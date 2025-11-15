'use strict';

// Image settings: handles max images per document and max files to combine

let maxImagesInput;
let maxCombinedInput;
let saveMaxImagesBtn;

function cacheElements() {
  maxImagesInput = document.getElementById('maxImagesInput');
  maxCombinedInput = document.getElementById('maxCombinedInput');
  saveMaxImagesBtn = document.getElementById('saveMaxImages');
}

async function loadImageSettings() {
  try {
    const settings = await window.electronAPI.getSettings();
    
    if (maxImagesInput && typeof settings.maxImages === 'number') {
      maxImagesInput.value = settings.maxImages;
    } else if (maxImagesInput) {
      maxImagesInput.value = 5; // default
    }
    
    if (maxCombinedInput && typeof settings.maxCombinedFiles === 'number') {
      maxCombinedInput.value = settings.maxCombinedFiles;
    } else if (maxCombinedInput) {
      maxCombinedInput.value = 3; // default
    }
    
  } catch (error) {
    console.error('Error loading image settings:', error);
  }
}

async function handleSaveImageSettings() {
  try {
    if (saveMaxImagesBtn) {
      saveMaxImagesBtn.disabled = true;
      saveMaxImagesBtn.textContent = 'Saving...';
    }
    
    const settings = await window.electronAPI.getSettings();
    
    if (maxImagesInput) {
      const value = parseInt(maxImagesInput.value, 10);
      if (!isNaN(value) && value >= 0 && value <= 10) {
        settings.maxImages = value;
      }
    }
    
    if (maxCombinedInput) {
      const value = parseInt(maxCombinedInput.value, 10);
      if (!isNaN(value) && value >= 1 && value <= 10) {
        settings.maxCombinedFiles = value;
      }
    }
    
    await window.electronAPI.saveSettings(settings);
    
    if (window.showToast) {
      window.showToast('Image settings saved successfully', 'success');
    }
    
  } catch (error) {
    console.error('Error saving image settings:', error);
    if (window.showToast) {
      window.showToast(`Error saving settings: ${error.message}`, 'error');
    }
  } finally {
    if (saveMaxImagesBtn) {
      saveMaxImagesBtn.disabled = false;
      saveMaxImagesBtn.textContent = 'Save settings';
    }
  }
}

function bindEvents() {
  if (saveMaxImagesBtn) {
    saveMaxImagesBtn.addEventListener('click', handleSaveImageSettings);
  }
}

function init() {
  cacheElements();
  bindEvents();
  
  // Listen for panel activation
  document.addEventListener('settings-panel-activated', (e) => {
    if (e.detail && e.detail.panel === 'image') {
      loadImageSettings();
    }
  });
  
  // Initialize if we're already on the image panel
  const imagePanel = document.getElementById('panel-image');
  if (imagePanel && !imagePanel.hidden) {
    loadImageSettings();
  }
}

module.exports = {
  init,
  loadImageSettings
};
