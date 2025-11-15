'use strict';

// Appearance settings: handles theme selection

function loadAppearanceSettings() {
  const themeOptions = document.querySelectorAll('.theme-option');
  
  if (!themeOptions.length) return;
  
  // Get current theme from data attribute or localStorage
  const currentTheme = document.documentElement.getAttribute('data-theme') || 
                      localStorage.getItem('theme') || 
                      'dark';
  
  // Set active state on current theme
  themeOptions.forEach(option => {
    const theme = option.getAttribute('data-theme');
    if (theme === currentTheme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

function setTheme(theme) {
  // Update HTML attribute
  document.documentElement.setAttribute('data-theme', theme);
  
  // Save to localStorage
  localStorage.setItem('theme', theme);
  
  // Update active state
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    const optionTheme = option.getAttribute('data-theme');
    if (optionTheme === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Show toast notification
  if (window.showToast) {
    const themeNames = {
      'system': 'System',
      'dark': 'Dark',
      'light': 'Light',
      'high-contrast': 'High Contrast'
    };
    window.showToast(`Theme changed to ${themeNames[theme] || theme}`, 'success');
  }
}

function bindEvents() {
  const themeOptions = document.querySelectorAll('.theme-option');
  
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.getAttribute('data-theme');
      if (theme) {
        setTheme(theme);
      }
    });
  });
  
  // Also bind the header theme button if it exists
  const openSettingsAppearanceBtn = document.getElementById('openSettingsAppearance');
  if (openSettingsAppearanceBtn) {
    openSettingsAppearanceBtn.addEventListener('click', () => {
      // Navigate to settings appearance panel
      if (window.settingsModule && window.settingsModule.activate) {
        // First navigate to settings page
        const settingsPageBtn = document.querySelector('[data-page="settings"]');
        if (settingsPageBtn) {
          settingsPageBtn.click();
        }
        // Then activate appearance panel
        setTimeout(() => {
          window.settingsModule.activate('appearance');
        }, 100);
      }
    });
  }
}

function init() {
  bindEvents();
  
  // Listen for panel activation
  document.addEventListener('settings-panel-activated', (e) => {
    if (e.detail && e.detail.panel === 'appearance') {
      loadAppearanceSettings();
    }
  });
  
  // Initialize if we're already on the appearance panel
  const appearancePanel = document.getElementById('panel-appearance');
  if (appearancePanel && !appearancePanel.hidden) {
    loadAppearanceSettings();
  }
  
  // Load initial theme on app startup
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}

module.exports = {
  init,
  setTheme,
  loadAppearanceSettings
};
