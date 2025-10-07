const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  processDocuments: (filePaths, summaryType, apiKey, responseTone, model, summaryStyle) => 
    ipcRenderer.invoke('process-documents', filePaths, summaryType, apiKey, responseTone, model, summaryStyle),
  saveSummary: (fileName, summary) => 
    ipcRenderer.invoke('save-summary', fileName, summary),
  validateApiKey: (apiKey) => 
    ipcRenderer.invoke('validate-api-key', apiKey),
  saveApiKey: (apiKey) =>
    ipcRenderer.invoke('save-api-key', apiKey),
  loadApiKey: () =>
    ipcRenderer.invoke('load-api-key'),
  deleteApiKey: () =>
    ipcRenderer.invoke('delete-api-key'),
  readStoredFile: (storedFileName) =>
    ipcRenderer.invoke('read-stored-file', storedFileName),
  checkFileExists: (storedFileName) =>
    ipcRenderer.invoke('check-file-exists', storedFileName),
  deleteStoredFile: (storedFileName) =>
    ipcRenderer.invoke('delete-stored-file', storedFileName),
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
  saveHistory: (history) =>
    ipcRenderer.invoke('save-history', history),
  addSummaryToHistory: (summaryData) =>
    ipcRenderer.invoke('add-summary-to-history', summaryData),
  deleteSummaryFromHistory: (index) =>
    ipcRenderer.invoke('delete-summary-from-history', index),
  clearSummaryHistory: () =>
    ipcRenderer.invoke('clear-summary-history'),
  onProcessingProgress: (callback) => 
    ipcRenderer.on('processing-progress', (event, data) => callback(data))
});
