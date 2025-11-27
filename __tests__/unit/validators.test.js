const v = require('../../src/utils/validators');

describe('validators', () => {
  test('folder id validation', () => {
    expect(v.isValidFolderId('abcd1234')).toBe(true);
    expect(v.isValidFolderId('ABC12345')).toBe(false);
    expect(v.isValidFolderId('abc123')).toBe(false);
    expect(v.isValidFolderId('abc12345!')).toBe(false);
  });

  test('summary/tone/style sanitization', () => {
    expect(v.sanitizeSummaryType('short')).toBe('short');
    expect(v.sanitizeSummaryType('normal')).toBe('normal');
    expect(v.sanitizeSummaryType('longer')).toBe('longer');
    expect(v.sanitizeSummaryType('weird')).toBe('normal');

    expect(v.sanitizeTone('formal')).toBe('formal');
    expect(v.sanitizeTone('nope')).toBe('casual');

    expect(v.sanitizeStyle('notes')).toBe('notes');
    expect(v.sanitizeStyle('mcqs')).toBe('mcqs');
    expect(v.sanitizeStyle('bad')).toBe('teaching');
  });

  test('file path extensions', () => {
    expect(v.isAllowedFilePath('C:/abc/test.pdf')).toBe(true);
    expect(v.isAllowedFilePath('C:/abc/test.pptx')).toBe(true);
    expect(v.isAllowedFilePath('C:/abc/test.ppt')).toBe(true);
    expect(v.isAllowedFilePath('C:/abc/test.docx')).toBe(true);
    expect(v.isAllowedFilePath('C:/abc/test.doc')).toBe(true);
    expect(v.isAllowedFilePath('C:/abc/test.png')).toBe(false);
  });

  test('sanitize settings clamps and filters', () => {
    const out = v.sanitizeSettings({
      theme: 'light',
      aiProvider: 'openai',
      aiModel: 'my-model',
      processImages: 'yes',
      maxImageCount: 99,
      maxCombinedFiles: 0,
      mcqCount: 100,
      aiConfig: {
        'azure-openai': { endpoint: 'x', deployment: 'y', apiVersion: 'z', extra: 'nope' },
        'custom-openai': { baseURL: 'http://local', extra: 'nope' },
        bad: { a: 1 }
      }
    });
    expect(out.theme).toBe('light');
    expect(out.aiProvider).toBe('openai');
    expect(out.aiModel).toBe('my-model');
    expect(out.processImages).toBe(true);
    expect(out.maxImageCount).toBe(10);
    expect(out.maxCombinedFiles).toBe(1);
    expect(out.mcqCount).toBe(50);
    expect(out.aiConfig['azure-openai']).toBeDefined();
    expect(out.aiConfig['custom-openai']).toBeDefined();
    expect(out.aiConfig.bad).toBeUndefined();
  });

  test('validate process docs args happy', () => {
    const { ok, value } = v.validateProcessDocumentsArgs({
      filePaths: ['C:/tmp/x.pdf', 'C:/tmp/y.docx'],
      summaryType: 'short',
      responseTone: 'formal',
      model: 'openai/gpt-4o-mini',
      summaryStyle: 'notes',
      processImagesFlag: false
    });
    expect(ok).toBe(true);
    expect(value.summaryType).toBe('short');
    expect(value.responseTone).toBe('formal');
    expect(value.summaryStyle).toBe('notes');
    expect(value.processImages).toBe(false);
  });

  test('validate process docs args errors', () => {
    expect(v.validateProcessDocumentsArgs({ filePaths: [], summaryType: 'x' }).ok).toBe(false);
    expect(v.validateProcessDocumentsArgs({ filePaths: ['a.txt'] }).ok).toBe(false);
  });
});
