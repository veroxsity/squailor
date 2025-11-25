'use strict';

// Central bootstrap for the Electron main process.
// All heavy logic has been moved into src/main/* modules; this file wires them together.

const { app, ipcMain, dialog, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Suppress cache warnings by disabling disk cache
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disk-cache-size', '0');

const validators = require('../utils/validators');

const {
  defaultSettings,
  loadSettings,
  saveSettings,
  ensureDataDirectories,
  changeStorageLocation,
  getStorageStats,
  getPaths,
} = require('./storage');

const {
  loadSummaryHistory,
  deleteSummaryFolder,
  clearAllSummaries,
  migrateOldStorage,
  resolveSummarySummary,
} = require('./documents');

const {
  attachAutoUpdaterListeners,
} = require('./updater');

const {
  createSplashWindow,
  createMainWindow,
  scheduleSplashClose,
  setupAppLifecycle,
  getMainWindow,
  getSplashWindow,
} = require('./windows');

const { logStartup } = require('./startupLog');

const {
  getNetworkDiagnosticsSnapshot,
  clearNetworkDiagnosticsStore,
} = require('./networkDiagnostics');

const {
  handleGetLatestReleaseInfo,
} = require('./updaterIpc');

const {
  processDocuments,
  processDocumentsCombined,
} = require('./processing');

const {
  validateApiKeyHandler,
  saveApiKeyHandler,
  loadApiKeyHandler,
  deleteApiKeyHandler,
  saveProviderCredentialsHandler,
  loadProviderCredentialsHandler,
  deleteProviderCredentialsHandler,
} = require('./keystore');

let answerQuestionAboutSummary;

// Safely send IPC to a BrowserWindow if it and its webContents still exist
function safeSend(win, channel, ...args) {
  try {
    if (!win) return false;
    if (win.isDestroyed && win.isDestroyed()) return false;
    const wc = win.webContents;
    if (!wc) return false;
    if (wc.isDestroyed && wc.isDestroyed()) return false;
    wc.send(channel, ...args);
    return true;
  } catch (err) {
    try { console.warn('safeSend failed', err && err.message); } catch (e) {}
    return false;
  }
}

// Run a blocking update check before startup. This is a direct lift of the previous
// main.js version, but using helpers from src/main/* where appropriate.
async function runBlockingUpdateCheck(timeoutMs = 15000) {
  try {
    const { autoUpdater } = require('electron-updater');
    const log = require('electron-log');

    if (!app.isPackaged) {
      // In development don't block
      log.info('Development mode - skipping blocking update check');
      return true;
    }

    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.autoDownload = true;

    return await new Promise((resolve) => {
      let finished = false;

      const finish = (allowStart = true) => {
        if (finished) return;
        finished = true;
        try {
          autoUpdater.removeAllListeners('update-available');
          autoUpdater.removeAllListeners('update-downloaded');
          autoUpdater.removeAllListeners('update-not-available');
          autoUpdater.removeAllListeners('error');
        } catch (e) { /* ignore */ }
        resolve(allowStart);
      };

      // If an update is available: wait for download, then install immediately only if user prefers
      autoUpdater.once('update-available', (info) => {
        log.info('Blocking flow - update available:', info.version);
        try { logStartup('update-available:' + info.version); } catch (e) {}
        safeSend(getSplashWindow(), 'update-available', info);

        autoUpdater.once('update-downloaded', async (downloadedInfo) => {
          log.info('Blocking flow - update downloaded:', downloadedInfo.version);
          try { logStartup('update-downloaded:' + downloadedInfo.version); } catch (e) {}
          safeSend(getSplashWindow(), 'update-downloaded', downloadedInfo);
          try {
            // Read user preference for applying updates immediately vs on restart
            let preferImmediate = true;
            try {
              const s = await loadSettings();
              preferImmediate = !!s.autoApplyUpdates;
            } catch (_) { /* default to immediate */ }

            if (!preferImmediate) {
              // Respect staged-apply preference: do NOT quit now; allow app to start
              // Update will install on the next app quit (autoInstallOnAppQuit)
              try { logStartup('blockingDeferredApply'); } catch (_) {}
              // Close splash shortly and continue startup
              scheduleSplashClose();
              finish(true);
              return;
            }

            // Diagnostics: tasklist for this process image
            try {
              const procName = path.basename(process.execPath);
              try { logStartup('preInstall:pid:' + process.pid); } catch (e) {}
              try { logStartup('preInstall:execPath:' + process.execPath); } catch (e) {}
              const { exec } = require('child_process');
              exec(`tasklist /FI "IMAGENAME eq ${procName}" /V`, { windowsHide: true }, (err, stdout) => {
                try {
                  if (err) {
                    try { logStartup('tasklistError:' + (err && err.message)); } catch (e) {}
                  } else {
                    try { logStartup('tasklist:' + stdout.replace(/\r?\n/g, ' || ')); } catch (e) {}
                  }
                } catch (e) { /* ignore */ }
              });
            } catch (e) { /* ignore */ }

            // Attempt to close the main window so file handles are released.
            try {
              const win = getMainWindow();
              if (win && !win.isDestroyed()) {
                try { win.destroy(); } catch (e) { /* ignore */ }
              }
            } catch (e) { /* ignore */ }

            // Give the OS a short moment to release handles then call quitAndInstall
            setTimeout(() => {
              try {
                autoUpdater.quitAndInstall(true, true);
                try { app.quit(); } catch (e) { /* ignore */ }
                setTimeout(() => {
                  try { process.exit(0); } catch (e) { /* ignore */ }
                }, 1500);
              } catch (e) {
                log.error('quitAndInstall failed in blocking flow:', e && (e.stack || e).toString());
                finish(true);
              }
            }, 250);
          } catch (e) {
            log.error('pre-install diagnostics failed in blocking flow:', e && (e.stack || e).toString());
            finish(true);
          }
        });
      });

      autoUpdater.once('update-not-available', (info) => {
        log.info('Blocking flow - update not available');
        try { logStartup('update-not-available'); } catch (e) {}
        safeSend(getSplashWindow(), 'update-not-available', info);
        scheduleSplashClose();
        finish(true);
      });

      autoUpdater.once('error', (err) => {
        log.warn('Blocking flow - update error:', err == null ? 'unknown' : (err.stack || err).toString());
        try { logStartup('update-error:' + (err && err.message)); } catch (e) {}
        safeSend(getSplashWindow(), 'update-error', { message: err && err.message });
        scheduleSplashClose();
        finish(true);
      });

      try {
        safeSend(getSplashWindow(), 'update-checking');
        try { logStartup('update-checking'); } catch (e) {}

        autoUpdater.checkForUpdates().catch(e => {
          log.error('checkForUpdates() promise rejected in blocking flow:', e && e.message);
          try { logStartup('checkForUpdatesError:' + (e && e.message)); } catch (err) {}
          finish(true);
        });
      } catch (e) {
        log.error('checkForUpdates() threw in blocking flow:', e && e.message);
        try { logStartup('checkForUpdatesThrow:' + (e && e.message)); } catch (err) {}
        finish(true);
      }

      setTimeout(() => {
        log.warn('Blocking update check timed out; proceeding with startup');
        finish(true);
      }, timeoutMs);
    });
  } catch (e) {
    try { console.warn('auto-updater unavailable in blocking check:', e && e.message); } catch (ee) {}
    return true;
  }
}

// --- App startup ---
app.whenReady().then(async () => {
  // Ensure responses include a frame-ancestors directive where possible
  // Note: frame-ancestors must be delivered via HTTP headers; meta tags are ignored.
  try {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      try {
        const url = details.url || '';
        // Only apply for network responses (http/https)
        if (!url.startsWith('http')) return callback({ responseHeaders: details.responseHeaders });

        const headers = Object.assign({}, details.responseHeaders || {});
        // Find existing CSP header (case-insensitive)
        const cspKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-security-policy');
        const existing = cspKey ? (Array.isArray(headers[cspKey]) ? headers[cspKey][0] : headers[cspKey]) : '';

        // If frame-ancestors directive missing, append a restrictive rule (deny embedding)
        if (!/frame-ancestors/i.test(existing)) {
          const newCsp = (existing ? existing + '; ' : '') + "frame-ancestors 'none'";
          headers['Content-Security-Policy'] = [newCsp];
        }

        callback({ responseHeaders: headers });
      } catch (e) {
        callback({ responseHeaders: details.responseHeaders });
      }
    });
  } catch (e) {
    // Ignore - webRequest might not be available in all contexts
  }
  // Show splash quickly so user gets feedback during potentially long startup
  createSplashWindow();

  // Record runtime info immediately to help diagnose updater behavior
  try {
    try { await logStartup('appVersion:' + app.getVersion()); } catch (e) {}
    try { await logStartup('execPath:' + process.execPath); } catch (e) {}
    try { await logStartup('cwd:' + process.cwd()); } catch (e) {}
    try { await logStartup('argv:' + process.argv.join(' ')); } catch (e) {}
  } catch (e) {
    console.warn('failed to write runtime startup logs', e && e.message);
  }

  const initStart = Date.now();
  await loadSettings();
  await ensureDataDirectories();
  await migrateOldStorage();
  const initEnd = Date.now();
  console.log(`Initialization finished in ${initEnd - initStart} ms`);
  logStartup(`initEnd:${initEnd}:${initEnd - initStart}`);

  try {
    await logStartup('blockingCheckStart');
    const allowStart = await runBlockingUpdateCheck(15000);
    await logStartup(`blockingCheckEnd:${allowStart}`);
    if (!allowStart) {
      return;
    }
  } catch (e) {
    try { logStartup('blockingCheckException:' + (e && e.message)); } catch (err) {}
    try {
      const electronLog = require('electron-log');
      electronLog.error('Error during blocking update check:', e && e.message);
    } catch (_) {
      console.warn('Error during blocking update check (fallback):', e && e.message);
    }
  }

  createMainWindow();
  setupAppLifecycle();

  // Auto-updater configuration (non-blocking once app is up)
  try {
    const { autoUpdater } = require('electron-updater');
    const log = require('electron-log');

    if (app.isPackaged) {
      autoUpdater.logger = log;
      autoUpdater.logger.transports.file.level = 'info';
      autoUpdater.autoDownload = true;
      try { autoUpdater.autoInstallOnAppQuit = true; } catch (_) {}

      try {
        const s = await loadSettings();
        if (s.updateProvider === 'generic' && s.updateGenericUrl && /^https?:\/\//i.test(s.updateGenericUrl)) {
          const base = String(s.updateGenericUrl).replace(/\/+$/, '');
          autoUpdater.setFeedURL({ provider: 'generic', url: base });
          try { logStartup('phase:feed-configured:generic:' + base); } catch(_){}
        } else {
          try { logStartup('phase:feed-configured:github'); } catch(_){}
        }
      } catch (_) { /* ignore feed config errors */ }

      attachAutoUpdaterListeners(autoUpdater, log);

      try {
        const dns = require('dns');
        dns.resolve('github.com', (err) => {
          try { logStartup('dnsCheck:' + (err ? ('fail:' + err.code) : 'ok')); } catch (_) {}
        });
      } catch (_) {}

      setTimeout(() => scheduleSplashClose(), 20000);
    }
  } catch (e) {
    console.warn('auto-updater not available in this environment', e && e.message);
  }
});

// --- IPC wiring ---

// Handle file selection
ipcMain.handle('select-file', async () => {
  const mainWindow = getMainWindow();
  const result = await dialog.showOpenDialog(mainWindow || BrowserWindow.getFocusedWindow(), {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'pptx', 'ppt', 'docx', 'doc'] },
      { name: 'Word Documents', extensions: ['docx', 'doc'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'PowerPoint Files', extensions: ['pptx', 'ppt'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths;
});

// Process documents
ipcMain.handle('process-documents', async (event, filePaths, summaryType, apiKey, responseTone = 'casual', model = 'openai/gpt-4o-mini', summaryStyle = 'teaching', processImagesFlag = undefined) => {
  return processDocuments({
    event,
    filePaths,
    summaryType,
    apiKey,
    responseTone,
    model,
    summaryStyle,
    processImagesFlag,
    loadSettings,
  });
});

// Combined summaries
ipcMain.handle('process-documents-combined', async (event, filePaths, summaryType, apiKey, responseTone = 'casual', model = 'openai/gpt-4o-mini', summaryStyle = 'teaching', processImagesFlag = undefined) => {
  return processDocumentsCombined({
    event,
    filePaths,
    summaryType,
    apiKey,
    responseTone,
    model,
    summaryStyle,
    processImagesFlag,
    loadSettings,
  });
});

// Save summary to file
ipcMain.handle('save-summary', async (event, fileName, summary) => {
  const v = validators.validateSaveSummaryArgs({ fileName, summary });
  if (!v.ok) return { success: false, error: v.error };
  const mainWindow = getMainWindow();
  const result = await dialog.showSaveDialog(mainWindow || BrowserWindow.getFocusedWindow(), {
    defaultPath: `${fileName}_summary.txt`,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return { success: false };
  }

  try {
    await fs.writeFile(result.filePath, summary, 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Keystore / provider credentials IPC
ipcMain.handle('validate-api-key', (event, arg) => validateApiKeyHandler(arg));
ipcMain.handle('save-api-key', (event, apiKey) => saveApiKeyHandler(apiKey));
ipcMain.handle('load-api-key', () => loadApiKeyHandler());
ipcMain.handle('delete-api-key', () => deleteApiKeyHandler());
ipcMain.handle('save-provider-credentials', (event, payload) => saveProviderCredentialsHandler(payload));
ipcMain.handle('load-provider-credentials', (event, provider) => loadProviderCredentialsHandler(provider));
ipcMain.handle('delete-provider-credentials', (event, provider) => deleteProviderCredentialsHandler(provider));

// Read file for preview - now reads from folder
ipcMain.handle('read-stored-file', async (event, folderId) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { success: false, error: 'Invalid folder id' };
    const { documentsStoragePath } = getPaths();
    const folderPath = path.join(documentsStoragePath, folderId);

    const summaryPath = path.join(folderPath, 'summary.json');
    const summaryData = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    const filePath = path.join(folderPath, summaryData.fileName);

    const officeExts = new Set(['.pptx', '.ppt', '.docx', '.doc']);
    if (officeExts.has(path.extname(summaryData.fileName).toLowerCase())) {
      try {
        const converter = require('../utils/convertToPdf');
        const res = await converter.convertToPdfIfNeeded(folderPath, summaryData.fileName);
        if (res && res.success) {
          return { success: true, data: res.data, mimeType: res.mimeType || 'application/pdf', fileName: summaryData.fileName };
        }
      } catch (err) {
        console.warn('convertToPdf failed:', err && err.message);
      }
    }

    const dataBuffer = await fs.readFile(filePath);

    return {
      success: true,
      data: dataBuffer.toString('base64'),
      mimeType: getMimeType(summaryData.fileName),
      fileName: summaryData.fileName
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-file-exists', async (event, folderId) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { exists: false };
    const { documentsStoragePath } = getPaths();
    const folderPath = path.join(documentsStoragePath, folderId);
    await fs.access(folderPath);
    const summaryPath = path.join(folderPath, 'summary.json');
    await fs.access(summaryPath);
    return { exists: true };
  } catch (error) {
    return { exists: false };
  }
});

ipcMain.handle('delete-stored-file', async (event, folderId) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { success: false, error: 'Invalid folder id' };
    const { documentsStoragePath } = getPaths();
    const folderPath = path.join(documentsStoragePath, folderId);
    await fs.rm(folderPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Storage-related IPC
ipcMain.handle('get-storage-paths', async () => {
  try {
    const settings = await loadSettings();
    const paths = getPaths();
    return {
      success: true,
      appdataFull: paths.defaultDataPath,
      localAppFull: paths.localAppDataPath,
      settings,
    };
  } catch (error) {
    const paths = getPaths();
    return {
      success: true,
      appdataFull: paths.defaultDataPath,
      localAppFull: paths.localAppDataPath,
      settings: { ...defaultSettings },
    };
  }
});

ipcMain.handle('get-settings', async () => {
  try {
    const settings = await loadSettings();
    return settings;
  } catch (_) {
    return { ...defaultSettings };
  }
});

ipcMain.handle('save-settings', async (event, partial) => {
  try {
    const current = await loadSettings();
    const sanitized = validators.sanitizeSettings(partial || {});
    const next = { ...current, ...sanitized };
    await saveSettings(next);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('change-storage-location', async (event, storageLocation) => {
  try {
    return await changeStorageLocation(storageLocation);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', async () => {
  try { return app.getVersion(); } catch (_) { return '0.0.0'; }
});

ipcMain.handle('get-storage-stats', async () => {
  try {
    const stats = await getStorageStats();
    if (!stats.success) {
      return { success: true, fileCount: 0, totalSize: 0, totalSizeMB: '0.00' };
    }
    return {
      success: true,
      fileCount: stats.fileCount,
      totalSize: stats.totalSizeMB * 1024 * 1024,
      totalSizeMB: stats.totalSizeMB.toFixed ? stats.totalSizeMB.toFixed(2) : stats.totalSizeMB,
    };
  } catch (error) {
    return {
      success: true,
      fileCount: 0,
      totalSize: 0,
      totalSizeMB: '0.00',
    };
  }
});

ipcMain.handle('get-summary-history', async () => {
  try {
    const history = await loadSummaryHistory();
    return { success: true, history };
  } catch (error) {
    return { success: false, error: error.message, history: [] };
  }
});

ipcMain.handle('delete-summary-from-history', async (event, folderId) => {
  try {
    if (!validators.isValidFolderId(folderId)) {
      return { success: false, error: 'Invalid folder id' };
    }
    await deleteSummaryFolder(folderId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-summary-history', async () => {
  try {
    await clearAllSummaries();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Updater-related IPC that returns metadata only
ipcMain.handle('get-latest-release-info', () => handleGetLatestReleaseInfo());

// Q&A: answer a question about a stored summary (by folderId)
ipcMain.handle('qa-summary', async (event, { folderId, question, apiKey, model }) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { success: false, error: 'Invalid folder id' };
    if (typeof question !== 'string' || !question.trim()) {
      return { success: false, error: 'Question is required' };
    }
    if (!answerQuestionAboutSummary) {
      const ai = require('../utils/aiSummarizer');
      answerQuestionAboutSummary = ai.answerQuestionAboutSummary;
    }

    const data = await resolveSummarySummary(folderId);
    const summary = data.summary || '';
    if (!summary) {
      return { success: false, error: 'Summary not found for this item.' };
    }

    const settings = await loadSettings();
    const provider = (settings && settings.aiProvider) ? settings.aiProvider : 'openrouter';
    const providerConfig = (settings && settings.aiConfig && settings.aiConfig[provider]) ? settings.aiConfig[provider] : {};

    const channel = `qa-progress:${folderId}`;
    const mainWindow = getMainWindow();
    const answer = await answerQuestionAboutSummary(
      summary,
      question,
      {
        apiKey,
        provider,
        model,
        onProgress: (progress) => { try { safeSend(mainWindow, channel, progress); } catch (_) {} },
        baseURL: providerConfig.baseURL,
        endpoint: providerConfig.endpoint,
        deployment: providerConfig.deployment,
        apiVersion: providerConfig.apiVersion,
      }
    );

    return { success: true, answer };
  } catch (error) {
    let errorType = 'error';
    let displayMessage = error.message;
    if (error.message && error.message.startsWith('RATE_LIMIT:')) { errorType = 'rate-limit'; displayMessage = error.message.replace('RATE_LIMIT: ', ''); }
    else if (error.message && error.message.startsWith('QUOTA_EXCEEDED:')) { errorType = 'quota'; displayMessage = error.message.replace('QUOTA_EXCEEDED: ', ''); }
    else if (error.message && error.message.startsWith('INVALID_API_KEY:')) { errorType = 'api-key'; displayMessage = error.message.replace('INVALID_API_KEY: ', ''); }
    return { success: false, error: displayMessage, errorType };
  }
});

// Get available models for a provider (loaded from assets/models.json)
ipcMain.handle('get-provider-models', async (event, provider) => {
  try {
    if (!validators.isValidProvider(provider)) provider = 'openrouter';
    const modelsPath = path.join(__dirname, '..', '..', 'assets', 'models.json');
    let models = [];
    try {
      const json = await fs.readFile(modelsPath, 'utf8');
      const table = JSON.parse(json);
      models = (table && table[provider]) || [];
    } catch (_) {
      models = [];
    }
    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message, models: [] };
  }
});

// Network diagnostics IPC
ipcMain.handle('get-network-diagnostics', async () => {
  try {
    const snapshot = getNetworkDiagnosticsSnapshot();
    return {
      success: true,
      totals: snapshot.totals,
      suspiciousHosts: snapshot.hostSummaries,
      recentEvents: snapshot.events,
    };
  } catch (e) {
    return { success: false, error: e && e.message };
  }
});

ipcMain.handle('clear-network-diagnostics', async () => {
  try {
    clearNetworkDiagnosticsStore();
    return { success: true };
  } catch (e) {
    return { success: false, error: e && e.message };
  }
});
