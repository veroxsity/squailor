'use strict';

// Renderer bootstrap: centralizes app wiring and delegates to focused modules.

let helpers, initNavigation, initUpdatesAndDiagnostics, history, summaryView, workspace, settingsNav, settingsData, settingsModels, settingsImage, settingsAppearance;
let summaryQa; // newly added summary Q&A module

// NOTE: This file is injected via a <script> tag in index.html, so Node's
// resolution treats relative require paths as if they originate from index.html's
// directory ("src"), not this file's physical folder. Therefore we must include
// the "renderer/" segment when requiring sibling renderer modules.
try {
  helpers = require('./renderer/helpers.js');
} catch (e) {
  console.error('✗ Failed to load helpers:', e.message);
}

try {
  const nav = require('./renderer/navigation.js');
  initNavigation = nav.initNavigation;
} catch (e) {
  console.error('✗ Failed to load navigation:', e.message);
}

try {
  const settings = require('./renderer/settings.js');
  settingsNav = settings.initSettingsNavigation;
} catch (e) {
  console.error('✗ Failed to load settings navigation:', e.message);
}

try {
  settingsData = require('./renderer/settingsData.js');
} catch (e) {
  console.error('✗ Failed to load settings data:', e.message);
}

try {
  settingsModels = require('./renderer/settingsModels.js');
} catch (e) {
  console.error('✗ Failed to load settings models:', e.message);
}

try {
  settingsImage = require('./renderer/settingsImage.js');
} catch (e) {
  console.error('✗ Failed to load settings image:', e.message);
}

try {
  settingsAppearance = require('./renderer/settingsAppearance.js');
} catch (e) {
  console.error('✗ Failed to load settings appearance:', e.message);
}

try {
  const updates = require('./renderer/updates.js');
  initUpdatesAndDiagnostics = updates.initUpdatesAndDiagnostics;
} catch (e) {
  console.error('✗ Failed to load updates:', e.message);
}

try {
  history = require('./renderer/history.js');
} catch (e) {
  console.error('✗ Failed to load history:', e.message);
}

try {
  summaryView = require('./renderer/summaryView.js');
} catch (e) {
  console.error('✗ Failed to load summaryView:', e.message);
}

try {
  summaryQa = require('./renderer/summaryQa.js');
} catch (e) {
  console.error('✗ Failed to load summaryQa:', e.message);
}

try {
  workspace = require('./renderer/workspace.js');
} catch (e) {
  console.error('✗ Failed to load workspace:', e.message);
}

async function loadGlobalApiContext() {
  try {
    // Load API key and provider on startup
    const settings = await window.electronAPI.getSettings();
    window.currentProvider = settings?.provider || 'openrouter';
    
    if (window.electronAPI.loadApiKey) {
      const keyData = await window.electronAPI.loadApiKey();
      if (keyData && keyData.apiKey) {
        window.apiKey = keyData.apiKey;
      } else {
        window.apiKey = null;
      }
    } else {
      window.apiKey = null;
    }
  } catch (error) {
    console.error('Error loading global API context:', error);
    window.apiKey = null;
    window.currentProvider = 'openrouter';
  }
}

function initialize() {
  try {
    // Load global API context first
    loadGlobalApiContext().then(() => {
      console.log('API context loaded:', window.currentProvider, window.apiKey ? 'Key present' : 'No key');
      
      // Update provider alert banner after API context is loaded
      if (window.workspaceModule && typeof window.workspaceModule.updateProviderAlert === 'function') {
        window.workspaceModule.updateProviderAlert();
      }
    }).catch(err => {
      console.error('Failed to load API context:', err);
    });
    
    if (helpers && helpers.init) {
      helpers.init();
    }
    if (initNavigation) {
      initNavigation();
    }
    if (initUpdatesAndDiagnostics) {
      initUpdatesAndDiagnostics();
    }
    if (history && history.init) {
      history.init();
    }
    if (summaryView && summaryView.init) {
      summaryView.init();
    }
    if (summaryQa && summaryQa.init) {
      summaryQa.init();
    }
    if (workspace && workspace.init) {
      workspace.init();
    }
    if (settingsNav) {
      settingsNav();
    }
    if (settingsData && settingsData.init) {
      settingsData.init();
    }
    if (settingsModels && settingsModels.init) {
      settingsModels.init();
    }
    if (settingsImage && settingsImage.init) {
      settingsImage.init();
    }
    if (settingsAppearance && settingsAppearance.init) {
      settingsAppearance.init();
    }
  } catch (e) {
    console.error('❌ Bootstrap initialization error:', e.message, e.stack);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
