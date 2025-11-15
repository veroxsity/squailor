const { app, BrowserWindow } = require('electron');

let autoUpdaterListenersAttached = false;
let updateDownloadStartTs = null;
let lastProgressTs = null;
let updateSlowEmitted = false;
let slowWatchInterval = null;
const UPDATE_SLOW_THRESHOLD_MS = 20000;

function safeSend(win, channel, ...args) {
  try {
    if (!win) return false;
    if (win.isDestroyed && win.isDestroyed()) return false;
    const wc = win.webContents;
    if (!wc) return false;
    if (wc.isDestroyed && wc.isDestroyed()) return false;
    wc.send(channel, ...args);
    return true;
  } catch (_) {
    return false;
  }
}

function startUpdateSlowWatch(autoUpdater, options = {}) {
  const {
    logStartup = () => {},
    getWindows = () => ({ mainWindow: null, splashWindow: null })
  } = options;
  try {
    if (slowWatchInterval) clearInterval(slowWatchInterval);
    updateSlowEmitted = false;
    slowWatchInterval = setInterval(() => {
      try {
        if (updateSlowEmitted) return;
        if (!updateDownloadStartTs) return;
        const now = Date.now();
        const sinceLastProgress = lastProgressTs ? (now - lastProgressTs) : (now - updateDownloadStartTs);
        if (sinceLastProgress >= UPDATE_SLOW_THRESHOLD_MS) {
          updateSlowEmitted = true;
          try { logStartup('update-slow:' + sinceLastProgress); } catch (_) {}
          const { mainWindow, splashWindow } = getWindows();
          safeSend(mainWindow, 'update-slow', { stalledMs: sinceLastProgress, thresholdMs: UPDATE_SLOW_THRESHOLD_MS });
          safeSend(splashWindow, 'update-slow', { stalledMs: sinceLastProgress, thresholdMs: UPDATE_SLOW_THRESHOLD_MS });
        }
      } catch (_) {}
    }, 2500);
  } catch (_) {}
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

function attachAutoUpdaterListeners(autoUpdater, log, options = {}) {
  const {
    logStartup = () => {},
    getWindows = () => ({ mainWindow: null, splashWindow: null }),
    scheduleSplashClose = () => {},
  } = options;

  if (autoUpdaterListenersAttached) return;
  autoUpdaterListenersAttached = true;
  try { logStartup('autoUpdaterListenersAttached'); } catch (_) {}

  autoUpdater.on('checking-for-update', () => {
    try { logStartup('phase:update-checking'); } catch(_){}
    const { mainWindow, splashWindow } = getWindows();
    safeSend(mainWindow, 'update-checking');
    safeSend(splashWindow, 'update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    try { logStartup('phase:update-available:' + (info && info.version)); } catch(_){}
    const { mainWindow, splashWindow } = getWindows();
    safeSend(mainWindow, 'update-available', info);
    safeSend(splashWindow, 'update-available', info);
    try { logStartup('update-available-event:' + info.version); } catch (_) {}
    startUpdateSlowWatch(autoUpdater, { logStartup, getWindows });
  });

  autoUpdater.on('update-not-available', (info) => {
    try { logStartup('phase:update-not-available'); } catch(_){}
    const { mainWindow, splashWindow } = getWindows();
    safeSend(mainWindow, 'update-not-available', info);
    safeSend(splashWindow, 'update-not-available', info);
    scheduleSplashClose();
    clearUpdateSlowWatch();
  });

  autoUpdater.on('error', (err) => {
    try { logStartup('phase:update-error:' + (err && err.message)); } catch(_){}
    const { mainWindow, splashWindow } = getWindows();
    safeSend(mainWindow, 'update-error', { message: err && err.message });
    safeSend(splashWindow, 'update-error', { message: err && err.message });
    scheduleSplashClose();
    clearUpdateSlowWatch();
  });

  autoUpdater.on('download-progress', (progress) => {
    try {
      const now = Date.now();
      if (!updateDownloadStartTs) {
        updateDownloadStartTs = now;
        try { logStartup('phase:download-start'); } catch(_){ }
      }
      const elapsedMs = now - updateDownloadStartTs;
      const elapsedSec = elapsedMs / 1000;
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
      const { mainWindow, splashWindow } = getWindows();
      safeSend(mainWindow, 'update-progress', detail);
      safeSend(splashWindow, 'update-progress', detail);
    } catch (e) {
      const { mainWindow, splashWindow } = getWindows();
      safeSend(mainWindow, 'update-progress', progress);
      safeSend(splashWindow, 'update-progress', progress);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    try { logStartup('phase:download-end:' + (info && info.version)); } catch(_){}
    const { mainWindow, splashWindow } = getWindows();
    safeSend(mainWindow, 'update-downloaded', info);
    safeSend(splashWindow, 'update-downloaded', info);
    clearUpdateSlowWatch();
  });
}

module.exports = {
  UPDATE_SLOW_THRESHOLD_MS,
  startUpdateSlowWatch,
  clearUpdateSlowWatch,
  formatEta,
  attachAutoUpdaterListeners,
};
