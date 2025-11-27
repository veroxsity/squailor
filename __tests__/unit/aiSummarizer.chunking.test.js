const { estimateTokens, splitTextIntoChunksByTokens } = require('../../src/utils/aiSummarizer');

describe('token-aware chunking utilities', () => {
  test('estimateTokens basic behavior', () => {
    expect(estimateTokens('Hello world')).toBeGreaterThanOrEqual(2); // >= words
    expect(estimateTokens('')).toBe(1); // clamps to at least 1
    expect(estimateTokens('abcd')).toBeGreaterThanOrEqual(1);
    expect(estimateTokens('a'.repeat(100))).toBeGreaterThanOrEqual(25); // ~4 chars/token heuristic
  });

  test('split returns single chunk when under budget', () => {
    const text = 'Para one. With some words.\n\nPara two. With more words here.';
    const chunks = splitTextIntoChunksByTokens(text, 1000);
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(text);
  });

  test('split breaks into multiple chunks within token budget', () => {
    // Build content with multiple paragraphs and sentences
    const para = Array.from({ length: 8 }, (_, i) => `Sentence ${i+1} is here with detail.`).join(' ');
    const text = Array.from({ length: 6 }, () => para).join('\n\n'); // 6 paragraphs

    const target = 40; // small budget to force multiple chunks
    const chunks = splitTextIntoChunksByTokens(text, target);

    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk stays within budget under the same estimator
    for (const c of chunks) {
      expect(estimateTokens(c)).toBeLessThanOrEqual(target);
    }

    // Re-joining should preserve semantic content (ignore whitespace diffs)
    const recombined = chunks.join('\n\n').replace(/\s+/g, ' ').trim();
    const originalNorm = text.replace(/\s+/g, ' ').trim();
    expect(recombined).toBe(originalNorm);
  });

  test('extremely long sentence is hard-split safely (content preserved ignoring added whitespace)', () => {
    const longSentence = 'A' + 'a'.repeat(10000) + '.';
    const text = longSentence + '\n\n' + longSentence; // two very long sentences separated by blank line
    const target = 100; // force hard-splits
    const chunks = splitTextIntoChunksByTokens(text, target);

    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) {
      expect(estimateTokens(c)).toBeLessThanOrEqual(target);
    }

    // Content preserved
    const recombined = chunks.join('\n\n');
    expect(recombined).toContain('A');
    expect(recombined.length).toBeGreaterThan(0);
    // Strict content check ignoring whitespace artifacts introduced by chunk boundaries
    const strippedRecombined = recombined.replace(/\s+/g, '');
    const strippedOriginal = text.replace(/\s+/g, '');
    expect(strippedRecombined).toBe(strippedOriginal);
  });
});
