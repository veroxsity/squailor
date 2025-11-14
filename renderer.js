let selectedFiles = [];
let apiKey = '';
let currentTheme = localStorage.getItem('app_theme') || 'dark';
let selectedModel = localStorage.getItem('ai_model') || 'openai/gpt-4o-mini';  // Updated default
let summaryHistory = [];
let currentProvider = 'openrouter';
const SUMMARY_PREVIEW_LIMIT = 600;
let isProcessingBatch = false;
let processingBatchSize = 0;

// DOM Elements (removed legacy apiKey elements)
const selectFilesBtn = document.getElementById('selectFiles');
const processFilesBtn = document.getElementById('processFiles');
let processCombined = false; // user choice: combined vs individual
const combinedToggle = document.getElementById('combinedToggle');
const fileListDiv = document.getElementById('fileList');
const resultsSection = document.getElementById('resultsSection');
const resultsDiv = document.getElementById('results');
const modelSelect = document.getElementById('modelSelect');
const homeProviderBadge = document.getElementById('homeProviderBadge');
const heroProviderAlert = document.getElementById('heroProviderAlert');
const heroProviderCta = document.getElementById('heroProviderCta');
const heroStatSummaries = document.getElementById('heroStatSummaries');
const heroStatQueue = document.getElementById('heroStatQueue');
const heroStatLastRun = document.getElementById('heroStatLastRun');
const historyListDiv = document.getElementById('historyList');
const emptyHistoryDiv = document.getElementById('emptyHistory');
const clearHistoryBtn = document.getElementById('clearHistory');
const totalSummariesSpan = document.getElementById('totalSummaries');
const totalDocumentsSpan = document.getElementById('totalDocuments');
const appHeading = document.getElementById('appHeading');
const appSubtitle = document.getElementById('appSubtitle');
const appContent = document.querySelector('.app-content');
const queueCountEl = document.getElementById('queueCount');
const queueTokensEl = document.getElementById('queueTokens');
const statusProviderValue = document.getElementById('statusProviderValue');
const statusProviderMeta = document.getElementById('statusProviderMeta');
const statusQueueValue = document.getElementById('statusQueueValue');
const statusQueueMeta = document.getElementById('statusQueueMeta');
const statusNetworkValue = document.getElementById('statusNetworkValue');
const statusNetworkMeta = document.getElementById('statusNetworkMeta');
const railItems = Array.from(document.querySelectorAll('.rail-item'));
const pageElements = {
  home: document.getElementById('homePage'),
  history: document.getElementById('historyPage'),
  summary: document.getElementById('summaryViewPage'),
  settings: document.getElementById('settingsPage')
};
const headerCopy = {
  home: {
    title: 'Document workspace',
    subtitle: 'Transform your documents into concise, intelligent summaries'
  },
  history: {
    title: 'Summary history',
    subtitle: 'Search, filter, and revisit previous summaries.'
  },
  settings: {
    title: 'App settings',
    subtitle: 'Manage API keys, models, storage, and preferences.'
  },
  summary: {
    title: 'Summary workspace',
    subtitle: 'Review generated notes, explore context, and chat with your AI assistant.'
  }
};
let setSettingsPanelActive = null;
let pendingSettingsPanel = null;

// Global processing progress listener state
let progressListenerAttached = false;
let currentFileIndexMap = new Map();

function attachProcessingProgressListener() {
  if (progressListenerAttached) return;
  if (!window.electronAPI || !window.electronAPI.onProcessingProgress) return;
  window.electronAPI.onProcessingProgress((data) => {
    // console.log('Processing:', data); // optionally gate under dev
    // Resolve file index from the active run's map
    const fileIndex = currentFileIndexMap.get(data.fileName);
    if (fileIndex === undefined) return; // ignore stale events or unrelated

    const statusElement = document.getElementById(`file-status-${fileIndex}`);
    const progressElement = document.getElementById(`file-progress-${fileIndex}`);
    if (!statusElement) return;

    const stageConfig = {
      'init': { emoji: '🔄', color: '#667eea' },
      'duplicate-check': { emoji: '🔍', color: '#667eea' },
      'cleanup': { emoji: '🧹', color: '#f59e0b' },
      'setup': { emoji: '📁', color: '#667eea' },
      'storing': { emoji: '💾', color: '#667eea' },
      'extracting': { emoji: '📖', color: '#667eea' },
      'extracted': { emoji: '✅', color: '#10b981' },
      'combining': { emoji: '🧩', color: '#8b5cf6' },
      'summarizing': { emoji: '🤖', color: '#8b5cf6' },
      'saving': { emoji: '✅', color: '#10b981' },
      'complete': { emoji: '✓', color: '#10b981' },
      'cancelled': { emoji: '⏸️', color: '#ef4444' },
      'error': { emoji: '❌', color: '#ef4444' }
    };
    const config = stageConfig[data.stage] || { emoji: '⏳', color: '#667eea' };

    if (data.stage === 'error' && data.errorType) {
      if (data.errorType === 'rate-limit') {
        config.emoji = '⏱️';
        config.color = '#f59e0b';
      } else if (data.errorType === 'quota') {
        config.emoji = '💳';
        config.color = '#ef4444';
      } else if (data.errorType === 'api-key') {
        config.emoji = '🔑';
        config.color = '#ef4444';
      }
    }

    let statusText = `${config.emoji} ${data.status}`;
    if (data.stage !== 'error') {
      if (data.fileIndex && data.totalFiles) {
        statusText = `[${data.fileIndex}/${data.totalFiles}] ${statusText}`;
      }
      if (data.charCount) {
        statusText += ` (${data.charCount.toLocaleString()} chars)`;
      }
    }
    statusElement.textContent = statusText;
    statusElement.style.color = config.color;
    statusElement.style.fontWeight = '500';

    if (data.stage === 'summarizing' && data.delta) {
      let ticker = statusElement.nextElementSibling;
      const id = `ai-ticker-${fileIndex}`;
      if (!ticker || !ticker.classList || !ticker.classList.contains('ai-ticker')) {
        ticker = document.createElement('div');
        ticker.className = 'ai-ticker';
        ticker.id = id;
        statusElement.parentNode.insertBefore(ticker, statusElement.nextSibling);
      }
      ticker.textContent = (ticker.textContent + data.delta).slice(-180);
    }

    if (data.errorType === 'rate-limit') {
      statusElement.style.whiteSpace = 'normal';
      statusElement.style.lineHeight = '1.4';
    }

    // Friendly error hint toast (once per file & error type)
    try {
      if (data.stage === 'error' && data.errorType) {
        if (!window.__shownErrorHints) window.__shownErrorHints = new Set();
        const key = data.fileName + ':' + data.errorType;
        if (!window.__shownErrorHints.has(key)) {
          window.__shownErrorHints.add(key);
          const hints = {
            'rate-limit': 'Rate limit reached. Try again shortly or switch to a less-used model/provider.',
            'quota': 'Quota exceeded. Check your account usage or upgrade your plan.',
            'api-key': 'Invalid API key. Verify the key in Settings → AI Providers.'
          };
            const msg = hints[data.errorType] || ('Error processing ' + data.fileName);
            showToast(msg, 'error', 6000);
        }
      }
    } catch (_) {}

    if (progressElement) {
      if (data.stage === 'complete' || data.stage === 'error' || data.stage === 'cancelled') {
        progressElement.style.display = 'none';
      } else {
        progressElement.style.display = 'block';
        const progressFill = progressElement.querySelector('.progress-fill');
        if (progressFill) {
          const stageProgress = {
            'init': '10%',
            'duplicate-check': '20%',
            'setup': '30%',
            'storing': '40%',
            'extracting': '60%',
            'extracted': '60%',
            'combining': '70%',
            'summarizing': '85%',
            'saving': '95%'
          };
          progressFill.style.width = stageProgress[data.stage] || '50%';
          progressFill.style.background = `linear-gradient(90deg, ${config.color}, ${config.color}cc)`;
        }
      }
    }
  });
  progressListenerAttached = true;
}

// attach once on load
attachProcessingProgressListener();

// Storage settings elements
const storageAppDataRadio = document.getElementById('storageAppData');
const storageLocalAppRadio = document.getElementById('storageLocalApp');
const saveStorageLocationBtn = document.getElementById('saveStorageLocation');
const storageStatus = document.getElementById('storageStatus');
const appdataPathDiv = document.getElementById('appdataPath');
const localAppPathDiv = document.getElementById('localAppPath');
const statsFileCount = document.getElementById('statsFileCount');
const statsTotalSize = document.getElementById('statsTotalSize');
// Image settings elements
const maxImagesInput = document.getElementById('maxImagesInput');
const saveMaxImagesBtn = document.getElementById('saveMaxImages');
const maxImagesStatus = document.getElementById('maxImagesStatus');
const maxCombinedInput = document.getElementById('maxCombinedInput');
const combinedHelperLabel = document.getElementById('combinedHelperLabel');
// Home page: process images toggle
const processImagesToggle = document.getElementById('processImagesToggle');
let processImages = true;

// Diagnostics elements
const diagRefreshBtn = document.getElementById('diagRefreshBtn');
const diagExportBtn = document.getElementById('diagExportBtn');
const diagClearBtn = document.getElementById('diagClearBtn');
const diagList = document.getElementById('diagList');
const diagCount = document.getElementById('diagCount');

// Provider display names
const providerDisplayNames = {
  'openrouter': 'OpenRouter',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'cohere': 'Cohere',
  'groq': 'Groq',
  'mistral': 'Mistral',
  'xai': 'xAI',
  'azure-openai': 'Azure OpenAI',
  'custom-openai': 'Custom OpenAI'
};

// Populate model select based on provider
async function populateModels(provider, hasApiKey) {
  const modelSelect = document.getElementById('modelSelect');
  const currentProviderLabel = document.getElementById('currentProviderLabel');
  
  if (!modelSelect) {
    updateHomeProviderBadge(provider, hasApiKey);
    return;
  }
  
  // Update provider label
  if (currentProviderLabel) {
    const displayName = providerDisplayNames[provider] || provider;
    currentProviderLabel.textContent = `Current provider: ${displayName}`;
  }

  updateHomeProviderBadge(provider, hasApiKey);
  
  // If no API key, show message
  if (!hasApiKey) {
    modelSelect.innerHTML = '<option value="">No API key set - go to Settings</option>';
    modelSelect.disabled = true;
    return;
  }
  
  // Get models from backend
  try {
    const result = await window.electronAPI.getProviderModels(provider);
    if (result.success && result.models && result.models.length > 0) {
      // Build optgroups
      const groups = {};
      result.models.forEach(model => {
        if (!groups[model.group]) {
          groups[model.group] = [];
        }
        groups[model.group].push(model);
      });
      
      let html = '';
      Object.keys(groups).forEach(groupName => {
        html += `<optgroup label="${groupName}">`;
        groups[groupName].forEach(model => {
          html += `<option value="${model.value}">${model.label}</option>`;
        });
        html += '</optgroup>';
      });
      
      modelSelect.innerHTML = html;
      modelSelect.disabled = false;
      
      // Restore selected model if it exists
      if (selectedModel && Array.from(modelSelect.options).some(opt => opt.value === selectedModel)) {
        modelSelect.value = selectedModel;
      } else {
        // Default to first option
        modelSelect.selectedIndex = 0;
        selectedModel = modelSelect.value;
      }
    } else {
      modelSelect.innerHTML = '<option value="">No models available</option>';
      modelSelect.disabled = true;
    }
  } catch (error) {
    console.error('Failed to load models:', error);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
    modelSelect.disabled = true;
  }
}

function updateHomeProviderBadge(provider, hasApiKey) {
  if (!homeProviderBadge) return;
  const displayName = providerDisplayNames[provider] || provider;
  const text = hasApiKey ? `Provider: ${displayName}` : `Provider: ${displayName} (no key)`;
  homeProviderBadge.textContent = text;
  homeProviderBadge.classList.remove('success', 'warning');
  homeProviderBadge.classList.add(hasApiKey ? 'success' : 'warning');
  updateHeroProviderState(hasApiKey);
}

function updateHeroProviderState(hasApiKey) {
  if (heroProviderAlert) {
    heroProviderAlert.hidden = !!hasApiKey;
  }
  if (heroProviderCta) {
    heroProviderCta.textContent = hasApiKey ? 'Manage providers' : 'Add API key';
  }
  if (statusProviderValue) {
    const displayName = providerDisplayNames[currentProvider] || currentProvider;
    statusProviderValue.textContent = displayName;
  }
  if (statusProviderMeta) {
    statusProviderMeta.textContent = hasApiKey ? 'Connected' : 'Add API key';
    statusProviderMeta.dataset.state = hasApiKey ? 'ok' : 'warn';
  }
}

function updateHeroStats() {
  if (heroStatSummaries) {
    heroStatSummaries.textContent = summaryHistory.length ? summaryHistory.length.toString() : '—';
  }
  if (heroStatQueue) {
    heroStatQueue.textContent = selectedFiles.length.toString();
  }
  if (heroStatLastRun) {
    heroStatLastRun.textContent = formatHeroLastRun();
  }
}

function updateQueueStatusChip() {
  if (!statusQueueValue && !statusQueueMeta) return;
  const queueCount = isProcessingBatch
    ? Math.max(processingBatchSize, selectedFiles.length, 1)
    : selectedFiles.length;
  if (statusQueueValue) {
    const label = queueCount === 1 ? 'file' : 'files';
    statusQueueValue.textContent = `${queueCount} ${label}`;
  }
  if (statusQueueMeta) {
    if (isProcessingBatch) {
      statusQueueMeta.textContent = 'Processing…';
      statusQueueMeta.dataset.state = 'busy';
    } else if (selectedFiles.length > 0) {
      statusQueueMeta.textContent = 'Ready to run';
      statusQueueMeta.dataset.state = 'warn';
    } else {
      statusQueueMeta.textContent = 'Queue idle';
      statusQueueMeta.dataset.state = 'idle';
    }
  }
}

function updateNetworkStatusChip() {
  if (!statusNetworkValue && !statusNetworkMeta) return;
  const online = navigator.onLine;
  if (statusNetworkValue) {
    statusNetworkValue.textContent = online ? 'Online' : 'Offline';
  }
  if (statusNetworkMeta) {
    statusNetworkMeta.textContent = online ? 'All systems go' : 'Reconnect to run jobs';
    statusNetworkMeta.dataset.state = online ? 'ok' : 'error';
  }
}

updateQueueStatusChip();
updateNetworkStatusChip();

function formatHeroLastRun() {
  if (!summaryHistory.length) return 'Not yet';
  const latest = [...summaryHistory]
    .filter(item => item && item.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  if (!latest) return 'Not yet';
  const date = new Date(latest.timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const oneHour = 1000 * 60 * 60;
  const oneDay = oneHour * 24;
  const oneWeek = oneDay * 7;
  if (diffMs < oneHour) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${mins}m ago`;
  }
  if (diffMs < oneDay) {
    return `Today · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffMs < oneWeek) {
    return `${date.toLocaleDateString([], { weekday: 'short' })}`;
  }
  return date.toLocaleDateString();
}

function updateQueueStats() {
  if (queueCountEl) {
    queueCountEl.textContent = selectedFiles.length;
  }
  if (queueTokensEl) {
    queueTokensEl.textContent = selectedFiles.length ? 'Pending…' : '—';
  }
  updateHeroStats();
  updateQueueStatusChip();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  // Load API key from secure storage (for current provider)
  const keyResult = await window.electronAPI.loadApiKey();
  if (keyResult.success && keyResult.apiKey) {
    apiKey = keyResult.apiKey;
  }
  updateHeroProviderState(!!apiKey);
  updateHeroStats();
  
  // Load settings
  const settings = await window.electronAPI.getSettings();
  if (settings.theme) {
    currentTheme = settings.theme;
  }
  if (settings.aiModel) {
    selectedModel = settings.aiModel;
  }
  // Load provider
  if (settings.aiProvider) {
    currentProvider = settings.aiProvider;
  }
  
  // Populate models based on provider and API key availability
  await populateModels(currentProvider, !!apiKey);
  
  // Load image settings
  if (settings.maxImageCount !== undefined && maxImagesInput) {
    maxImagesInput.value = settings.maxImageCount;
  }
  if (settings.maxCombinedFiles !== undefined && maxCombinedInput) {
    maxCombinedInput.value = settings.maxCombinedFiles;
  }
  if (combinedHelperLabel) {
    const cap = (settings.maxCombinedFiles !== undefined) ? settings.maxCombinedFiles : 3;
    combinedHelperLabel.textContent = `Limit ${cap} file${cap === 1 ? '' : 's'}; best for multi-part lectures`;
  }
  // Load processImages preference
  if (typeof settings.processImages === 'boolean') {
    processImages = settings.processImages;
  }
  if (processImagesToggle) {
    processImagesToggle.checked = processImages;
    processImagesToggle.addEventListener('change', async () => {
      processImages = processImagesToggle.checked;
      try { await window.electronAPI.saveSettings({ processImages }); } catch (_) {}
    });
  }
  
  // Apply theme (including system preference)
  applyTheme(currentTheme);
  
  // Set model
  if (modelSelect) {
    modelSelect.value = selectedModel;
  }

  // Combined toggle
  if (combinedToggle) {
    combinedToggle.checked = processCombined;
    combinedToggle.addEventListener('change', () => {
      processCombined = combinedToggle.checked;
      // Update primary button label
      if (processFilesBtn) {
        processFilesBtn.querySelector('span:last-child').textContent = processCombined ? 'Generate Combined Summary' : 'Generate Summaries';
      }
      renderFileList();
    });
  }
  
  // App version display
  if (window.electronAPI.getAppVersion) {
    try {
      const version = await window.electronAPI.getAppVersion();
      const versionDisplay = document.getElementById('appVersionDisplay');
      const versionDisplayRail = document.getElementById('appVersionDisplayRail');
      if (versionDisplay) {
        versionDisplay.textContent = version;
      }
      if (versionDisplayRail) {
        versionDisplayRail.textContent = `v${version}`;
      }
    } catch (err) {
      console.error('Failed to load app version:', err);
    }
  }

  // Provider + model settings UI
  try {
    const settings = await window.electronAPI.getSettings();
    currentProvider = (settings && settings.aiProvider) ? settings.aiProvider : 'openrouter';

    const providerSelect = document.getElementById('providerSelect');
    const providerApiKeyInput = document.getElementById('providerApiKey');
    const toggleProviderKey = document.getElementById('toggleProviderKey');
    const providerConfigFields = document.getElementById('providerConfigFields');
    const testProviderBtn = document.getElementById('testProviderBtn');
    const saveProviderBtn = document.getElementById('saveProviderBtn');
    const deleteProviderKeyBtn = document.getElementById('deleteProviderKeyBtn');
    const providerKeyStatus = document.getElementById('providerKeyStatus');
    const settingsModelSelect = document.getElementById('settingsModelSelect');

    // Sync the model list with the workspace selector
    if (settingsModelSelect && modelSelect) {
      settingsModelSelect.innerHTML = modelSelect.innerHTML;
      settingsModelSelect.value = selectedModel;
      settingsModelSelect.addEventListener('change', () => {
        selectedModel = settingsModelSelect.value;
        if (modelSelect) modelSelect.value = selectedModel;
        localStorage.setItem('ai_model', selectedModel);
      });
    }

    function renderProviderConfig(provider, cfg = {}) {
      if (!providerConfigFields) return;
      let html = '';
      if (provider === 'azure-openai') {
        html = `
          <label class="form-label">Azure settings</label>
          <div class="grid-2">
            <input id="azureEndpoint" class="modern-input" placeholder="Endpoint (https://...azure.com)" value="${(cfg.endpoint||'')}">
            <input id="azureDeployment" class="modern-input" placeholder="Deployment name" value="${(cfg.deployment||'')}">
          </div>
          <input id="azureApiVersion" class="modern-input" placeholder="API version (e.g., 2024-08-01-preview)" value="${(cfg.apiVersion||'')}">`;
      } else if (provider === 'custom-openai') {
        html = `
          <label class="form-label">Custom OpenAI-compatible</label>
          <input id="customBaseUrl" class="modern-input" placeholder="Base URL (https://host/v1)" value="${(cfg.baseURL||'')}">`;
      } else {
        html = `<p class="form-helper">No additional configuration required for this provider.</p>`;
      }
      providerConfigFields.innerHTML = html;
    }

    async function loadProviderState(provider) {
      if (providerSelect) providerSelect.value = provider;
      try {
        const res = await window.electronAPI.loadProviderCredentials(provider);
        const cfg = (res && res.config) || {};
        renderProviderConfig(provider, cfg);
        if (providerKeyStatus) {
          if (res && res.success) {
            if (res.hasKey) {
              providerKeyStatus.textContent = '✓ API key is saved for this provider';
              providerKeyStatus.className = 'status-message success';
            } else {
              providerKeyStatus.textContent = 'No saved API key for this provider yet';
              providerKeyStatus.className = 'status-message';
            }
          } else {
            providerKeyStatus.textContent = `❌ ${res && res.error ? res.error : 'Failed to load credentials'}`;
            providerKeyStatus.className = 'status-message error';
          }
        }
      } catch (e) {
        if (providerKeyStatus) {
          providerKeyStatus.textContent = `❌ ${e && e.message}`;
          providerKeyStatus.className = 'status-message error';
        }
      }
    }

    if (providerSelect) {
      providerSelect.value = currentProvider;
      providerSelect.addEventListener('change', async () => {
        currentProvider = providerSelect.value;
        await window.electronAPI.saveSettings({ aiProvider: currentProvider });
        await loadProviderState(currentProvider);
        // Refresh the global apiKey based on current provider
        const keyRes = await window.electronAPI.loadApiKey();
        apiKey = (keyRes && keyRes.success) ? (keyRes.apiKey || '') : '';
        
        // Refresh model list on home page
        await populateModels(currentProvider, !!apiKey);
      });
    }

    if (toggleProviderKey && providerApiKeyInput) {
      toggleProviderKey.addEventListener('click', () => {
        providerApiKeyInput.type = providerApiKeyInput.type === 'password' ? 'text' : 'password';
      });
    }

    function collectConfig(provider) {
      const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };
      if (provider === 'azure-openai') {
        return {
          endpoint: getVal('azureEndpoint'),
          deployment: getVal('azureDeployment'),
          apiVersion: getVal('azureApiVersion')
        };
      }
      if (provider === 'custom-openai') {
        return { baseURL: getVal('customBaseUrl') };
      }
      return {};
    }

    if (testProviderBtn) {
      testProviderBtn.addEventListener('click', async () => {
        // Store original button text and disable button
        const originalText = testProviderBtn.textContent;
        testProviderBtn.disabled = true;
        testProviderBtn.textContent = 'Testing connection...';
        
        if (providerKeyStatus) {
          providerKeyStatus.textContent = 'Testing connection...';
          providerKeyStatus.className = 'status-message loading';
        }
        try {
          const providedKey = providerApiKeyInput ? providerApiKeyInput.value.trim() : '';
          const cfg = collectConfig(currentProvider);
          const result = await window.electronAPI.validateApiKeyForProvider({ provider: currentProvider, apiKey: providedKey, config: cfg });
          if (result && result.valid) {
            if (providerKeyStatus) {
              providerKeyStatus.textContent = '✓ Connection successful';
              providerKeyStatus.className = 'status-message success';
            }
          } else {
            if (providerKeyStatus) {
              providerKeyStatus.textContent = `❌ ${(result && result.error) || 'Validation failed'}`;
              providerKeyStatus.className = 'status-message error';
            }
          }
        } catch (e) {
          if (providerKeyStatus) {
            providerKeyStatus.textContent = `❌ ${e && e.message}`;
            providerKeyStatus.className = 'status-message error';
          }
        } finally {
          // Restore button
          testProviderBtn.disabled = false;
          testProviderBtn.textContent = originalText;
        }
      });
    }

    if (saveProviderBtn) {
      saveProviderBtn.addEventListener('click', async () => {
        if (providerKeyStatus) {
          providerKeyStatus.textContent = 'Saving provider settings...';
          providerKeyStatus.className = 'status-message loading';
        }
        try {
          const providedKey = providerApiKeyInput ? providerApiKeyInput.value.trim() : '';
          const cfg = collectConfig(currentProvider);
          const res = await window.electronAPI.saveProviderCredentials(currentProvider, providedKey, cfg);
          if (res && res.success) {
            await window.electronAPI.saveSettings({ aiProvider: currentProvider });
            const keyRes = await window.electronAPI.loadApiKey();
            apiKey = (keyRes && keyRes.success) ? (keyRes.apiKey || '') : '';
            
            // Refresh model list on home page
            await populateModels(currentProvider, !!apiKey);
            
            if (providerKeyStatus) {
              providerKeyStatus.textContent = '✓ Provider settings saved';
              providerKeyStatus.className = 'status-message success';
            }
            if (providerApiKeyInput) providerApiKeyInput.value = '';
          } else {
            if (providerKeyStatus) {
              providerKeyStatus.textContent = `❌ ${(res && res.error) || 'Failed to save settings'}`;
              providerKeyStatus.className = 'status-message error';
            }
          }
        } catch (e) {
          if (providerKeyStatus) {
            providerKeyStatus.textContent = `❌ ${e && e.message}`;
            providerKeyStatus.className = 'status-message error';
          }
        }
      });
    }

    if (deleteProviderKeyBtn) {
      deleteProviderKeyBtn.addEventListener('click', async () => {
        try {
          const res = await window.electronAPI.deleteProviderCredentials(currentProvider);
          if (res && res.success) {
            apiKey = '';
            
            // Refresh model list to show "no API key" message
            await populateModels(currentProvider, false);
            
            if (providerKeyStatus) {
              providerKeyStatus.textContent = 'Key deleted for this provider';
              providerKeyStatus.className = 'status-message';
            }
          } else {
            if (providerKeyStatus) {
              providerKeyStatus.textContent = `❌ ${(res && res.error) || 'Failed to delete key'}`;
              providerKeyStatus.className = 'status-message error';
            }
          }
        } catch (e) {
          if (providerKeyStatus) {
            providerKeyStatus.textContent = `❌ ${e && e.message}`;
            providerKeyStatus.className = 'status-message error';
          }
        }
      });
    }

    // Initial state
    await loadProviderState(currentProvider);
  } catch (e) {
    console.warn('Provider settings init failed:', e && e.message);
  }
});

// Toast helper
function showToast(message, type = 'info', timeout = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 200ms, transform 200ms';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => container.removeChild(toast), 220);
  }, timeout);
}

window.addEventListener('online', () => {
  updateNetworkStatusChip();
  showToast('Back online. You can resume processing.', 'success', 3200);
});

window.addEventListener('offline', () => {
  updateNetworkStatusChip();
  showToast('You appear to be offline. Processing is paused until reconnection.', 'error', 4200);
});

// Confirm dialog helper (returns Promise<boolean>)
function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const body = document.getElementById('confirmModalBody');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    if (!modal || !body || !okBtn || !cancelBtn) {
      resolve(false);
      return;
    }
    body.textContent = message;
    modal.hidden = false;
    modal.classList.add('active');

    // Accessibility: focus trap within modal
    const content = modal.querySelector('.modal-content');
    const previouslyFocused = document.activeElement;
    const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(content.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null || el.getAttribute('aria-hidden') !== 'true');
    const focusables = getFocusable();
    const first = focusables[0] || okBtn;
    const last = focusables[focusables.length - 1] || okBtn;
    if (first && typeof first.focus === 'function') first.focus();

    function cleanup() {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      window.removeEventListener('keydown', onKeydown);
      content && content.removeEventListener('keydown', onTrap);
      modal.classList.remove('active');
      modal.hidden = true;
      // Restore focus to the previously focused element
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    }

    function onOk() { cleanup(); resolve(true); }
    function onCancel() { cleanup(); resolve(false); }
    function onKeydown(e) { if (e.key === 'Escape') { cleanup(); resolve(false); } }
    function onTrap(e) {
      if (e.key !== 'Tab') return;
      const els = getFocusable();
      if (!els.length) return;
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    window.addEventListener('keydown', onKeydown);
    content && content.addEventListener('keydown', onTrap);
  });
}

// Navigation
const pageTriggers = document.querySelectorAll('[data-page]');

async function loadHistoryPage() {
  try {
    const result = await window.electronAPI.getSummaryHistory();
    if (result.success) {
      summaryHistory = result.history;
    }
    renderHistory();
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

function updateHeaderForPage(pageKey) {
  const copy = headerCopy[pageKey] || headerCopy.home;
  if (appHeading && copy?.title) {
    appHeading.textContent = copy.title;
  }
  if (appSubtitle && copy?.subtitle) {
    appSubtitle.textContent = copy.subtitle;
  }
}

function setRailActive(pageKey) {
  railItems.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageKey);
  });
}

function activatePage(pageName, options = {}) {
  const key = pageName === 'summaryView' ? 'summary' : pageName;

  Object.entries(pageElements).forEach(([name, el]) => {
    if (!el) return;
    const isActive = name === key;
    el.classList.toggle('page-active', isActive);
    el.classList.toggle('active', isActive);
    el.hidden = !isActive;
  });

  setRailActive(key);

  if (!options.skipHeader) {
    updateHeaderForPage(key);
  }

  if (key === 'history' && !options.skipHistory) {
    loadHistoryPage();
  }

  if (key === 'settings' && !options.skipSettings) {
    loadStorageSettings();
  }

  if (key === 'home' && appContent && typeof appContent.focus === 'function') {
    requestAnimationFrame(() => appContent.focus({ preventScroll: false }));
  }
}

pageTriggers.forEach(trigger => {
  trigger.addEventListener('click', event => {
    const targetPage = trigger.dataset.page;
    if (!targetPage) return;
    activatePage(targetPage);

    if (targetPage === 'settings' && trigger.dataset.panel && typeof setSettingsPanelActive === 'function') {
      setSettingsPanelActive(trigger.dataset.panel);
    } else if (targetPage === 'settings' && trigger.dataset.panel) {
      pendingSettingsPanel = trigger.dataset.panel;
    }
  });
});

const openSettingsAppearanceBtn = document.getElementById('openSettingsAppearance');
if (openSettingsAppearanceBtn) {
  openSettingsAppearanceBtn.addEventListener('click', () => {
    activatePage('settings');
    if (typeof setSettingsPanelActive === 'function') {
      setSettingsPanelActive('appearance');
    } else {
      pendingSettingsPanel = 'appearance';
    }
  });
}

// Settings sidebar navigation
document.addEventListener('DOMContentLoaded', () => {
  const sidebarButtons = document.querySelectorAll('.settings-nav-item');
  const panels = document.querySelectorAll('.settings-panel');
  const titleEl = document.getElementById('settingsSectionTitle');
  const subtitleEl = document.getElementById('settingsSectionSubtitle');
  const headerAction = document.getElementById('settingsHeaderAction');

  const panelCopy = {
    models: 'Configure your AI provider credentials.',
    image: 'Control OCR usage and combined summary limits.',
    appearance: 'Choose between light and dark appearances.',
    storage: 'Review where Squailor stores documents and adjust location.',
    updates: 'Check for the latest release and install updates.',
    about: 'Version details and what Squailor is all about.',
    privacy: 'Understand how Squailor protects your data.'
  };

  setSettingsPanelActive = (panelId, labelOverride) => {
    panels.forEach(p => p.classList.remove('active'));
    const active = document.getElementById(`panel-${panelId}`);
    if (active) {
      active.classList.add('active');
      // Reflect tabpanel visibility for a11y
      panels.forEach(p => {
        if (p === active) {
          p.hidden = false;
          p.setAttribute('aria-hidden', 'false');
        } else {
          p.hidden = true;
          p.setAttribute('aria-hidden', 'true');
        }
      });
    }
    sidebarButtons.forEach(b => {
      b.classList.remove('active');
      // Update ARIA for tabs
      if (b.dataset && b.dataset.panel === panelId) {
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
        b.removeAttribute('tabindex');
      } else {
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
      }
    });
    const btn = Array.from(sidebarButtons).find(b => b.dataset.panel === panelId);
    const computedLabel = labelOverride || btn?.textContent?.replace(/^[^A-Za-z0-9]+\s*/, '') || 'Settings';
    if (titleEl) titleEl.textContent = computedLabel;
    if (subtitleEl) subtitleEl.textContent = panelCopy[panelId] || panelCopy.models;

    // No special header action needed anymore
    if (headerAction) headerAction.style.display = 'none';

    // Move focus to the active tab for keyboard users
    if (btn && typeof btn.focus === 'function') {
      btn.focus();
    }
  };

  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => setSettingsPanelActive(btn.dataset.panel));
  });

  // Keyboard navigation for tablist (Up/Down and Left/Right, Home/End)
  const tablist = document.querySelector('.settings-nav[role="tablist"]');
  if (tablist) {
    tablist.addEventListener('keydown', (e) => {
      const tabs = Array.from(document.querySelectorAll('.settings-nav-item[role="tab"]'));
      const currentIndex = tabs.findIndex(t => t.classList.contains('active'));
      let nextIndex = currentIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return; // ignore other keys
      }
      e.preventDefault();
      const targetTab = tabs[nextIndex];
      if (targetTab) {
        setSettingsPanelActive(targetTab.dataset.panel);
      }
    });
  }

  // Ensure default active
  if (pendingSettingsPanel) {
    setSettingsPanelActive(pendingSettingsPanel);
    pendingSettingsPanel = null;
  } else if (document.getElementById('panel-models')) {
    setSettingsPanelActive('models');
  }
});

// Theme Management
function applyTheme(theme) {
  // Support 'system' theme which follows OS preference
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  document.body.className = `${resolved}-theme`;
  // Also reflect theme on the <html> element so root scrollbars pick it up
  const root = document.documentElement;
  if (root) {
    root.classList.remove('dark-theme', 'light-theme', 'high-contrast-theme');
    root.classList.add(`${resolved}-theme`);
  }
  currentTheme = theme;
  localStorage.setItem('app_theme', theme);
  try { window.electronAPI.saveSettings && window.electronAPI.saveSettings({ theme }); } catch (_) {}

  // Update theme selector
  document.querySelectorAll('.theme-option').forEach(option => {
    if (option.dataset.theme === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });

  // React to system changes when 'system' is selected
  if (theme === 'system' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (!window.__themeMqBound) {
      window.__themeMqBound = true;
      mq.addEventListener('change', () => {
        applyTheme('system');
      });
    }
  }
}

// Theme selector
document.querySelectorAll('.theme-option').forEach(option => {
  option.addEventListener('click', () => {
    const theme = option.dataset.theme;
    applyTheme(theme);
  });
});

// Model selector
if (modelSelect) {
  modelSelect.value = selectedModel;
  modelSelect.addEventListener('change', () => {
    selectedModel = modelSelect.value;
    localStorage.setItem('ai_model', selectedModel);
  });
}

// Initialize theme
applyTheme(currentTheme);

// Storage Settings Functions
async function loadStorageSettings() {
  try {
    const paths = await window.electronAPI.getStoragePaths();
    
    // Update path displays
    if (appdataPathDiv) appdataPathDiv.textContent = paths.appdataFull;
    if (localAppPathDiv) localAppPathDiv.textContent = paths.localAppFull;
    
    // Set current selection
    const currentLocation = paths.settings.storageLocation || 'appdata';
    if (currentLocation === 'appdata' && storageAppDataRadio) {
      storageAppDataRadio.checked = true;
    } else if (currentLocation === 'local-app' && storageLocalAppRadio) {
      storageLocalAppRadio.checked = true;
    }
    
    // Load storage stats
    updateStorageStats();
  } catch (error) {
    console.error('Failed to load storage settings:', error);
  }
}

// Update UI elements for updater
const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
const installUpdateBtn = document.getElementById('installUpdateBtn');
const applyOnRestartBtn = document.getElementById('applyOnRestartBtn');
const updateStatusDiv = document.getElementById('updateStatus');
const currentVersionValue = document.getElementById('currentVersionValue');
const latestVersionValue = document.getElementById('latestVersionValue');
const autoApplyUpdatesToggle = document.getElementById('autoApplyUpdatesToggle');
const updateProgressDetails = document.getElementById('updateProgressDetails');
const manualDownloadBtn = document.getElementById('manualDownloadBtn');
const updateProviderSelect = document.getElementById('updateProviderSelect');
const updateGenericUrlInput = document.getElementById('updateGenericUrlInput');
const genericUrlRow = document.getElementById('genericUrlRow');

if (checkUpdatesBtn) {
  checkUpdatesBtn.addEventListener('click', async () => {
    if (updateStatusDiv) {
      updateStatusDiv.textContent = 'Checking for updates...';
    }
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res && res.success) {
        // actual events will be delivered via the update event handlers below
        if (updateStatusDiv) updateStatusDiv.textContent = 'Check started...';
      } else {
        if (updateStatusDiv) updateStatusDiv.textContent = 'Failed to start update check';
      }
    } catch (err) {
      if (updateStatusDiv) updateStatusDiv.textContent = `Error: ${err && err.message}`;
    }
  });
}

if (installUpdateBtn) {
  installUpdateBtn.addEventListener('click', async () => {
    if (updateStatusDiv) updateStatusDiv.textContent = 'Installing update...';
    try {
      await window.electronAPI.installUpdate(true);
    } catch (err) {
      if (updateStatusDiv) updateStatusDiv.textContent = `Install failed: ${err && err.message}`;
    }
  });
}

// Apply on restart: do not quit now; just inform the user
if (applyOnRestartBtn) {
  applyOnRestartBtn.addEventListener('click', async () => {
    try {
      if (updateStatusDiv) updateStatusDiv.textContent = 'Update will install on next restart.';
    } catch (_) {}
  });
}

// Updater event handlers from preload (emits from main)
if (window.electronAPI && window.electronAPI.onUpdateChecking) {
  window.electronAPI.onUpdateChecking(() => {
    if (updateStatusDiv) updateStatusDiv.textContent = 'Checking for updates...';
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
    if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
    const badge = document.getElementById('updateReadyBadge');
    if (badge) badge.style.display = 'none';
  });

  window.electronAPI.onUpdateAvailable((info) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Update available: ${info.version} — downloading...`;
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
    if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
    if (latestVersionValue) latestVersionValue.textContent = info.version;
  });

  window.electronAPI.onUpdateProgress((progress) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Downloading update: ${Math.round(progress.percent || 0)}%`;
    if (updateProgressDetails) {
      let line = '';
      if (progress.transferredMB != null && progress.totalMB != null) {
        line += `${progress.transferredMB}/${progress.totalMB} MB`;
      }
      if (progress.speedMBps != null) {
        line += (line ? ' • ' : '') + `${progress.speedMBps} MB/s`;
      }
      if (progress.etaHuman && progress.percent < 100) {
        line += (line ? ' • ' : '') + `ETA ${progress.etaHuman}`;
      }
      updateProgressDetails.textContent = line;
    }
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Update downloaded: ${info.version}`;
    if (installUpdateBtn) installUpdateBtn.style.display = 'inline-block';
    if (applyOnRestartBtn) {
      if (autoApplyUpdatesToggle && autoApplyUpdatesToggle.checked) {
        applyOnRestartBtn.style.display = 'none';
      } else {
        applyOnRestartBtn.style.display = 'inline-block';
      }
    }
    // Show a small badge in settings nav to indicate readiness
    try {
      const badge = document.getElementById('updateReadyBadge');
      if (badge && !(autoApplyUpdatesToggle && autoApplyUpdatesToggle.checked)) {
        badge.style.display = '';
      }
    } catch (_) {}
    // Auto apply if setting enabled
    try {
      if (autoApplyUpdatesToggle && autoApplyUpdatesToggle.checked) {
        updateStatusDiv.textContent = 'Applying update...';
        window.electronAPI.installUpdate(true);
      }
    } catch (e) { console.error('Auto-apply failed', e); }
  });

  window.electronAPI.onUpdateNotAvailable(() => {
    if (updateStatusDiv) updateStatusDiv.textContent = 'No updates available';
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
    if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
    const badge = document.getElementById('updateReadyBadge');
    if (badge) badge.style.display = 'none';
  });

  window.electronAPI.onUpdateError((err) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Update error: ${err && err.message}`;
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
    if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
    const badge = document.getElementById('updateReadyBadge');
    if (badge) badge.style.display = 'none';
  });

  // Fallback: stalled download detection
  window.electronAPI.onUpdateSlow((detail) => {
    try {
      if (updateStatusDiv) updateStatusDiv.textContent = 'Download appears stalled — offering fallback options.';
      // Create banner if not present
      let banner = document.getElementById('updateSlowBanner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'updateSlowBanner';
        banner.style.position = 'fixed';
        banner.style.bottom = '16px';
        banner.style.right = '16px';
        banner.style.zIndex = '9999';
        banner.style.maxWidth = '360px';
        banner.style.background = 'linear-gradient(135deg,#1e293b,#0f172a)';
        banner.style.color = '#f1f5f9';
        banner.style.padding = '14px 16px';
        banner.style.borderRadius = '10px';
        banner.style.boxShadow = '0 4px 16px rgba(0,0,0,0.45)';
        banner.style.fontSize = '13px';
        banner.style.lineHeight = '1.4';
        banner.innerHTML = `
          <div style="font-weight:600;margin-bottom:6px;">Update download stalled</div>
          <div style="opacity:.85;margin-bottom:10px;">No progress for ${(detail.stalledMs/1000).toFixed(0)}s. You can retry or use fallback options.</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="updateRetryBtn" style="flex:1 1 auto;padding:6px 10px;border:none;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;">Retry</button>
            <button id="updateManualBtn" style="flex:1 1 auto;padding:6px 10px;border:none;border-radius:6px;background:#64748b;color:#fff;cursor:pointer;">Manual</button>
            <button id="updateDismissBtn" style="flex:0 1 auto;padding:6px 10px;border:none;border-radius:6px;background:#334155;color:#fff;cursor:pointer;">Dismiss</button>
          </div>
        `;
        document.body.appendChild(banner);
        // Wire actions
        const retryBtn = document.getElementById('updateRetryBtn');
        const manualBtn = document.getElementById('updateManualBtn');
        const dismissBtn = document.getElementById('updateDismissBtn');
        if (retryBtn) retryBtn.addEventListener('click', async () => {
          try { updateStatusDiv && (updateStatusDiv.textContent = 'Retrying update check...'); } catch(_){}
          try { await window.electronAPI.checkForUpdates(); } catch(e){ console.error('Retry failed', e); }
        });
        if (manualBtn) manualBtn.addEventListener('click', async () => {
          manualBtn.disabled = true;
          manualBtn.textContent = 'Starting...';
          try {
            await window.electronAPI.manualDownloadUpdate();
          } catch (e) {
            console.error('Manual download start failed', e);
            manualBtn.disabled = false;
            manualBtn.textContent = 'Manual';
          }
        });
        if (dismissBtn) dismissBtn.addEventListener('click', () => {
          if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        });
      }
    } catch (e) { console.error('Failed to show slow banner', e); }
  });
}

// Manual download button separate from stalled banner
if (manualDownloadBtn) {
  manualDownloadBtn.addEventListener('click', async () => {
    manualDownloadBtn.disabled = true;
    manualDownloadBtn.textContent = 'Starting...';
    try {
      await window.electronAPI.manualDownloadUpdate();
    } catch (e) {
      manualDownloadBtn.disabled = false;
      manualDownloadBtn.textContent = 'Manual download';
    }
  });
}

// Manual update progress listeners (panel context as well)
if (window.electronAPI && window.electronAPI.onManualUpdateProgress) {
  window.electronAPI.onManualUpdateProgress((data) => {
    if (updateProgressDetails) {
      let line = `Manual: ${data.transferredMB} MB`;
      if (data.totalMB != null) line += ` / ${data.totalMB} MB`;
      if (data.speedMBps != null) line += ` • ${data.speedMBps} MB/s`;
      if (data.percent != null) line += ` • ${Math.round(data.percent)}%`;
      updateProgressDetails.textContent = line;
    }
  });
  window.electronAPI.onManualUpdateVerifyFailed((d) => {
    if (updateProgressDetails) updateProgressDetails.textContent = 'Integrity check failed';
    if (manualDownloadBtn) { manualDownloadBtn.disabled = false; manualDownloadBtn.textContent = 'Manual download'; }
  });
  window.electronAPI.onManualUpdateError((d) => {
    if (updateProgressDetails) updateProgressDetails.textContent = 'Manual update error: ' + (d && d.message);
    if (manualDownloadBtn) { manualDownloadBtn.disabled = false; manualDownloadBtn.textContent = 'Manual download'; }
  });
  window.electronAPI.onManualUpdateComplete((d) => {
    if (updateProgressDetails) updateProgressDetails.textContent = 'Manual download complete. Launching installer...';
  });
}

// Load version + latest release & settings toggle state when settings page opens
async function initUpdateSettingsPanel() {
  try {
    if (currentVersionValue) {
      const v = await window.electronAPI.getAppVersion();
      currentVersionValue.textContent = v;
    }
    await refreshLatestVersionLabel();
    const settings = await window.electronAPI.getSettings();
    if (autoApplyUpdatesToggle && settings && typeof settings.autoApplyUpdates === 'boolean') {
      autoApplyUpdatesToggle.checked = settings.autoApplyUpdates;
    }
    if (updateProviderSelect) {
      updateProviderSelect.value = settings.updateProvider || 'github';
      if (genericUrlRow) genericUrlRow.style.display = (updateProviderSelect.value === 'generic') ? 'block' : 'none';
    }
    if (updateGenericUrlInput) {
      updateGenericUrlInput.value = settings.updateGenericUrl || '';
    }
    if (autoApplyUpdatesToggle) {
      autoApplyUpdatesToggle.addEventListener('change', async () => {
        const s = await window.electronAPI.getSettings();
        s.autoApplyUpdates = !!autoApplyUpdatesToggle.checked;
        await window.electronAPI.saveSettings({ autoApplyUpdates: s.autoApplyUpdates });
      });
    }
    if (updateProviderSelect) {
      updateProviderSelect.addEventListener('change', async () => {
        const provider = updateProviderSelect.value;
        if (genericUrlRow) genericUrlRow.style.display = (provider === 'generic') ? 'block' : 'none';
        await window.electronAPI.saveSettings({ updateProvider: provider });
        await refreshLatestVersionLabel();
      });
    }
    if (updateGenericUrlInput) {
      updateGenericUrlInput.addEventListener('change', async () => {
        const url = updateGenericUrlInput.value.trim();
        await window.electronAPI.saveSettings({ updateGenericUrl: url });
        await refreshLatestVersionLabel();
      });
    }
  } catch (e) { console.error('Failed update settings init', e); }
}

async function refreshLatestVersionLabel() {
  try {
    if (!latestVersionValue) return;
    const meta = await window.electronAPI.getLatestReleaseInfo();
    if (meta && meta.success && meta.version) latestVersionValue.textContent = meta.version; else latestVersionValue.textContent = '—';
  } catch {
    if (latestVersionValue) latestVersionValue.textContent = '—';
  }
}

// Observe navigation to settings updates panel
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && t.matches && t.matches('.settings-nav-item[data-panel="updates"]')) {
    setTimeout(initUpdateSettingsPanel, 50);
  }
  if (t && t.matches && t.matches('.settings-nav-item[data-panel="privacy"]')) {
    setTimeout(initDiagnosticsPanel, 50);
  }
});

async function initDiagnosticsPanel() {
  try {
    await loadDiagnostics();
    if (diagRefreshBtn && !diagRefreshBtn.__bound) {
      diagRefreshBtn.__bound = true;
      diagRefreshBtn.addEventListener('click', loadDiagnostics);
    }
    if (diagClearBtn && !diagClearBtn.__bound) {
      diagClearBtn.__bound = true;
      diagClearBtn.addEventListener('click', async () => {
        try { await window.electronAPI.clearNetworkDiagnostics(); } catch(_){}
        await loadDiagnostics();
      });
    }
    if (diagExportBtn && !diagExportBtn.__bound) {
      diagExportBtn.__bound = true;
      diagExportBtn.addEventListener('click', async () => {
        const data = await window.electronAPI.getNetworkDiagnostics();
        const payload = {
          generatedAt: new Date().toISOString(),
          count: (data && data.count) || 0,
          suspiciousHosts: (data && data.suspiciousHosts) || []
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'squailor-network-diagnostics.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
      });
    }
  } catch (e) {
    console.error('Diagnostics init failed', e);
  }
}

async function loadDiagnostics() {
  try {
    const res = await window.electronAPI.getNetworkDiagnostics();
    const hosts = (res && res.suspiciousHosts) || [];
    if (diagCount) diagCount.textContent = `Entries: ${hosts.length}`;
    if (diagList) {
      if (hosts.length === 0) {
        diagList.innerHTML = '<div style="opacity:.7">No suspicious hosts recorded.</div>';
      } else {
        diagList.innerHTML = hosts.map(h => `<div>• ${escapeHtml(h)}</div>`).join('');
      }
    }
  } catch (e) {
    if (diagList) diagList.textContent = 'Failed to load diagnostics';
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"]/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s]));
}

// Manual update progress listeners
if (window.electronAPI && window.electronAPI.onManualUpdateProgress) {
  window.electronAPI.onManualUpdateProgress((data) => {
    let banner = document.getElementById('manualUpdateProgress');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'manualUpdateProgress';
      banner.style.position = 'fixed';
      banner.style.bottom = '16px';
      banner.style.left = '16px';
      banner.style.zIndex = '9999';
      banner.style.background = 'rgba(15,23,42,0.9)';
      banner.style.color = '#f8fafc';
      banner.style.padding = '12px 14px';
      banner.style.borderRadius = '10px';
      banner.style.fontSize = '13px';
      banner.style.width = '340px';
      banner.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
      banner.innerHTML = '<div style="font-weight:600;margin-bottom:6px;">Manual installer download</div><div id="manualUpdateLine" style="margin-bottom:6px;">Initializing...</div><div style="height:6px;background:#1e293b;border-radius:4px;overflow:hidden"><div id="manualUpdateBar" style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#06b6d4)"></div></div>';
      document.body.appendChild(banner);
    }
    const line = document.getElementById('manualUpdateLine');
    const bar = document.getElementById('manualUpdateBar');
    if (line) {
      let pct = data.percent != null ? Math.round(data.percent) + '%' : ((data.transferredMB || 0) + ' MB');
      let msg = `Downloading: ${pct}`;
      if (data.speedMBps != null) msg += ` @ ${data.speedMBps} MB/s`;
      if (data.totalMB != null) msg += ` (${data.transferredMB}/${data.totalMB} MB)`;
      line.textContent = msg;
    }
    if (bar && data.percent != null) {
      bar.style.width = Math.min(100, data.percent) + '%';
    }
  });
  window.electronAPI.onManualUpdateVerifyFailed((d) => {
    const line = document.getElementById('manualUpdateLine');
    if (line) {
      line.textContent = 'Integrity check failed (hash mismatch). Aborting.';
      line.style.color = '#f87171';
    }
  });
  window.electronAPI.onManualUpdateError((d) => {
    const line = document.getElementById('manualUpdateLine');
    if (line) {
      line.textContent = 'Manual update error: ' + (d && d.message);
      line.style.color = '#f87171';
    }
  });
  window.electronAPI.onManualUpdateComplete((d) => {
    const line = document.getElementById('manualUpdateLine');
    if (line) {
      line.textContent = 'Download complete. Launching installer...';
      line.style.color = '#10b981';
    }
    const bar = document.getElementById('manualUpdateBar');
    if (bar) bar.style.width = '100%';
  });
}

async function updateStorageStats() {
  try {
    const stats = await window.electronAPI.getStorageStats();
    if (statsFileCount) statsFileCount.textContent = stats.fileCount;
    if (statsTotalSize) statsTotalSize.textContent = stats.totalSizeMB + ' MB';
  } catch (error) {
    console.error('Failed to update storage stats:', error);
  }
}

// Save storage location
if (saveStorageLocationBtn) {
  saveStorageLocationBtn.addEventListener('click', async () => {
    let storageLocation = 'appdata';
    
    if (storageAppDataRadio && storageAppDataRadio.checked) {
      storageLocation = 'appdata';
    } else if (storageLocalAppRadio && storageLocalAppRadio.checked) {
      storageLocation = 'local-app';
    }
    
    if (storageStatus) {
      storageStatus.textContent = 'Changing storage location and moving files...';
      storageStatus.className = 'status-message loading';
      storageStatus.style.display = 'block';
    }
    
    saveStorageLocationBtn.disabled = true;
    
    try {
      const result = await window.electronAPI.changeStorageLocation(storageLocation);
      
      if (result.success) {
        if (storageStatus) {
          storageStatus.textContent = '✓ Storage location changed successfully! Files have been moved and old location cleaned up.';
          storageStatus.className = 'status-message success';
          storageStatus.style.display = 'block';
        }
        
        // Update stats
        await updateStorageStats();
        
        setTimeout(() => {
          if (storageStatus) storageStatus.style.display = 'none';
        }, 5000);
      } else {
        if (storageStatus) {
          storageStatus.textContent = `❌ Failed to change storage location: ${result.error}`;
          storageStatus.className = 'status-message error';
          storageStatus.style.display = 'block';
        }
      }
    } catch (error) {
      if (storageStatus) {
        storageStatus.textContent = `❌ Error: ${error.message}`;
        storageStatus.className = 'status-message error';
        storageStatus.style.display = 'block';
      }
    } finally {
      saveStorageLocationBtn.disabled = false;
    }
  });
}

  // Save image and combine settings
  if (saveMaxImagesBtn && maxImagesInput && maxImagesStatus) {
    saveMaxImagesBtn.addEventListener('click', async () => {
      const value = parseInt(maxImagesInput.value, 10);
      if (isNaN(value) || value < 0 || value > 10) {
        maxImagesStatus.textContent = '❌ Please enter a number between 0 and 10';
        maxImagesStatus.className = 'status-message error';
        maxImagesStatus.style.display = 'block';
        return;
      }
      let combinedVal = maxCombinedInput ? parseInt(maxCombinedInput.value, 10) : 3;
      if (isNaN(combinedVal) || combinedVal < 1 || combinedVal > 10) {
        maxImagesStatus.textContent = '❌ Max combined files must be between 1 and 10';
        maxImagesStatus.className = 'status-message error';
        maxImagesStatus.style.display = 'block';
        return;
      }
      maxImagesStatus.textContent = 'Saving image settings...';
      maxImagesStatus.className = 'status-message loading';
      maxImagesStatus.style.display = 'block';
      try {
        const result = await window.electronAPI.saveSettings({ maxImageCount: value, maxCombinedFiles: combinedVal });
        if (result.success) {
          maxImagesStatus.textContent = '✓ Image settings saved!';
          maxImagesStatus.className = 'status-message success';
          if (combinedHelperLabel) {
            combinedHelperLabel.textContent = `Limit ${combinedVal} file${combinedVal === 1 ? '' : 's'}; best for multi-part lectures`;
          }
        } else {
          maxImagesStatus.textContent = `❌ Failed to save: ${result.error}`;
          maxImagesStatus.className = 'status-message error';
        }
      } catch (err) {
        maxImagesStatus.textContent = `❌ Error: ${err.message}`;
        maxImagesStatus.className = 'status-message error';
      }
      setTimeout(() => {
        maxImagesStatus.style.display = 'none';
      }, 5000);
    });
  }

// Select files
if (selectFilesBtn && fileListDiv && processFilesBtn) {
  selectFilesBtn.addEventListener('click', async () => {
    const filePaths = await window.electronAPI.selectFile();
    
    if (filePaths && filePaths.length > 0) {
      selectedFiles = filePaths;
      renderFileList();
      processFilesBtn.disabled = false;
    }
  });
}

// Render file list
function renderFileList() {
  updateQueueStats();

  if (selectedFiles.length === 0) {
    fileListDiv.innerHTML = '';
    processFilesBtn.disabled = true;
    if (queueTokensEl) {
      queueTokensEl.textContent = '—';
    }
    return;
  }

  // Cap at 3 files if combined mode is on
  const maxCombined = (maxCombinedInput && parseInt(maxCombinedInput.value, 10)) || 3;
  const filesToShow = processCombined ? selectedFiles.slice(0, maxCombined) : selectedFiles;
  if (processCombined && selectedFiles.length > maxCombined) {
    showToast(`Combined mode supports up to ${maxCombined} files. Extra files are ignored.`, 'info');
  }

  fileListDiv.innerHTML = filesToShow.map((filePath, index) => {
    const fileName = filePath.split(/[/\\]/).pop();
    const ext = fileName.split('.').pop().toUpperCase();
    const icon = ext === 'PDF' ? '📕' : '📊';
    
    return `
      <div class="file-item" data-index="${index}">
        <div class="file-info">
          <span class="file-icon">${icon}</span>
          <div class="file-details">
            <div class="file-name">${fileName}</div>
            <div class="file-status" id="file-status-${index}">Ready to process</div>
            <div class="file-progress-bar" id="file-progress-${index}" style="display: none;">
              <div class="progress-fill"></div>
            </div>
          </div>
        </div>
        <button class="remove-btn" onclick="removeFile(${index})">Remove</button>
      </div>
    `;
  }).join('');

  processFilesBtn.disabled = false;
}

// Remove file
window.removeFile = (index) => {
  selectedFiles.splice(index, 1);
  renderFileList();
};

// Get selected summary type
function getSummaryType() {
  const selected = document.querySelector('input[name="summaryType"]:checked');
  return selected ? selected.value : 'normal';
}

// Get selected response tone
function getResponseTone() {
  const selected = document.querySelector('input[name="responseTone"]:checked');
  return selected ? selected.value : 'casual';
}

// Get selected summary style
function getSummaryStyle() {
  const selected = document.querySelector('input[name="summaryStyle"]:checked');
  return selected ? selected.value : 'teaching';
}

// Process files
if (processFilesBtn && resultsDiv && resultsSection) {
  processFilesBtn.addEventListener('click', async () => {
    if (!apiKey) {
      const prov = (typeof currentProvider !== 'undefined' && currentProvider) ? currentProvider : 'your provider';
      showToast(`Please save your API key for ${prov} first!`, 'error');
      return;
    }

    if (selectedFiles.length === 0) {
      showToast('Please select files to process!', 'error');
      return;
    }

    const combinedCap = (maxCombinedInput && parseInt(maxCombinedInput.value, 10)) || 3;

    // Disable button and show processing state
    processFilesBtn.disabled = true;
    processFilesBtn.innerHTML = '<span class="loading"></span> Processing...';
    if (queueTokensEl) {
      queueTokensEl.textContent = 'Processing…';
    }
    
    // Disable remove buttons during processing
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });

    const summaryType = getSummaryType();
    const responseTone = getResponseTone();
    const summaryStyle = getSummaryStyle();  // Get the selected style
    const runBatchSize = processCombined
      ? Math.min(selectedFiles.length, combinedCap)
      : selectedFiles.length;
    isProcessingBatch = true;
    processingBatchSize = runBatchSize;
    updateQueueStatusChip();
    
    // Build index map for the current run and share with global listener
    currentFileIndexMap = new Map();
    selectedFiles.forEach((filePath, index) => {
      const fileName = filePath.split(/[/\\]/).pop();
      currentFileIndexMap.set(fileName, index);
    });

    try {
      if (processCombined) {
        const combined = await window.electronAPI.processDocumentsCombined(
          selectedFiles.slice(0, combinedCap),
          summaryType,
          apiKey,
          responseTone,
          selectedModel,
          summaryStyle,
          processImages
        );

        if (!combined || !combined.success) {
          throw new Error((combined && combined.error) || 'Combined summary failed');
        }
        // Normalize to results array for modal
        const reduction = Math.round((1 - combined.summary.length / combined.originalLength) * 100);
        await displayResults([
          {
            success: true,
            fileName: combined.fileName,
            folderId: combined.folderId,
            fileType: '.aggregate',
            originalLength: combined.originalLength,
            summary: combined.summary
          }
        ]);
      } else {
        const results = await window.electronAPI.processDocuments(
          selectedFiles,
          summaryType,
          apiKey,
          responseTone,
          selectedModel,  // Pass the selected model
          summaryStyle,   // Pass the selected style
          processImages
        );
        await displayResults(results);
      }

      // Clear the uploaded files after successful processing
      selectedFiles = [];
      renderFileList();
    } catch (error) {
      showToast(`Error processing documents: ${error.message}`, 'error');
    } finally {
      processFilesBtn.disabled = false;
      processFilesBtn.innerHTML = '<span class="btn-icon">🚀</span><span>Generate Summaries</span>';
      updateQueueStats();
      isProcessingBatch = false;
      processingBatchSize = 0;
      updateQueueStatusChip();
      if (queueTokensEl && selectedFiles.length === 0) {
        queueTokensEl.textContent = '—';
      }
    }
  });
}

// Display results
async function displayResults(results) {
  if (resultsSection) {
    resultsSection.hidden = false;
  }
  if (resultsDiv) {
    const inlineCards = results.map((result, index) => {
      if (!result.success) return '';
        const fileExt = result.fileName.split('.').pop().toUpperCase();
        const fileIcon = fileExt === 'PDF' ? '📕' : fileExt === 'PPTX' || fileExt === 'PPT' ? '📊' : '📄';
        const reduction = result.originalLength ? Math.round((1 - result.summary.length / result.originalLength) * 100) : null;
      const locationLabel = result.folderId ? 'Saved to history' : 'Local only';
        return `
          <article class="summary-completion-card" onclick="navigateToSummary(${index})">
            <div class="summary-card-header">
              <div class="summary-card-icon">${fileIcon}</div>
              <div class="summary-card-info">
                <div class="summary-card-title">${escapeHtml(result.fileName)}</div>
                <div class="summary-card-type">${fileExt} Document${reduction === null ? '' : ` • ${reduction}% reduction`}</div>
              </div>
            </div>
            <div class="summary-card-footer">
              <div class="summary-card-stats">
                <div class="summary-card-stat"><span>✨</span><span>Generated</span></div>
                <div class="summary-card-stat"><span>📁</span><span>${locationLabel}</span></div>
              </div>
              <div class="summary-card-action">Open →</div>
            </div>
          </article>
        `;
      }).filter(Boolean);
    if (inlineCards.length) {
      resultsDiv.innerHTML = inlineCards.join('');
    } else {
      resultsDiv.innerHTML = '<div class="summary-text">No summaries were generated in this run.</div>';
    }
  }

  // Show the modal with summary cards instead of displaying inline
  showSummaryCompletionModal(results);
  
  // Store results for later use
  window.currentResults = results;
  
  // Add successful results to history
  for (const result of results) {
    if (result.success) {
      await addToHistory(result);
    }
  }
}

// Show summary completion modal
function showSummaryCompletionModal(results) {
  const modal = document.getElementById('summaryCompleteModal');
  const summaryCardsDiv = document.getElementById('summaryCards');
  
  if (!modal || !summaryCardsDiv) return;
  
  // Generate summary cards
  summaryCardsDiv.innerHTML = results.map((result, index) => {
    if (result.success) {
      const openedExisting = !!result.openedExisting;
      const hasLengths = typeof result.originalLength === 'number' && result.summary && typeof result.summary.length === 'number';
      const reduction = hasLengths ? Math.round((1 - result.summary.length / result.originalLength) * 100) : null;
      const fileExt = result.fileName.split('.').pop().toUpperCase();
      const fileIcon = fileExt === 'PDF' ? '📕' : fileExt === 'PPTX' || fileExt === 'PPT' ? '📊' : '📄';
      const summaryType = getSummaryType();
      const responseTone = getResponseTone();
      
      // Get tone display
      const toneMap = {
        'casual': '😊',
        'formal': '🎓',
        'informative': '📚',
        'easy': '✨'
      };
      const toneIcon = toneMap[responseTone] || '😊';
      
      return `
        <div class="summary-completion-card" onclick="navigateToSummary(${index})">
          <div class="summary-card-header">
            <div class="summary-card-icon">${fileIcon}</div>
            <div class="summary-card-info">
              <div class="summary-card-title">${escapeHtml(result.fileName)}</div>
              <div class="summary-card-type">${fileExt} Document${openedExisting ? ' • Existing summary' : ''}</div>
            </div>
          </div>
          <div class="summary-card-footer">
            <div class="summary-card-stats">
              ${openedExisting ? `
                <div class="summary-card-stat"><span>📁</span><span>Opened existing</span></div>
              ` : `
                <div class="summary-card-stat">
                  <span>${summaryType === 'normal' ? '📝' : '⚡'}</span>
                  <span>${summaryType}</span>
                </div>
                <div class="summary-card-stat">
                  <span>${toneIcon}</span>
                  <span>${responseTone}</span>
                </div>
                <div class="summary-card-stat">
                  <span>📉</span>
                  <span>${reduction ?? '—'}${reduction === null ? '' : '%'}</span>
                </div>
              `}
            </div>
            <div class="summary-card-action">
              View <span>→</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const fileExt = result.fileName.split('.').pop().toUpperCase();
      const fileIcon = fileExt === 'PDF' ? '📕' : fileExt === 'PPTX' || fileExt === 'PPT' ? '📊' : '📄';
      
      // Determine error icon and type based on errorType
      let errorIcon = '❌';
      let errorTypeText = 'Error';
      let errorColor = 'var(--danger)';
      
      if (result.errorType === 'rate-limit') {
        errorIcon = '⏱️';
        errorTypeText = 'Rate Limited';
        errorColor = '#f59e0b';
      } else if (result.errorType === 'quota') {
        errorIcon = '💳';
        errorTypeText = 'Quota Exceeded';
      } else if (result.errorType === 'api-key') {
        errorIcon = '🔑';
        errorTypeText = 'Invalid API Key';
      }
      
      // Shorten error message for display
      let shortError = result.error || 'Failed to process';
      if (shortError.length > 100) {
        shortError = shortError.substring(0, 97) + '...';
      }
      
      return `
        <div class="summary-completion-card error-card" style="cursor: default; border-color: ${errorColor};">
          <div class="summary-card-header">
            <div class="summary-card-icon" style="background: ${errorColor};">${errorIcon}</div>
            <div class="summary-card-info">
              <div class="summary-card-title">${escapeHtml(result.fileName)}</div>
              <div class="summary-card-type" style="color: ${errorColor};">${errorTypeText}</div>
            </div>
          </div>
          <div class="summary-card-footer">
            <div class="summary-card-error-msg">
              ${escapeHtml(shortError)}
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
  
  // Show modal
  modal.hidden = false;
  modal.classList.add('active');

  // Accessibility: focus trap and restore focus
  const content = modal.querySelector('.modal-content');
  const closeBtn = modal.querySelector('.modal-close');
  const previouslyFocused = document.activeElement;
  const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"])';
  const getFocusable = () => Array.from(content.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null || el.getAttribute('aria-hidden') !== 'true');
  const setInitialFocus = () => {
    const els = getFocusable();
    if (els.length) {
      (closeBtn || els[0]).focus();
    }
  };
  setInitialFocus();
  function onTrap(e) {
    if (e.key !== 'Tab') return;
    const els = getFocusable();
    if (!els.length) return;
    const firstEl = els[0];
    const lastEl = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        lastEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastEl) {
        firstEl.focus();
        e.preventDefault();
      }
    }
  }
  content && content.addEventListener('keydown', onTrap);
  modal.__restoreFocus = () => { previouslyFocused && previouslyFocused.focus && previouslyFocused.focus(); };
  modal.__removeTrap = () => { content && content.removeEventListener('keydown', onTrap); };
}

// Close summary modal
window.closeSummaryModal = function() {
  const modal = document.getElementById('summaryCompleteModal');
  if (modal) {
    modal.classList.remove('active');
    modal.hidden = true;
    // Remove trap and restore focus
    if (modal.__removeTrap) try { modal.__removeTrap(); } catch(_){}
    if (modal.__restoreFocus) try { modal.__restoreFocus(); } catch(_){}
  }
};

// Navigate to summary from modal
window.navigateToSummary = async function(index) {
  const result = window.currentResults[index];

  if (!result || !result.success) {
    return;
  }

  // Close modal
  closeSummaryModal();

  // Reload history to ensure we have the latest data
  const historyResult = await window.electronAPI.getSummaryHistory();
  if (historyResult.success) {
    summaryHistory = historyResult.history;
  }

  // Find the matching history item by folderId
  const historyIndex = summaryHistory.findIndex(item => item.folderId === result.folderId);

  if (historyIndex !== -1) {
    // Directly open the summary view without going through history page
    viewFullSummary(historyIndex);
  }
};

// Save summary
window.saveSummary = async (index, fileName) => {
  const result = window.currentResults[index];
  
  if (!result || !result.success) {
    return;
  }

  const saveResult = await window.electronAPI.saveSummary(
    fileName.replace(/\.[^/.]+$/, ''),
    result.summary
  );

  if (saveResult.success) {
    showToast('Summary saved successfully!', 'success');
  } else if (saveResult.error) {
    showToast(`Error saving summary: ${saveResult.error}`, 'error');
  }
};

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getSummaryPreview(summary = '') {
  if (!summary) return '';
  if (summary.length <= SUMMARY_PREVIEW_LIMIT) {
    return summary;
  }
  const truncated = summary.slice(0, SUMMARY_PREVIEW_LIMIT).trimEnd();
  return `${truncated}…`;
}

// History Management Functions
async function addToHistory(result) {
  // History is now automatically saved during processing
  // Each document gets its own folder with summary.json
  // We just need to reload history when viewing
}

function renderHistory() {
  if (!historyListDiv) return;
  
  updateHistoryStats();
  
  if (summaryHistory.length === 0) {
    historyListDiv.innerHTML = '';
    if (historyListDiv) historyListDiv.hidden = true;
    if (emptyHistoryDiv) emptyHistoryDiv.hidden = false;
    return;
  }
  
  historyListDiv.hidden = false;
  if (emptyHistoryDiv) emptyHistoryDiv.hidden = true;
  
  historyListDiv.innerHTML = summaryHistory.map((item, index) => {
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    const reduction = Math.round((1 - item.summaryLength / item.originalLength) * 100);
    const fileExt = item.fileName.split('.').pop().toUpperCase();
    const fileIcon = fileExt === 'PDF' ? '📕' : '📊';
    
    // Get tone display name
    const toneMap = {
      'casual': '😊 Casual',
      'formal': '🎓 Formal',
      'informative': '📚 Informative',
      'easy': '✨ Easy'
    };
    const toneDisplay = toneMap[item.responseTone] || '😊 Casual';

    // Get style display name
    const styleMap = {
      'teaching': '👨‍🏫 Teaching',
      'notes': '📝 Notes'
    };
    const styleDisplay = styleMap[item.summaryStyle] || '👨‍🏫 Teaching';
    const summaryTextId = `summaryText-${index}`;
    const shouldTruncate = (item.summary || '').length > SUMMARY_PREVIEW_LIMIT;
    const previewToggle = shouldTruncate
      ? `<button class="btn btn-ghost btn-small preview-toggle" id="previewToggle-${index}" onclick="toggleHistoryPreview(${index})" aria-expanded="false">
          <span class="btn-icon">⬇️</span>
          <span>Expand preview</span>
        </button>`
      : '';
    
    return `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-item-info">
            <div class="history-item-title">
              <span class="history-file-icon">${fileIcon}</span>
              ${escapeHtml(item.fileName)}
            </div>
            <div class="history-item-meta">
              <div class="meta-item">📅 ${formattedDate}</div>
              <div class="meta-item">🕐 ${formattedTime}</div>
              <div class="meta-badge">${item.summaryType}</div>
              <div class="meta-badge">${toneDisplay}</div>
              <div class="meta-badge">${styleDisplay}</div>
              <div class="meta-item">📉 ${reduction}% reduction</div>
            </div>
          </div>
          <div class="history-item-actions">
            <button class="icon-btn" onclick="copyHistorySummary(${index})" title="Copy Summary">
              📋
            </button>
            <button class="icon-btn" onclick="exportHistoryItem(${index})" title="Export">
              💾
            </button>
            <button class="icon-btn delete" onclick="deleteHistoryItem(${index})" title="Delete">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="history-item-content">
          <div class="history-preview">
            <div class="preview-label">
              <span>📄</span> Document Viewer
            </div>
            <div class="document-viewer" id="viewer-${index}">
              <div class="viewer-loading">Loading document...</div>
            </div>
          </div>
          
          <div class="summary-preview">
            <div class="preview-label">
              <span>✨</span> Summary
            </div>
            <div class="summary-text" id="${summaryTextId}" data-expanded="false"></div>
            ${previewToggle}
          </div>
        </div>
        
        <div class="history-item-footer">
          <div class="footer-stats">
            <div>Original: ${item.originalLength.toLocaleString()} chars</div>
            <div>Summary: ${item.summaryLength.toLocaleString()} chars</div>
            <div>Model: ${item.model}</div>
          </div>
          <div class="footer-actions">
            <button class="btn btn-outline btn-small" onclick="viewFullSummary(${index})">
              👁️ View Full
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Populate summary previews and load viewers after DOM update
  requestAnimationFrame(() => {
    summaryHistory.forEach((item, index) => {
      const summaryEl = document.getElementById(`summaryText-${index}`);
      if (summaryEl) {
        const preview = getSummaryPreview(item.summary || '');
        summaryEl.textContent = preview;
        summaryEl.dataset.expanded = 'false';
        const truncated = (item.summary || '').length > SUMMARY_PREVIEW_LIMIT;
        summaryEl.classList.toggle('truncated', truncated);
      }
      loadDocumentViewer(index, item);
    });
  });
}

window.toggleHistoryPreview = function(index) {
  const textEl = document.getElementById(`summaryText-${index}`);
  const toggleBtn = document.getElementById(`previewToggle-${index}`);
  if (!textEl || !toggleBtn) return;

  const isExpanded = textEl.dataset.expanded === 'true';
  if (isExpanded) {
    const preview = getSummaryPreview((summaryHistory[index] && summaryHistory[index].summary) || '');
    textEl.textContent = preview;
    textEl.dataset.expanded = 'false';
    textEl.classList.add('truncated');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = '<span class="btn-icon">⬇️</span><span>Expand preview</span>';
  } else {
    const fullSummary = (summaryHistory[index] && summaryHistory[index].summary) || '';
    textEl.textContent = fullSummary;
    textEl.dataset.expanded = 'true';
    textEl.classList.remove('truncated');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.innerHTML = '<span class="btn-icon">⬆️</span><span>Collapse preview</span>';
  }
};

function updateHistoryStats() {
  if (totalSummariesSpan) {
    totalSummariesSpan.textContent = `${summaryHistory.length} ${summaryHistory.length === 1 ? 'summary' : 'summaries'}`;
  }
  
  if (totalDocumentsSpan) {
    const uniqueFiles = new Set(summaryHistory.map(item => item.fileName)).size;
    totalDocumentsSpan.textContent = `${uniqueFiles} ${uniqueFiles === 1 ? 'document' : 'documents'}`;
  }

  updateHeroStats();
}

async function deleteHistoryItem(index) {
  const ok = await showConfirm('Are you sure you want to delete this history item?');
  if (!ok) return;
  const item = summaryHistory[index];

  // Delete the folder containing the document and summary
  if (item.folderId) {
    await window.electronAPI.deleteSummaryFromHistory(item.folderId);
  }

  // Reload history from disk
  const result = await window.electronAPI.getSummaryHistory();
  if (result.success) {
    summaryHistory = result.history;
  }
  renderHistory();
}

function copyHistorySummary(index) {
  const item = summaryHistory[index];
  navigator.clipboard.writeText(item.summary).then(() => {
    showToast('Summary copied to clipboard!', 'success');
  }).catch(err => {
    showToast('Failed to copy: ' + err.message, 'error');
  });
}

// Copy summary from the completion modal results
function copyResultSummary(event, index) {
  // prevent parent card onclick from firing
  event.stopPropagation();
  const result = window.currentResults && window.currentResults[index];
  if (!result || !result.success) return;
  navigator.clipboard.writeText(result.summary).then(() => {
    showToast('Summary copied to clipboard!', 'success');
  }).catch(err => {
    showToast('Failed to copy: ' + err.message, 'error');
  });
}

// Download a result summary as .md or .txt
function downloadResultSummary(event, index, format = 'txt') {
  event.stopPropagation();
  const result = window.currentResults && window.currentResults[index];
  if (!result || !result.success) return;

  const baseName = result.fileName.replace(/\.[^/.]+$/, '') + '_summary';
  let content = '';
  if (format === 'md') {
    content = `# Summary for ${result.fileName}\n\n${result.summary}`;
  } else {
    content = `Summary for ${result.fileName}\n\n${result.summary}`;
  }

  const blob = new Blob([content], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Use Web Share API when available, otherwise fall back to copying link/text
function shareResultSummary(event, index) {
  event.stopPropagation();
  const result = window.currentResults && window.currentResults[index];
  if (!result || !result.success) return;

  const text = `Summary for ${result.fileName}\n\n${result.summary}`;
  if (navigator.share) {
    navigator.share({
      title: `Summary: ${result.fileName}`,
      text
    }).catch(err => {
      showToast('Share failed: ' + err.message, 'error');
    });
  } else {
    // Fallback: copy to clipboard and notify user
    navigator.clipboard.writeText(text).then(() => {
      showToast('Summary copied to clipboard (share fallback).', 'info');
    }).catch(err => {
      showToast('Share not available and copy failed: ' + err.message, 'error');
    });
  }
}

function exportHistoryItem(index) {
  const item = summaryHistory[index];
  
  // Get tone display name
  const toneMap = {
    'casual': 'Casual',
    'formal': 'Formal',
    'informative': 'Informative',
    'easy': 'Easy to Understand'
  };
  const toneDisplay = toneMap[item.responseTone] || 'Casual';
  
  // Get style display name
  const styleMap = {
    'teaching': 'Teaching',
    'notes': 'Notes'
  };
  const styleDisplay = styleMap[item.summaryStyle] || 'Teaching';
  
  const content = `File: ${item.fileName}
Date: ${new Date(item.timestamp).toLocaleString()}
Type: ${item.summaryType.toUpperCase()}
Tone: ${toneDisplay}
Style: ${styleDisplay}
Model: ${item.model}

SUMMARY:
${item.summary}`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.fileName.replace(/\.[^/.]+$/, '')}_summary.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Markdown parsing and sanitization are provided by preload (local libs)
async function ensureMarkdownLibs() {
  return true;
}

function renderSummaryContent(contentDiv, summaryText) {
  if (!contentDiv) return;
  const text = typeof summaryText === 'string' ? summaryText : '';

  // Attempt Markdown parsing + sanitization if helpers are loaded
  const parseMarkdown = window.electronAPI && typeof window.electronAPI.parseMarkdown === 'function'
    ? window.electronAPI.parseMarkdown
    : null;
  const sanitizeHtml = window.electronAPI && typeof window.electronAPI.sanitizeHtml === 'function'
    ? window.electronAPI.sanitizeHtml
    : null;

  try {
    if (parseMarkdown) {
      const rawHtml = parseMarkdown(text) || '';
      if (rawHtml) {
        const safeHtml = sanitizeHtml ? (sanitizeHtml(rawHtml) || rawHtml) : rawHtml;
        contentDiv.innerHTML = safeHtml;
        return;
      }
    }
  } catch (err) {
    console.error('Markdown parsing error:', err);
  }

  // Fallback: render plain text to avoid HTML injection.
  contentDiv.innerHTML = '';
  const normalized = text.trim();
  if (!normalized) {
    const empty = document.createElement('p');
    empty.textContent = 'No summary content available.';
    empty.classList.add('text-muted');
    contentDiv.appendChild(empty);
    return;
  }

  normalized.split(/\n{2,}/).forEach(block => {
    const paragraph = document.createElement('p');
    // Preserve single line breaks within the paragraph for readability
    paragraph.textContent = block.replace(/\n+/g, ' ').trim();
    if (paragraph.textContent.length > 0) {
      contentDiv.appendChild(paragraph);
    }
  });
}

async function viewFullSummary(index) {
  const item = summaryHistory[index];
  
  // Store current summary index for actions
  window.currentSummaryIndex = index;
  
  // Navigate to summary view page
  activatePage('summary', { skipHistory: true, skipSettings: true, skipHeader: false });
  
  // Get tone display name
  const toneMap = {
    'casual': 'Casual',
    'formal': 'Formal',
    'informative': 'Informative',
    'easy': 'Easy to Understand'
  };
  const toneDisplay = toneMap[item.responseTone] || 'Casual';
  
  // Get style display name
  const styleMap = {
    'teaching': 'Teaching',
    'notes': 'Notes'
  };
  const styleDisplay = styleMap[item.summaryStyle] || 'Teaching';
  
  // Update page content
  const summaryHeading = document.getElementById('summaryViewHeading');
  if (summaryHeading) {
    summaryHeading.textContent = item.fileName;
  }
  const summaryMeta = document.getElementById('summaryViewMeta');
  if (summaryMeta) {
    summaryMeta.textContent = `${new Date(item.timestamp).toLocaleString()} • ${item.summaryType.toUpperCase()} • ${toneDisplay} • ${styleDisplay} • ${item.model}`;
  }
  
  const reduction = Math.round((1 - item.summaryLength / item.originalLength) * 100);
  const summaryStats = document.getElementById('summaryViewStats');
  if (summaryStats) {
    summaryStats.textContent = `Original: ${item.originalLength.toLocaleString()} chars • Summary: ${item.summaryLength.toLocaleString()} chars • ${reduction}% reduction`;
  }

  const summaryMetaChips = document.getElementById('summaryMetaChips');
  if (summaryMetaChips) {
    summaryMetaChips.innerHTML = [
      item.summaryType.toUpperCase(),
      toneDisplay,
      styleDisplay,
      item.model
    ].map(value => `<span class="meta-chip">${escapeHtml(value)}</span>`).join('');
  }
  
  // Parse markdown and render
  const contentDiv = document.getElementById('summaryViewContent');
  // Canvas guidance banner (optional) – show once per view if PDF and no images were extracted
  try {
    const guidanceHost = document.getElementById('canvasGuidance');
    if (guidanceHost) guidanceHost.remove();
    const isPdf = /\.pdf$/i.test(item.fileName);
    const hadImages = Array.isArray(item.images) && item.images.length > 0; // if we later persist image metadata
    if (isPdf && !hadImages) {
      // Provide a subtle hint if thumbnails were not generated
      const banner = document.createElement('div');
      banner.id = 'canvasGuidance';
      banner.className = 'status-message info';
      banner.style.margin = '12px 0';
      banner.innerHTML = '🖼️ PDF thumbnails not available. Enable vision with images by installing optional Canvas dependencies or using a vision-capable model.';
      if (contentDiv && contentDiv.parentElement) {
        contentDiv.parentElement.insertBefore(banner, contentDiv);
      }
    }
  } catch (_) {}
  // Parse, sanitize, or safely fall back to plain text
  renderSummaryContent(contentDiv, item.summary);

  // Setup Q&A chat for this summary
  setupSummaryQaChat(item);

  // Build TOC from rendered content
  buildSummaryTOC();

  // Ensure sidebars default states
  const split = document.getElementById('summarySplit');
  const qaSidebar = document.getElementById('qaSidebar');
  const qaResizer = document.getElementById('qaResizer');
  const resizerRight = document.getElementById('qaResizerRight');
  const tocSidebar = document.getElementById('tocSidebar');
  const tocResizer = document.getElementById('tocResizer');
  const openQaPref = localStorage.getItem('ui.qaOpen') === 'true';
  const openTocPref = localStorage.getItem('ui.tocOpen') === 'true';
  // Restore widths if saved
  const savedQaW = localStorage.getItem('ui.qaWidth');
  const savedTocW = localStorage.getItem('ui.tocWidth');
  if (split) {
    split.style.setProperty('--qa-col', '0px');
    split.style.setProperty('--qa-resizer-col', '0px');
    split.style.setProperty('--toc-col', '0px');
    split.style.setProperty('--toc-resizer-col', '0px');
  }
  if (qaSidebar && qaResizer) {
    qaSidebar.style.display = 'none';
    qaResizer.style.display = 'none';
  }
  if (tocSidebar && tocResizer) {
    tocSidebar.style.display = 'none';
    tocResizer.style.display = 'none';
  }

  // Wire the open button
  const openQaBtn = document.getElementById('openQaBtn');
  const qaCloseBtn = document.getElementById('qaCloseBtn');
  function openQaPanel() {
    if (!qaSidebar || !qaResizer || !split) {
      console.error('Missing QA elements:', { qaSidebar, qaResizer, split });
      return;
    }
    qaSidebar.style.display = '';
    qaSidebar.removeAttribute('hidden');
    qaResizer.style.display = '';
    qaResizer.removeAttribute('hidden');
    // Use a fixed width for QA panel (400px default, or saved width)
    const width = savedQaW ? parseInt(savedQaW, 10) : 400;
    split.style.setProperty('--qa-col', Math.max(260, Math.min(width, 600)) + 'px');
    split.style.setProperty('--qa-resizer-col', '6px');
    localStorage.setItem('ui.qaOpen', 'true');
    try { document.getElementById('openQaBtn')?.setAttribute('aria-expanded', 'true'); } catch(_){}
    setTimeout(() => document.getElementById('qaInput')?.focus(), 0);
  }
  function closeQaPanel() {
    if (!qaSidebar || !qaResizer || !split) return;
    split.style.setProperty('--qa-col', '0px');
    split.style.setProperty('--qa-resizer-col', '0px');
    qaSidebar.style.display = 'none';
    qaResizer.style.display = 'none';
    localStorage.setItem('ui.qaOpen', 'false');
    try { document.getElementById('openQaBtn')?.setAttribute('aria-expanded', 'false'); } catch(_){}
  }
  if (openQaBtn && split && qaSidebar && qaResizer) {
    openQaBtn.onclick = openQaPanel;
  } else {
    console.warn('QA button setup failed:', { openQaBtn: !!openQaBtn, split: !!split, qaSidebar: !!qaSidebar, qaResizer: !!qaResizer });
  }
  if (qaCloseBtn && split && qaSidebar && qaResizer) {
    qaCloseBtn.onclick = closeQaPanel;
  }

  // TOC open/close
  const openTocBtn = document.getElementById('openTocBtn');
  const tocCloseBtn = document.getElementById('tocCloseBtn');
  function openTocPanel() {
    if (!tocSidebar || !tocResizer || !split) {
      console.error('Missing TOC elements:', { tocSidebar, tocResizer, split });
      return;
    }
    tocSidebar.style.display = '';
    tocSidebar.removeAttribute('hidden');
    tocResizer.style.display = '';
    tocResizer.removeAttribute('hidden');
    const width = savedTocW ? parseInt(savedTocW, 10) : 260;
    split.style.setProperty('--toc-col', Math.max(220, Math.min(width, Math.round(window.innerWidth * 0.4))) + 'px');
    split.style.setProperty('--toc-resizer-col', '6px');
    localStorage.setItem('ui.tocOpen', 'true');
    try { document.getElementById('openTocBtn')?.setAttribute('aria-expanded', 'true'); } catch(_){}
  }
  function closeTocPanel() {
    if (!tocSidebar || !tocResizer || !split) return;
    split.style.setProperty('--toc-col', '0px');
    split.style.setProperty('--toc-resizer-col', '0px');
    tocSidebar.style.display = 'none';
    tocResizer.style.display = 'none';
    localStorage.setItem('ui.tocOpen', 'false');
    try { document.getElementById('openTocBtn')?.setAttribute('aria-expanded', 'false'); } catch(_){}
  }
  if (openTocBtn && split && tocSidebar && tocResizer) {
    openTocBtn.onclick = openTocPanel;
  } else {
    console.warn('TOC button setup failed:', { openTocBtn: !!openTocBtn, split: !!split, tocSidebar: !!tocSidebar, tocResizer: !!tocResizer });
  }
  if (tocCloseBtn && split && tocSidebar && tocResizer) {
    tocCloseBtn.onclick = closeTocPanel;
  }

  // Auto-restore open state
  if (openTocPref && tocSidebar && tocResizer) openTocPanel();
  if (openQaPref && qaSidebar && qaResizer) openQaPanel();

  // Resizer drag logic for QA (middle)
  if (qaResizer) {
    let dragging = false;
    qaResizer.onmousedown = (e) => {
      dragging = true;
      document.body.style.userSelect = 'none';
    };
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const splitRect = split.getBoundingClientRect();
      const min = 260; // px
      const max = Math.min(window.innerWidth * 0.6, 800);
      const used = e.clientX - splitRect.left; // width used by left + resizer
      // grid columns: [left, 6px, sidebar]
  const sidebarWidth = Math.max(min, Math.min(max, splitRect.width - used));
  split.style.setProperty('--qa-col', sidebarWidth + 'px');
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      document.body.style.userSelect = '';
      const width = split && getComputedStyle(split).getPropertyValue('--qa-col');
      if (width) localStorage.setItem('ui.qaWidth', parseInt(width, 10));
    });
  }

  // Right edge resizer
  if (resizerRight) {
    let draggingR = false;
    resizerRight.onmousedown = () => {
      draggingR = true;
      document.body.style.userSelect = 'none';
    };
    window.addEventListener('mousemove', (e) => {
      if (!draggingR) return;
      const splitRect = split.getBoundingClientRect();
      const min = 260;
      const max = Math.min(window.innerWidth * 0.6, 800);
      // Sidebar width from right edge drag: total - left - resizer - mouseX offset
      const mouseFromLeft = e.clientX - splitRect.left;
  const sidebarWidth = Math.max(min, Math.min(max, splitRect.width - mouseFromLeft));
  split.style.setProperty('--qa-col', sidebarWidth + 'px');
    });
    window.addEventListener('mouseup', () => {
      draggingR = false;
      document.body.style.userSelect = '';
      const width = split && getComputedStyle(split).getPropertyValue('--qa-col');
      if (width) localStorage.setItem('ui.qaWidth', parseInt(width, 10));
    });
  }

  // TOC resizer (drag from right edge of left panel)
  if (tocResizer) {
    let draggingL = false;
    tocResizer.onmousedown = () => {
      draggingL = true;
      document.body.style.userSelect = 'none';
    };
    window.addEventListener('mousemove', (e) => {
      if (!draggingL) return;
      const splitRect = split.getBoundingClientRect();
      const min = 220;
      const max = Math.min(window.innerWidth * 0.4, 600);
      const mouseFromLeft = e.clientX - splitRect.left;
      const tocWidth = Math.max(min, Math.min(max, mouseFromLeft));
      split.style.setProperty('--toc-col', tocWidth + 'px');
    });
    window.addEventListener('mouseup', () => {
      draggingL = false;
      document.body.style.userSelect = '';
      const width = split && getComputedStyle(split).getPropertyValue('--toc-col');
      if (width) localStorage.setItem('ui.tocWidth', parseInt(width, 10));
    });
  }
}

// Clear History
// Clear History
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
    const ok = await showConfirm('Are you sure you want to clear all history? This cannot be undone.');
    if (!ok) return;
    await window.electronAPI.clearSummaryHistory();
    
    // Reload history from disk (should be empty now)
    const result = await window.electronAPI.getSummaryHistory();
    if (result.success) {
      summaryHistory = result.history;
    }
    renderHistory();
  });
}

// Make functions globally available
window.deleteHistoryItem = deleteHistoryItem;
window.copyHistorySummary = copyHistorySummary;
window.exportHistoryItem = exportHistoryItem;
window.viewFullSummary = viewFullSummary;

// Summary View Page Controls
const backFromSummaryBtn = document.getElementById('backFromSummary');
const copySummaryViewBtn = document.getElementById('copySummaryView');
const exportSummaryMDBtn = document.getElementById('exportSummaryMD');
const exportSummaryTXTBtn = document.getElementById('exportSummaryTXT');
const shareSummaryViewBtn = document.getElementById('shareSummaryView');

if (backFromSummaryBtn) {
  backFromSummaryBtn.addEventListener('click', () => {
    // Go back to history page
    activatePage('history');
  });
}

if (copySummaryViewBtn) {
  copySummaryViewBtn.addEventListener('click', () => {
    if (typeof window.currentSummaryIndex !== 'undefined') {
      copyHistorySummary(window.currentSummaryIndex);
    }
  });
}

if (exportSummaryMDBtn) {
  exportSummaryMDBtn.addEventListener('click', () => {
    if (typeof window.currentSummaryIndex !== 'undefined') {
      // Download markdown version
      const idx = window.currentSummaryIndex;
      const item = summaryHistory[idx];
      if (!item) return;
      const baseName = item.fileName.replace(/\.[^/.]+$/, '') + '_summary';
      const content = `# Summary for ${item.fileName}\n\n${item.summary}`;
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  });
}

if (exportSummaryTXTBtn) {
  exportSummaryTXTBtn.addEventListener('click', () => {
    if (typeof window.currentSummaryIndex !== 'undefined') {
      exportHistoryItem(window.currentSummaryIndex);
    }
  });
}

if (shareSummaryViewBtn) {
  shareSummaryViewBtn.addEventListener('click', () => {
    if (typeof window.currentSummaryIndex !== 'undefined') {
      const idx = window.currentSummaryIndex;
      const item = summaryHistory[idx];
      if (!item) return;
      const text = `Summary for ${item.fileName}\n\n${item.summary}`;
      if (navigator.share) {
        navigator.share({ title: `Summary: ${item.fileName}`, text }).catch(err => {
          showToast('Share failed: ' + err.message, 'error');
        });
      } else {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Summary copied to clipboard (share fallback).', 'info');
        }).catch(err => {
          showToast('Share not available and copy failed: ' + err.message, 'error');
        });
      }
    }
  });
}

// Document Viewer Function
async function loadDocumentViewer(index, item) {
  const viewerDiv = document.getElementById(`viewer-${index}`);
  if (!viewerDiv) return;
  
  // Check if folder still exists
  const fileCheck = await window.electronAPI.checkFileExists(item.folderId);
  if (!fileCheck.exists) {
    viewerDiv.innerHTML = `
      <div class="viewer-error">
        <div class="error-icon">⚠️</div>
        <div>File not found</div>
        <div class="error-hint">The stored file may have been deleted</div>
      </div>
    `;
    return;
  }
  
  if (item.fileType === '.pdf') {
    await loadPDFViewer(viewerDiv, item.folderId);
  } else if (item.fileType === '.pptx' || item.fileType === '.ppt' || item.fileType === '.docx' || item.fileType === '.doc') {
    // Try to read the stored file first — the main process may have converted it to PDF for preview
    try {
      const fileData = await window.electronAPI.readStoredFile(item.folderId);
      if (fileData && fileData.success && fileData.mimeType === 'application/pdf') {
        // Build blob URL and inject iframe
        const blob = base64ToBlob(fileData.data, fileData.mimeType);
        const url = URL.createObjectURL(blob);
        viewerDiv.innerHTML = `
          <iframe 
            src="${url}"
            class="pdf-viewer"
            title="PDF Document">
          </iframe>
        `;
        return;
      }
    } catch (err) {
      console.warn('Failed to load converted preview:', err && err.message);
    }

    // Fallback: show a simple preview using the stored preview text
    // Use a generic viewer for both PPTX and DOCX when no PDF preview is available
    const subtitle = (item.fileType === '.docx' || item.fileType === '.doc') ? 'Word Document' : 'Presentation';
    viewerDiv.innerHTML = `
      <div class="ppt-viewer">
        <div class="ppt-info">
          <span class="ppt-icon">📄</span>
          <div>
            <div class="ppt-title">${escapeHtml(item.fileName)}</div>
            <div class="ppt-subtitle">${escapeHtml(subtitle)}</div>
          </div>
        </div>
        <div class="ppt-content">
          ${escapeHtml(item.preview)}
        </div>
        <div class="ppt-note">
          💡 Full content was used for summarization
        </div>
      </div>
    `;
  } else if (item.fileType === '.aggregate') {
    viewerDiv.innerHTML = `
      <div class="ppt-viewer">
        <div class="ppt-info">
          <span class="ppt-icon">🧩</span>
          <div>
            <div class="ppt-title">${escapeHtml(item.fileName)}</div>
            <div class="ppt-subtitle">Combined summary from multiple sources</div>
          </div>
        </div>
        <div class="ppt-content">
          ${escapeHtml(item.preview || 'Combined across multiple documents.')}
        </div>
      </div>
    `;
  }
}

// PDF Viewer using iframe
async function loadPDFViewer(viewerDiv, folderId) {
  try {
    const fileData = await window.electronAPI.readStoredFile(folderId);
    if (fileData.success) {
      const blob = base64ToBlob(fileData.data, fileData.mimeType);
      const url = URL.createObjectURL(blob);
      
      viewerDiv.innerHTML = `
        <iframe 
          src="${url}" 
          class="pdf-viewer"
          title="PDF Document">
        </iframe>
      `;
    } else {
      viewerDiv.innerHTML = `
        <div class="viewer-error">
          <div class="error-icon">❌</div>
          <div>Failed to load PDF</div>
        </div>
      `;
    }
  } catch (error) {
    viewerDiv.innerHTML = `
      <div class="viewer-error">
        <div class="error-icon">❌</div>
        <div>Error: ${error.message}</div>
      </div>
    `;
  }
}

// PowerPoint Viewer (shows text content with slide breaks)
async function loadPPTViewer(viewerDiv, item) {
  viewerDiv.innerHTML = `
    <div class="ppt-viewer">
      <div class="ppt-info">
        <span class="ppt-icon">📊</span>
        <div>
          <div class="ppt-title">${escapeHtml(item.fileName)}</div>
          <div class="ppt-subtitle">PowerPoint Presentation</div>
        </div>
      </div>
      <div class="ppt-content">
        ${escapeHtml(item.preview)}
      </div>
      <div class="ppt-note">
        💡 Full content was used for summarization
      </div>
    </div>
  `;
}

// Helper function to convert base64 to blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

window.loadDocumentViewer = loadDocumentViewer;

// Modal overlay click handler - close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('summaryCompleteModal');
  if (!modal) return;

  const overlay = modal.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeSummaryModal);
  }

  const closeButtons = modal.querySelectorAll('[data-action="close-summary-modal"]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeSummaryModal);
  });
});

// --- Summary Q&A Chat ---
function setupSummaryQaChat(item) {
  const transcript = document.getElementById('qaTranscript');
  const input = document.getElementById('qaInput');
  const sendBtn = document.getElementById('qaSendBtn');
  const status = document.getElementById('qaStatus');
  if (!transcript || !input || !sendBtn || !status) return;

  // Reset transcript on each open
  transcript.innerHTML = '';
  status.hidden = true;
  status.textContent = '';
  status.className = 'status-message';

  function appendMsg(role, text) {
    const div = document.createElement('div');
    div.className = `qa-msg ${role === 'user' ? 'user' : 'assistant'}`;
    div.innerHTML = `<strong>${role === 'user' ? 'You' : 'AI'}</strong><div class="qa-msg-body">${escapeHtml(text)}</div>`;
    transcript.appendChild(div);
    transcript.scrollTop = transcript.scrollHeight;
  }

  async function ask() {
    const question = input.value.trim();
    if (!question) return;
    if (!apiKey) {
      const prov = (typeof currentProvider !== 'undefined' && currentProvider) ? currentProvider : 'your provider';
      showToast(`Please save your API key for ${prov} first!`, 'error');
      return;
    }
    appendMsg('user', question);
    input.value = '';
    sendBtn.disabled = true;
    status.textContent = 'Asking...';
    status.className = 'status-message loading';
    status.hidden = false;

    // Streaming area
    const partialDiv = document.createElement('div');
    partialDiv.className = 'qa-msg assistant';
    partialDiv.innerHTML = '<strong>AI</strong><div class="qa-msg-body" id="qaStreaming">...</div>';
    transcript.appendChild(partialDiv);

    // Subscribe to progress
    const progHandler = (p) => {
      const el = partialDiv.querySelector('#qaStreaming');
      if (el && p && p.delta) {
        el.textContent = (el.textContent + p.delta).slice(-5000);
      }
    };
    if (window.electronAPI.onQaProgress) {
      // Avoid listener leaks by removing any prior listeners for this folderId first
      if (window.electronAPI.offQaProgress) {
        window.electronAPI.offQaProgress(item.folderId);
      }
      window.electronAPI.onQaProgress(item.folderId, progHandler);
    }

    try {
      const res = await window.electronAPI.askSummaryQuestion(item.folderId, question, apiKey, selectedModel);
      if (res && res.success) {
        partialDiv.querySelector('#qaStreaming').textContent = res.answer;
        status.textContent = '✓ Answered';
        status.className = 'status-message success';
        status.hidden = false;
      } else {
        const msg = (res && res.error) || 'Failed to get answer';
        partialDiv.querySelector('#qaStreaming').textContent = msg;
        status.textContent = `❌ ${msg}`;
        status.className = 'status-message error';
        status.hidden = false;
      }
    } catch (err) {
      partialDiv.querySelector('#qaStreaming').textContent = err && err.message || 'Error';
      status.textContent = `❌ ${err && err.message}`;
      status.className = 'status-message error';
      status.hidden = false;
    } finally {
      sendBtn.disabled = false;
      setTimeout(() => {
        status.hidden = true;
        status.textContent = '';
        status.className = 'status-message';
      }, 4000);
    }
  }

  sendBtn.onclick = ask;
  input.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };
}

// --- Outline (TOC) ---
function buildSummaryTOC() {
  const root = document.getElementById('summaryViewContent');
  const list = document.getElementById('tocList');
  const filter = document.getElementById('tocFilter');
  if (!root || !list) return;

  // Collect headings h1..h4
  const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4'));
  // Ensure anchors for scrollIntoView
  headings.forEach((h, i) => {
    if (!h.id) {
      h.id = 'sec-' + i + '-' + h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
  });

  // Build nested list
  list.innerHTML = '';
  const stack = [{ level: 0, el: list }];
  function levelNum(tag) { return parseInt(tag.substring(1), 10); }
  headings.forEach((h) => {
    const lvl = levelNum(h.tagName.toLowerCase());
    const label = h.textContent.trim();
    const id = h.id;

    // Adjust stack to current level
    while (stack.length && stack[stack.length - 1].level >= lvl) stack.pop();
    const parent = stack[stack.length - 1].el;

    const item = document.createElement('div');
    item.className = 'toc-item' + (lvl > 1 ? ' toc-child' : '');
    item.dataset.target = id;
    item.innerHTML = `<span class=\"chevron\" title=\"Collapse/expand\">▾</span><span class=\"toc-text\">${escapeHtml(label)}</span>`;
    // Scroll on text click
    item.addEventListener('click', (ev) => {
      if (ev.target && ev.target.classList && ev.target.classList.contains('chevron')) return; // chevron handled separately
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // active highlight
      list.querySelectorAll('.toc-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
    parent.appendChild(item);

    // Prepare container for children
    const childContainer = document.createElement('div');
    parent.appendChild(childContainer);
    stack.push({ level: lvl, el: childContainer });

    // Chevron toggles child container
    const chev = item.querySelector('.chevron');
    if (chev) {
      chev.style.cursor = 'pointer';
      chev.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = childContainer.style.display === 'none';
        childContainer.style.display = isHidden ? '' : 'none';
        chev.textContent = isHidden ? '▾' : '▸';
      });
    }
  });

  // Filter logic
  if (filter) {
    filter.oninput = () => {
      const q = filter.value.toLowerCase();
      list.querySelectorAll('.toc-item').forEach((el) => {
        const txt = el.querySelector('.toc-text')?.textContent.toLowerCase() || '';
        el.style.display = txt.includes(q) ? '' : 'none';
      });
    };
  }
}

