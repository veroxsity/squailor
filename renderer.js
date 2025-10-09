let selectedFiles = [];
let apiKey = '';
let currentTheme = localStorage.getItem('app_theme') || 'dark';
let selectedModel = localStorage.getItem('ai_model') || 'openai/gpt-4o-mini';  // Updated default
let summaryHistory = [];

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const selectFilesBtn = document.getElementById('selectFiles');
const processFilesBtn = document.getElementById('processFiles');
let processCombined = false; // user choice: combined vs individual
const combinedToggle = document.getElementById('combinedToggle');
const fileListDiv = document.getElementById('fileList');
const resultsSection = document.getElementById('resultsSection');
const resultsDiv = document.getElementById('results');
const modelSelect = document.getElementById('modelSelect');
const historyListDiv = document.getElementById('historyList');
const emptyHistoryDiv = document.getElementById('emptyHistory');
const clearHistoryBtn = document.getElementById('clearHistory');
const totalSummariesSpan = document.getElementById('totalSummaries');
const totalDocumentsSpan = document.getElementById('totalDocuments');

// Storage settings elements
const storageAppDataRadio = document.getElementById('storageAppData');
const storageLocalAppRadio = document.getElementById('storageLocalApp');
const saveStorageLocationBtn = document.getElementById('saveStorageLocation');
const storageStatus = document.getElementById('storageStatus');
const appdataPathDiv = document.getElementById('appdataPath');
const localAppPathDiv = document.getElementById('localAppPath');
const statsFileCount = document.getElementById('statsFileCount');
const statsTotalSize = document.getElementById('statsTotalSize');

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  // Load API key from secure storage
  const keyResult = await window.electronAPI.loadApiKey();
  if (keyResult.success && keyResult.apiKey) {
    apiKey = keyResult.apiKey;
    if (apiKeyInput) {
      apiKeyInput.value = apiKey;
    }
  }
  
  // Load settings
  const settings = await window.electronAPI.getSettings();
  if (settings.theme) {
    currentTheme = settings.theme;
  }
  if (settings.aiModel) {
    selectedModel = settings.aiModel;
  }
  
  // Apply theme
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
    modal.style.display = 'block';

    function cleanup() {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      window.removeEventListener('keydown', onKeydown);
      modal.style.display = 'none';
    }

    function onOk() { cleanup(); resolve(true); }
    function onCancel() { cleanup(); resolve(false); }
    function onKeydown(e) { if (e.key === 'Escape') { cleanup(); resolve(false); } }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    window.addEventListener('keydown', onKeydown);
    okBtn.focus();
  });
}

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
  item.addEventListener('click', async () => {
    const targetPage = item.dataset.page;
    
    // Update nav items
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    
    // Update pages
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(`${targetPage}Page`).classList.add('active');
    
    // Load history if navigating to history page
    if (targetPage === 'history') {
      const result = await window.electronAPI.getSummaryHistory();
      if (result.success) {
        summaryHistory = result.history;
      }
      renderHistory();
    }
    
    // Load storage settings if navigating to settings page
    if (targetPage === 'settings') {
      loadStorageSettings();
    }
  });
});

// Theme Management
function applyTheme(theme) {
  document.body.className = `${theme}-theme`;
  currentTheme = theme;
  localStorage.setItem('app_theme', theme);
  
  // Update theme selector
  document.querySelectorAll('.theme-option').forEach(option => {
    if (option.dataset.theme === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
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
const updateStatusDiv = document.getElementById('updateStatus');

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

// Updater event handlers from preload (emits from main)
if (window.electronAPI && window.electronAPI.onUpdateChecking) {
  window.electronAPI.onUpdateChecking(() => {
    if (updateStatusDiv) updateStatusDiv.textContent = 'Checking for updates...';
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
  });

  window.electronAPI.onUpdateAvailable((info) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Update available: ${info.version} — downloading...`;
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
  });

  window.electronAPI.onUpdateProgress((progress) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Downloading update: ${Math.round(progress.percent || 0)}% (${progress.bytesPerSecond ? (Math.round(progress.bytesPerSecond / 1024) + ' KB/s') : ''})`;
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Update downloaded: ${info.version}`;
    if (installUpdateBtn) installUpdateBtn.style.display = 'inline-block';
  });

  window.electronAPI.onUpdateNotAvailable(() => {
    if (updateStatusDiv) updateStatusDiv.textContent = 'No updates available';
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
  });

  window.electronAPI.onUpdateError((err) => {
    if (updateStatusDiv) updateStatusDiv.textContent = `Update error: ${err && err.message}`;
    if (installUpdateBtn) installUpdateBtn.style.display = 'none';
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

// Initialize
if (apiKey && apiKeyInput && apiKeyStatus) {
  apiKeyInput.value = apiKey;
  apiKeyStatus.textContent = '✓ API Key loaded from secure storage (encrypted)';
  apiKeyStatus.className = 'status-message success';
  apiKeyStatus.style.display = 'block';
}

// Toggle API key visibility
if (toggleApiKeyBtn && apiKeyInput) {
  toggleApiKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
    } else {
      apiKeyInput.type = 'password';
    }
  });
}

// Save API key
if (saveApiKeyBtn && apiKeyInput && apiKeyStatus) {
  saveApiKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    
    if (!key) {
      apiKeyStatus.textContent = '❌ Please enter an API key';
      apiKeyStatus.className = 'status-message error';
      apiKeyStatus.style.display = 'block';
      return;
    }

  apiKeyStatus.textContent = 'Validating API key...';
    apiKeyStatus.className = 'status-message loading';
    apiKeyStatus.style.display = 'block';

    const result = await window.electronAPI.validateApiKey(key);

    if (result.valid) {
      // Save to encrypted file storage
      const saveResult = await window.electronAPI.saveApiKey(key);
      
      if (saveResult.success) {
        apiKey = key;
        apiKeyStatus.textContent = '✓ API Key validated and saved securely (encrypted)';
        apiKeyStatus.className = 'status-message success';
      } else {
        apiKeyStatus.textContent = `❌ Failed to save API key: ${saveResult.error}`;
        apiKeyStatus.className = 'status-message error';
      }
    } else {
      apiKeyStatus.textContent = `❌ Invalid API key: ${result.error}`;
      apiKeyStatus.className = 'status-message error';
    }
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
  if (selectedFiles.length === 0) {
    fileListDiv.innerHTML = '';
    processFilesBtn.disabled = true;
    return;
  }

  // Cap at 3 files if combined mode is on
  const filesToShow = processCombined ? selectedFiles.slice(0, 3) : selectedFiles;
  if (processCombined && selectedFiles.length > 3) {
    showToast('Combined mode supports up to 3 files. Extra files are ignored.', 'info');
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
      showToast('Please save your OpenRouter API key first!', 'error');
      return;
    }

    if (selectedFiles.length === 0) {
      showToast('Please select files to process!', 'error');
      return;
    }

    // Disable button and show processing state
    processFilesBtn.disabled = true;
    processFilesBtn.innerHTML = '<span class="loading"></span> Processing...';
    
    // Disable remove buttons during processing
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });

    const summaryType = getSummaryType();
    const responseTone = getResponseTone();
    const summaryStyle = getSummaryStyle();  // Get the selected style
    
    // Create a map to track file indices by filename
    const fileIndexMap = new Map();
    selectedFiles.forEach((filePath, index) => {
      const fileName = filePath.split(/[/\\]/).pop();
      fileIndexMap.set(fileName, index);
    });

    // Listen for progress updates
    window.electronAPI.onProcessingProgress((data) => {
      console.log('Processing:', data);
      
      // Find the file index
      const fileIndex = fileIndexMap.get(data.fileName);
      if (fileIndex !== undefined) {
        const statusElement = document.getElementById(`file-status-${fileIndex}`);
        const progressElement = document.getElementById(`file-progress-${fileIndex}`);
        
        if (statusElement) {
          // Get stage emoji and color
          const stageConfig = {
            'init': { emoji: '🔄', color: '#667eea' },
            'duplicate-check': { emoji: '🔍', color: '#667eea' },
            'cleanup': { emoji: '🧹', color: '#f59e0b' },
            'setup': { emoji: '📁', color: '#667eea' },
            'storing': { emoji: '💾', color: '#667eea' },
            'extracting': { emoji: '📖', color: '#667eea' },
            'summarizing': { emoji: '🤖', color: '#8b5cf6' },
            'saving': { emoji: '✅', color: '#10b981' },
            'complete': { emoji: '✓', color: '#10b981' },
            'cancelled': { emoji: '⏸️', color: '#ef4444' },
            'error': { emoji: '❌', color: '#ef4444' }
          };
          
          const config = stageConfig[data.stage] || { emoji: '⏳', color: '#667eea' };
          
          // For errors, customize the emoji based on error type
          if (data.stage === 'error' && data.errorType) {
            if (data.errorType === 'rate-limit') {
              config.emoji = '⏱️';
              config.color = '#f59e0b'; // Orange for rate limit
            } else if (data.errorType === 'quota') {
              config.emoji = '💳';
              config.color = '#ef4444';
            } else if (data.errorType === 'api-key') {
              config.emoji = '🔑';
              config.color = '#ef4444';
            }
          }
          
          // Update status text with progress indicator
          let statusText = `${config.emoji} ${data.status}`;
          
          // For errors, keep the full message (already user-friendly)
          if (data.stage !== 'error') {
            if (data.fileIndex && data.totalFiles) {
              statusText = `[${data.fileIndex}/${data.totalFiles}] ${statusText}`;
            }
            if (data.charCount) {
              statusText += ` (${data.charCount.toLocaleString()} chars)`;
            }
          } else {
            // For errors, just show the emoji and message
            statusText = `${config.emoji} ${data.status}`;
          }
          
          statusElement.textContent = statusText;
          statusElement.style.color = config.color;
          statusElement.style.fontWeight = '500';
          
          // For rate limit errors, make the text wrap properly
          if (data.errorType === 'rate-limit') {
            statusElement.style.whiteSpace = 'normal';
            statusElement.style.lineHeight = '1.4';
          }
          
          // Show/update progress bar for active stages
          if (progressElement) {
            if (data.stage === 'complete' || data.stage === 'error' || data.stage === 'cancelled') {
              progressElement.style.display = 'none';
            } else {
              progressElement.style.display = 'block';
              const progressFill = progressElement.querySelector('.progress-fill');
              if (progressFill) {
                // Animate progress based on stage
                const stageProgress = {
                  'init': '10%',
                  'duplicate-check': '20%',
                  'setup': '30%',
                  'storing': '40%',
                  'extracting': '60%',
                  'summarizing': '85%',
                  'saving': '95%'
                };
                progressFill.style.width = stageProgress[data.stage] || '50%';
                progressFill.style.background = `linear-gradient(90deg, ${config.color}, ${config.color}cc)`;
              }
            }
          }
        }
      }
    });

    try {
      if (processCombined) {
        const combined = await window.electronAPI.processDocumentsCombined(
          selectedFiles.slice(0, 3),
          summaryType,
          apiKey,
          responseTone,
          selectedModel,
          summaryStyle
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
          summaryStyle    // Pass the selected style
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
    }
  });
}

// Display results
async function displayResults(results) {
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
      const reduction = Math.round((1 - result.summary.length / result.originalLength) * 100);
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
              <div class="summary-card-type">${fileExt} Document</div>
            </div>
          </div>
          <div class="summary-card-footer">
            <div class="summary-card-stats">
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
                <span>${reduction}%</span>
              </div>
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
        <div class="summary-completion-card error-card" style="opacity: 0.9; cursor: default; border-color: ${errorColor};">
          <div class="summary-card-header">
            <div class="summary-card-icon" style="background: ${errorColor};">${errorIcon}</div>
            <div class="summary-card-info">
              <div class="summary-card-title">${escapeHtml(result.fileName)}</div>
              <div class="summary-card-type" style="color: ${errorColor};">${errorTypeText}</div>
            </div>
          </div>
          <div class="summary-card-footer">
            <div class="summary-card-error-msg" style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 8px; line-height: 1.4;">
              ${escapeHtml(shortError)}
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
  
  // Show modal
  modal.classList.add('active');
}

// Close summary modal
window.closeSummaryModal = function() {
  const modal = document.getElementById('summaryCompleteModal');
  if (modal) {
    modal.classList.remove('active');
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
    historyListDiv.style.display = 'none';
    emptyHistoryDiv.style.display = 'block';
    return;
  }
  
  historyListDiv.style.display = 'flex';
  emptyHistoryDiv.style.display = 'none';
  
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
            <div class="summary-text">${escapeHtml(item.summary)}</div>
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
  
  // Load document viewers for all items after DOM is updated
  setTimeout(() => {
    summaryHistory.forEach((item, index) => {
      loadDocumentViewer(index, item);
    });
  }, 0);
}

function updateHistoryStats() {
  if (totalSummariesSpan) {
    totalSummariesSpan.textContent = summaryHistory.length;
  }
  
  if (totalDocumentsSpan) {
    const uniqueFiles = new Set(summaryHistory.map(item => item.fileName)).size;
    totalDocumentsSpan.textContent = uniqueFiles;
  }
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

function viewFullSummary(index) {
  const item = summaryHistory[index];
  
  // Store current summary index for actions
  window.currentSummaryIndex = index;
  
  // Navigate to summary view page
  navItems.forEach(nav => nav.classList.remove('active'));
  pages.forEach(page => page.classList.remove('active'));
  document.getElementById('summaryViewPage').classList.add('active');
  
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
  document.getElementById('summaryViewTitle').textContent = item.fileName;
  document.getElementById('summaryViewMeta').textContent = `${new Date(item.timestamp).toLocaleString()} • ${item.summaryType.toUpperCase()} • ${toneDisplay} • ${styleDisplay} • ${item.model}`;
  
  const reduction = Math.round((1 - item.summaryLength / item.originalLength) * 100);
  document.getElementById('summaryViewStats').textContent = `Original: ${item.originalLength.toLocaleString()} chars • Summary: ${item.summaryLength.toLocaleString()} chars • ${reduction}% reduction`;
  
  // Parse markdown and render
  const contentDiv = document.getElementById('summaryViewContent');
  try {
    // Check if marked is available
    if (typeof marked !== 'undefined' && marked.parse) {
      // Configure marked for better rendering
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false
      });
      
      const htmlContent = marked.parse(item.summary);
      contentDiv.innerHTML = htmlContent;
    } else {
      // Fallback to plain text with basic formatting
      console.warn('marked library not loaded, using fallback rendering');
      const formattedText = item.summary
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/^- (.+)$/gm, '<li>$1</li>') // List items
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>') // Wrap in ul
        .replace(/\n\n/g, '</p><p>') // Paragraphs
        .replace(/^(.+)$/gm, '<p>$1</p>'); // Single paragraphs
      contentDiv.innerHTML = formattedText;
    }
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Fallback to pre-formatted text
    contentDiv.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.8;">${escapeHtml(item.summary)}</pre>`;
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
    document.querySelector('[data-page="history"]').click();
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
  } else if (item.fileType === '.pptx' || item.fileType === '.ppt') {
    await loadPPTViewer(viewerDiv, item);
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
  if (modal) {
    const overlay = modal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        closeSummaryModal();
      });
    }
  }
});

