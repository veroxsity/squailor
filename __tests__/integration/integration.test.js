'use strict';

/**
 * Integration tests for main application flows
 */

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      if (name === 'userData') return '/tmp/squailor-test';
      return '/tmp';
    }),
    isPackaged: false
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  BrowserWindow: jest.fn()
}));

// Mock electron-log
jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Integration: Settings Flow', () => {
  test('should sanitize settings and preserve valid values', () => {
    const validators = require('../../src/utils/validators');
    
    // Only 'dark' and 'light' are valid themes
    const settings = {
      theme: 'dark',
      aiProvider: 'openai'
    };
    
    const sanitized = validators.sanitizeSettings(settings);
    expect(sanitized.theme).toBe('dark');
    expect(sanitized.aiProvider).toBe('openai');
  });

  test('should remove invalid theme values', () => {
    const validators = require('../../src/utils/validators');
    
    const settings = {
      theme: 'invalid-theme',
      aiProvider: 'openai'
    };
    
    const sanitized = validators.sanitizeSettings(settings);
    // Invalid theme gets deleted, not defaulted
    expect(sanitized.theme).toBeUndefined();
    expect(sanitized.aiProvider).toBe('openai');
  });

  test('should sanitize invalid settings values', () => {
    const validators = require('../../src/utils/validators');
    
    const invalidSettings = {
      theme: 'light',
      aiProvider: 'fake-provider', // invalid - will be deleted
      maxImageCount: 100,
      mcqCount: 1000
    };
    
    const sanitized = validators.sanitizeSettings(invalidSettings);
    
    expect(sanitized.theme).toBe('light');
    expect(sanitized.aiProvider).toBeUndefined(); // invalid provider is deleted
    expect(sanitized.maxImageCount).toBeLessThanOrEqual(10);
    expect(sanitized.mcqCount).toBeLessThanOrEqual(50);
  });
});

describe('Integration: Provider Validation', () => {
  test('should validate provider names', () => {
    const validators = require('../../src/utils/validators');
    
    const validProviders = [
      'openrouter', 'openai', 'anthropic', 'google', 
      'cohere', 'groq', 'mistral', 'xai', 
      'azure-openai', 'custom-openai'
    ];
    
    validProviders.forEach(provider => {
      expect(validators.isValidProvider(provider)).toBe(true);
    });
    
    expect(validators.isValidProvider('fake')).toBe(false);
    expect(validators.isValidProvider('')).toBe(false);
    expect(validators.isValidProvider(null)).toBe(false);
  });

  test('should sanitize provider to valid value', () => {
    const validators = require('../../src/utils/validators');
    
    expect(validators.sanitizeProvider('openai')).toBe('openai');
    expect(validators.sanitizeProvider('fake')).toBe('openrouter');
    expect(validators.sanitizeProvider(null)).toBe('openrouter');
  });
});

describe('Integration: File Validation', () => {
  test('should validate allowed file extensions', () => {
    const validators = require('../../src/utils/validators');
    
    // Valid files
    expect(validators.isAllowedFilePath('/path/to/doc.pdf')).toBe(true);
    expect(validators.isAllowedFilePath('/path/to/doc.pptx')).toBe(true);
    expect(validators.isAllowedFilePath('/path/to/doc.ppt')).toBe(true);
    expect(validators.isAllowedFilePath('/path/to/doc.docx')).toBe(true);
    expect(validators.isAllowedFilePath('/path/to/doc.doc')).toBe(true);
    
    // Invalid files
    expect(validators.isAllowedFilePath('/path/to/doc.txt')).toBe(false);
    expect(validators.isAllowedFilePath('/path/to/doc.exe')).toBe(false);
    expect(validators.isAllowedFilePath('/path/to/doc.js')).toBe(false);
  });

  test('should validate folder IDs', () => {
    const validators = require('../../src/utils/validators');
    
    // Valid folder IDs (8 lowercase alphanumeric)
    expect(validators.isValidFolderId('abcd1234')).toBe(true);
    expect(validators.isValidFolderId('xyz98765')).toBe(true);
    
    // Invalid folder IDs
    expect(validators.isValidFolderId('ABC12345')).toBe(false); // uppercase
    expect(validators.isValidFolderId('abc123')).toBe(false); // too short
    expect(validators.isValidFolderId('abc12345!')).toBe(false); // special char
    expect(validators.isValidFolderId('')).toBe(false);
    expect(validators.isValidFolderId(null)).toBe(false);
  });
});

describe('Integration: Summary Type Validation', () => {
  test('should validate and sanitize summary types', () => {
    const validators = require('../../src/utils/validators');
    
    expect(validators.sanitizeSummaryType('short')).toBe('short');
    expect(validators.sanitizeSummaryType('normal')).toBe('normal');
    expect(validators.sanitizeSummaryType('longer')).toBe('longer');
    expect(validators.sanitizeSummaryType('invalid')).toBe('normal');
  });

  test('should validate and sanitize response tones', () => {
    const validators = require('../../src/utils/validators');
    
    expect(validators.sanitizeTone('casual')).toBe('casual');
    expect(validators.sanitizeTone('formal')).toBe('formal');
    expect(validators.sanitizeTone('informative')).toBe('informative');
    expect(validators.sanitizeTone('eli5')).toBe('eli5');
    expect(validators.sanitizeTone('invalid')).toBe('casual');
  });

  test('should validate and sanitize summary styles', () => {
    const validators = require('../../src/utils/validators');
    
    expect(validators.sanitizeStyle('teaching')).toBe('teaching');
    expect(validators.sanitizeStyle('notes')).toBe('notes');
    expect(validators.sanitizeStyle('mcqs')).toBe('mcqs');
    expect(validators.sanitizeStyle('invalid')).toBe('teaching');
  });
});

describe('Integration: Process Documents Args Validation', () => {
  test('should validate complete process args', () => {
    const validators = require('../../src/utils/validators');
    
    const validArgs = {
      filePaths: ['/path/to/file.pdf'],
      summaryType: 'normal',
      responseTone: 'casual',
      model: 'openai/gpt-4o-mini',
      summaryStyle: 'teaching',
      processImagesFlag: false
    };
    
    const result = validators.validateProcessDocumentsArgs(validArgs);
    expect(result.ok).toBe(true);
    // Note: filePaths is NOT included in result.value - only sanitized options
    expect(result.value.summaryType).toBe('normal');
    expect(result.value.responseTone).toBe('casual');
    expect(result.value.summaryStyle).toBe('teaching');
    expect(result.value.processImages).toBe(false);
  });

  test('should reject empty file paths', () => {
    const validators = require('../../src/utils/validators');
    
    const result = validators.validateProcessDocumentsArgs({
      filePaths: [],
      summaryType: 'normal'
    });
    
    expect(result.ok).toBe(false);
  });

  test('should reject invalid file extensions', () => {
    const validators = require('../../src/utils/validators');
    
    const result = validators.validateProcessDocumentsArgs({
      filePaths: ['/path/to/file.txt'],
      summaryType: 'normal'
    });
    
    expect(result.ok).toBe(false);
  });
});

describe('Integration: Token Estimation', () => {
  test('should estimate tokens reasonably', () => {
    const { estimateTokens } = require('../../src/utils/ai/chunking');
    
    // Simple text
    const shortText = 'Hello world';
    expect(estimateTokens(shortText)).toBeGreaterThan(0);
    
    // Longer text should have more tokens
    const longText = 'This is a much longer piece of text that should have significantly more tokens than the short text above.';
    expect(estimateTokens(longText)).toBeGreaterThan(estimateTokens(shortText));
  });

  test('should handle empty and null input', () => {
    const { estimateTokens } = require('../../src/utils/ai/chunking');
    
    // Empty string clamps to 1 (minimum)
    expect(estimateTokens('')).toBe(1);
    // Non-strings return 0
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });
});

describe('Integration: Text Chunking', () => {
  test('should return single chunk for small text', () => {
    const { splitTextIntoChunksByTokens } = require('../../src/utils/ai/chunking');
    
    const smallText = 'This is a small piece of text.';
    const chunks = splitTextIntoChunksByTokens(smallText, 1000);
    
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(smallText);
  });

  test('should split large text into multiple chunks', () => {
    const { splitTextIntoChunksByTokens } = require('../../src/utils/ai/chunking');
    
    // Create a large text
    const paragraph = 'This is a paragraph with some content. '.repeat(100);
    const largeText = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    
    const chunks = splitTextIntoChunksByTokens(largeText, 200);
    
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be non-empty
    chunks.forEach(chunk => {
      expect(chunk.length).toBeGreaterThan(0);
    });
  });

  test('should handle empty input', () => {
    const { splitTextIntoChunksByTokens } = require('../../src/utils/ai/chunking');
    
    expect(splitTextIntoChunksByTokens('', 1000)).toEqual([]);
    expect(splitTextIntoChunksByTokens(null, 1000)).toEqual([]);
  });
});

describe('Integration: Prompt Building', () => {
  test('should build prompts for different summary types', () => {
    const { buildSummaryPrompts } = require('../../src/utils/ai/prompts');
    
    const options = {
      summaryType: 'normal',
      summaryStyle: 'teaching',
      responseTone: 'casual',
      text: 'Sample document content here.',
      mcqCount: 5,
      minWordsTarget: 100,
      maxWordsTarget: 500
    };
    
    const { systemPrompt, userPrompt } = buildSummaryPrompts(options);
    
    expect(systemPrompt).toBeTruthy();
    expect(userPrompt).toBeTruthy();
    expect(userPrompt).toContain('Sample document content');
  });

  test('should include MCQ count in mcqs style', () => {
    const { buildSummaryPrompts } = require('../../src/utils/ai/prompts');
    
    const options = {
      summaryType: 'normal',
      summaryStyle: 'mcqs',
      responseTone: 'formal',
      text: 'Content for MCQ generation.',
      mcqCount: 10
    };
    
    const { userPrompt } = buildSummaryPrompts(options);
    
    expect(userPrompt).toContain('10');
    expect(userPrompt.toLowerCase()).toContain('multiple-choice');
  });

  test('should use appropriate tone instructions', () => {
    const { getToneInstructions } = require('../../src/utils/ai/prompts');
    
    const casual = getToneInstructions('casual');
    expect(casual.style).toContain('friendly');
    
    const formal = getToneInstructions('formal');
    expect(formal.style).toContain('professional');
    
    const eli5 = getToneInstructions('eli5');
    expect(eli5.style).toContain('simple');
  });
});
