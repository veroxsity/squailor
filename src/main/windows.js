const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { attachNetworkMonitoring } = require('./networkDiagnostics');
const { logStartup } = require('./startupLog');

let mainWindow;
let splashWindow;
const appStartTime = Date.now();
let splashShownAt = 0;
const MIN_SPLASH_TIME = 1500; // ms

function getMainWindow() {
  return mainWindow;
}

function getSplashWindow() {
  return splashWindow;
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

function scheduleSplashClose(minDelay = MIN_SPLASH_TIME) {
  try {
    if (!splashWindow || (splashWindow.isDestroyed && splashWindow.isDestroyed())) return;
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
      preload: path.join(__dirname, '..', 'preload', 'index.js')
    }
  });

  Menu.setApplicationMenu(null);

  splashWindow.loadFile('src/splash.html');

  splashWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      try { splashShownAt = Date.now(); } catch (e) { splashShownAt = Date.now(); }
      try { logStartup(`splashShown:${splashShownAt}`); } catch (_) {}
    }, 30);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: false,
      nodeIntegration: true
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png')
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile('src/index.html');

  // Suppress DevTools autofill warnings
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.devToolsWebContents?.executeJavaScript(`
      const originalWarn = console.warn;
      const originalError = console.error;
      console.warn = (...args) => {
        const msg = args.join(' ');
        if (!msg.includes('Autofill')) originalWarn(...args);
      };
      console.error = (...args) => {
        const msg = args.join(' ');
        if (!msg.includes('Autofill')) originalError(...args);
      };
    `).catch(() => {});
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  attachNetworkMonitoring();

  mainWindow.once('ready-to-show', () => {
    const readyTime = Date.now();
    console.log(`Main window ready-to-show (startup ${readyTime - appStartTime} ms)`);
    try { logStartup(`mainReady:${readyTime}:${readyTime - appStartTime}`); } catch (_) {}
    const now = Date.now();
    const shownDelta = splashShownAt ? (now - splashShownAt) : Infinity;

    const finish = () => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        try { splashWindow.close(); } catch (e) { /* ignore */ }
      }
      try { logStartup(`mainShown:${Date.now()}`); } catch (_) {}
      mainWindow.show();
    };

    if (!splashShownAt) {
      const timeout = Math.max(100, MIN_SPLASH_TIME);
      setTimeout(() => finish(), timeout);
    } else if (shownDelta < MIN_SPLASH_TIME) {
      setTimeout(() => finish(), MIN_SPLASH_TIME - shownDelta);
    } else {
      finish();
    }
  });

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

function setupAppLifecycle() {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

module.exports = {
  createSplashWindow,
  createMainWindow,
  scheduleSplashClose,
  setupAppLifecycle,
  getMainWindow,
  getSplashWindow,
  safeSend,
};
