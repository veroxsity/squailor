const fs = require('fs').promises;
// Try to require mammoth, but fail gracefully with a helpful message
let mammoth;
try {
  mammoth = require('mammoth');
} catch (err) {
  // Leave mammoth undefined; parseDocx will throw a clear error when called
  mammoth = null;
}

/**
 * Extract text from a DOCX file using mammoth
 * Returns plain text suitable for summarization
 */
async function parseDocx(filePath) {
  try {
    if (!mammoth) {
      throw new Error('Missing dependency "mammoth". Run `npm install` in the project root or reinstall the packaged app so the dependency is available.');
    }
    const buffer = await fs.readFile(filePath);
    // mammoth accepts a Buffer or ArrayBuffer; pass the node Buffer
    const result = await mammoth.extractRawText({ buffer });
    let text = result.value || '';

    // Basic cleanup: trim and collapse multiple blank lines
    text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    if (!text || text.length === 0) {
      throw new Error('No text content found in Word document');
    }

    return text;
  } catch (err) {
    throw new Error(`Failed to parse Word document: ${err && err.message}`);
  }
}

module.exports = { parseDocx };
