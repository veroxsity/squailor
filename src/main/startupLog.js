const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Append debug startup timestamps to a log file in userData for packaged apps
async function logStartup(message) {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, 'startup.log');
    const entry = `${new Date().toISOString()} ${message}\n`;
    await fs.mkdir(logDir, { recursive: true }).catch(() => {});
    await fs.appendFile(logPath, entry, 'utf8');
  } catch (err) {
    try { console.error('startup log failed', err.message); } catch (e) { }
  }
}

module.exports = { logStartup };
