const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const os = require('os');
const crypto = require('crypto');
const { app } = require('electron');
const { loadSettings } = require('./storage');
const { logStartup } = require('./startupLog');
const { safeSend } = require('./windows');

// IPC: allow renderer to request update checks and trigger install
async function handleCheckForUpdates() {
  try {
    const { autoUpdater } = require('electron-updater');
    try { logStartup('phase:check-for-updates:ipc'); } catch (_) {}
    // Reconfigure feed dynamically in case user changed provider in settings
    try {
      const s = await loadSettings();
      if (s.updateProvider === 'generic' && s.updateGenericUrl && /^https?:\/\//i.test(s.updateGenericUrl)) {
        const base = String(s.updateGenericUrl).replace(/\/+$/, '');
        autoUpdater.setFeedURL({ provider: 'generic', url: base });
        try { logStartup('phase:feed-configured:generic:' + base); } catch (_) {}
      } else {
        try { logStartup('phase:feed-configured:github'); } catch (_) {}
      }
    } catch (_) {}
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message };
  }
}

async function handleInstallUpdate(restartImmediately = true) {
  try {
    const { autoUpdater } = require('electron-updater');
    try { logStartup('phase:install-trigger:ipc:' + (restartImmediately ? 'restart-now' : 'restart-later')); } catch (_) {}
    try {
      try { logStartup('ipcInstall:pid:' + process.pid); } catch (e) {}
      try { logStartup('ipcInstall:execPath:' + process.execPath); } catch (e) {}
      const procName = path.basename(process.execPath);
      const { exec } = require('child_process');
      exec(`tasklist /FI "IMAGENAME eq ${procName}" /V`, { windowsHide: true }, (err, stdout) => {
        try {
          if (err) {
            try { logStartup('ipcTasklistError:' + (err && err.message)); } catch (e) {}
          } else {
            try { logStartup('ipcTasklist:' + stdout.replace(/\r?\n/g, ' || ')); } catch (e) {}
          }
        } catch (e) { /* ignore */ }
      });

      // Close main window to release handles; splash stays visible
      const { getMainWindow } = require('./windows');
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        try { win.destroy(); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }

    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(true, restartImmediately);
        try { app.quit(); } catch (e) { /* ignore */ }
        setTimeout(() => {
          try { process.exit(0); } catch (e) { /* ignore */ }
        }, 1500);
      } catch (err) {
        try { logStartup('ipcQuitAndInstallError:' + (err && err.message)); } catch (e) {}
      }
    }, 250);
    return { success: true };
  } catch (err) {
    return { success: false, error: err && err.message };
  }
}

// Manual direct installer download (fallback path)
async function handleManualDownloadUpdate(mainWindow) {
  try {
    try { logStartup('phase:manual-download:start'); } catch (_) {}
    const tmpDir = os.tmpdir();
    const settings = await loadSettings();
    const useGeneric = settings.updateProvider === 'generic' && settings.updateGenericUrl && /^https?:\/\//i.test(settings.updateGenericUrl);
    const baseGeneric = useGeneric ? String(settings.updateGenericUrl).replace(/\/+$/, '') : '';
    const owner = 'veroxsity';
    const repo = 'Squailor';
    const latestUrl = useGeneric
      ? `${baseGeneric}/latest.yml`
      : `https://github.com/${owner}/${repo}/releases/latest/download/latest.yml`;
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
    await fs.writeFile(latestYmlPath, ymlContent, 'utf8').catch(() => {});
    const versionMatch = ymlContent.match(/^version:\s*([\w.-]+)/m);
    const pathMatch = ymlContent.match(/^path:\s*(.+\.exe)$/m);
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
    const downloadUrl = useGeneric
      ? `${baseGeneric}/${encodeURIComponent(exeFileName)}`
      : `https://github.com/${owner}/${repo}/releases/download/v${version}/${encodeURIComponent(exeFileName)}`;
    const outPath = path.join(tmpDir, exeFileName);
    const hash = crypto.createHash('sha512');
    let transferred = 0;
    let total = 0;
    const startedAt = Date.now();
    await new Promise((resolve, reject) => {
      https.get(downloadUrl, (res) => {
        if (res.statusCode !== 200) {
          safeSend(mainWindow, 'manual-update-error', { message: 'Installer download failed: ' + res.statusCode });
          try { logStartup('phase:manual-download:error:http-' + res.statusCode); } catch (_) {}
          return reject(new Error('HTTP ' + res.statusCode));
        }
        total = parseInt(res.headers['content-length'] || '0', 10) || 0;
        const fileStream = require('fs').createWriteStream(outPath);
        res.on('data', chunk => {
          hash.update(chunk);
          transferred += chunk.length;
          fileStream.write(chunk);
          const elapsed = (Date.now() - startedAt) / 1000;
          const speed = elapsed > 0 ? transferred / elapsed : 0;
          const percent = total > 0 ? (transferred / total) * 100 : null;
          safeSend(mainWindow, 'manual-update-progress', {
            transferred,
            total,
            percent,
            speedBytesPerSecond: Math.round(speed),
            speedMBps: Number((speed / 1024 / 1024).toFixed(2)),
            transferredMB: Number((transferred / 1024 / 1024).toFixed(2)),
            totalMB: total ? Number((total / 1024 / 1024).toFixed(2)) : null,
            elapsedSeconds: Number(elapsed.toFixed(1)),
            phase: 'downloading',
          });
        });
        res.on('end', () => {
          fileStream.end();
          resolve();
        });
        res.on('error', (e) => {
          safeSend(mainWindow, 'manual-update-error', { message: e.message });
          try { logStartup('phase:manual-download:error:' + e.message); } catch (_) {}
          reject(e);
        });
      }).on('error', (e) => {
        safeSend(mainWindow, 'manual-update-error', { message: e.message });
        try { logStartup('phase:manual-download:error:' + e.message); } catch (_) {}
        reject(e);
      });
    });
    const actualSha512 = hash.digest('base64');
    if (actualSha512 !== expectedSha512) {
      safeSend(mainWindow, 'manual-update-verify-failed', { expected: expectedSha512, actual: actualSha512 });
      try { logStartup('phase:manual-download:verify-failed'); } catch (_) {}
      return { success: false, error: 'SHA512 mismatch' };
    }
    try { logStartup('phase:manual-download:complete'); } catch (_) {}
    safeSend(mainWindow, 'manual-update-complete', { path: outPath, version });
    try {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
      const { spawn } = require('child_process');
      const child = spawn(outPath, [], { detached: true, stdio: 'ignore' });
      child.unref();
      try { logStartup('phase:manual-install:spawned'); } catch (_) {}
      setTimeout(() => {
        try { app.quit(); } catch (_) {}
        setTimeout(() => { try { process.exit(0); } catch (_) {} }, 1200);
      }, 400);
    } catch (e) {
      safeSend(mainWindow, 'manual-update-error', { message: 'Installer launch failed: ' + e.message });
      try { logStartup('phase:manual-install:error:' + e.message); } catch (_) {}
      return { success: false, error: e.message };
    }
    return { success: true };
  } catch (err) {
    try { logStartup('phase:manual-download:error:' + (err && err.message)); } catch (_) {}
    return { success: false, error: err && err.message };
  }
}

// Fetch latest release metadata without downloading installer
async function handleGetLatestReleaseInfo() {
  try {
    const s = await loadSettings();
    const owner = 'veroxsity';
    const repo = 'Squailor';
    const useGeneric = s.updateProvider === 'generic' && s.updateGenericUrl && /^https?:\/\//i.test(s.updateGenericUrl);
    const baseGeneric = useGeneric ? String(s.updateGenericUrl).replace(/\/+$/, '') : '';
    const latestUrl = useGeneric
      ? `${baseGeneric}/latest.yml`
      : `https://github.com/${owner}/${repo}/releases/latest/download/latest.yml`;
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
      sha512,
    };
  } catch (e) {
    return { success: false, error: e && e.message };
  }
}

module.exports = {
  handleCheckForUpdates,
  handleInstallUpdate,
  handleManualDownloadUpdate,
  handleGetLatestReleaseInfo,
};
