const { app, BrowserWindow, ipcMain, dialog, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const validators = require('./utils/validators');
// Lazy-loaded heavy modules (required on demand to speed up app startup)
let pdfParse;
let parsePresentation;
let extractSlideImages;
let parseDocx;
let extractDocxImages;
let summarizeText;
let modelSupportsVision;
let answerQuestionAboutSummary;
let encrypt;
let decrypt;
let validateEncryption;
let calculateFileHash;
let extractPdfImages;

// Updater resilience helpers
let autoUpdaterListenersAttached = false;
// Track timing for enhanced download progress metrics
let updateDownloadStartTs = null;
let lastProgressTs = null;
let updateSlowEmitted = false;
let slowWatchInterval = null;
const UPDATE_SLOW_THRESHOLD_MS = 20000; // configurable threshold
function startUpdateSlowWatch(autoUpdater) {
  try {
    if (slowWatchInterval) clearInterval(slowWatchInterval);
    updateSlowEmitted = false;
    slowWatchInterval = setInterval(() => {
      try {
        if (updateSlowEmitted) return;
        // If we haven't started downloading yet skip
        if (!updateDownloadStartTs) return;
        // If update already downloaded stop
        // We'll rely on update-downloaded event to clear interval; still guard
        const now = Date.now();
        const sinceLastProgress = lastProgressTs ? (now - lastProgressTs) : (now - updateDownloadStartTs);
        if (sinceLastProgress >= UPDATE_SLOW_THRESHOLD_MS) {
          updateSlowEmitted = true;
          try { logStartup('update-slow:' + sinceLastProgress); } catch (_) {}
          safeSend(mainWindow, 'update-slow', { stalledMs: sinceLastProgress, thresholdMs: UPDATE_SLOW_THRESHOLD_MS });
          safeSend(splashWindow, 'update-slow', { stalledMs: sinceLastProgress, thresholdMs: UPDATE_SLOW_THRESHOLD_MS });
        }
      } catch (_) { /* ignore */ }
    }, 2500);
  } catch (_) { /* ignore */ }
}
function clearUpdateSlowWatch() {
  try { if (slowWatchInterval) clearInterval(slowWatchInterval); } catch (_) {}
  slowWatchInterval = null;
}
function formatEta(seconds) {
  if (seconds == null || !isFinite(seconds)) return '∞';
  if (seconds < 1) return '<1s';
  if (seconds < 60) return Math.round(seconds) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m + 'm ' + (s < 10 ? ('0' + s) : s) + 's';
}
function scheduleSplashClose(minDelay = MIN_SPLASH_TIME) {
  try {
    if (!splashWindow || splashWindow.isDestroyed && splashWindow.isDestroyed()) return;
    const elapsed = Date.now() - splashShownAt;
    const delay = Math.max(0, minDelay - elapsed);
    setTimeout(() => {
      try {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
      } catch (_) {}
    }, delay);
  } catch (_) {}
}

function attachAutoUpdaterListeners(autoUpdater, log) {
  if (autoUpdaterListenersAttached) return;
  autoUpdaterListenersAttached = true;
  try { logStartup('autoUpdaterListenersAttached'); } catch (_) {}

  autoUpdater.on('checking-for-update', () => {
    safeSend(mainWindow, 'update-checking');
    safeSend(splashWindow, 'update-checking');
  });
  autoUpdater.on('update-available', (info) => {
    safeSend(mainWindow, 'update-available', info);
    safeSend(splashWindow, 'update-available', info);
    try { logStartup('update-available-event:' + info.version); } catch (_) {}
    startUpdateSlowWatch(autoUpdater);
  });
  autoUpdater.on('update-not-available', (info) => {
    safeSend(mainWindow, 'update-not-available', info);
    safeSend(splashWindow, 'update-not-available', info);
    // Ensure splash goes away promptly if no update
    scheduleSplashClose();
    clearUpdateSlowWatch();
  });
  autoUpdater.on('error', (err) => {
    safeSend(mainWindow, 'update-error', { message: err && err.message });
    safeSend(splashWindow, 'update-error', { message: err && err.message });
    scheduleSplashClose();
    clearUpdateSlowWatch();
  });
  autoUpdater.on('download-progress', (progress) => {
    try {
      const now = Date.now();
      if (!updateDownloadStartTs) updateDownloadStartTs = now;
      const elapsedMs = now - updateDownloadStartTs;
      const elapsedSec = elapsedMs / 1000;
      // electron-updater provides bytesPerSecond, percent, transferred, total
      const bytesPerSecond = progress.bytesPerSecond || (elapsedSec > 0 ? (progress.transferred / elapsedSec) : 0);
      const remainingBytes = (progress.total || 0) - (progress.transferred || 0);
      const etaSec = bytesPerSecond > 0 ? (remainingBytes / bytesPerSecond) : null;
      const transferredMB = (progress.transferred || 0) / (1024 * 1024);
      const totalMB = (progress.total || 0) / (1024 * 1024);
      const speedMBps = bytesPerSecond / (1024 * 1024);
      const detail = {
        ...progress,
        elapsedSeconds: elapsedSec,
        speedBytesPerSecond: Math.round(bytesPerSecond),
        speedMBps: Number(speedMBps.toFixed(2)),
        transferredMB: Number(transferredMB.toFixed(2)),
        totalMB: Number(totalMB.toFixed(2)),
        etaSeconds: etaSec == null ? null : Number(etaSec.toFixed(1)),
        etaHuman: formatEta(etaSec),
        phase: 'downloading'
      };
      lastProgressTs = now;
      safeSend(mainWindow, 'update-progress', detail); // backward-compatible channel augmented with detail
      safeSend(splashWindow, 'update-progress', detail);
    } catch (e) {
      // Fallback: send original progress if enhancement fails
      safeSend(mainWindow, 'update-progress', progress);
      safeSend(splashWindow, 'update-progress', progress);
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    safeSend(mainWindow, 'update-downloaded', info);
    safeSend(splashWindow, 'update-downloaded', info);
    clearUpdateSlowWatch();
  });
}

let mainWindow;
let splashWindow;
const appStartTime = Date.now();
let splashShownAt = 0;
const MIN_SPLASH_TIME = 1500; // ms - minimum time to show splash to avoid blinking

// Append debug startup timestamps to a log file in userData for packaged apps
async function logStartup(message) {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, 'startup.log');
    const entry = `${new Date().toISOString()} ${message}\n`;
    await fs.mkdir(logDir, { recursive: true }).catch(() => {});
    await fs.appendFile(logPath, entry, 'utf8');
  } catch (err) {
    // Don't crash if logging fails
    try { console.error('startup log failed', err.message); } catch (e) { }
  }
}

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

// Run a blocking update check before startup. This function is defined at top-level
// so it can be awaited during initialization before main window creation.
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

      // If an update is available: wait for download then install immediately
      autoUpdater.once('update-available', (info) => {
        log.info('Blocking flow - update available:', info.version);
        try { logStartup('update-available:' + info.version); } catch (e) {}
        safeSend(splashWindow, 'update-available', info);

        autoUpdater.once('update-downloaded', (downloadedInfo) => {
          log.info('Blocking flow - update downloaded:', downloadedInfo.version);
          try { logStartup('update-downloaded:' + downloadedInfo.version); } catch (e) {}
          safeSend(splashWindow, 'update-downloaded', downloadedInfo);
          try {
            // Write diagnostics: current process info and running processes to help debug "cannot be closed" installer dialogs
            try {
              const procName = path.basename(process.execPath);
              try { logStartup('preInstall:pid:' + process.pid); } catch (e) {}
              try { logStartup('preInstall:execPath:' + process.execPath); } catch (e) {}
              // Capture tasklist output for Windows to see which processes are running with this image name
              const { exec } = require('child_process');
              exec(`tasklist /FI "IMAGENAME eq ${procName}" /V`, { windowsHide: true }, (err, stdout, stderr) => {
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
            // Keep the splashWindow visible to show update progress until the process exits.
            try {
              if (mainWindow && !mainWindow.isDestroyed()) {
                try { mainWindow.destroy(); } catch (e) { /* ignore */ }
              }
            } catch (e) { /* ignore */ }

            // Give the OS a short moment to release handles then call quitAndInstall
            setTimeout(() => {
              try {
                autoUpdater.quitAndInstall(true, true);
                // Ensure the app actually exits: request quit and force exit as a fallback
                try {
                  app.quit();
                } catch (e) { /* ignore */ }
                setTimeout(() => {
                  try {
                    // If still running, force immediate exit to release handles for installer
                    process.exit(0);
                  } catch (e) { /* ignore */ }
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
        safeSend(splashWindow, 'update-not-available', info);
        // Schedule splash close and allow app start
        scheduleSplashClose();
        finish(true);
      });

      autoUpdater.once('error', (err) => {
        log.warn('Blocking flow - update error:', err == null ? 'unknown' : (err.stack || err).toString());
        try { logStartup('update-error:' + (err && err.message)); } catch (e) {}
        safeSend(splashWindow, 'update-error', { message: err && err.message });
        scheduleSplashClose();
        finish(true);
      });

      try {
        // Notify splash that we're checking
        safeSend(splashWindow, 'update-checking');
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

// Default storage paths with new structure
const defaultUserDataPath = app.getPath('userData');
const defaultDataPath = path.join(defaultUserDataPath, 'data');
const defaultDocumentsStoragePath = path.join(defaultDataPath, 'documents');
const defaultSettingsPath = path.join(defaultDataPath, 'settings.json');
const defaultKeystorePath = path.join(defaultDataPath, 'keystore.enc');

// For portable mode, use directory where executable is located, not app.getAppPath()
// app.getAppPath() returns the resources folder inside .asar which is read-only
// We need the actual executable directory for portable mode
const getExecutableDir = () => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  // In development, use app.getAppPath()
  if (!app.isPackaged) {
    return app.getAppPath();
  }
  // In production, use the directory containing the executable
  return path.dirname(app.getPath('exe'));
};

const appDirectory = getExecutableDir();
const localAppDataPath = path.join(appDirectory, 'data');
const localAppDocumentsPath = path.join(localAppDataPath, 'documents');
const localAppSettingsPath = path.join(localAppDataPath, 'settings.json');
const localAppKeystorePath = path.join(localAppDataPath, 'keystore.enc');

// Current storage paths (loaded from settings)
let dataPath = defaultDataPath;
let documentsStoragePath = defaultDocumentsStoragePath;
let settingsPath = defaultSettingsPath;
let keystorePath = defaultKeystorePath;

// Default settings structure
const defaultSettings = {
  storageLocation: 'appdata',
  dataPath: defaultDataPath,
  theme: 'dark',
  // Phase 1: multi-provider defaults
  aiProvider: 'openrouter',
  aiModel: 'openai/gpt-4o-mini',  // Updated to OpenRouter format
  aiConfig: {
    'openai': {},
    'azure-openai': { endpoint: '', deployment: '', apiVersion: '2024-08-01-preview' },
    'anthropic': {},
    'google': {},
    'mistral': {},
    'groq': {},
    'cohere': {},
    'xai': {},
    'openrouter': {},
    'custom-openai': { baseURL: '' }
  },
  version: '1.0.0',
  // Max number of images to OCR per document (user configurable)
  maxImageCount: 3,
  // Whether to include images (OCR/vision) in processing
  processImages: true,
  // Max number of files to combine into a single summary (user configurable)
  maxCombinedFiles: 3,
  // Whether to auto-apply downloaded updates (silent install)
  autoApplyUpdates: true
};

// Auto-detect storage location based on where data folder exists
async function detectStorageLocation() {
  // Check if data folder exists in local app directory
  try {
    await fs.access(localAppDataPath);
    await fs.access(path.join(localAppDataPath, 'documents'));
    // Local app data exists
    return {
      location: 'local-app',
      dataPath: localAppDataPath
    };
  } catch (error) {
    // Local app doesn't exist or is not accessible
  }
  
  // Check if data folder exists in appdata
  try {
    await fs.access(defaultDataPath);
    await fs.access(path.join(defaultDataPath, 'documents'));
    // AppData exists
    return {
      location: 'appdata',
      dataPath: defaultDataPath
    };
  } catch (error) {
    // AppData doesn't exist
  }
  
  // Default to appdata if nothing exists
  return {
    location: 'appdata',
    dataPath: defaultDataPath
  };
}

// Load settings from JSON file
async function loadSettings() {
  try {
    // Auto-detect storage location
    const detected = await detectStorageLocation();
    
    // Try to load settings from detected location
    const detectedSettingsPath = path.join(detected.dataPath, 'settings.json');
    
    try {
      const settingsData = await fs.readFile(detectedSettingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      
      // Update current paths based on detected location
      dataPath = detected.dataPath;
      documentsStoragePath = path.join(dataPath, 'documents');
      settingsPath = path.join(dataPath, 'settings.json');
      keystorePath = path.join(dataPath, 'keystore.enc');
      
      // Ensure required new fields exist (Phase 1 multi-provider)
      if (!settings.aiProvider) settings.aiProvider = 'openrouter';
      if (!settings.aiConfig || typeof settings.aiConfig !== 'object') {
        settings.aiConfig = JSON.parse(JSON.stringify(defaultSettings.aiConfig));
      } else {
        const defaults = defaultSettings.aiConfig;
        for (const key of Object.keys(defaults)) {
          if (!(key in settings.aiConfig)) settings.aiConfig[key] = defaults[key];
        }
      }

      // Ensure storageLocation is set correctly
      settings.storageLocation = detected.location;
      settings.dataPath = detected.dataPath;
      
      return settings;
    } catch (error) {
      // Settings file doesn't exist, create default with detected location
      dataPath = detected.dataPath;
      documentsStoragePath = path.join(dataPath, 'documents');
      settingsPath = path.join(dataPath, 'settings.json');
      keystorePath = path.join(dataPath, 'keystore.enc');
      
      return {
        ...defaultSettings,
        storageLocation: detected.location,
        dataPath: detected.dataPath
      };
    }
  } catch (error) {
    // Fallback to defaults
    return { ...defaultSettings };
  }
}

// Save settings to JSON file
async function saveSettings(settings) {
  try {
    await fs.mkdir(dataPath, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
}

// -------------------------
// Keystore helpers (Phase 1 multi-provider)
// -------------------------

async function ensureEncryptionLoaded() {
  if (!validateEncryption || !encrypt || !decrypt) {
    const enc = require('./utils/encryption');
    encrypt = enc.encrypt;
    decrypt = enc.decrypt;
    validateEncryption = enc.validateEncryption;
  }
}

// Read encrypted keystore and return a provider->secret map; migrates legacy string format.
async function readKeystoreMap() {
  await ensureEncryptionLoaded();
  // Check file existence
  try {
    await fs.access(keystorePath);
  } catch (_) {
    return { map: {}, migrated: false, legacy: false };
  }
  try {
    const encrypted = await fs.readFile(keystorePath, 'utf8');
    if (!encrypted) return { map: {}, migrated: false, legacy: false };
    const plain = decrypt(encrypted);
    if (plain == null) return { map: {}, migrated: false, legacy: false };
    // Try parse JSON map
    try {
      const parsed = JSON.parse(plain);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { map: parsed, migrated: false, legacy: false };
      }
    } catch (_) {
      // fallthrough to legacy
    }
    // Legacy: plain is the key string → map to openrouter
    return { map: { openrouter: { apiKey: plain } }, migrated: true, legacy: true };
  } catch (error) {
    console.error('Failed to read keystore:', error && error.message);
    return { map: {}, migrated: false, legacy: false };
  }
}

async function writeKeystoreMap(map) {
  await ensureEncryptionLoaded();
  try {
    await fs.mkdir(dataPath, { recursive: true });
    const json = JSON.stringify(map);
    const encStr = encrypt(json);
    await fs.writeFile(keystorePath, encStr, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write keystore:', error && error.message);
    return { success: false, error: error.message };
  }
}

async function getCurrentProvider() {
  try {
    const s = await loadSettings();
    return s.aiProvider || 'openrouter';
  } catch (_) {
    return 'openrouter';
  }
}

// Ensure all data directories exist
async function ensureDataDirectories(customPath = null) {
  try {
    const targetDataPath = customPath || dataPath;
    const targetDocsPath = path.join(targetDataPath, 'documents');
    
    await fs.mkdir(targetDataPath, { recursive: true });
    await fs.mkdir(targetDocsPath, { recursive: true });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to create data directories:', error);
    return { success: false, error: error.message };
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    center: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // No menu for splash
  Menu.setApplicationMenu(null);

  splashWindow.loadFile('splash.html');

  // Record when splash finished loading (painted)
  splashWindow.webContents.once('did-finish-load', () => {
    // Give the renderer a quick moment to paint
    setTimeout(() => {
      try { splashShownAt = Date.now(); } catch (e) { splashShownAt = Date.now(); }
      logStartup(`splashShown:${splashShownAt}`);
    }, 30);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false, // create hidden and show when ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Remove the default menu bar
  Menu.setApplicationMenu(null);

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Network telemetry assertion: Monitor outbound requests and record non-allowlisted hosts
  try {
    const allowedHostPatterns = [
      'localhost',
      '127.0.0.1',
      'openai',
      'anthropic',
      'openrouter',
      'googleapis',
      'cohere',
      'groq',
      'mistral',
      'x.ai',
      'azure',
      'github.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'jsdelivr.net'
    ];
    if (!global.__suspiciousRequests) {
      global.__suspiciousRequests = new Set();
    }
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      try {
        const url = details.url || '';
        if (url.startsWith('http')) {
          const host = new URL(url).host.toLowerCase();
          const allowed = allowedHostPatterns.some(p => host.includes(p));
          if (!allowed) {
            global.__suspiciousRequests.add(host);
          }
        }
      } catch (_) { /* ignore parse errors */ }
      callback({ cancel: false });
    });
  } catch (e) { /* ignore telemetry setup errors */ }

  // When the renderer signals it's ready to show, close splash and show main
  mainWindow.once('ready-to-show', () => {
    const readyTime = Date.now();
    console.log(`Main window ready-to-show (startup ${(readyTime - appStartTime)} ms)`);
    // Log main window ready time for packaged diagnostics
    logStartup(`mainReady:${readyTime}:${readyTime - appStartTime}`);
    const now = Date.now();
    const shownDelta = splashShownAt ? (now - splashShownAt) : Infinity;

    const finish = () => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        try { splashWindow.close(); } catch (e) { /* ignore */ }
      }
      // Log when main is shown
      logStartup(`mainShown:${Date.now()}`);
      mainWindow.show();
    };

    if (!splashShownAt) {
      // If splash hasn't finished loading, wait a short time but force show after MIN_SPLASH_TIME
      const timeout = Math.max(100, MIN_SPLASH_TIME);
      setTimeout(() => finish(), timeout);
    } else if (shownDelta < MIN_SPLASH_TIME) {
      setTimeout(() => finish(), MIN_SPLASH_TIME - shownDelta);
    } else {
      finish();
    }
  });

  // Fallback: if main hasn't emitted ready-to-show in 30s, force show
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('Main window did not become ready in 30s; showing anyway');
      if (splashWindow && !splashWindow.isDestroyed()) {
        try { splashWindow.close(); } catch (e) { /* ignore */ }
      }
      mainWindow.show();
    }
  }, 30000);
}

app.whenReady().then(async () => {
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

  // Perform initialization while splash is visible
  const initStart = Date.now();
  await loadSettings();
  await ensureDataDirectories();
  // Migrate old storage format if needed
  await migrateOldStorage();
  const initEnd = Date.now();
  console.log(`Initialization finished in ${initEnd - initStart} ms`);
  // Log initialization end for packaged diagnostics
  logStartup(`initEnd:${initEnd}:${initEnd - initStart}`);

  // Create main window (hidden) and let it show when ready
  // Before creating main window, run the blocking update check to avoid files-in-use during install
  try {
    await logStartup('blockingCheckStart');
    const allowStart = await runBlockingUpdateCheck(15000);
    await logStartup(`blockingCheckEnd:${allowStart}`);
    if (!allowStart) {
      // If allowStart is false, the app will be quitting to install an update. Stop initialization.
      return;
    }
  } catch (e) {
    try { logStartup('blockingCheckException:' + (e && e.message)); } catch (err) {}
    // 'log' may not be defined in this scope if electron-log was not initialized; fall back safely
    try {
      const electronLog = require('electron-log');
      electronLog.error('Error during blocking update check:', e && e.message);
    } catch (_) {
      console.warn('Error during blocking update check (fallback):', e && e.message);
    }
  }

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
  
  // -------------------------
  // Auto-updater (GitHub Releases)
  // -------------------------
  try {
    const { autoUpdater } = require('electron-updater');
    const log = require('electron-log');

    if (app.isPackaged) {
      autoUpdater.logger = log;
      autoUpdater.logger.transports.file.level = 'info';
      autoUpdater.autoDownload = true; // set to false if you prefer manual download

      // Attach resilient listeners once
      attachAutoUpdaterListeners(autoUpdater, log);

      // Network reachability diagnostic (non-blocking)
      try {
        const dns = require('dns');
        dns.resolve('github.com', (err) => {
          try { logStartup('dnsCheck:' + (err ? ('fail:' + err.code) : 'ok')); } catch (_) {}
        });
      } catch (_) {}

      // If no update events change splash after 20s, ensure splash closes
      setTimeout(() => scheduleSplashClose(), 20000);
    }
  } catch (e) {
    console.warn('auto-updater not available in this environment', e && e.message);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle file selection
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
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
  // Basic arg validation and safe defaults
  const v = validators.validateProcessDocumentsArgs({ filePaths, summaryType, responseTone, model, summaryStyle, processImagesFlag });
  if (!v.ok) {
    return [{ success: false, fileName: '(input)', error: v.error, errorType: 'error' }];
  }
  ({ summaryType, responseTone, model, summaryStyle } = v.value);
  const results = [];
  const totalFiles = filePaths.length;

  // Load user settings for image limits
  const userSettings = await loadSettings();
  const maxImages = Number(userSettings.maxImageCount) || 3;
  const processImages = typeof v.value.processImages === 'boolean' ? v.value.processImages : (typeof userSettings.processImages === 'boolean' ? userSettings.processImages : true);
  const provider = (userSettings && userSettings.aiProvider) ? userSettings.aiProvider : 'openrouter';
  const providerConfig = (userSettings && userSettings.aiConfig && userSettings.aiConfig[provider]) ? userSettings.aiConfig[provider] : {};
  // Lazy-load heavy modules to avoid increasing startup time
  if (!calculateFileHash) {
    calculateFileHash = require('./utils/fileHash').calculateFileHash;
  }
  if (!pdfParse) {
    pdfParse = require('pdf-parse-fork');
  }
  if (!parsePresentation) {
    const ppt = require('./utils/pptxParser');
    parsePresentation = ppt.parsePresentation;
    extractSlideImages = ppt.extractSlideImages;
  }
  if (!summarizeText) {
    const ai = require('./utils/aiSummarizer');
    summarizeText = ai.summarizeText;
    modelSupportsVision = ai.modelSupportsVision;
    answerQuestionAboutSummary = ai.answerQuestionAboutSummary;
  }

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
  const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Send initial progress
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Starting...',
        stage: 'init'
      });
      
      // Calculate file hash for duplicate detection
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Checking for duplicates...',
        stage: 'duplicate-check'
      });
      
      // Compute new SHA-256 hash plus legacy MD5 for backward duplicate detection
      const fileHash = await calculateFileHash(filePath); // SHA-256
      let legacyMd5 = '';
      try {
        const fh = require('./utils/fileHash');
        if (fh.calculateLegacyMd5) legacyMd5 = await fh.calculateLegacyMd5(filePath);
      } catch (_) { legacyMd5 = ''; }
      
      // Check for duplicates (match either new SHA-256 or legacy MD5 stored hash)
      const duplicateCheck = await findDuplicateDocument(fileHash, legacyMd5);
      
      if (duplicateCheck.exists) {
        // Show duplicate dialog to user
        const choice = await dialog.showMessageBox(mainWindow, {
          type: 'question',
          title: 'Duplicate Document Found',
          message: `A document with the same content already exists:\n\n"${duplicateCheck.fileName}"\n\nWhat would you like to do?`,
          // Keep existing button indices stable; add a 4th option at the end
          buttons: ['Cancel', 'Overwrite Existing', 'Create New Copy', 'Open Existing'],
          defaultId: 0,
          cancelId: 0
        });
        
        if (choice.response === 0) {
          // Cancel - skip this file
          event.sender.send('processing-progress', {
            fileName,
            fileIndex: i + 1,
            totalFiles,
            status: 'Cancelled by user',
            stage: 'cancelled'
          });
          
          results.push({
            fileName,
            success: false,
            error: 'Cancelled by user (duplicate found)'
          });
          continue;
        } else if (choice.response === 1) {
          // Overwrite - delete old folder and create new one
          event.sender.send('processing-progress', {
            fileName,
            fileIndex: i + 1,
            totalFiles,
            status: 'Removing old version...',
            stage: 'cleanup'
          });
          await fs.rm(duplicateCheck.folderPath, { recursive: true, force: true }).catch(() => {});
        } else if (choice.response === 3) {
          // Open existing - do not process, return a navigable result with existing folderId
          event.sender.send('processing-progress', {
            fileName,
            fileIndex: i + 1,
            totalFiles,
            status: 'Opening existing summary',
            stage: 'duplicate-open'
          });

          results.push({
            fileName,
            success: true,
            folderId: duplicateCheck.folderId,
            openedExisting: true
          });
          continue;
        }
        // If response === 2, just continue and create new copy
      }
      
      // Generate unique folder ID
      const folderId = generateShortUUID();
      const folderPath = path.join(documentsStoragePath, folderId);
      
      // Create folder for this document
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Creating storage folder...',
        stage: 'setup'
      });
      
      await fs.mkdir(folderPath, { recursive: true });
      
      // Copy file to folder with original name
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Storing document...',
        stage: 'storing'
      });
      
      const storedFilePath = path.join(folderPath, fileName);
      await fs.copyFile(filePath, storedFilePath);
      
  let text = '';

      // Extract text based on file type
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: ext === '.pdf' ? 'Extracting text from PDF...' : (ext === '.docx' || ext === '.doc') ? 'Extracting text from Word document...' : 'Extracting text from PowerPoint...',
        stage: 'extracting'
      });
      
      let imagesForVision = [];
      if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
        // Attempt to collect small page thumbnails to provide visual context
        if (processImages) {
          try {
            if (!extractPdfImages) {
              extractPdfImages = require('./utils/pdfImages').extractPdfImages;
            }
            imagesForVision = await extractPdfImages(filePath, 2);
          } catch (_) { imagesForVision = []; }
        }
        } else if (ext === '.docx' || ext === '.doc') {
            // Lazy-load DOCX parser
            if (!parseDocx) {
              const docx = require('./utils/docxParser');
              parseDocx = docx.parseDocx;
              extractDocxImages = docx.extractDocxImages;
            }
            text = await parseDocx(filePath);
            // Try to include a few embedded images (if present)
            if (processImages) {
              try {
                if (!extractDocxImages) {
                  extractDocxImages = require('./utils/docxParser').extractDocxImages;
                }
                imagesForVision = await extractDocxImages(filePath, 2);
              } catch (_) { imagesForVision = []; }
            }
          } else if (ext === '.pptx' || ext === '.ppt') {
        text = await parsePresentation(filePath);
        // Try to extract a few representative images to enrich summarization
        if (processImages) {
          try {
            if (!extractSlideImages) {
              const ppt = require('./utils/pptxParser');
              extractSlideImages = ppt.extractSlideImages;
            }
            imagesForVision = await extractSlideImages(filePath, maxImages);
          } catch (_) { imagesForVision = []; }
        }
      }

      if (!text || text.trim().length === 0) {
        // Clean up folder if extraction failed
        await fs.rm(folderPath, { recursive: true, force: true }).catch(() => {});
        
        event.sender.send('processing-progress', {
          fileName,
          fileIndex: i + 1,
          totalFiles,
          status: 'Failed - No text found',
          stage: 'error'
        });
        
        results.push({
          fileName,
          success: false,
          error: 'No text content found in document'
        });
        continue;
      }

      // Inform renderer about image detection (if any)
      if (imagesForVision && imagesForVision.length) {
        event.sender.send('processing-progress', {
          fileName,
          fileIndex: i + 1,
          totalFiles,
          status: `Found ${imagesForVision.length} image(s) for analysis`,
          stage: 'extracted'
        });
      }

      // Send progress update
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Generating AI summary...',
        stage: 'summarizing',
        charCount: text.length
      });

      // Decide on vision support
  const visionAllowed = processImages && (typeof modelSupportsVision === 'function' ? modelSupportsVision(model, provider) : false);
      const imagesToUse = visionAllowed ? imagesForVision : [];
      if (!visionAllowed && imagesForVision && imagesForVision.length) {
        event.sender.send('processing-progress', {
          fileName,
          fileIndex: i + 1,
          totalFiles,
          status: processImages ? 'Model does not support images — using text only' : 'Image analysis disabled — using text only',
          stage: 'summarizing'
        });
      }

      // Summarize using AI with tone and style
      const summary = await summarizeText(
        text,
        summaryType,
        {
          apiKey,
          provider,
          model,
          responseTone,
          summaryStyle,
          images: imagesToUse,
          onProgress: (progress) => {
            if (!progress) return;
            // forward streaming deltas to renderer per-file
            if (progress.type === 'delta') {
              event.sender.send('processing-progress', {
                fileName,
                fileIndex: i + 1,
                totalFiles,
                status: 'Generating AI summary…',
                stage: 'summarizing',
                delta: progress.deltaText,
                summarizedChars: progress.totalChars
              });
            } else if (progress.type === 'chunk-start' || progress.type === 'chunk-done' || progress.type === 'combine-start') {
              event.sender.send('processing-progress', {
                fileName,
                fileIndex: i + 1,
                totalFiles,
                status: progress.type === 'chunk-start' ? `Summarizing part ${progress.chunkIndex}/${progress.totalChunks}…` : (progress.type === 'chunk-done' ? `Finished part ${progress.chunkIndex}/${progress.totalChunks}` : 'Combining parts…'),
                stage: 'summarizing'
              });
            } else if (progress.type === 'done') {
              event.sender.send('processing-progress', {
                fileName,
                fileIndex: i + 1,
                totalFiles,
                status: 'Summary generated',
                stage: 'saving'
              });
            }
          },
          // pass through known provider config keys
          baseURL: providerConfig.baseURL,
          endpoint: providerConfig.endpoint,
          deployment: providerConfig.deployment,
          apiVersion: providerConfig.apiVersion
        }
      );
      
      // Save summary
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Saving summary...',
        stage: 'saving'
      });

      // Save summary data to folder (including file hash)
      // Create a better preview - clean and readable
      let previewText = text.substring(0, 500);
      
      // For PowerPoint, try to get first few slides' content
      if (ext === '.pptx' || ext === '.ppt') {
        const slideMatch = text.match(/--- Slide \d+ ---\n([\s\S]*?)(?=\n--- Slide \d+ ---|$)/);
        if (slideMatch && slideMatch[1]) {
          previewText = slideMatch[1].substring(0, 500);
        }
      }
      
      const summaryData = {
        fileName,
        fileType: ext,
        fileHash,
        summary,
        originalLength: text.length,
        summaryLength: summary.length,
        summaryType,
        responseTone,
        summaryStyle,  // Store the style used
        timestamp: new Date().toISOString(),
        model: model,  // Store the actual model used
        preview: previewText.trim() + (text.length > 500 ? '...' : '')
      };
      
      await saveSummaryToFolder(folderId, summaryData);
      
      // Send completion progress
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Complete! ✓',
        stage: 'complete'
      });

      results.push({
        fileName,
        folderId,
        fileType: ext,
        success: true,
        originalLength: text.length,
        summary
      });

    } catch (error) {
      // Parse error message to determine type
      let errorType = 'error';
      let displayMessage = error.message;
      
      if (error.message.startsWith('RATE_LIMIT:')) {
        errorType = 'rate-limit';
        displayMessage = error.message.replace('RATE_LIMIT: ', '');
      } else if (error.message.startsWith('QUOTA_EXCEEDED:')) {
        errorType = 'quota';
        displayMessage = error.message.replace('QUOTA_EXCEEDED: ', '');
      } else if (error.message.startsWith('INVALID_API_KEY:')) {
        errorType = 'api-key';
        displayMessage = error.message.replace('INVALID_API_KEY: ', '');
      }
      
      event.sender.send('processing-progress', {
        fileName: path.basename(filePath),
        fileIndex: i + 1,
        totalFiles,
        status: displayMessage,
        stage: 'error',
        errorType: errorType
      });
      
      results.push({
        fileName: path.basename(filePath),
        success: false,
        error: displayMessage,
        errorType: errorType
      });
    }
  }

  return results;
});

// New: Process multiple documents into one combined/aggregate summary (max 3)
ipcMain.handle('process-documents-combined', async (event, filePaths, summaryType, apiKey, responseTone = 'casual', model = 'openai/gpt-4o-mini', summaryStyle = 'teaching', processImagesFlag = undefined) => {
  const v = validators.validateCombinedArgs({ filePaths, summaryType, responseTone, model, summaryStyle, processImagesFlag });
  if (!v.ok) {
    return { success: false, error: v.error };
  }
  ({ summaryType, responseTone, model, summaryStyle } = v.value);
  // Load user settings for max combined files
  const userSettings = await loadSettings();
  const cfgMaxCombined = Math.max(1, Math.min(10, Number(userSettings.maxCombinedFiles) || 3));
  // Enforce maximum to control token/cost
  const inputFiles = Array.isArray(filePaths) ? filePaths.slice(0, cfgMaxCombined) : [];
  const totalFiles = inputFiles.length;
  if (totalFiles === 0) {
    return { success: false, error: 'No files provided' };
  }

  // Load user settings for image limits
  // (settings already loaded above, but ensure we keep reference name)
  const maxImages = Number(userSettings.maxImageCount) || 3;
  const processImages = typeof v.value.processImages === 'boolean' ? v.value.processImages : (typeof userSettings.processImages === 'boolean' ? userSettings.processImages : true);
  const provider = (userSettings && userSettings.aiProvider) ? userSettings.aiProvider : 'openrouter';
  const providerConfig = (userSettings && userSettings.aiConfig && userSettings.aiConfig[provider]) ? userSettings.aiConfig[provider] : {};
  // Lazy-load heavy modules
  if (!pdfParse) {
    pdfParse = require('pdf-parse-fork');
  }
  if (!parsePresentation) {
    const ppt = require('./utils/pptxParser');
    parsePresentation = ppt.parsePresentation;
    extractSlideImages = ppt.extractSlideImages;
  }
  if (!summarizeText) {
    const ai = require('./utils/aiSummarizer');
    summarizeText = ai.summarizeText;
    modelSupportsVision = ai.modelSupportsVision;
    answerQuestionAboutSummary = ai.answerQuestionAboutSummary;
  }
  if (!calculateFileHash) {
    calculateFileHash = require('./utils/fileHash').calculateFileHash;
  }

  // Extract text from each file with progress events
  const extracted = [];
  const collectedImages = [];
  for (let i = 0; i < inputFiles.length; i++) {
    const filePath = inputFiles[i];
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    try {
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Reading and extracting text...',
        stage: 'extracting'
      });

      let text = '';
      let imagesForVision = [];
      if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text || '';
        if (processImages) {
          try {
            if (!extractPdfImages) {
              extractPdfImages = require('./utils/pdfImages').extractPdfImages;
            }
            imagesForVision = await extractPdfImages(filePath, 1);
          } catch (_) { imagesForVision = []; }
        }
      } else if (ext === '.pptx' || ext === '.ppt') {
        text = await parsePresentation(filePath);
          if (processImages) {
            try {
              if (!extractSlideImages) {
                const ppt = require('./utils/pptxParser');
                extractSlideImages = ppt.extractSlideImages;
              }
              imagesForVision = await extractSlideImages(filePath, maxImages);
          } catch (_) { imagesForVision = []; }
        }
      } else if (ext === '.docx' || ext === '.doc') {
        if (!parseDocx) {
          const docx = require('./utils/docxParser');
          parseDocx = docx.parseDocx;
          extractDocxImages = docx.extractDocxImages;
        }
        text = await parseDocx(filePath);
        if (processImages) { try { imagesForVision = await extractDocxImages(filePath, 1); } catch (_) { imagesForVision = []; } }
      } else {
        text = '';
      }

      if (!text || !text.trim()) {
        throw new Error('No text content found in document');
      }

      extracted.push({ fileName, ext, text });
      if (imagesForVision && imagesForVision.length) {
        // Keep a small pool of images across files (max ~3 total)
        collectedImages.push(...imagesForVision);
      }

      // Notify renderer that extraction for this file finished
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Text extracted',
        stage: 'extracted',
        charCount: text.length
      });
    } catch (err) {
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: err.message || 'Failed to extract',
        stage: 'error'
      });
      return { success: false, error: `Failed to extract ${fileName}: ${err.message}` };
    }
  }

  // Build combined prompt text with caps per-file to avoid token blowups
  const MAX_PER_FILE_CHARS = 20000; // cap each source
  const cleanedParts = extracted.map((item, idx) => {
    let t = item.text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length > MAX_PER_FILE_CHARS) {
      t = t.slice(0, MAX_PER_FILE_CHARS) + `\n...[truncated ${t.length - MAX_PER_FILE_CHARS} chars]`;
    }
    return `--- Source ${idx + 1}: ${item.fileName} (${item.ext}) ---\n${t}\n`;
  }).join('\n');

  const aggregationIntro = `You are given ${totalFiles} documents. Produce a single cohesive summary that:
- Identifies themes that span multiple documents
- Resolves or notes contradictions
- Clearly attributes unique points to their sources when important (Source 1/2/3)
- Avoids repetition and keeps a logical flow\n\n`;

  const combinedText = aggregationIntro + cleanedParts;

  // Notify about images collected across sources (if any)
  if (collectedImages.length) {
    const note = `Collected ${collectedImages.length} image(s) from sources`;
    extracted.forEach((info, idx) => {
      event.sender.send('processing-progress', {
        fileName: info.fileName,
        fileIndex: idx + 1,
        totalFiles,
        status: note,
        stage: 'extracted'
      });
    });
  }

  // Indicate combining stage for each file (moves progress forward visually)
  extracted.forEach((info, idx) => {
    event.sender.send('processing-progress', {
      fileName: info.fileName,
      fileIndex: idx + 1,
      totalFiles,
      status: 'Combining sources...',
      stage: 'combining'
    });
  });

  // Move each file to summarizing stage for better UI feedback
  extracted.forEach((info, idx) => {
    event.sender.send('processing-progress', {
      fileName: info.fileName,
      fileIndex: idx + 1,
      totalFiles,
      status: 'Generating combined AI summary...',
      stage: 'summarizing'
    });
  });

  let combinedSummary;
  try {
    // Respect model vision capability
  const visionAllowed = processImages && (typeof modelSupportsVision === 'function' ? modelSupportsVision(model, provider) : false);
    const imagesToUse = visionAllowed ? collectedImages.slice(0, 3) : [];
    if (!visionAllowed && collectedImages.length) {
      // Send one notice (associate with first file)
      const first = extracted[0];
      event.sender.send('processing-progress', {
        fileName: first.fileName,
        fileIndex: 1,
        totalFiles,
        status: processImages ? 'Model does not support images — combining text only' : 'Image analysis disabled — combining text only',
        stage: 'summarizing'
      });
    }

    combinedSummary = await summarizeText(
      combinedText,
      summaryType,
      {
        apiKey,
        provider,
        model,
        responseTone,
        summaryStyle,
        images: imagesToUse,
        onProgress: (progress) => {
          // For combined mode, forward progress per original source (first fileIndex for visuals)
          if (!progress) return;
          if (progress.type === 'delta') {
            extracted.forEach((info, k) => {
              event.sender.send('processing-progress', {
                fileName: info.fileName,
                fileIndex: k + 1,
                totalFiles,
                status: 'Generating combined AI summary…',
                stage: 'summarizing',
                delta: progress.deltaText
              });
            });
          } else if (progress.type === 'chunk-start' || progress.type === 'chunk-done' || progress.type === 'combine-start') {
            extracted.forEach((info, k) => {
              event.sender.send('processing-progress', {
                fileName: info.fileName,
                fileIndex: k + 1,
                totalFiles,
                status: progress.type === 'chunk-start' ? `Summarizing part ${progress.chunkIndex}/${progress.totalChunks}…` : (progress.type === 'chunk-done' ? `Finished part ${progress.chunkIndex}/${progress.totalChunks}` : 'Combining parts…'),
                stage: 'summarizing'
              });
            });
          } else if (progress.type === 'done') {
            extracted.forEach((info, k) => {
              event.sender.send('processing-progress', {
                fileName: info.fileName,
                fileIndex: k + 1,
                totalFiles,
                status: 'Summary generated',
                stage: 'saving'
              });
            });
          }
        },
        baseURL: providerConfig.baseURL,
        endpoint: providerConfig.endpoint,
        deployment: providerConfig.deployment,
        apiVersion: providerConfig.apiVersion
      }
    );
  } catch (error) {
    let displayMessage = error.message || 'AI summarization failed';
    event.sender.send('processing-progress', {
      fileName: `${totalFiles} files`,
      fileIndex: 1,
      totalFiles: 1,
      status: displayMessage,
      stage: 'error'
    });
    return { success: false, error: displayMessage };
  }

  // Create a synthetic folder to store the combined entry (no single original file)
  const folderId = generateShortUUID();
  const folderPath = path.join(documentsStoragePath, folderId);
  await fs.mkdir(folderPath, { recursive: true });

  // Create a descriptive filename for display purposes only
  const displayName = totalFiles === 1
    ? extracted[0].fileName
    : `Combined: ${extracted[0].fileName} + ${totalFiles - 1} more`;

  // Compute a synthetic hash based on all inputs
  const hashes = [];
  for (const f of inputFiles) {
    try { hashes.push(await calculateFileHash(f)); } catch (e) { /* ignore */ }
  }
  const syntheticHash = require('crypto').createHash('sha256').update(hashes.join('|')).digest('hex');

  // Build preview text from first source (or from combined parts)
  let previewText = extracted[0].text.slice(0, 500);
  if (extracted[0].ext === '.pptx' || extracted[0].ext === '.ppt') {
    const m = extracted[0].text.match(/--- Slide \d+ ---\n([\s\S]*?)(?=\n--- Slide \d+ ---|$)/);
    if (m && m[1]) previewText = m[1].slice(0, 500);
  }

  const originalLength = cleanedParts.length;
  const summaryData = {
    fileName: displayName,
    fileType: '.aggregate',
    fileHash: syntheticHash,
    summary: combinedSummary,
    originalLength: originalLength,
    summaryLength: combinedSummary.length,
    summaryType,
    responseTone,
    summaryStyle,
    timestamp: new Date().toISOString(),
    model,
    preview: previewText.trim() + (originalLength > 500 ? '...' : ''),
    sources: extracted.map(e => ({ fileName: e.fileName, fileType: e.ext }))
  };

  await saveSummaryToFolder(folderId, summaryData);

  event.sender.send('processing-progress', {
    fileName: displayName,
    fileIndex: 1,
    totalFiles: 1,
    status: 'Complete! ✓',
    stage: 'complete'
  });

  return {
    success: true,
    folderId,
    fileName: displayName,
    fileType: '.aggregate',
    originalLength,
    summary: combinedSummary
  };
});

// Save summary to file
ipcMain.handle('save-summary', async (event, fileName, summary) => {
  const v = validators.validateSaveSummaryArgs({ fileName, summary });
  if (!v.ok) return { success: false, error: v.error };
  const result = await dialog.showSaveDialog(mainWindow, {
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

// Validate API key using provider adapters (backward compatible with string arg)
ipcMain.handle('validate-api-key', async (event, arg) => {
  try {
    const { getAdapter } = require('./utils/ai/providers/registry');
    const payload = typeof arg === 'string' ? { provider: 'openrouter', apiKey: arg } : validators.validateProviderPayload(arg || {});
    let provider = payload.provider || 'openrouter';
    let apiKey = payload.apiKey || '';
    let config = payload.config || {};

    if (typeof arg === 'string') {
      apiKey = arg;
    } else if (arg && typeof arg === 'object') {
      provider = arg.provider || 'openrouter';
      apiKey = arg.apiKey || '';
      config = arg.config || {};
    }

    // If apiKey not provided, try keystore for provider
    if (!apiKey) {
      const { map } = await readKeystoreMap();
      if (map[provider] && map[provider].apiKey) {
        apiKey = map[provider].apiKey;
      }
    }

    if (!apiKey) {
      return { valid: false, error: 'Missing API key for provider: ' + provider };
    }

    // Merge with settings non-secret config as fallback
    const settings = await loadSettings();
    const providerCfg = (settings.aiConfig && settings.aiConfig[provider]) || {};
    const merged = { ...providerCfg, ...config, apiKey };

    const adapter = getAdapter(provider);
    if (!adapter || typeof adapter.validate !== 'function') {
      return { valid: false, error: `Unsupported provider: ${provider}` };
    }
    const result = await adapter.validate(merged);
    return result;
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

// Save API key securely for current provider (backward-compatible entry point)
ipcMain.handle('save-api-key', async (event, apiKey) => {
  try {
    await ensureEncryptionLoaded();
    if (!validateEncryption() ) {
      return { success: false, error: 'Encryption validation failed' };
    }
    const { map, migrated } = await readKeystoreMap();
    const provider = await getCurrentProvider();
    const next = { ...map, [provider]: { apiKey } };
    const res = await writeKeystoreMap(next);
    if (!res.success) return res;
    return { success: true };
  } catch (error) {
    console.error('Failed to save API key:', error);
    return { success: false, error: error.message };
  }
});

// Load API key for current provider
ipcMain.handle('load-api-key', async () => {
  try {
    const provider = await getCurrentProvider();
    const { map } = await readKeystoreMap();
    const apiKey = (map[provider] && map[provider].apiKey) || '';
    return { success: true, apiKey };
  } catch (error) {
    console.error('Failed to load API key:', error);
    return { success: false, error: error.message, apiKey: '' };
  }
});

// Delete API key for current provider
ipcMain.handle('delete-api-key', async () => {
  try {
    const provider = await getCurrentProvider();
    const { map } = await readKeystoreMap();
    if (map[provider]) delete map[provider];
    // If empty, remove file; else rewrite
    const keys = Object.keys(map);
    if (keys.length === 0) {
      try { await fs.unlink(keystorePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    } else {
      const res = await writeKeystoreMap(map);
      if (!res.success) return res;
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return { success: false, error: error.message };
  }
});

// New Phase 1 IPC: provider-specific credentials save/load/delete
ipcMain.handle('save-provider-credentials', async (event, { provider, apiKey, config }) => {
  try {
    if (!validators.isValidProvider(provider)) return { success: false, error: 'Invalid provider' };
    await ensureEncryptionLoaded();
    if (!validateEncryption()) return { success: false, error: 'Encryption validation failed' };
    const { map } = await readKeystoreMap();
    if (apiKey) map[provider] = { apiKey };
    const res = await writeKeystoreMap(map);
    if (!res.success) return res;
    // Persist non-secret config to settings
    const settings = await loadSettings();
    settings.aiConfig = settings.aiConfig || {};
    const sanitizedCfg = validators.validateProviderPayload({ provider, config }).config || {};
    settings.aiConfig[provider] = { ...(settings.aiConfig[provider] || {}), ...sanitizedCfg };
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-provider-credentials', async (event, provider) => {
  try {
    if (!validators.isValidProvider(provider)) provider = await getCurrentProvider();
    const { map } = await readKeystoreMap();
    const hasKey = !!(map[provider] && map[provider].apiKey);
    const settings = await loadSettings();
    const config = (settings.aiConfig && settings.aiConfig[provider]) || {};
    return { success: true, hasKey, config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-provider-credentials', async (event, provider) => {
  try {
    if (!validators.isValidProvider(provider)) provider = await getCurrentProvider();
    const { map } = await readKeystoreMap();
    if (map[provider]) delete map[provider];
    const keys = Object.keys(map);
    if (keys.length === 0) {
      try { await fs.unlink(keystorePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    } else {
      const res = await writeKeystoreMap(map);
      if (!res.success) return res;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Read file for preview - now reads from folder
ipcMain.handle('read-stored-file', async (event, folderId) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { success: false, error: 'Invalid folder id' };
    const folderPath = path.join(documentsStoragePath, folderId);
    
    // Read summary.json to get the filename
    const summaryPath = path.join(folderPath, 'summary.json');
    const summaryData = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    
    // Read the actual document file
    const filePath = path.join(folderPath, summaryData.fileName);

    // If the stored file is a PPT/DOC (or similar), attempt to convert to PDF for preview.
    const officeExts = new Set(['.pptx', '.ppt', '.docx', '.doc']);
    if (officeExts.has(path.extname(summaryData.fileName).toLowerCase())) {
      try {
        // Lazy-load converter util
        const converter = require('./utils/convertToPdf');
        const res = await converter.convertToPdfIfNeeded(folderPath, summaryData.fileName);
        if (res && res.success) {
          return { success: true, data: res.data, mimeType: res.mimeType || 'application/pdf', fileName: summaryData.fileName };
        }
        // otherwise fallthrough to returning original bytes
      } catch (err) {
        // Log but continue to fallback
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

// Get file info - now checks folder
ipcMain.handle('check-file-exists', async (event, folderId) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { exists: false };
    const folderPath = path.join(documentsStoragePath, folderId);
    await fs.access(folderPath);
    
    // Also check for summary.json
    const summaryPath = path.join(folderPath, 'summary.json');
    await fs.access(summaryPath);
    
    return { exists: true };
  } catch (error) {
    return { exists: false };
  }
});

// Delete stored file - now deletes entire folder
ipcMain.handle('delete-stored-file', async (event, folderId) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { success: false, error: 'Invalid folder id' };
    const folderPath = path.join(documentsStoragePath, folderId);
    await fs.rm(folderPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Helper function to get MIME type
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint'
    , '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    , '.doc': 'application/msword'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Get storage paths (for Settings UI)
ipcMain.handle('get-storage-paths', async () => {
  try {
    const settings = await loadSettings();
    return {
      success: true,
      // Full paths to display in UI
      appdataFull: defaultDataPath,
      localAppFull: localAppDataPath,
      // Current settings including selected storage location
      settings
    };
  } catch (error) {
    return {
      success: true,
      appdataFull: defaultDataPath,
      localAppFull: localAppDataPath,
      settings: { ...defaultSettings }
    };
  }
});

// Get current settings
ipcMain.handle('get-settings', async () => {
  try {
    const settings = await loadSettings();
    return settings;
  } catch (_) {
    return { ...defaultSettings };
  }
});

// Save settings (partial updates allowed and sanitized)
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

// Change storage location and migrate files
ipcMain.handle('change-storage-location', async (event, storageLocation) => {
  try {
    if (!validators.isValidStorageLocation(storageLocation)) {
      return { success: false, error: 'Invalid storage location' };
    }

    // Determine new target paths
    const newDataPath = (storageLocation === 'local-app') ? localAppDataPath : defaultDataPath;
    const newDocumentsPath = path.join(newDataPath, 'documents');
    const newSettingsPath = path.join(newDataPath, 'settings.json');
    const newKeystorePath = path.join(newDataPath, 'keystore.enc');

    // Short-circuit if already at desired location
    if (newDataPath === dataPath) {
      return { success: true, path: documentsStoragePath, dataPath: newDataPath, errors: [] };
    }

    // Ensure target directories exist
    await fs.mkdir(newDocumentsPath, { recursive: true }).catch(() => {});

    // Attempt to migrate existing data
    const copyErrors = [];
    const oldDataPath = dataPath;
    const oldDocsPath = documentsStoragePath;
    const oldSettingsPath = settingsPath;
    const oldKeystorePath = keystorePath;

    try {
      const entries = await fs.readdir(oldDocsPath, { withFileTypes: true });
      // Pre-migration inventory for integrity check
      const inventory = [];
      for (const entry of entries) {
        const source = path.join(oldDocsPath, entry.name);
        let size = 0;
        try {
          const stat = await fs.stat(source);
          size = stat.size || 0;
        } catch (_) { /* ignore */ }
        inventory.push({ name: entry.name, isDir: entry.isDirectory(), size });
      }
      const totalBytes = inventory.reduce((sum, i) => sum + i.size, 0);
      let migratedBytes = 0;
      for (const entry of entries) {
        const source = path.join(oldDocsPath, entry.name);
        const dest = path.join(newDocumentsPath, entry.name);
        try {
          if (entry.isDirectory()) {
            await fs.cp(source, dest, { recursive: true, force: true });
          } else {
            await fs.copyFile(source, dest);
          }
          try {
            const stat = await fs.stat(dest);
            migratedBytes += stat.size || 0;
          } catch (_) { /* ignore size tracking errors */ }
        } catch (err) {
          copyErrors.push({ item: entry.name, error: err.message });
        }
      }
      // Integrity assessment
      const integrity = {
        itemsAttempted: inventory.length,
        itemsFailed: copyErrors.length,
        totalBytes,
        migratedBytes,
        byteRatio: totalBytes ? (migratedBytes / totalBytes) : 1
      };

      // Copy settings if present
      await fs.copyFile(oldSettingsPath, newSettingsPath).catch(() => {});
      // Copy keystore if present
      await fs.copyFile(oldKeystorePath, newKeystorePath).catch(() => {});

      // Only remove old data if all copies succeeded (full integrity)
      if (copyErrors.length === 0 && integrity.byteRatio >= 0.999) {
        await fs.rm(oldDocsPath, { recursive: true, force: true }).catch(() => {});
        await fs.rm(oldDataPath, { recursive: true, force: true }).catch(() => {});
      } else {
        console.warn('Storage migration completed with partial integrity; old data retained.', { copyErrors, integrity });
      }
    } catch (err) {
      console.warn('Storage migration: old documents path inaccessible or empty:', err.message);
    }

    // Update global path references
    dataPath = newDataPath;
    documentsStoragePath = newDocumentsPath;
    settingsPath = newSettingsPath;
    keystorePath = newKeystorePath;

    // Persist settings update
    const currentSettings = await loadSettings();
    const updatedSettings = {
      ...currentSettings,
      storageLocation,
      dataPath: newDataPath
    };
    await saveSettings(updatedSettings);

    return { success: copyErrors.length === 0, path: newDocumentsPath, dataPath: newDataPath, errors: copyErrors };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App version for UI
ipcMain.handle('get-app-version', async () => {
  try { return app.getVersion(); } catch (_) { return '0.0.0'; }
});

// Get storage stats
ipcMain.handle('get-storage-stats', async () => {
  try {
    const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());
    
    let totalSize = 0;
    let fileCount = 0;
    
    for (const folder of folders) {
      const folderPath = path.join(documentsStoragePath, folder.name);
      const files = await fs.readdir(folderPath);
      
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        fileCount++;
      }
    }
    
    return {
      success: true,
      fileCount: folders.length, // Count folders (each represents a document)
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    return {
      success: true,
      fileCount: 0,
      totalSize: 0,
      totalSizeMB: '0.00'
    };
  }
});

// Migrate old storage format to new folder-based format
async function migrateOldStorage() {
  try {
    const oldSummariesPath = path.join(dataPath, 'summaries.json');
    
    // Check if old summaries.json exists
    try {
      await fs.access(oldSummariesPath);
    } catch {
      // No old data to migrate
      return { success: true, migrated: 0 };
    }
    
    // Read old summaries
    const data = await fs.readFile(oldSummariesPath, 'utf8');
    const oldSummaries = JSON.parse(data);
    
    if (!Array.isArray(oldSummaries) || oldSummaries.length === 0) {
      // Delete empty summaries.json
      await fs.unlink(oldSummariesPath).catch(() => {});
      return { success: true, migrated: 0 };
    }
    
    console.log(`Migrating ${oldSummaries.length} summaries to new format...`);
    
    let migrated = 0;
    
    for (const summary of oldSummaries) {
      try {
        // Generate folder ID
        const folderId = generateShortUUID();
        const folderPath = path.join(documentsStoragePath, folderId);
        
        // Create folder
        await fs.mkdir(folderPath, { recursive: true });
        
        // If old format had storedFileName, try to move the file
        if (summary.storedFileName) {
          const oldFilePath = path.join(documentsStoragePath, summary.storedFileName);
          const newFilePath = path.join(folderPath, summary.fileName);
          
          try {
            await fs.access(oldFilePath);
            await fs.copyFile(oldFilePath, newFilePath);
            // Delete old file after successful copy
            await fs.unlink(oldFilePath).catch(() => {});
          } catch (err) {
            console.log(`Could not migrate file ${summary.storedFileName}: ${err.message}`);
            // Continue anyway - we'll still save the summary
          }
        }
        
        // Create summary.json in new format
        const newSummary = {
          fileName: summary.fileName,
          fileType: summary.fileType,
          summary: summary.summary,
          originalLength: summary.originalLength,
          summaryLength: summary.summaryLength || summary.summary.length,
          summaryType: summary.summaryType,
          timestamp: summary.timestamp,
          model: summary.model || 'gpt-4o-mini',
          preview: summary.preview || 'Preview not available'
        };
        
        await saveSummaryToFolder(folderId, newSummary);
        migrated++;
      } catch (err) {
        console.error(`Failed to migrate summary ${summary.fileName}:`, err);
      }
    }
    
    // Delete old summaries.json after successful migration
    await fs.unlink(oldSummariesPath).catch(() => {});
    
    console.log(`Migration complete: ${migrated} summaries migrated`);
    return { success: true, migrated };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message, migrated: 0 };
  }
}

// Generate 8-character alphanumeric UUID
function generateShortUUID() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Check if a document with the same hash already exists
async function findDuplicateDocument(fileHash, legacyMd5) {
  try {
    const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());
    
    for (const folder of folders) {
      try {
        const summaryPath = path.join(documentsStoragePath, folder.name, 'summary.json');
        const data = await fs.readFile(summaryPath, 'utf8');
        const summaryData = JSON.parse(data);
        
        // Match against current SHA-256 or legacy MD5
        if (summaryData.fileHash === fileHash || (legacyMd5 && summaryData.fileHash === legacyMd5)) {
          return {
            exists: true,
            folderId: folder.name,
            fileName: summaryData.fileName,
            folderPath: path.join(documentsStoragePath, folder.name)
          };
        }
      } catch (error) {
        // Skip folders without valid summary.json
        continue;
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return { exists: false };
  }
}

// Summary history management - now reads from individual document folders
async function loadSummaryHistory() {
  try {
    // Read all folders in documents directory
    const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());
    
    const history = [];
    
    for (const folder of folders) {
      try {
        const summaryPath = path.join(documentsStoragePath, folder.name, 'summary.json');
        const data = await fs.readFile(summaryPath, 'utf8');
        const summaryData = JSON.parse(data);
        
        // Add folder ID to data
        summaryData.folderId = folder.name;
        history.push(summaryData);
      } catch (error) {
        // Skip folders without valid summary.json
        console.log(`Skipping folder ${folder.name}: ${error.message}`);
      }
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return history;
  } catch (error) {
    // Documents folder doesn't exist or is invalid
    console.error('Failed to load summary history:', error);
    return [];
  }
}

// Save individual summary to its folder
async function saveSummaryToFolder(folderId, summaryData) {
  try {
    const folderPath = path.join(documentsStoragePath, folderId);
    await fs.mkdir(folderPath, { recursive: true });
    
    const summaryPath = path.join(folderPath, 'summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2), 'utf8');
    
    return { success: true, folderId };
  } catch (error) {
    console.error('Failed to save summary:', error);
    return { success: false, error: error.message };
  }
}

// Get summary history
ipcMain.handle('get-summary-history', async () => {
  try {
    const history = await loadSummaryHistory();
    return { success: true, history };
  } catch (error) {
    return { success: false, error: error.message, history: [] };
  }
});

// Deprecated history endpoints removed (folder-based storage saves automatically during processing)

// Delete summary from history by folder ID
ipcMain.handle('delete-summary-from-history', async (event, folderId) => {
  try {
    const folderPath = path.join(documentsStoragePath, folderId);
    
    // Delete entire folder (contains document + summary.json)
    await fs.rm(folderPath, { recursive: true, force: true });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Clear all summary history
ipcMain.handle('clear-summary-history', async () => {
  try {
    // Delete all folders in documents directory
    const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());
    
    for (const folder of folders) {
      const folderPath = path.join(documentsStoragePath, folder.name);
      await fs.rm(folderPath, { recursive: true, force: true }).catch(err => {
        console.error(`Failed to delete folder ${folder.name}:`, err);
      });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC: allow renderer to request update checks and trigger install
ipcMain.handle('check-for-updates', async () => {
  try {
    const { autoUpdater } = require('electron-updater');
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message };
  }
});

ipcMain.handle('install-update', async (event, restartImmediately = true) => {
  try {
    const { autoUpdater } = require('electron-updater');
    // Parameters: isSilent, isForceRunAfter
    // Perform diagnostics and try to close windows prior to install
    try {
      try { logStartup('ipcInstall:pid:' + process.pid); } catch (e) {}
      try { logStartup('ipcInstall:execPath:' + process.execPath); } catch (e) {}
      const procName = path.basename(process.execPath);
      const { exec } = require('child_process');
      exec(`tasklist /FI "IMAGENAME eq ${procName}" /V`, { windowsHide: true }, (err, stdout, stderr) => {
        try {
          if (err) {
            try { logStartup('ipcTasklistError:' + (err && err.message)); } catch (e) {}
          } else {
            try { logStartup('ipcTasklist:' + stdout.replace(/\r?\n/g, ' || ')); } catch (e) {}
          }
        } catch (e) { /* ignore */ }
      });

      // Close only the main window to release document file handles. Leave the splash visible
      // so the user sees update progress until the process exits and installer runs.
      if (mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.destroy(); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }

    // Give a moment and then trigger a silent install
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(true, restartImmediately);
        try { app.quit(); } catch (e) { /* ignore */ }
        setTimeout(() => {
          try { process.exit(0); } catch (e) { /* ignore */ }
        }, 1500);
      } catch (err) {
        // If this fails, report back to renderer
        try { logStartup('ipcQuitAndInstallError:' + (err && err.message)); } catch (e) {}
      }
    }, 250);
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message };
  }
});

// Manual direct installer download (fallback path)
ipcMain.handle('manual-download-update', async () => {
  try {
    const https = require('https');
    const os = require('os');
    const crypto = require('crypto');
    const tmpDir = os.tmpdir();
    const owner = 'veroxsity';
    const repo = 'Squailor';
    // latest.yml location for GitHub provider
    const latestUrl = `https://github.com/${owner}/${repo}/releases/latest/download/latest.yml`;
    const latestYmlPath = path.join(tmpDir, `latest-${Date.now()}.yml`);
    const ymlContent = await new Promise((resolve, reject) => {
      https.get(latestUrl, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error('Failed to fetch latest.yml: ' + res.statusCode));
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    await fs.writeFile(latestYmlPath, ymlContent, 'utf8').catch(()=>{});
    // Parse version, path (exe) and sha512
    const versionMatch = ymlContent.match(/^version:\s*([\w.-]+)/m);
    const pathMatch = ymlContent.match(/^path:\s*(.+\.exe)$/m);
    // Look for sha512 near path line or global sha512
    let sha512Match = null;
    const shaLines = ymlContent.match(/^sha512:\s*([A-Za-z0-9+/=]+)$/mg);
    if (shaLines && shaLines.length) {
      sha512Match = shaLines[0].match(/^sha512:\s*([A-Za-z0-9+/=]+)$/);
    }
    if (!versionMatch || !pathMatch || !sha512Match) {
      return { success: false, error: 'latest.yml parse failed (missing version/path/sha512)' };
    }
    const version = versionMatch[1].trim();
    const exeFileName = pathMatch[1].trim();
    const expectedSha512 = sha512Match[1].trim();
    const downloadUrl = `https://github.com/${owner}/${repo}/releases/download/v${version}/${encodeURIComponent(exeFileName)}`;
    // Prepare temp file path
    const outPath = path.join(tmpDir, exeFileName);
    const hash = crypto.createHash('sha512');
    let transferred = 0;
    let total = 0; // might not be known upfront
    const startedAt = Date.now();
    await new Promise((resolve, reject) => {
      https.get(downloadUrl, (res) => {
        if (res.statusCode !== 200) {
          safeSend(mainWindow, 'manual-update-error', { message: 'Installer download failed: ' + res.statusCode });
          return reject(new Error('HTTP ' + res.statusCode));
        }
        total = parseInt(res.headers['content-length'] || '0', 10) || 0;
        const fileStream = require('fs').createWriteStream(outPath);
        res.on('data', chunk => {
          hash.update(chunk);
          transferred += chunk.length;
          fileStream.write(chunk);
          const elapsed = (Date.now() - startedAt)/1000;
          const speed = elapsed > 0 ? transferred/elapsed : 0;
          const percent = total > 0 ? (transferred/total)*100 : null;
          safeSend(mainWindow, 'manual-update-progress', {
            transferred,
            total,
            percent,
            speedBytesPerSecond: Math.round(speed),
            speedMBps: Number((speed/1024/1024).toFixed(2)),
            transferredMB: Number((transferred/1024/1024).toFixed(2)),
            totalMB: total ? Number((total/1024/1024).toFixed(2)) : null,
            elapsedSeconds: Number(elapsed.toFixed(1)),
            phase: 'downloading'
          });
        });
        res.on('end', () => {
          fileStream.end();
          resolve();
        });
        res.on('error', (e) => {
          safeSend(mainWindow, 'manual-update-error', { message: e.message });
          reject(e);
        });
      }).on('error', (e) => {
        safeSend(mainWindow, 'manual-update-error', { message: e.message });
        reject(e);
      });
    });
    const actualSha512 = hash.digest('base64');
    if (actualSha512 !== expectedSha512) {
      safeSend(mainWindow, 'manual-update-verify-failed', { expected: expectedSha512, actual: actualSha512 });
      return { success: false, error: 'SHA512 mismatch' };
    }
    safeSend(mainWindow, 'manual-update-complete', { path: outPath, version });
    // Install: destroy windows, spawn installer, exit
    try {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
      const { spawn } = require('child_process');
      const child = spawn(outPath, [], { detached: true, stdio: 'ignore' });
      child.unref();
      setTimeout(() => { try { app.quit(); } catch(_){}; setTimeout(()=>{ try { process.exit(0); } catch(_){} }, 1200); }, 400);
    } catch (e) {
      safeSend(mainWindow, 'manual-update-error', { message: 'Installer launch failed: ' + e.message });
      return { success: false, error: e.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message };
  }
});

// Q&A: answer a question about a stored summary (by folderId)
ipcMain.handle('qa-summary', async (event, { folderId, question, apiKey, model }) => {
  try {
    if (!validators.isValidFolderId(folderId)) return { success: false, error: 'Invalid folder id' };
    if (typeof question !== 'string' || !question.trim()) {
      return { success: false, error: 'Question is required' };
    }
    if (!answerQuestionAboutSummary) {
      const ai = require('./utils/aiSummarizer');
      answerQuestionAboutSummary = ai.answerQuestionAboutSummary;
    }

    // Load the summary text from storage
    const folderPath = path.join(documentsStoragePath, folderId);
    const summaryPath = path.join(folderPath, 'summary.json');
    const data = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    const summary = data.summary || '';
    if (!summary) {
      return { success: false, error: 'Summary not found for this item.' };
    }

    // Resolve provider from settings
    const settings = await loadSettings();
    const provider = (settings && settings.aiProvider) ? settings.aiProvider : 'openrouter';
    const providerConfig = (settings && settings.aiConfig && settings.aiConfig[provider]) ? settings.aiConfig[provider] : {};

    // Provide light streaming feedback back to renderer via a channel
    const channel = `qa-progress:${folderId}`;
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
        apiVersion: providerConfig.apiVersion
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
    const modelsPath = path.join(__dirname, 'assets', 'models.json');
    let models = [];
    try {
      const json = await fs.readFile(modelsPath, 'utf8');
      const table = JSON.parse(json);
      models = (table && table[provider]) || [];
    } catch (_) {
      // Fallback to empty list if assets not found; renderer will handle gracefully
      models = [];
    }
    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message, models: [] };
  }
});

// Network diagnostics: return suspicious outbound hosts for telemetry assertion
ipcMain.handle('get-network-diagnostics', async () => {
  try {
    const suspicious = Array.from(global.__suspiciousRequests || []);
    return {
      success: true,
      suspiciousHosts: suspicious,
      count: suspicious.length
    };
  } catch (e) {
    return { success: false, error: e && e.message };
  }
});

// Fetch latest release metadata (version/path/sha512) without downloading installer
ipcMain.handle('get-latest-release-info', async () => {
  try {
    const https = require('https');
    const owner = 'veroxsity';
    const repo = 'Squailor';
    const latestUrl = `https://github.com/${owner}/${repo}/releases/latest/download/latest.yml`;
    const data = await new Promise((resolve, reject) => {
      https.get(latestUrl, (res) => {
        if (res.statusCode !== 200) return reject(new Error('Failed latest.yml fetch: ' + res.statusCode));
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      }).on('error', reject);
    });
    const versionMatch = data.match(/^version:\s*([\w.-]+)/m);
    const pathMatch = data.match(/^path:\s*(.+\.exe)$/m);
    const shaLines = data.match(/^sha512:\s*([A-Za-z0-9+/=]+)$/mg);
    let sha512 = null;
    if (shaLines && shaLines.length) {
      const m = shaLines[0].match(/^sha512:\s*([A-Za-z0-9+/=]+)$/);
      if (m) sha512 = m[1];
    }
    return {
      success: true,
      version: versionMatch ? versionMatch[1].trim() : null,
      exePath: pathMatch ? pathMatch[1].trim() : null,
      sha512
    };
  } catch (e) {
    return { success: false, error: e && e.message };
  }
});