const fs = require('fs').promises;
const { getPaths, loadSettings, saveSettings } = require('./storage');
const validators = require('../utils/validators');

let encrypt;
let decrypt;
let validateEncryption;

async function ensureEncryptionLoaded() {
  if (!validateEncryption || !encrypt || !decrypt) {
    const enc = require('../utils/encryption');
    encrypt = enc.encrypt;
    decrypt = enc.decrypt;
    validateEncryption = enc.validateEncryption;
  }
}

async function readKeystoreMap() {
  await ensureEncryptionLoaded();
  try {
    const { keystorePath } = getPaths();
    await fs.access(keystorePath);
  } catch (_) {
    return { map: {}, migrated: false, legacy: false };
  }
  try {
    const { keystorePath } = getPaths();
    const encrypted = await fs.readFile(keystorePath, 'utf8');
    if (!encrypted) return { map: {}, migrated: false, legacy: false };
    const plain = decrypt(encrypted);
    if (plain == null) return { map: {}, migrated: false, legacy: false };
    try {
      const parsed = JSON.parse(plain);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { map: parsed, migrated: false, legacy: false };
      }
    } catch (_) {
      // fallthrough to legacy
    }
    return { map: { openrouter: { apiKey: plain } }, migrated: true, legacy: true };
  } catch (error) {
    console.error('Failed to read keystore:', error && error.message);
    return { map: {}, migrated: false, legacy: false };
  }
}

async function writeKeystoreMap(map) {
  await ensureEncryptionLoaded();
  try {
    const { dataPath, keystorePath } = getPaths();
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

// IPC-friendly handlers

async function validateApiKeyHandler(arg) {
  try {
    const { getAdapter } = require('../utils/ai/providers/registry');
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

    if (!apiKey) {
      const { map } = await readKeystoreMap();
      if (map[provider] && map[provider].apiKey) {
        apiKey = map[provider].apiKey;
      }
    }

    if (!apiKey) {
      return { valid: false, error: 'Missing API key for provider: ' + provider };
    }

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
}

async function saveApiKeyHandler(apiKey) {
  try {
    await ensureEncryptionLoaded();
    if (!validateEncryption()) {
      return { success: false, error: 'Encryption validation failed' };
    }
    const { map } = await readKeystoreMap();
    const provider = await getCurrentProvider();
    const next = { ...map, [provider]: { apiKey } };
    const res = await writeKeystoreMap(next);
    if (!res.success) return res;
    return { success: true };
  } catch (error) {
    console.error('Failed to save API key:', error);
    return { success: false, error: error.message };
  }
}

async function loadApiKeyHandler() {
  try {
    const provider = await getCurrentProvider();
    const { map } = await readKeystoreMap();
    const apiKey = (map[provider] && map[provider].apiKey) || '';
    return { success: true, apiKey };
  } catch (error) {
    console.error('Failed to load API key:', error);
    return { success: false, error: error.message, apiKey: '' };
  }
}

async function deleteApiKeyHandler() {
  try {
    const { keystorePath } = getPaths();
    const provider = await getCurrentProvider();
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
    console.error('Failed to delete API key:', error);
    return { success: false, error: error.message };
  }
}

async function saveProviderCredentialsHandler({ provider, apiKey, config }) {
  try {
    if (!validators.isValidProvider(provider)) return { success: false, error: 'Invalid provider' };
    await ensureEncryptionLoaded();
    if (!validateEncryption()) return { success: false, error: 'Encryption validation failed' };
    const { map } = await readKeystoreMap();
    if (apiKey) map[provider] = { apiKey };
    const res = await writeKeystoreMap(map);
    if (!res.success) return res;

    const settings = await loadSettings();
    settings.aiConfig = settings.aiConfig || {};
    const sanitizedCfg = validators.validateProviderPayload({ provider, config }).config || {};
    settings.aiConfig[provider] = { ...(settings.aiConfig[provider] || {}), ...sanitizedCfg };
    await saveSettings(settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function loadProviderCredentialsHandler(provider) {
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
}

async function deleteProviderCredentialsHandler(provider) {
  try {
    const { keystorePath } = getPaths();
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
}

module.exports = {
  ensureEncryptionLoaded,
  readKeystoreMap,
  writeKeystoreMap,
  getCurrentProvider,
  validateApiKeyHandler,
  saveApiKeyHandler,
  loadApiKeyHandler,
  deleteApiKeyHandler,
  saveProviderCredentialsHandler,
  loadProviderCredentialsHandler,
  deleteProviderCredentialsHandler,
};
