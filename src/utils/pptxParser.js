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

    // Debug logging (development only)
    const isDev = process.env.NODE_ENV === 'development';
    const debugLog = (...args) => { if (isDev) console.log(...args); };
    debugLog('Raw text before cleaning (length:', rawText.length, ')');
    if (rawText.length > 0 && rawText.length < 500) {
      debugLog('Raw text:', rawText);
    }

    // Clean up the extracted text
    text = cleanExtractedText(text);
    
  debugLog('Cleaned text (length:', text.length, ')');

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in presentation. The slides may be empty or contain only images.');
    }

    return text.trim();
  } catch (error) {
    throw new Error(`Failed to parse PowerPoint: ${error.message}`);
  }
}

/**
 * Extract key slide images from a PPTX file with basic metadata
 * - Attempts to map each slide's picture relationships to actual media files
 * - Captures optional alt text/description when present
 * - Returns up to maxImages images (to control token/cost when sent to a vision model)
 *
 * @param {string} filePath - Path to the PPTX file
 * @param {number} maxImages - Maximum number of images to extract
 * @returns {Promise<Array<{ slideNumber: number, altText?: string, mimeType: string, dataUrl: string }>>}
 */
async function extractSlideImages(filePath, maxImages = 10) {
  try {
    const data = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(data);

    // Collect slide XML file entries
    const slideEntries = [];
    zip.forEach((relativePath, file) => {
      if (relativePath.match(/ppt\/slides\/slide\d+\.xml/)) {
        slideEntries.push({ path: relativePath, file });
      }
    });

    // Sort slides in order
    slideEntries.sort((a, b) => {
      const numA = parseInt(a.path.match(/slide(\d+)\.xml/)[1]);
      const numB = parseInt(b.path.match(/slide(\d+)\.xml/)[1]);
      return numA - numB;
    });

    const images = [];
    const parser = new xml2js.Parser();

    for (const { path: slidePath, file } of slideEntries) {
      if (images.length >= maxImages) break;
      const slideNum = parseInt(slidePath.match(/slide(\d+)\.xml/)[1]);
      const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
      const relsFile = zip.file(relsPath);

      // Map relId -> target media path
      const relMap = {};
      if (relsFile) {
        try {
          const relsXml = await relsFile.async('string');
          const relsDoc = await parser.parseStringPromise(relsXml);
          const rels = relsDoc?.Relationships?.Relationship || [];
          for (const r of rels) {
            const id = r.$?.Id;
            const target = r.$?.Target;
            if (id && target && /media\//.test(target)) {
              // Resolve relative path from slides folder to root
              const norm = target.startsWith('..') ? target.replace(/^\.\.\//, 'ppt/') : `ppt/slides/${target}`;
              // Many targets look like ../media/image1.png; normalize to ppt/media/image1.png
              const normalized = norm.replace(/^ppt\/slides\/\.\.\//, 'ppt/');
              relMap[id] = normalized;
            }
          }
        } catch (_) {
          // ignore rel parsing errors
        }
      }

      // Parse slide XML and find pictures (p:pic) with a:blip r:embed references
      const slideXml = await file.async('string');
      let slideDoc;
      try {
        slideDoc = await parser.parseStringPromise(slideXml);
      } catch (_) {
        continue;
      }

      // Traverse the slide tree and collect any a:blip r:embed occurrences (pictures and shape fills)
      const found = [];
      traverseSlide(slideDoc, [], (node, parents) => {
        const relId = node?.$?.['r:embed'];
        if (!relId) return;
        // Find nearest alt text from parent chain if available
        let altText;
        for (let p = parents.length - 1; p >= 0; p--) {
          const parent = parents[p];
          const cNvPrPic = parent?.['p:nvPicPr']?.[0]?.['p:cNvPr']?.[0]?.$;
          const cNvPrSp = parent?.['p:nvSpPr']?.[0]?.['p:cNvPr']?.[0]?.$;
          const c = cNvPrPic || cNvPrSp;
          if (c) {
            altText = c.descr || c.name || c.title;
            if (altText) break;
          }
        }
        found.push({ relId, altText });
      });

      for (const f of found) {
        if (images.length >= maxImages) break;
        const mediaPath = relMap[f.relId];
        if (!mediaPath) continue;
        const mediaFile = zip.file(mediaPath);
        if (!mediaFile) continue;
        const extMatch = mediaPath.match(/\.([a-zA-Z0-9]+)$/);
        const ext = (extMatch ? extMatch[1] : '').toLowerCase();
        const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
        const mimeType = mimeMap[ext] || 'application/octet-stream';
        try {
          const base64 = await mediaFile.async('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;
          images.push({ slideNumber: slideNum, altText: f.altText, mimeType, dataUrl });
        } catch (_) { /* ignore */ }
      }
    }

    return images;
  } catch (error) {
    // On any failure, return empty to avoid breaking primary text pipeline
    return [];
  }
}

// Helper to traverse nested arrays/objects and collect nodes at a path
function findNodesByPath(root, path) {
  let level = [root];
  for (const key of path) {
    const next = [];
    for (const node of level) {
      const v = node?.[key];
      if (Array.isArray(v)) {
        next.push(...v);
      }
    }
    level = next;
  }
  return level;
}

// Depth-first traversal to find any a:blip occurrences; callback receives node and parents chain
function traverseSlide(node, parents, onBlip) {
  if (!node || typeof node !== 'object') return;
  // If this node has a:blip array
  const blips = node['a:blip'];
  if (Array.isArray(blips)) {
    for (const b of blips) {
      onBlip(b, parents.concat(node));
    }
  }
  // Recurse children
  for (const key of Object.keys(node)) {
    if (key === '$' || key === '_') continue;
    const val = node[key];
    if (Array.isArray(val)) {
      for (const child of val) {
        traverseSlide(child, parents.concat(node), onBlip);
      }
    } else if (typeof val === 'object' && val) {
      traverseSlide(val, parents.concat(node), onBlip);
    }
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
  parsePresentation,
  extractSlideImages
};
