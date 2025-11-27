'use strict';

/**
 * Estimate the number of tokens in a text string
 * Uses a simple heuristic: ~4 characters per token on average for English
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count (minimum 1 for any string)
 */
function estimateTokens(text) {
  if (typeof text !== 'string') return 0;
  if (text.length === 0) return 1; // Clamp empty string to 1
  
  // Simple heuristic: ~4 chars per token on average English
  // Clamp to at least number of words to avoid underestimation on short strings
  const byChars = Math.ceil(text.length / 4);
  const byWords = Math.max(1, (text.match(/\S+/g) || []).length);
  return Math.max(byChars, byWords);
}

/**
 * Split text into chunks that fit within a token budget
 * Tries to split on paragraph boundaries, then sentence boundaries
 * @param {string} text - Text to split
 * @param {number} targetTokens - Target maximum tokens per chunk
 * @returns {string[]} Array of text chunks
 */
function splitTextIntoChunksByTokens(text, targetTokens) {
  if (typeof text !== 'string' || text.length === 0) return [];
  
  // If under budget, return as single chunk
  if (estimateTokens(text) <= targetTokens) {
    return [text];
  }

  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  let currentTokens = 0;

  function pushCurrent() {
    if (current) {
      chunks.push(current);
      current = '';
      currentTokens = 0;
    }
  }

  for (const paragraph of paragraphs) {
    const pTokens = estimateTokens(paragraph);
    
    // Check if paragraph fits in current chunk
    if (currentTokens + pTokens <= targetTokens) {
      current += (current ? '\n\n' : '') + paragraph;
      currentTokens += pTokens;
    } else if (pTokens > targetTokens) {
      // Paragraph too large - need to split further
      pushCurrent();
      splitLargeParagraph(paragraph, targetTokens, chunks);
    } else {
      // Paragraph doesn't fit but is small enough on its own
      pushCurrent();
      current = paragraph;
      currentTokens = pTokens;
    }
  }

  pushCurrent();
  return chunks;
}

/**
 * Split a large paragraph by sentences, then by hard character split if needed
 * @private
 */
function splitLargeParagraph(paragraph, targetTokens, chunks) {
  // Try to split by sentences first
  const sentences = paragraph.match(/[^.!?\n]+[.!?]+\s*/g) || [paragraph];
  let current = '';
  let currentTokens = 0;

  function pushCurrent() {
    if (current) {
      chunks.push(current);
      current = '';
      currentTokens = 0;
    }
  }

  for (const sentence of sentences) {
    const sTok = estimateTokens(sentence);
    
    if (sTok > targetTokens) {
      // Sentence too long - hard split it
      pushCurrent();
      hardSplitText(sentence, targetTokens, chunks);
    } else if (currentTokens + sTok <= targetTokens) {
      // Sentence fits in current chunk
      current += sentence;
      currentTokens += sTok;
    } else {
      // Sentence doesn't fit, start new chunk
      pushCurrent();
      current = sentence;
      currentTokens = sTok;
    }
  }

  pushCurrent();
}

/**
 * Hard split text by character count to fit within token budget
 * @private
 */
function hardSplitText(text, targetTokens, chunks) {
  // Each token is ~4 chars, so slice size to stay under budget
  const sliceSize = Math.max(20, Math.floor(targetTokens * 4));
  
  for (let i = 0; i < text.length; i += sliceSize) {
    const piece = text.slice(i, i + sliceSize);
    chunks.push(piece);
  }
}

/**
 * Calculate word targets based on summary type and text length
 * @param {string} text - Original text
 * @param {string} summaryType - Type of summary (short, normal, longer)
 * @returns {Object} { minWordsTarget, maxWordsTarget }
 */
function calculateWordTargets(text, summaryType) {
  const approxWords = Math.max(1, Math.floor((text?.length || 0) / 5));
  let minWordsTarget = 0;
  let maxWordsTarget = 0;

  if (summaryType === 'short') {
    // Aggressive compression
    minWordsTarget = Math.min(600, Math.floor(approxWords * 0.08));
    maxWordsTarget = Math.max(minWordsTarget + 150, Math.floor(approxWords * 0.15));
  } else if (summaryType === 'normal') {
    // Moderate compression
    minWordsTarget = Math.min(3000, Math.floor(approxWords * 0.25));
    maxWordsTarget = Math.max(minWordsTarget + 400, Math.floor(approxWords * 0.45));
  } else {
    // 'longer' — minimal compression
    minWordsTarget = Math.min(12000, Math.floor(approxWords * 0.55));
    maxWordsTarget = Math.min(18000, Math.max(minWordsTarget + 1000, Math.floor(approxWords * 0.9)));
  }

  return { minWordsTarget, maxWordsTarget };
}

/**
 * Get chunk and max token settings based on summary type
 * @param {string} summaryType - Type of summary
 * @returns {Object} { targetChunkTokens, maxTokens, chunkMaxTokens }
 */
function getTokenSettings(summaryType) {
  let targetChunkTokens, maxTokens, chunkMaxTokens;

  if (summaryType === 'short') {
    targetChunkTokens = 900;
    maxTokens = 1000;
    chunkMaxTokens = 500;
  } else if (summaryType === 'longer') {
    targetChunkTokens = 3500;
    maxTokens = 9000;
    chunkMaxTokens = 5000;
  } else {
    // normal
    targetChunkTokens = 2200;
    maxTokens = 3000;
    chunkMaxTokens = 1500;
  }

  return { targetChunkTokens, maxTokens, chunkMaxTokens };
}

module.exports = {
  estimateTokens,
  splitTextIntoChunksByTokens,
  calculateWordTargets,
  getTokenSettings
};
