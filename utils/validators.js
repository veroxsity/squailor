const path = require('path');

// Allowed values
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.pptx', '.ppt', '.docx', '.doc']);
const ALLOWED_SUMMARY_TYPES = new Set(['short', 'normal', 'longer']);
const ALLOWED_TONES = new Set(['casual', 'formal', 'informative', 'eli5']);
const ALLOWED_STYLES = new Set(['teaching', 'notes']);
const ALLOWED_PROVIDERS = new Set([
  'openrouter', 'openai', 'anthropic', 'google', 'groq', 'mistral', 'cohere', 'xai', 'azure-openai', 'custom-openai'
]);
const ALLOWED_STORAGE_LOCATIONS = new Set(['appdata', 'local-app']);

function isString(v) { return typeof v === 'string'; }
function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }

function isAllowedFilePath(p) {
  if (!isNonEmptyString(p)) return false;
  const ext = path.extname(p).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function sanitizeSummaryType(v) {
  if (isString(v) && ALLOWED_SUMMARY_TYPES.has(v)) return v;
  return 'normal';
}

function sanitizeTone(v) {
  if (isString(v) && ALLOWED_TONES.has(v)) return v;
  return 'casual';
}

function sanitizeStyle(v) {
  if (isString(v) && ALLOWED_STYLES.has(v)) return v;
  return 'teaching';
}

function sanitizeModel(v) {
  if (!isString(v)) return 'openai/gpt-4o-mini';
  const s = v.trim();
  if (!s) return 'openai/gpt-4o-mini';
  // Cap length to avoid absurd strings being stored
  return s.slice(0, 200);
}

function sanitizeBoolean(v, fallback) {
  if (typeof v === 'boolean') return v;
  return !!fallback;
}

function isValidFolderId(id) {
  return isString(id) && /^[a-z0-9]{8}$/.test(id);
}

function sanitizeProvider(v) {
  if (isString(v) && ALLOWED_PROVIDERS.has(v)) return v;
  return 'openrouter';
}

function isValidProvider(v) {
  return isString(v) && ALLOWED_PROVIDERS.has(v);
}

function isValidStorageLocation(v) {
  return isString(v) && ALLOWED_STORAGE_LOCATIONS.has(v);
}

function sanitizeSettings(input) {
  const out = Object.assign({}, input || {});
  if (out.theme !== 'dark' && out.theme !== 'light') delete out.theme;
  if (!isValidProvider(out.aiProvider)) delete out.aiProvider;
  if (out.aiModel) out.aiModel = sanitizeModel(out.aiModel);
  if (out.processImages !== undefined) out.processImages = sanitizeBoolean(out.processImages, true);
  if (out.autoApplyUpdates !== undefined) out.autoApplyUpdates = sanitizeBoolean(out.autoApplyUpdates, true);

  if (out.maxImageCount !== undefined) {
    const n = Number(out.maxImageCount);
    if (Number.isFinite(n)) out.maxImageCount = Math.max(0, Math.min(10, Math.trunc(n)));
    else delete out.maxImageCount;
  }
  if (out.maxCombinedFiles !== undefined) {
    const n = Number(out.maxCombinedFiles);
    if (Number.isFinite(n)) out.maxCombinedFiles = Math.max(1, Math.min(10, Math.trunc(n)));
    else delete out.maxCombinedFiles;
  }

  // Sanitize aiConfig per provider for known keys only
  if (out.aiConfig && typeof out.aiConfig === 'object') {
    const cleaned = {};
    for (const prov of Object.keys(out.aiConfig)) {
      if (!ALLOWED_PROVIDERS.has(prov)) continue;
      const cfg = out.aiConfig[prov];
      if (!cfg || typeof cfg !== 'object') continue;
      if (prov === 'azure-openai') {
        cleaned[prov] = {
          endpoint: isString(cfg.endpoint) ? cfg.endpoint : '',
          deployment: isString(cfg.deployment) ? cfg.deployment : '',
          apiVersion: isString(cfg.apiVersion) ? cfg.apiVersion : '2024-08-01-preview'
        };
      } else if (prov === 'custom-openai') {
        cleaned[prov] = {
          baseURL: isString(cfg.baseURL) ? cfg.baseURL : ''
        };
      } else {
        cleaned[prov] = {}; // other providers: no non-secret config currently
      }
    }
    out.aiConfig = cleaned;
  }

  return out;
}

function validateProcessDocumentsArgs({ filePaths, summaryType, responseTone, model, summaryStyle, processImagesFlag }) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return { ok: false, error: 'No files provided' };
  }
  const bad = filePaths.find(p => !isAllowedFilePath(p));
  if (bad) {
    return { ok: false, error: `Unsupported file type for: ${path.basename(String(bad))}` };
  }
  return {
    ok: true,
    value: {
      summaryType: sanitizeSummaryType(summaryType),
      responseTone: sanitizeTone(responseTone),
      model: sanitizeModel(model),
      summaryStyle: sanitizeStyle(summaryStyle),
      processImages: sanitizeBoolean(processImagesFlag, true)
    }
  };
}

function validateCombinedArgs(args) {
  // Reuse same validation, but allow empty filePaths check to emit a specific shape handled by combined flow
  return validateProcessDocumentsArgs(args);
}

function validateSaveSummaryArgs({ fileName, summary }) {
  if (!isNonEmptyString(fileName)) return { ok: false, error: 'Invalid file name' };
  if (!isNonEmptyString(summary)) return { ok: false, error: 'Empty summary' };
  return { ok: true };
}

function validateProviderPayload(arg) {
  const out = { provider: sanitizeProvider(arg && arg.provider) };
  if (arg && typeof arg === 'object') {
    if (isNonEmptyString(arg.apiKey)) out.apiKey = arg.apiKey;
    const cfg = arg.config || {};
    if (out.provider === 'azure-openai') {
      out.config = {
        endpoint: isString(cfg.endpoint) ? cfg.endpoint : '',
        deployment: isString(cfg.deployment) ? cfg.deployment : '',
        apiVersion: isString(cfg.apiVersion) ? cfg.apiVersion : '2024-08-01-preview'
      };
    } else if (out.provider === 'custom-openai') {
      out.config = { baseURL: isString(cfg.baseURL) ? cfg.baseURL : '' };
    } else {
      out.config = {};
    }
  }
  return out;
}

module.exports = {
  ALLOWED_EXTENSIONS,
  ALLOWED_SUMMARY_TYPES,
  ALLOWED_TONES,
  ALLOWED_STYLES,
  ALLOWED_PROVIDERS,
  isAllowedFilePath,
  sanitizeSummaryType,
  sanitizeTone,
  sanitizeStyle,
  sanitizeModel,
  sanitizeBoolean,
  isValidFolderId,
  sanitizeProvider,
  isValidProvider,
  isValidStorageLocation,
  sanitizeSettings,
  validateProcessDocumentsArgs,
  validateCombinedArgs,
  validateSaveSummaryArgs,
  validateProviderPayload
};
