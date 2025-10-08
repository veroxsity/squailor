const fs = require('fs').promises;
const JSZip = require('jszip');

/**
 * Extract text from a DOCX file using JSZip and XML parsing/regex
 * Returns plain text suitable for summarization
 */
async function parseDocx(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(buffer);

    // Primary document
    const parts = [];
    const main = zip.file('word/document.xml');
    if (main) {
      parts.push(await main.async('string'));
    }
    // Headers/footers (optional)
    Object.keys(zip.files).forEach((k) => {
      if (/^word\/(header\d*|footer\d*)\.xml$/.test(k)) {
        parts.push(zip.files[k].async('string'));
      }
    });
    // Resolve any pending async strings
    for (let i = 0; i < parts.length; i++) {
      if (typeof parts[i].then === 'function') {
        parts[i] = await parts[i];
      }
    }

    const texts = [];
    for (const xml of parts) {
      texts.push(extractTextFromWordXML(xml));
    }
    let text = texts.filter(Boolean).join('\n').replace(/\r\n/g, '\n');
    // Collapse excessive blank lines
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    if (!text) {
      throw new Error('No text content found in Word document');
    }

    return text;
  } catch (err) {
    throw new Error(`Failed to parse Word document: ${err && err.message}`);
  }
}

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTextFromWordXML(xml) {
  if (!xml) return '';
  try {
    // Replace tabs and breaks with spaces/newlines
    let cleaned = xml
      .replace(/<w:tab\b[^>]*\/>/g, '\t')
      .replace(/<w:br\b[^>]*\/>/g, '\n')
      .replace(/<w:p\b[^>]*>/g, '\n')
      .replace(/<\/w:p>/g, '\n');

    // Collect text nodes in w:t
    const matches = cleaned.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    const parts = matches.map(m => {
      const inner = m.replace(/<w:t[^>]*>|<\/w:t>/g, '');
      return decodeEntities(inner.trim());
    });

    let text = parts.join(' ');
    // Normalize whitespace
    text = text.replace(/\u00A0/g, ' ').replace(/\s{2,}/g, ' ');
    return text.trim();
  } catch (_) {
    return '';
  }
}

module.exports = { parseDocx };
