// Helpers for detecting and trimming MCQ sections in AI-generated text
function trimMcqsFromText(text, maxCount) {
  try {
    if (!text || maxCount === undefined || maxCount === null) return text;
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

module.exports = { trimMcqsFromText };
