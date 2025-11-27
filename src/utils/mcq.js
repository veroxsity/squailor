// Helpers for detecting and trimming MCQ sections in AI-generated text
function trimMcqsFromText(text, maxCount) {
  try {
    if (!text || maxCount === undefined || maxCount === null) return text;
    // Prefer trimming structured JSON MCQs when present
    try {
      const jsonTrimmed = _trimJsonMcqs(text, maxCount);
      if (typeof jsonTrimmed === 'string' && jsonTrimmed.length > 0) return jsonTrimmed;
    } catch (_) {}
    const lines = (text || '').split(/\r?\n/);
    const questionRe = /^\s*(?:\d+\.|\d+\)|Q\d+[:\)]|Question\s+\d+[:\)])\s*/i;

    // Find start of first question
    let firstQIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (questionRe.test(lines[i])) { firstQIdx = i; break; }
      // sometimes a 'Questions' heading indicates start
      if (/^\s*(Multiple[- ]?Choice|MCQs|Questions)\b/i.test(lines[i])) { firstQIdx = i + 1; break; }
    }
    if (firstQIdx === -1) return text; // can't locate question section

    // Collect question blocks
    const blocks = [];
    let cur = [];
    for (let i = firstQIdx; i < lines.length; i++) {
      const l = lines[i];
      if (questionRe.test(l)) {
        if (cur.length) blocks.push(cur.join('\n'));
        cur = [l];
      } else {
        if (cur.length) cur.push(l);
      }
    }
    if (cur.length) blocks.push(cur.join('\n'));

    if (blocks.length <= maxCount) return text;

    // Keep only first maxCount blocks and rebuild
    const prefix = lines.slice(0, firstQIdx).join('\n').trim();
    const kept = blocks.slice(0, maxCount).join('\n\n');
    return (prefix ? prefix + '\n\n' : '') + kept;
  } catch (_) {
    return text;
  }
}

// Try to detect JSON-formatted MCQs anywhere in the string. If found, trim the
// questions array to maxCount and return the transformed text. This allows the
// summarizer to emit a strict JSON schema and still be post-processed safely.
function _trimJsonMcqs(text, maxCount) {
  try {
    if (!text || typeof text !== 'string') return null;
    // Look for a fenced ```json block first
    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
    const rawCandidate = fencedMatch ? fencedMatch[1].trim() : null;
    const plainJsonMatch = !rawCandidate ? text.match(/\{[\s\S]*\}\s*$/m) : null;
    const jsonSource = rawCandidate || (plainJsonMatch ? plainJsonMatch[0] : null);
    if (!jsonSource) return null;

    const parsed = JSON.parse(jsonSource);
    // Accept object with questions array, or direct array
    const obj = Array.isArray(parsed) ? { questions: parsed } : parsed;
    if (!obj || !Array.isArray(obj.questions)) return null;

    if (obj.questions.length <= maxCount) return null;
    // Trim questions
    const kept = obj.questions.slice(0, maxCount);
    const newObj = Object.assign({}, obj, { questions: kept });
    const pretty = JSON.stringify(newObj, null, 2);

    if (fencedMatch) {
      return text.replace(fencedMatch[0], `\n\n\`\`\`json\n${pretty}\n\`\`\`\n`);
    }
    // Replace the trailing JSON block if plain
    if (plainJsonMatch) {
      return text.replace(plainJsonMatch[0], pretty);
    }
    return null;
  } catch (_) {
    return null;
  }
}

function parseMcqsFromText(text) {
  // Fast-path: if the model returned JSON (or a fenced JSON block), prefer the
  // structured JSON output over fragile heuristic parsing.
  try {
    if (typeof text === 'string') {
      // detect fenced JSON block
      const fenced = text.match(/```json\s*([\s\S]*?)```/i);
      const candidate = fenced ? fenced[1].trim() : text.trim();
      // If candidate looks like JSON (starts with { or [), try to parse
      if (candidate && (/^[\[{]/.test(candidate))) {
        try {
          const parsed = JSON.parse(candidate);
          const obj = Array.isArray(parsed) ? { intro: '', questions: parsed } : parsed;
          if (obj && Array.isArray(obj.questions)) {
            // Normalize minimal structure: ensure options have label/text
            const questions = (obj.questions || []).map(q => {
              const opts = Array.isArray(q.options) ? q.options.map(o => ({ label: String((o && o.label) || '').toUpperCase(), text: String((o && o.text) || '').trim() })) : [];
              return {
                question: String(q.question || q.prompt || q.q || '').trim(),
                options: opts,
                correctLabel: q.correctLabel || q.correct || null,
                correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : (q.correctLabel ? opts.findIndex(o => o.label === q.correctLabel) : null),
                explanation: q.explanation || q.reason || null,
                answerText: q.answerText || q.answer || null,
                raw: JSON.stringify(q)
              };
            });
            return { intro: String(obj.intro || obj.summary || '').trim(), questions };
          }
        } catch (_) {
          // fallthrough to heuristic parsing below
        }
      }
    }
  } catch (_) {}
  if (!text || typeof text !== 'string') return { intro: '', questions: [] };
  const lines = text.split(/\r?\n/);
  const questionRe = /^\s*(?:\d+\.|\d+\)|Q\d+[:\)]|Question\s+\d+[:\)])\s*/i;

  // find first question index
  let firstQIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (questionRe.test(lines[i])) { firstQIdx = i; break; }
    if (/^\s*(Multiple[- ]?Choice|MCQs|Questions)\b/i.test(lines[i])) { firstQIdx = i + 1; break; }
  }

  if (firstQIdx === -1) return { intro: text.trim(), questions: [] };

  const intro = lines.slice(0, firstQIdx).join('\n').trim();

  // collect question blocks
  const blocks = [];
  let cur = [];
  for (let i = firstQIdx; i < lines.length; i++) {
    const l = lines[i];
    if (questionRe.test(l)) {
      if (cur.length) blocks.push(cur.slice());
      cur = [l];
    } else {
      if (cur.length) cur.push(l);
    }
  }
  if (cur.length) blocks.push(cur.slice());

  const questions = blocks.map(blockLines => {
    const raw = blockLines.join('\n').trim();
    // first line is question header (strip number/prefix)
    const qLine = blockLines[0] || '';
    const questionText = qLine.replace(questionRe, '').trim();

    // parse options lines
    const optionRe = /^\s*([A-Za-z])\s*[\)\.:-]\s*(.*)$/;
    const options = [];
    let correctLabel = null;
    let explanation = null;
    let answerText = null;
    for (let i = 1; i < blockLines.length; i++) {
      // Keep both the raw line and a sanitized version for matching answers/explanations
      const rawLine = blockLines[i].trim();
      // Sanitized line removes markdown wrappers for stable matching of Answer/Explanation
      const l = rawLine.replace(/^[*_`~\s]+/, '').replace(/[*_`~\s]+$/, '').trim();
      if (!l) continue;
      // Answer line detection
      const ansLine = l.match(/^(?:Answer|Correct Answer|Correct)[:\s]+(.+)$/i);
      if (ansLine) {
        const payload = ansLine[1].trim();
        // payload can be a letter (B), letter+text (B) explanation) or full text answer
        // Detect an explicit single-letter answer (e.g. "B" or "B)"), or a
        // letter plus explanation ("B) because..."), otherwise treat as a
        // free-text answer like "Blue" and try mapping it to an option.
        const letterOnly = payload.match(/^([A-Za-z])\s*(?:\)|\.|:)?\s*$/);
        const letterWithText = payload.match(/^([A-Za-z])\s*(?:\)|\.|:)\s*(.+)$/);
        if (letterOnly) {
          correctLabel = letterOnly[1].toUpperCase();
        } else if (letterWithText) {
          correctLabel = letterWithText[1].toUpperCase();
          explanation = letterWithText[2].trim();
        } else {
          // full text answer — try to map to an option
          answerText = payload;
          // try to match option by prefix/contain
          const pref = payload.slice(0, 80).toLowerCase();
          const byExact = options.find(o => pref.startsWith(o.text.slice(0, Math.min(40, o.text.length)).toLowerCase()));
          if (byExact) correctLabel = byExact.label;
          else {
            const snippet = pref.split(/[\.|,|;|-]/)[0].trim();
            const byContain = options.find(o => o.text.toLowerCase().includes(snippet) || snippet.includes(o.text.slice(0, Math.min(30, o.text.length)).toLowerCase()));
            if (byContain) correctLabel = byContain.label;
          }
        }
        continue;
      }
      // Explanation lines
      const explMatch = l.match(/^\s*(?:Explanation|Reason|Rationale)[:\s]*\s*(.*)$/i);
      if (explMatch) { explanation = explMatch[1].trim(); continue; }

      // If it's an option line - test rawLine so trailing markers like '*' are preserved
      const opt = rawLine.match(optionRe);
      if (opt) {
        let optText = opt[2].trim();
        const hadStar = /\*+\s*$/.test(optText);
        if (hadStar) optText = optText.replace(/\*+\s*$/, '').trim();
        const labelUp = opt[1].toUpperCase();
        options.push({ label: labelUp, text: optText });
        if (hadStar) correctLabel = labelUp;
        continue;
      }

      // fallback: lines starting with '-' as list item
      if (/^\s*[\-\*]\s+/.test(rawLine)) {
        let text = rawLine.replace(/^\s*[\-\*]\s+/, '').trim();
        const hadStar = /\*+\s*$/.test(text);
        if (hadStar) text = text.replace(/\*+\s*$/, '').trim();
        const label = String.fromCharCode(65 + options.length); // A,B,C..
        options.push({ label, text });
        if (hadStar) correctLabel = label;
        continue;
      }

      // If line contains '(Correct)' appended to an option, try to detect
      const matchCorrectOpt = rawLine.match(/^([A-Za-z])\s*[\)\.:-]\s*(.*)\s*\(correct\)/i);
      if (matchCorrectOpt) {
        options.push({ label: matchCorrectOpt[1].toUpperCase(), text: matchCorrectOpt[2].trim() });
        correctLabel = matchCorrectOpt[1].toUpperCase();
        continue;
      }
    }

    if (!correctLabel) {
      for (const o of options) {
        if (o.text && /\*\s*$/.test(o.text)) {
          o.text = o.text.replace(/\*+\s*$/, '').trim();
          correctLabel = o.label;
          break;
        }
      }
    }

    const correctIndex = correctLabel ? options.findIndex(o => o.label === correctLabel) : -1;

    return { question: questionText, options, correctLabel: correctLabel || null, correctIndex: correctIndex >= 0 ? correctIndex : null, explanation: explanation || null, answerText: answerText || null, raw };
  });

  return { intro: intro || '', questions };
}

module.exports = { trimMcqsFromText, parseMcqsFromText };
