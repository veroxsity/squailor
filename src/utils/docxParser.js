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

/**
 * Extract images from a DOCX file (best-effort) for vision models
 * - Resolves relationships in document.xml.rels to media files
 * - Falls back to listing word/media/* when relationships are unavailable
 * - Limits to maxImages and returns data URLs
 *
 * @param {string} filePath
 * @param {number} maxImages
 * @returns {Promise<Array<{ mimeType: string, dataUrl: string, altText?: string }>>}
 */
async function extractDocxImages(filePath, maxImages = 3) {
  try {
    const buffer = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(buffer);

    const results = [];

    // Build relationship map rId -> Target (e.g., media/image1.png)
    let rels = {};
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (relsFile) {
      try {
        const relsXml = await relsFile.async('string');
        const relMatches = relsXml.match(/<Relationship\b[^>]*>/g) || [];
        for (const tag of relMatches) {
          const idMatch = tag.match(/\bId\s*=\s*"([^"]+)"/);
          const targetMatch = tag.match(/\bTarget\s*=\s*"([^"]+)"/);
          if (idMatch && targetMatch) {
            let target = targetMatch[1];
            if (!/^word\//.test(target)) {
              target = target.startsWith('..') ? target.replace(/^\.\.\//, 'word/') : `word/${target}`;
            }
            rels[idMatch[1]] = target;
          }
        }
      } catch (_) { /* ignore */ }
    }

    // Parse document.xml to find r:embed ids in a:blip tags
    const docFile = zip.file('word/document.xml');
    const embedTargets = [];
    if (docFile) {
      try {
        const docXml = await docFile.async('string');
        const ridMatches = docXml.match(/r:embed\s*=\s*"([^"]+)"/g) || [];
        for (const m of ridMatches) {
          const id = (m.match(/r:embed\s*=\s*"([^"]+)"/) || [])[1];
          if (id && rels[id]) {
            embedTargets.push(rels[id]);
          }
        }
      } catch (_) { /* ignore */ }
    }

    const seen = new Set();
    // Helper to push an image if present
    const pushImage = async (zipPath) => {
      if (results.length >= maxImages) return;
      if (seen.has(zipPath)) return;
      seen.add(zipPath);
      const f = zip.file(zipPath);
      if (!f) return;
      const ext = (zipPath.split('.').pop() || '').toLowerCase();
      const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
      const mimeType = mimeMap[ext];
      if (!mimeType) return;
      try {
        const base64 = await f.async('base64');
        results.push({ mimeType, dataUrl: `data:${mimeType};base64,${base64}` });
      } catch (_) { /* ignore */ }
    };

    // Try relationship-resolved targets in order
    for (const t of embedTargets) {
      if (results.length >= maxImages) break;
      await pushImage(t);
    }

    // Fallback: list media folder directly
    if (results.length < maxImages) {
      Object.keys(zip.files)
        .filter(k => /^word\/media\//.test(k))
        .slice(0, maxImages * 2) // a few extras for filtering
        .sort()
        .forEach(k => embedTargets.push(k));
      for (const t of embedTargets) {
        if (results.length >= maxImages) break;
        await pushImage(t);
      }
    }

    return results;
  } catch (_) {
    return [];
  }
}

module.exports.extractDocxImages = extractDocxImages;
