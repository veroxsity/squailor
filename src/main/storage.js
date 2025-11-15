const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const validators = require('../utils/validators');

// Default storage paths with new structure
const defaultUserDataPath = app.getPath('userData');
const defaultDataPath = path.join(defaultUserDataPath, 'data');
const defaultDocumentsStoragePath = path.join(defaultDataPath, 'documents');
const defaultSettingsPath = path.join(defaultDataPath, 'settings.json');
const defaultKeystorePath = path.join(defaultDataPath, 'keystore.enc');

// For portable mode, use directory where executable is located
const getExecutableDir = () => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  if (!app.isPackaged) {
    return app.getAppPath();
  }
  return path.dirname(app.getPath('exe'));
};

const appDirectory = getExecutableDir();
const localAppDataPath = path.join(appDirectory, 'data');
const localAppDocumentsPath = path.join(localAppDataPath, 'documents');
const localAppSettingsPath = path.join(localAppDataPath, 'settings.json');
const localAppKeystorePath = path.join(localAppDataPath, 'keystore.enc');

// Mutable storage paths (kept in module state to mirror original globals)
let dataPath = defaultDataPath;
let documentsStoragePath = defaultDocumentsStoragePath;
let settingsPath = defaultSettingsPath;
let keystorePath = defaultKeystorePath;

const defaultSettings = {
  storageLocation: 'appdata',
  dataPath: defaultDataPath,
  theme: 'dark',
  aiProvider: 'openrouter',
  aiModel: 'openai/gpt-4o-mini',
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
  maxImageCount: 3,
  processImages: true,
  maxCombinedFiles: 3,
  autoApplyUpdates: true,
  updateProvider: 'github',
  updateGenericUrl: ''
};

async function detectStorageLocation() {
  try {
    await fs.access(localAppDataPath);
    await fs.access(path.join(localAppDataPath, 'documents'));
    return { location: 'local-app', dataPath: localAppDataPath };
  } catch (_) {}

  try {
    await fs.access(defaultDataPath);
    await fs.access(path.join(defaultDataPath, 'documents'));
    return { location: 'appdata', dataPath: defaultDataPath };
  } catch (_) {}

  return { location: 'appdata', dataPath: defaultDataPath };
}

async function loadSettings() {
  try {
    const detected = await detectStorageLocation();
    const detectedSettingsPath = path.join(detected.dataPath, 'settings.json');
    try {
      const settingsData = await fs.readFile(detectedSettingsPath, 'utf8');
      const settings = JSON.parse(settingsData);

      dataPath = detected.dataPath;
      documentsStoragePath = path.join(dataPath, 'documents');
      settingsPath = path.join(dataPath, 'settings.json');
      keystorePath = path.join(dataPath, 'keystore.enc');

      if (!settings.aiProvider) settings.aiProvider = 'openrouter';
      if (!settings.aiConfig || typeof settings.aiConfig !== 'object') {
        settings.aiConfig = JSON.parse(JSON.stringify(defaultSettings.aiConfig));
      } else {
        const defaults = defaultSettings.aiConfig;
        for (const key of Object.keys(defaults)) {
          if (!(key in settings.aiConfig)) settings.aiConfig[key] = defaults[key];
        }
      }

      settings.storageLocation = detected.location;
      settings.dataPath = detected.dataPath;
      if (!settings.hasOwnProperty('autoApplyUpdates')) settings.autoApplyUpdates = true;
      if (!settings.updateProvider) settings.updateProvider = 'github';
      if (!settings.updateGenericUrl) settings.updateGenericUrl = '';

      return settings;
    } catch (_) {
      dataPath = detected.dataPath;
      documentsStoragePath = path.join(dataPath, 'documents');
      settingsPath = path.join(dataPath, 'settings.json');
      keystorePath = path.join(dataPath, 'keystore.enc');
      return { ...defaultSettings, storageLocation: detected.location, dataPath: detected.dataPath };
    }
  } catch (_) {
    return { ...defaultSettings };
  }
}

async function saveSettings(settings) {
  try {
    await fs.mkdir(dataPath, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function ensureDataDirectories(customPath = null) {
  try {
    const targetDataPath = customPath || dataPath;
    const targetDocsPath = path.join(targetDataPath, 'documents');
    await fs.mkdir(targetDataPath, { recursive: true });
    await fs.mkdir(targetDocsPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function changeStorageLocation(storageLocation) {
  if (!validators.isValidStorageLocation(storageLocation)) {
    return { success: false, error: 'Invalid storage location' };
  }

  const newDataPath = storageLocation === 'local-app' ? localAppDataPath : defaultDataPath;
  const newDocumentsPath = path.join(newDataPath, 'documents');
  const newSettingsPath = path.join(newDataPath, 'settings.json');
  const newKeystorePath = path.join(newDataPath, 'keystore.enc');

  if (newDataPath === dataPath) {
    return { success: true, path: documentsStoragePath, dataPath: newDataPath, errors: [] };
  }

  await fs.mkdir(newDocumentsPath, { recursive: true }).catch(() => {});

  const copyErrors = [];
  const oldDataPath = dataPath;
  const oldDocsPath = documentsStoragePath;
  const oldSettingsPath = settingsPath;
  const oldKeystorePath = keystorePath;

  try {
    const entries = await fs.readdir(oldDocsPath, { withFileTypes: true });
    const inventory = [];
    for (const entry of entries) {
      const source = path.join(oldDocsPath, entry.name);
      let size = 0;
      try {
        const stat = await fs.stat(source);
        size = stat.size || 0;
      } catch (_) {}
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
        } catch (_) {}
      } catch (err) {
        copyErrors.push({ item: entry.name, error: err.message });
      }
    }

    const integrity = {
      itemsAttempted: inventory.length,
      itemsFailed: copyErrors.length,
      totalBytes,
      migratedBytes,
      byteRatio: totalBytes ? (migratedBytes / totalBytes) : 1
    };

    await fs.copyFile(oldSettingsPath, newSettingsPath).catch(() => {});
    await fs.copyFile(oldKeystorePath, newKeystorePath).catch(() => {});

    if (copyErrors.length === 0 && integrity.byteRatio >= 0.999) {
      await fs.rm(oldDocsPath, { recursive: true, force: true }).catch(() => {});
      await fs.rm(oldDataPath, { recursive: true, force: true }).catch(() => {});
    }
  } catch (_) {}

  dataPath = newDataPath;
  documentsStoragePath = newDocumentsPath;
  settingsPath = newSettingsPath;
  keystorePath = newKeystorePath;

  const currentSettings = await loadSettings();
  const updatedSettings = { ...currentSettings, storageLocation, dataPath: newDataPath };
  await saveSettings(updatedSettings);

  return { success: copyErrors.length === 0, path: newDocumentsPath, dataPath: newDataPath, errors: copyErrors };
}

async function getStorageStats() {
  try {
    const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory());
    let totalSize = 0;
    let fileCount = 0;
    for (const folder of folders) {
      const folderPath = path.join(documentsStoragePath, folder.name);
      const files = await fs.readdir(folderPath);
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            totalSize += stat.size;
            fileCount += 1;
          }
        } catch (_) {}
      }
    }
    const totalSizeMB = Math.round((totalSize / (1024 * 1024)) * 10) / 10;
    return { success: true, fileCount, totalSizeMB };
  } catch (error) {
    return { success: false, error: error.message, fileCount: 0, totalSizeMB: 0 };
  }
}

function getPaths() {
  return {
    defaultDataPath,
    defaultDocumentsStoragePath,
    defaultSettingsPath,
    defaultKeystorePath,
    appDirectory,
    localAppDataPath,
    localAppDocumentsPath,
    localAppSettingsPath,
    localAppKeystorePath,
    dataPath,
    documentsStoragePath,
    settingsPath,
    keystorePath,
  };
}

module.exports = {
  defaultSettings,
  loadSettings,
  saveSettings,
  ensureDataDirectories,
  changeStorageLocation,
  getStorageStats,
  getPaths,
};
