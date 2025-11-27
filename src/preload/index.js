'use strict';

const { ipcRenderer } = require('electron');
const validators = require('../utils/validators');

// Local markdown and sanitization helpers
let markedParse = null;
let DOMPurifyInstance = null;

try {
  const marked = require('marked');
  if (marked && typeof marked.parse === 'function') {
    marked.setOptions({ breaks: true, gfm: true });
    markedParse = (md) => marked.parse(md || '');
  }
} catch (err) {
  console.warn('Failed to load marked library:', err.message);
}

try {
  const createDOMPurify = require('dompurify');
  // DOMPurify will use window in renderer context
  DOMPurifyInstance = createDOMPurify(window);
} catch (err) {
  console.warn('Failed to load dompurify:', err.message);
}

/**
 * Sanitize HTML content
 */
function sanitizeHtml(html) {
  try {
    if (!html) return '';
    if (DOMPurifyInstance) {
      return DOMPurifyInstance.sanitize(html, { USE_PROFILES: { html: true } });
    }
    // Fallback: basic sanitization
    return String(html)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=/gi, 'data-removed=');
  } catch (e) {
    console.error('Sanitize error:', e);
    return '';
  }
}

// Expose API to window (works with nodeIntegration: true, contextIsolation: false)
window.electronAPI = {
  // File selection
  selectFile: () => ipcRenderer.invoke('select-file'),

  // Document processing
  processDocuments: (filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages, mcqCount) =>
    ipcRenderer.invoke('process-documents', filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages, mcqCount),
  
  processDocumentsCombined: (filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages, mcqCount) =>
    ipcRenderer.invoke('process-documents-combined', filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages, mcqCount),

  // Summary management
  saveSummary: (fileName, summary) =>
    ipcRenderer.invoke('save-summary', fileName, summary),

  // API key management (legacy)
  validateApiKey: (apiKey) =>
    ipcRenderer.invoke('validate-api-key', apiKey),
  
  validateApiKeyForProvider: (args) =>
    ipcRenderer.invoke('validate-api-key', args),
  
  saveApiKey: (apiKey) =>
    ipcRenderer.invoke('save-api-key', apiKey),
  
  loadApiKey: () =>
    ipcRenderer.invoke('load-api-key'),
  
  deleteApiKey: () =>
    ipcRenderer.invoke('delete-api-key'),

  // Provider-aware credentials management
  saveProviderCredentials: (provider, apiKey, config) =>
    ipcRenderer.invoke('save-provider-credentials', {
      provider: validators.sanitizeProvider(provider),
      apiKey,
      config: (config && typeof config === 'object') ? config : {}
    }),
  
  loadProviderCredentials: (provider) =>
    ipcRenderer.invoke('load-provider-credentials', validators.sanitizeProvider(provider)),
  
  deleteProviderCredentials: (provider) =>
    ipcRenderer.invoke('delete-provider-credentials', validators.sanitizeProvider(provider)),

  // Stored file operations
  readStoredFile: (folderId) => {
    if (!validators.isValidFolderId(folderId)) {
      return Promise.resolve({ success: false, error: 'Invalid folder id' });
    }
    return ipcRenderer.invoke('read-stored-file', folderId);
  },

  checkFileExists: (folderId) => {
    if (!validators.isValidFolderId(folderId)) {
      return Promise.resolve({ exists: false });
    }
    return ipcRenderer.invoke('check-file-exists', folderId);
  },

  deleteStoredFile: (folderId) => {
    if (!validators.isValidFolderId(folderId)) {
      return Promise.resolve({ success: false, error: 'Invalid folder id' });
    }
    return ipcRenderer.invoke('delete-stored-file', folderId);
  },

  // Storage and settings
  getStoragePaths: () =>
    ipcRenderer.invoke('get-storage-paths'),
  
  getSettings: () =>
    ipcRenderer.invoke('get-settings'),
  
  saveSettings: (settings) =>
    ipcRenderer.invoke('save-settings', settings),
  
  changeStorageLocation: (storageLocation) =>
    ipcRenderer.invoke('change-storage-location', storageLocation),
  
  getStorageStats: () =>
    ipcRenderer.invoke('get-storage-stats'),

  // Summary history
  getSummaryHistory: () =>
    ipcRenderer.invoke('get-summary-history'),

  deleteSummaryFromHistory: (folderId) => {
    if (!validators.isValidFolderId(folderId)) {
      return Promise.resolve({ success: false, error: 'Invalid folder id' });
    }
    return ipcRenderer.invoke('delete-summary-from-history', folderId);
  },

  clearSummaryHistory: () =>
    ipcRenderer.invoke('clear-summary-history'),

  // Processing progress listener
  onProcessingProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('processing-progress', listener);
    return () => ipcRenderer.removeListener('processing-progress', listener);
  },

  // Updater API
  onUpdateChecking: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('update-checking', listener);
    return () => ipcRenderer.removeListener('update-checking', listener);
  },

  onUpdateAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },

  onUpdateNotAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update-not-available', listener);
    return () => ipcRenderer.removeListener('update-not-available', listener);
  },

  onUpdateError: (callback) => {
    const listener = (_event, err) => callback(err);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },

  onUpdateProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },

  onUpdateSlow: (callback) => {
    const listener = (_event, detail) => callback(detail);
    ipcRenderer.on('update-slow', listener);
    return () => ipcRenderer.removeListener('update-slow', listener);
  },

  onUpdateDownloaded: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },

  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  installUpdate: (restartImmediately = true) => ipcRenderer.invoke('install-update', restartImmediately),
  
  manualDownloadUpdate: () => ipcRenderer.invoke('manual-download-update'),

  onManualUpdateProgress: (cb) => {
    const listener = (_e, d) => cb(d);
    ipcRenderer.on('manual-update-progress', listener);
    return () => ipcRenderer.removeListener('manual-update-progress', listener);
  },

  onManualUpdateComplete: (cb) => {
    const listener = (_e, d) => cb(d);
    ipcRenderer.on('manual-update-complete', listener);
    return () => ipcRenderer.removeListener('manual-update-complete', listener);
  },

  onManualUpdateError: (cb) => {
    const listener = (_e, d) => cb(d);
    ipcRenderer.on('manual-update-error', listener);
    return () => ipcRenderer.removeListener('manual-update-error', listener);
  },

  onManualUpdateVerifyFailed: (cb) => {
    const listener = (_e, d) => cb(d);
    ipcRenderer.on('manual-update-verify-failed', listener);
    return () => ipcRenderer.removeListener('manual-update-verify-failed', listener);
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getLatestReleaseInfo: () => ipcRenderer.invoke('get-latest-release-info'),

  // Q&A about a summary
  askSummaryQuestion: (folderId, question, apiKey, model) => {
    if (!validators.isValidFolderId(folderId)) {
      return Promise.resolve({ success: false, error: 'Invalid folder id' });
    }
    const safeQuestion = (typeof question === 'string') ? question.trim() : '';
    if (!safeQuestion) {
      return Promise.resolve({ success: false, error: 'Question is required' });
    }
    return ipcRenderer.invoke('qa-summary', { folderId, question: safeQuestion, apiKey, model });
  },

  onQaProgress: (folderId, callback) => {
    if (!validators.isValidFolderId(folderId) || typeof callback !== 'function') {
      return () => {};
    }
    const channel = `qa-progress:${folderId}`;
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  offQaProgress: (folderId) => {
    if (!validators.isValidFolderId(folderId)) return;
    ipcRenderer.removeAllListeners(`qa-progress:${folderId}`);
  },

  // Provider models
  getProviderModels: (provider) => ipcRenderer.invoke('get-provider-models', validators.sanitizeProvider(provider)),

  // Network diagnostics
  getNetworkDiagnostics: () => ipcRenderer.invoke('get-network-diagnostics'),
  clearNetworkDiagnostics: () => ipcRenderer.invoke('clear-network-diagnostics'),

  // Markdown + Sanitization (local)
  parseMarkdown: (markdown) => {
    try {
      return markedParse ? markedParse(markdown) : null;
    } catch (e) {
      console.error('Markdown parse error:', e);
      return null;
    }
  },

  sanitizeHtml: sanitizeHtml
};
