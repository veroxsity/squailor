const { supportsVision } = require('../../src/utils/ai/providers/capabilities');

describe('model vision capability heuristic', () => {
  test('detects common vision-capable models', () => {
    expect(supportsVision('openai/gpt-4o-mini')).toBe(true);
    expect(supportsVision('gpt-4o')).toBe(true);
    expect(supportsVision('anthropic/claude-3.5-sonnet')).toBe(true);
    expect(supportsVision('google/gemini-1.5-flash')).toBe(true);
    expect(supportsVision('llava-1.6')).toBe(true);
  });

  test('returns false for non-vision models', () => {
    expect(supportsVision('gpt-3.5-turbo')).toBe(false);
    expect(supportsVision('random-model-123')).toBe(false);
  });
});
