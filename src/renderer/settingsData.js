'use strict';

// Settings data initialization: loads settings, populates storage paths, wires up buttons

async function initializeStoragePanel() {
  try {
    // Get storage paths from main process
    const response = await window.electronAPI.getStoragePaths();
    
    if (!response || !response.success) {
      console.error('Failed to get storage paths');
      return;
    }

    // Populate path displays
    const appdataPathEl = document.getElementById('appdataPath');
    const localAppPathEl = document.getElementById('localAppPath');
    
    if (appdataPathEl && response.appdataFull) {
      appdataPathEl.textContent = response.appdataFull;
    }
    
    if (localAppPathEl && response.localAppFull) {
      localAppPathEl.textContent = response.localAppFull;
    }

    // Set current selection based on settings
    if (response.settings && response.settings.storageLocation) {
      const location = response.settings.storageLocation;
      const radioAppData = document.getElementById('storageAppData');
      const radioLocalApp = document.getElementById('storageLocalApp');
      
      if (location === 'appdata' && radioAppData) {
        radioAppData.checked = true;
      } else if (location === 'local-app' && radioLocalApp) {
        radioLocalApp.checked = true;
      }
    }

    // Wire up save button
    const saveBtn = document.getElementById('saveStorageLocation');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSaveStorageLocation);
    }

    // Load storage stats
    await updateStorageStats();

  } catch (error) {
    console.error('Error initializing storage panel:', error);
    const appdataPathEl = document.getElementById('appdataPath');
    const localAppPathEl = document.getElementById('localAppPath');
    if (appdataPathEl) appdataPathEl.textContent = 'Error loading path';
    if (localAppPathEl) localAppPathEl.textContent = 'Error loading path';
  }
}

async function handleSaveStorageLocation() {
  const radioAppData = document.getElementById('storageAppData');
  const radioLocalApp = document.getElementById('storageLocalApp');
  const statusEl = document.getElementById('storageStatus');
  
  let selectedLocation = 'appdata';
  if (radioLocalApp && radioLocalApp.checked) {
    selectedLocation = 'local-app';
  }

  try {
    if (!window.electronAPI || !window.electronAPI.changeStorageLocation) {
      throw new Error('Storage API not available');
    }

    const result = await window.electronAPI.changeStorageLocation(selectedLocation);
    
    if (result && result.success) {
      if (statusEl) {
        statusEl.textContent = '✅ Storage location updated successfully';
        statusEl.className = 'status-message success';
      }
      if (window.showToast) {
        window.showToast('Storage location updated successfully', 'success');
      }
      // Update stats after changing location
      await updateStorageStats();
    } else {
      throw new Error(result?.error || 'Failed to change storage location');
    }
  } catch (error) {
    console.error('Error saving storage location:', error);
    if (statusEl) {
      statusEl.textContent = `❌ Error: ${error.message}`;
      statusEl.className = 'status-message error';
    }
    if (window.showToast) {
      window.showToast(`Error: ${error.message}`, 'error');
    }
  }
}

async function updateStorageStats() {
  const fileCountEl = document.getElementById('statsFileCount');
  const totalSizeEl = document.getElementById('statsTotalSize');
  
  if (!fileCountEl || !totalSizeEl) return;

  try {
    // Get settings to determine current storage location
    const settings = await window.electronAPI.getSettings();
    
    // For now, show placeholder - you can implement actual stats later
    fileCountEl.textContent = '—';
    totalSizeEl.textContent = '—';
    
  } catch (error) {
    console.error('Error updating storage stats:', error);
    if (fileCountEl) fileCountEl.textContent = '—';
    if (totalSizeEl) totalSizeEl.textContent = '—';
  }
}

async function initializeAppVersion() {
  try {
    if (!window.electronAPI || !window.electronAPI.getAppVersion) return;
    
    const version = await window.electronAPI.getAppVersion();
    
    // Update version in About panel
    const appVersionDisplay = document.getElementById('appVersionDisplay');
    if (appVersionDisplay) {
      appVersionDisplay.textContent = `v${version}`;
    }
    
    // Update version in rail
    const appVersionDisplayRail = document.getElementById('appVersionDisplayRail');
    if (appVersionDisplayRail) {
      appVersionDisplayRail.textContent = `v${version}`;
    }
  } catch (error) {
    console.error('Error loading app version:', error);
  }
}

function init() {
  // Initialize app version immediately
  initializeAppVersion();
  
  // Listen for settings panel activation
  document.addEventListener('settings-panel-activated', (e) => {
    if (e.detail && e.detail.panel === 'storage') {
      initializeStoragePanel();
    } else if (e.detail && e.detail.panel === 'about') {
      initializeAppVersion();
    }
  });

  // Initialize if we're already on the storage panel
  const storagePanel = document.getElementById('panel-storage');
  if (storagePanel && !storagePanel.hidden) {
    initializeStoragePanel();
  }
}

module.exports = {
  init,
  initializeStoragePanel,
  updateStorageStats,
  initializeAppVersion
};
