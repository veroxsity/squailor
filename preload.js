const { contextBridge, ipcRenderer } = require('electron');
const validators = require('./utils/validators');
// Local markdown and sanitization helpers (no CDN)
let markedParse = null;
let sanitizeHtml = null;
try {
  // marked v16 CommonJS default export exposes .parse
  const marked = require('marked');
  if (marked && typeof marked.setOptions === 'function' && typeof marked.parse === 'function') {
    marked.setOptions({ breaks: true, gfm: true, headerIds: true, mangle: false });
    markedParse = (md) => marked.parse(md || '');
  }
} catch (_) {}
try {
  // dompurify factory, bound to the window from renderer context
  const createDOMPurify = require('dompurify');
  if (typeof window !== 'undefined' && createDOMPurify) {
    const DOMPurify = createDOMPurify(window);
    if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
      sanitizeHtml = (html) => DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } });
    }
  }
} catch (_) {}

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  processDocuments: (filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages) => 
    ipcRenderer.invoke('process-documents', filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages),
  processDocumentsCombined: (filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages) => 
    ipcRenderer.invoke('process-documents-combined', filePaths, summaryType, apiKey, responseTone, model, summaryStyle, processImages),
  saveSummary: (fileName, summary) => 
    ipcRenderer.invoke('save-summary', fileName, summary),
  validateApiKey: (apiKey) => 
    ipcRenderer.invoke('validate-api-key', apiKey),
  // Provider-aware validation: { provider, apiKey?, config? }
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
  onProcessingProgress: (callback) => 
    ipcRenderer.on('processing-progress', (event, data) => callback(data))
  ,
  // Updater API
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', () => callback()),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, err) => callback(err)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, progress) => callback(progress)),
  onUpdateSlow: (callback) => ipcRenderer.on('update-slow', (event, detail) => callback(detail)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: (restartImmediately = true) => ipcRenderer.invoke('install-update', restartImmediately),
  manualDownloadUpdate: () => ipcRenderer.invoke('manual-download-update'),
  onManualUpdateProgress: (cb) => ipcRenderer.on('manual-update-progress', (e, d) => cb(d)),
  onManualUpdateComplete: (cb) => ipcRenderer.on('manual-update-complete', (e, d) => cb(d)),
  onManualUpdateError: (cb) => ipcRenderer.on('manual-update-error', (e, d) => cb(d)),
  onManualUpdateVerifyFailed: (cb) => ipcRenderer.on('manual-update-verify-failed', (e, d) => cb(d)),
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
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  offQaProgress: (folderId) => {
    if (!validators.isValidFolderId(folderId)) return;
    ipcRenderer.removeAllListeners(`qa-progress:${folderId}`);
  },
  // Get models for a provider
  getProviderModels: (provider) => ipcRenderer.invoke('get-provider-models', validators.sanitizeProvider(provider)),
  // Network diagnostics
  getNetworkDiagnostics: () => ipcRenderer.invoke('get-network-diagnostics'),
  clearNetworkDiagnostics: () => ipcRenderer.invoke('clear-network-diagnostics')
  ,
  // Markdown + Sanitization (local)
  parseMarkdown: (markdown) => {
    try {
      return markedParse ? markedParse(markdown) : null;
    } catch (e) {
      return null;
    }
  },
  sanitizeHtml: (html) => {
    try {
      return sanitizeHtml ? sanitizeHtml(html) : null;
    } catch (e) {
      return null;
    }
  }
});
