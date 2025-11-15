'use strict';

// AI Provider settings: handles provider selection, API key management, and connection testing

let providerSelect;
let providerApiKey;
let toggleProviderKey;
let testProviderBtn;
let saveProviderBtn;
let deleteProviderKeyBtn;
let providerKeyStatus;
let providerKeyHelper;
let providerConfigFields;

function cacheElements() {
  providerSelect = document.getElementById('providerSelect');
  providerApiKey = document.getElementById('providerApiKey');
  toggleProviderKey = document.getElementById('toggleProviderKey');
  testProviderBtn = document.getElementById('testProviderBtn');
  saveProviderBtn = document.getElementById('saveProviderBtn');
  deleteProviderKeyBtn = document.getElementById('deleteProviderKeyBtn');
  providerKeyStatus = document.getElementById('providerKeyStatus');
  providerKeyHelper = document.getElementById('providerKeyHelper');
  providerConfigFields = document.getElementById('providerConfigFields');
}

async function loadProviderSettings() {
  try {
    const settings = await window.electronAPI.getSettings();
    
    if (providerSelect && settings.provider) {
      providerSelect.value = settings.provider;
    }
    
    // Try to load saved API key
    if (window.electronAPI.loadApiKey) {
      const keyData = await window.electronAPI.loadApiKey();
      if (keyData && keyData.apiKey && providerApiKey) {
        providerApiKey.value = keyData.apiKey;
        if (providerKeyHelper) {
          providerKeyHelper.textContent = '✓ Using saved API key. Enter a new key to replace it.';
        }
      }
    }
    
    // Load provider-specific config
    renderProviderConfig(settings.provider || 'openrouter');
    
  } catch (error) {
    console.error('Error loading provider settings:', error);
  }
}

function renderProviderConfig(provider) {
  if (!providerConfigFields) return;
  
  // Clear existing fields
  providerConfigFields.innerHTML = '';
  
  // Azure OpenAI specific fields
  if (provider === 'azure-openai') {
    providerConfigFields.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="azureEndpoint">Azure Endpoint</label>
        <input type="url" id="azureEndpoint" class="modern-input" placeholder="https://your-resource.openai.azure.com">
        <p class="form-helper">Your Azure OpenAI resource endpoint URL.</p>
      </div>
      <div class="form-group">
        <label class="form-label" for="azureDeployment">Deployment Name</label>
        <input type="text" id="azureDeployment" class="modern-input" placeholder="gpt-4">
        <p class="form-helper">The name of your deployed model.</p>
      </div>
    `;
  }
  
  // Custom OpenAI-compatible fields
  if (provider === 'custom-openai') {
    providerConfigFields.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="customBaseUrl">Base URL</label>
        <input type="url" id="customBaseUrl" class="modern-input" placeholder="https://api.example.com/v1">
        <p class="form-helper">The base URL for your OpenAI-compatible API.</p>
      </div>
    `;
  }
}

function handleToggleKeyVisibility() {
  if (!providerApiKey) return;
  
  if (providerApiKey.type === 'password') {
    providerApiKey.type = 'text';
    if (toggleProviderKey) toggleProviderKey.textContent = '🙈';
  } else {
    providerApiKey.type = 'password';
    if (toggleProviderKey) toggleProviderKey.textContent = '👁️';
  }
}

async function handleTestConnection() {
  if (!providerApiKey || !providerApiKey.value.trim()) {
    if (providerKeyStatus) {
      providerKeyStatus.textContent = '⚠️ Please enter an API key first';
      providerKeyStatus.className = 'status-message warning';
    }
    if (window.showToast) {
      window.showToast('Please enter an API key first', 'warning');
    }
    return;
  }
  
  try {
    if (providerKeyStatus) {
      providerKeyStatus.textContent = '🔄 Testing connection...';
      providerKeyStatus.className = 'status-message';
    }
    
    if (testProviderBtn) {
      testProviderBtn.disabled = true;
      testProviderBtn.textContent = 'Testing...';
    }
    
    const result = await window.electronAPI.validateApiKey({
      apiKey: providerApiKey.value.trim(),
      provider: providerSelect ? providerSelect.value : 'openrouter'
    });
    
    if (result && result.valid) {
      if (providerKeyStatus) {
        providerKeyStatus.textContent = '✅ Connection successful!';
        providerKeyStatus.className = 'status-message success';
      }
      if (window.showToast) {
        window.showToast('Connection successful!', 'success');
      }
    } else {
      throw new Error(result?.error || 'Connection failed');
    }
  } catch (error) {
    console.error('Test connection error:', error);
    if (providerKeyStatus) {
      providerKeyStatus.textContent = `❌ ${error.message}`;
      providerKeyStatus.className = 'status-message error';
    }
    if (window.showToast) {
      window.showToast(`Connection failed: ${error.message}`, 'error');
    }
  } finally {
    if (testProviderBtn) {
      testProviderBtn.disabled = false;
      testProviderBtn.textContent = 'Test connection';
    }
  }
}

async function handleSaveProvider() {
  if (!providerApiKey || !providerApiKey.value.trim()) {
    if (providerKeyStatus) {
      providerKeyStatus.textContent = '⚠️ Please enter an API key';
      providerKeyStatus.className = 'status-message warning';
    }
    if (window.showToast) {
      window.showToast('Please enter an API key', 'warning');
    }
    return;
  }
  
  try {
    if (saveProviderBtn) {
      saveProviderBtn.disabled = true;
      saveProviderBtn.textContent = 'Saving...';
    }
    
    const provider = providerSelect ? providerSelect.value : 'openrouter';
    const apiKey = providerApiKey.value.trim();
    
    // Save API key
    await window.electronAPI.saveApiKey(apiKey);
    
    // Save provider and other settings
    const settings = await window.electronAPI.getSettings();
    settings.provider = provider;
    
    // Save Azure-specific settings
    if (provider === 'azure-openai') {
      const azureEndpoint = document.getElementById('azureEndpoint');
      const azureDeployment = document.getElementById('azureDeployment');
      if (azureEndpoint) settings.azureEndpoint = azureEndpoint.value;
      if (azureDeployment) settings.azureDeployment = azureDeployment.value;
    }
    
    // Save Custom OpenAI settings
    if (provider === 'custom-openai') {
      const customBaseUrl = document.getElementById('customBaseUrl');
      if (customBaseUrl) settings.customBaseUrl = customBaseUrl.value;
    }
    
    await window.electronAPI.saveSettings(settings);
    
    if (providerKeyStatus) {
      providerKeyStatus.textContent = '✅ Settings saved successfully';
      providerKeyStatus.className = 'status-message success';
    }
    if (window.showToast) {
      window.showToast('Provider settings saved', 'success');
    }
    
    // Update global state
    window.apiKey = apiKey;
    window.currentProvider = provider;
    
    // Reload models in workspace since provider changed
    if (window.workspaceModule && typeof window.workspaceModule.loadAvailableModels === 'function') {
      await window.workspaceModule.loadAvailableModels();
    }
    
    // Update provider alert banner
    if (window.workspaceModule && typeof window.workspaceModule.updateProviderAlert === 'function') {
      window.workspaceModule.updateProviderAlert();
    }
    
  } catch (error) {
    console.error('Save provider error:', error);
    if (providerKeyStatus) {
      providerKeyStatus.textContent = `❌ Error: ${error.message}`;
      providerKeyStatus.className = 'status-message error';
    }
    if (window.showToast) {
      window.showToast(`Save failed: ${error.message}`, 'error');
    }
  } finally {
    if (saveProviderBtn) {
      saveProviderBtn.disabled = false;
      saveProviderBtn.textContent = 'Save settings';
    }
  }
}

async function handleDeleteKey() {
  if (!window.showConfirm) {
    if (window.showToast) {
      window.showToast('Confirm dialog not available', 'error');
    }
    return;
  }
  
  const confirmed = await window.showConfirm('Are you sure you want to delete the saved API key?');
  if (!confirmed) return;
  
  try {
    if (deleteProviderKeyBtn) {
      deleteProviderKeyBtn.disabled = true;
      deleteProviderKeyBtn.textContent = 'Deleting...';
    }
    
    // Clear the API key
    await window.electronAPI.saveApiKey('');
    
    // Clear the input field
    if (providerApiKey) {
      providerApiKey.value = '';
    }
    
    if (providerKeyStatus) {
      providerKeyStatus.textContent = '✅ API key deleted';
      providerKeyStatus.className = 'status-message success';
    }
    if (window.showToast) {
      window.showToast('API key deleted', 'success');
    }
    
    // Clear global state
    window.apiKey = null;
    
  } catch (error) {
    console.error('Delete key error:', error);
    if (providerKeyStatus) {
      providerKeyStatus.textContent = `❌ Error: ${error.message}`;
      providerKeyStatus.className = 'status-message error';
    }
    if (window.showToast) {
      window.showToast(`Delete failed: ${error.message}`, 'error');
    }
  } finally {
    if (deleteProviderKeyBtn) {
      deleteProviderKeyBtn.disabled = false;
      deleteProviderKeyBtn.textContent = 'Delete saved key';
    }
  }
}

function bindEvents() {
  if (toggleProviderKey) {
    toggleProviderKey.addEventListener('click', handleToggleKeyVisibility);
  }
  
  if (testProviderBtn) {
    testProviderBtn.addEventListener('click', handleTestConnection);
  }
  
  if (saveProviderBtn) {
    saveProviderBtn.addEventListener('click', handleSaveProvider);
  }
  
  if (deleteProviderKeyBtn) {
    deleteProviderKeyBtn.addEventListener('click', handleDeleteKey);
  }
  
  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const provider = providerSelect.value;
      renderProviderConfig(provider);
    });
  }
}

function init() {
  cacheElements();
  bindEvents();
  
  // Listen for panel activation
  document.addEventListener('settings-panel-activated', (e) => {
    if (e.detail && e.detail.panel === 'models') {
      loadProviderSettings();
    }
  });
  
  // Initialize if we're already on the models panel
  const modelsPanel = document.getElementById('panel-models');
  if (modelsPanel && !modelsPanel.hidden) {
    loadProviderSettings();
  }
}

module.exports = {
  init,
  loadProviderSettings
};
