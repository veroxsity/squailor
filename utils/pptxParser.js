const fs = require('fs').promises;
const JSZip = require('jszip');
const xml2js = require('xml2js');

/**
 * Parse PowerPoint presentation and extract text content
 * @param {string} filePath - Path to the PPTX file
 * @returns {Promise<string>} - Extracted text content
 */
async function parsePresentation(filePath) {
  try {
    const data = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(data);
    
    let text = '';
    const slideFiles = [];

    // Get all slide files
    zip.forEach((relativePath, file) => {
      if (relativePath.match(/ppt\/slides\/slide\d+\.xml/)) {
        slideFiles.push({ path: relativePath, file });
      }
    });

    // Sort slides by number
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.path.match(/slide(\d+)\.xml/)[1]);
      const numB = parseInt(b.path.match(/slide(\d+)\.xml/)[1]);
      return numA - numB;
    });

    // Extract text from each slide
    let slideNumber = 0;
    let rawText = ''; // Keep raw text for debugging
    
    for (const { path, file } of slideFiles) {
      slideNumber++;
      const content = await file.async('string');
      const slideText = await extractTextFromSlideXML(content);
      
      if (slideText.trim()) {
        text += `\n--- Slide ${slideNumber} ---\n`;
        text += slideText + '\n';
        rawText += slideText + '\n';
      }
    }

    // Log raw text before cleaning (for debugging)
    console.log('Raw text before cleaning (length:', rawText.length, ')');
    if (rawText.length > 0 && rawText.length < 500) {
      console.log('Raw text:', rawText);
    }

    // Clean up the extracted text
    text = cleanExtractedText(text);
    
    console.log('Cleaned text (length:', text.length, ')');

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in presentation. The slides may be empty or contain only images.');
    }

    return text.trim();
  } catch (error) {
    throw new Error(`Failed to parse PowerPoint: ${error.message}`);
  }
}

/**
 * Extract text from slide XML content
 * @param {string} xmlContent - XML content of slide
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromSlideXML(xmlContent) {
  const parser = new xml2js.Parser();
  
  try {
    const result = await parser.parseStringPromise(xmlContent);
    const extractedText = extractTextRecursive(result);
    
    // If we got text from parsing, return it
    if (extractedText && extractedText.trim().length > 0) {
      return extractedText;
    }
    
    // Fallback to regex if parsing didn't yield text
    return extractTextWithRegex(xmlContent);
  } catch (error) {
    // Fallback: use regex to extract text between <a:t> tags
    return extractTextWithRegex(xmlContent);
  }
}

/**
 * Extract text using regex as fallback
 * @param {string} xmlContent - XML content
 * @returns {string} - Extracted text
 */
function extractTextWithRegex(xmlContent) {
  const matches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gs);
  if (matches) {
    return matches
      .map(match => match.replace(/<a:t[^>]*>|<\/a:t>/g, ''))
      .map(text => text.trim())
      .filter(text => text.length > 0)
      .join(' ')
      .trim();
  }
  return '';
}

/**
 * Recursively extract text from parsed XML object
 * Only extract from 'a:t' tags (actual text content)
 * @param {Object} obj - Parsed XML object
 * @returns {string} - Extracted text
 */
function extractTextRecursive(obj) {
  let text = '';

  if (typeof obj === 'string') {
    return obj;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      text += extractTextRecursive(item) + ' ';
    });
    return text.trim();
  }

  if (typeof obj === 'object' && obj !== null) {
    // Check for text content in 'a:t' tags
    if (obj['a:t']) {
      if (Array.isArray(obj['a:t'])) {
        text += obj['a:t'].join(' ') + ' ';
      } else if (typeof obj['a:t'] === 'string') {
        text += obj['a:t'] + ' ';
      } else if (typeof obj['a:t'] === 'object') {
        text += extractTextRecursive(obj['a:t']) + ' ';
      }
    }

    // Continue recursing through all properties to find more text
    Object.keys(obj).forEach(key => {
      if (key !== 'a:t' && key !== '$' && key !== '_') {
        const childText = extractTextRecursive(obj[key]);
        if (childText) {
          text += childText + ' ';
        }
      }
    });
  }

  return text.trim();
}

/**
 * Clean extracted text from XML artifacts
 * More conservative - only removes obvious XML/schema junk
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
function cleanExtractedText(text) {
  let cleaned = text;
  
  // Remove full XML namespace URLs (these are always junk)
  cleaned = cleaned.replace(/https?:\/\/schemas\.[^\s]+/g, '');
  
  // Remove xmlns declarations (these are always junk)
  cleaned = cleaned.replace(/xmlns[:\w]*\s*=\s*["'][^"']*["']/g, '');
  
  // Remove standalone GUIDs (format: {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX})
  cleaned = cleaned.replace(/\{[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\}/gi, '');
  
  // Remove obvious shape/background identifiers that appear alone
  cleaned = cleaned.replace(/\bbg\d+\s+/g, '');
  cleaned = cleaned.replace(/\bRectangle\s+\d+\s+/g, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Clean up multiple newlines (keep double newlines for paragraphs)
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n');
  
  // Trim each line and remove empty lines
  cleaned = cleaned.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  return cleaned.trim();
}

module.exports = {
  parsePresentation
};
