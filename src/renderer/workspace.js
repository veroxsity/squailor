// Workspace module: handles file selection, queue rendering, and processing

let selectedFiles = [];
let processCombined = false;
let processImages = true;
let isProcessingBatch = false;
let processingBatchSize = 0;
let currentFileIndexMap = new Map();

let selectFilesBtn;
let fileListDiv;
let processFilesBtn;
let resultsDiv;
let resultsSection;
let queueTokensEl;
let maxCombinedInput;
let processImagesToggle;
let combineFilesToggle;
let modelSelect;
let providerAlertBanner;

function cacheDom() {
  selectFilesBtn = document.getElementById('openFile');
  fileListDiv = document.getElementById('fileList');
  processFilesBtn = document.getElementById('processFiles');
  resultsDiv = document.getElementById('results');
  resultsSection = document.getElementById('resultsSection');
  queueTokensEl = document.getElementById('queueCount');
  maxCombinedInput = document.getElementById('maxCombinedInput');
  processImagesToggle = document.getElementById('processImagesToggle');
  combineFilesToggle = document.getElementById('combineFilesToggle');
  modelSelect = document.getElementById('modelSelect');
  providerAlertBanner = document.getElementById('workspaceProviderAlert');
}

async function updateProviderAlert() {
  if (!providerAlertBanner) {
    providerAlertBanner = document.getElementById('workspaceProviderAlert');
  }
  if (!providerAlertBanner) return;

  let hasKey = !!(window.apiKey && window.apiKey.length > 0);

  // Attempt lazy load if key not yet in memory
  if (!hasKey && window.electronAPI && typeof window.electronAPI.loadApiKey === 'function') {
    try {
      const keyData = await window.electronAPI.loadApiKey();
      if (keyData && keyData.success && keyData.apiKey) {
        window.apiKey = keyData.apiKey;
        hasKey = true;
      }
    } catch (e) {
      console.warn('Provider alert key load failed:', e && e.message);
    }
  }

  providerAlertBanner.hidden = hasKey;
  providerAlertBanner.classList.toggle('banner-has-key', hasKey);
  console.log('Provider alert updated. Has key:', hasKey, 'Banner hidden:', hasKey);
}

function updateQueueStats() {
  if (!queueTokensEl || !Array.isArray(selectedFiles)) return;
  if (!selectedFiles.length) {
    queueTokensEl.textContent = '—';
    return;
  }
  queueTokensEl.textContent = `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} in queue`;
}

function renderFileList() {
  updateQueueStats();

  if (!fileListDiv || !processFilesBtn) return;

  const fileListContainer = document.getElementById('fileListContainer');
  const processButtonContainer = document.getElementById('processButtonContainer');

  if (!selectedFiles.length) {
    fileListDiv.innerHTML = '';
    processFilesBtn.disabled = true;
    if (queueTokensEl) queueTokensEl.textContent = '—';
    if (fileListContainer) fileListContainer.hidden = true;
    if (processButtonContainer) processButtonContainer.hidden = true;
    return;
  }

  // Show the file list container and process button when files are added
  if (fileListContainer) fileListContainer.hidden = false;
  if (processButtonContainer) processButtonContainer.hidden = false;

  const maxCombined = (maxCombinedInput && parseInt(maxCombinedInput.value, 10)) || 3;
  const filesToShow = processCombined ? selectedFiles.slice(0, maxCombined) : selectedFiles;

  if (processCombined && selectedFiles.length > maxCombined && window.showToast) {
    window.showToast(`Combined mode supports up to ${maxCombined} files. Extra files are ignored.`, 'info');
  }

  fileListDiv.innerHTML = filesToShow
    .map((filePath, index) => {
      const fileName = filePath.split(/[/\\]/).pop();
      const ext = fileName.split('.').pop().toUpperCase();
      const icon = ext === 'PDF' ? '📕' : '📊';
      const escapedFilePath = filePath.replace(/'/g, '\\\'');
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
          <button class="remove-btn" onclick="window.workspaceModule.removeFile('${escapedFilePath}')">Remove</button>
        </div>
      `;
    })
    .join('');

  processFilesBtn.disabled = false;
}

async function handleSelectFilesClick() {
  if (!window.electronAPI || !window.electronAPI.selectFile) return;
  const filePaths = await window.electronAPI.selectFile();
  if (filePaths && filePaths.length > 0) {
    // Check for duplicates
    const newFiles = [];
    const duplicates = [];
    
    filePaths.forEach(filePath => {
      if (selectedFiles.includes(filePath)) {
        duplicates.push(filePath.split(/[/\\]/).pop()); // Extract filename
      } else {
        newFiles.push(filePath);
      }
    });
    
    // Add only new files
    if (newFiles.length > 0) {
      selectedFiles = [...selectedFiles, ...newFiles];
      renderFileList();
      if (processFilesBtn) processFilesBtn.disabled = false;
    }
    
    // Show feedback
    if (duplicates.length > 0 && window.showToast) {
      const msg = duplicates.length === 1 
        ? `File "${duplicates[0]}" is already in the queue`
        : `${duplicates.length} files already in queue (duplicates ignored)`;
      window.showToast(msg, 'info');
    }
    
    if (newFiles.length === 0 && duplicates.length > 0 && window.showToast) {
      window.showToast('No new files added - all selected files are already in the queue', 'warning');
    }
  }
}

function getSummaryType() {
  const selected = document.querySelector('input[name="summaryType"]:checked');
  return selected ? selected.value : 'normal';
}

function getResponseTone() {
  const selected = document.querySelector('input[name="responseTone"]:checked');
  return selected ? selected.value : 'casual';
}

function getSummaryStyle() {
  const selected = document.querySelector('input[name="summaryStyle"]:checked');
  return selected ? selected.value : 'teaching';
}

async function displayResults(results) {
  if (resultsSection) {
    resultsSection.hidden = false;
  }
  if (resultsDiv) {
    const inlineCards = results
      .map((result, index) => {
        if (!result.success) return '';
        const fileExt = result.fileName.split('.').pop().toUpperCase();
        const fileIcon = fileExt === 'PDF' ? '📕' : fileExt === 'PPTX' || fileExt === 'PPT' ? '📊' : '📄';
        const reduction = result.originalLength
          ? Math.round((1 - result.summary.length / result.originalLength) * 100)
          : null;
        const locationLabel = result.folderId ? 'Saved to history' : 'Local only';
        return `
          <article class="summary-completion-card" onclick="window.summaryViewModule && window.summaryViewModule.viewFullSummary(${index})">
            <div class="summary-card-header">
              <div class="summary-card-icon">${fileIcon}</div>
              <div class="summary-card-info">
                <div class="summary-card-title">${escapeHtml(result.fileName)}</div>
                <div class="summary-card-type">${fileExt} Document${
                  reduction === null ? '' : ` • ${reduction}% reduction`
                }</div>
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
      })
      .filter(Boolean);

    if (inlineCards.length) {
      resultsDiv.innerHTML = inlineCards.join('');
    } else {
      resultsDiv.innerHTML = '<div class="summary-text">No summaries were generated in this run.</div>';
    }
  }

  if (window.showSummaryCompletionModal) {
    window.showSummaryCompletionModal(results);
  }

  window.currentResults = results;

  if (window.addToHistory) {
    for (const result of results) {
      if (result.success) {
        await window.addToHistory(result);
      }
    }
  }
}

async function handleProcessFilesClick() {
  if (!processFilesBtn || !resultsDiv || !resultsSection) return;
  
  console.log('Process button clicked');
  console.log('API Key present:', !!window.apiKey);
  console.log('Selected model:', window.selectedModel);
  console.log('Files to process:', selectedFiles.length);
  
  if (!window.apiKey) {
    const prov = window.currentProvider || 'your provider';
    window.showToast && window.showToast(`Please save your API key for ${prov} first!`, 'error');
    return;
  }

  if (!selectedFiles.length) {
    window.showToast && window.showToast('Please select files to process!', 'error');
    return;
  }

  const combinedCap = (maxCombinedInput && parseInt(maxCombinedInput.value, 10)) || 3;
  processFilesBtn.disabled = true;
  processFilesBtn.innerHTML = '<span class="loading"></span> Processing...';
  if (queueTokensEl) {
    queueTokensEl.textContent = 'Processing…';
  }

  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
  });

  const summaryType = getSummaryType();
  const responseTone = getResponseTone();
  const summaryStyle = getSummaryStyle();
  const runBatchSize = processCombined ? Math.min(selectedFiles.length, combinedCap) : selectedFiles.length;
  isProcessingBatch = true;
  processingBatchSize = runBatchSize;

  if (window.updateQueueStatusChip) window.updateQueueStatusChip();

  currentFileIndexMap = new Map();
  selectedFiles.forEach((filePath, index) => {
    const fileName = filePath.split(/[/\\]/).pop();
    currentFileIndexMap.set(fileName, index);
  });

  try {
    console.log('Starting processing...');
    console.log('Process combined:', processCombined);
    console.log('Process images:', processImages);
    console.log('Summary type:', summaryType);
    console.log('Response tone:', responseTone);
    console.log('Summary style:', summaryStyle);
    
    if (processCombined) {
      console.log('Processing combined mode');
      const combined = await window.electronAPI.processDocumentsCombined(
        selectedFiles.slice(0, combinedCap),
        summaryType,
        window.apiKey,
        responseTone,
        window.selectedModel,
        summaryStyle,
        processImages
      );

      console.log('Combined processing result:', combined);

      if (!combined || !combined.success) {
        throw new Error((combined && combined.error) || 'Combined summary failed');
      }

      const reduction = Math.round((1 - combined.summary.length / combined.originalLength) * 100);
      await displayResults([
        {
          success: true,
          fileName: combined.fileName,
          folderId: combined.folderId,
          fileType: '.aggregate',
          originalLength: combined.originalLength,
          summary: combined.summary,
          reduction
        }
      ]);
    } else {
      console.log('Processing individual mode');
      const results = await window.electronAPI.processDocuments(
        selectedFiles,
        summaryType,
        window.apiKey,
        responseTone,
        window.selectedModel,
        summaryStyle,
        processImages
      );
      console.log('Processing results:', results);
      await displayResults(results);

      // Handle duplicates: keep them in queue and show feedback
      const duplicateResults = results.filter(r => r.duplicate);
      if (duplicateResults.length > 0) {
        selectedFiles = selectedFiles.filter(f => duplicateResults.some(d => d.filePath === f));
        renderFileList();
        const dupNames = duplicateResults.map(r => r.fileName);
        const message = `The following files were skipped because they have already been summarized:\n\n${dupNames.join('\n')}\n\nThese files remain in your queue. You can remove them or try different summary settings.`;
        if (window.showInfoModal) {
          window.showInfoModal(message, 'Duplicate Files Detected');
        } else if (window.showToast) {
          window.showToast(`Duplicate files skipped: ${dupNames.join(', ')}`, 'warning');
        }
      } else {
        selectedFiles = [];
        renderFileList();
      }
    }
  } catch (error) {
    console.error('Error processing documents:', error);
    window.showToast && window.showToast(`Error processing documents: ${error.message}`, 'error');
  } finally {
    processFilesBtn.disabled = false;
    processFilesBtn.innerHTML = '<span class="btn-icon">🚀</span><span>Generate Summaries</span>';
    updateQueueStats();
    isProcessingBatch = false;
    processingBatchSize = 0;
    if (window.updateQueueStatusChip) window.updateQueueStatusChip();
    if (queueTokensEl && !selectedFiles.length) {
      queueTokensEl.textContent = '—';
    }

    // Re-enable remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.removeAttribute('disabled');
      btn.style.opacity = '';
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadAvailableModels() {
  if (!modelSelect) return;
  
  try {
    // Get current provider from settings
    const settings = await window.electronAPI.getSettings();
    const provider = settings?.provider || 'openrouter';
    
    // Get models for this provider
    const result = await window.electronAPI.getProviderModels(provider);
    
    if (!result || !result.success || !Array.isArray(result.models)) {
      console.error('Failed to load models:', result?.error);
      modelSelect.innerHTML = '<option value="">No models available</option>';
      return;
    }
    
    const models = result.models;
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    if (models.length === 0) {
      modelSelect.innerHTML = '<option value="">No models available</option>';
      return;
    }
    
    // Check if models are objects or strings
    const isModelObject = models[0] && typeof models[0] === 'object' && models[0].value;
    
    // Add models to select
    if (isModelObject) {
      // Models are objects with value/label/group
      let currentGroup = null;
      models.forEach(model => {
        // Add optgroup if group changed
        if (model.group && model.group !== currentGroup) {
          currentGroup = model.group;
          const optgroup = document.createElement('optgroup');
          optgroup.label = currentGroup;
          modelSelect.appendChild(optgroup);
        }
        
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label || model.value;
        
        // Add to optgroup if exists, otherwise directly to select
        const lastChild = modelSelect.lastElementChild;
        if (lastChild && lastChild.tagName === 'OPTGROUP') {
          lastChild.appendChild(option);
        } else {
          modelSelect.appendChild(option);
        }
      });
    } else {
      // Models are simple strings
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
    }
    
    // Restore saved model selection
    const savedModel = settings?.model;
    if (savedModel) {
      // Try to find matching value
      const matchingOption = Array.from(modelSelect.options).find(opt => opt.value === savedModel);
      if (matchingOption) {
        modelSelect.value = savedModel;
        window.selectedModel = savedModel;
      }
    } else if (modelSelect.options.length > 0) {
      // If no saved model, use the first one
      const firstModel = modelSelect.options[0].value;
      modelSelect.value = firstModel;
      window.selectedModel = firstModel;
    }
  } catch (error) {
    console.error('Error loading models:', error);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
  }
}

function init() {
  cacheDom();

  // Load available models for the current provider
  loadAvailableModels();
  
  // Update provider alert banner visibility based on API key status
  // Initial alert update (async); don't await to avoid blocking startup
  updateProviderAlert();
  
  // Re-check provider alert after a short delay (in case API context loads late)
  setTimeout(() => { updateProviderAlert(); }, 300);
  setTimeout(() => { updateProviderAlert(); }, 1200); // second retry for slower disk encryption load

  if (selectFilesBtn && fileListDiv && processFilesBtn) {
    selectFilesBtn.addEventListener('click', handleSelectFilesClick);
    processFilesBtn.addEventListener('click', handleProcessFilesClick);
  }

  // Add drag-and-drop support to the dropzone
  const dropzone = document.getElementById('dropzone');
  if (dropzone) {
    // Make dropzone clickable
    dropzone.addEventListener('click', (e) => {
      // Don't trigger if clicking the button itself
      if (e.target.closest('#openFile')) return;
      if (selectFilesBtn) selectFilesBtn.click();
    });

    // Drag-and-drop handlers
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      if (files && files.length > 0) {
        const filePaths = files.map(f => f.path).filter(Boolean);
        if (filePaths.length > 0) {
          // Check for duplicates in drag-and-drop
          const newFiles = [];
          const duplicates = [];
          
          filePaths.forEach(filePath => {
            if (selectedFiles.includes(filePath)) {
              duplicates.push(filePath.split(/[/\\]/).pop());
            } else {
              newFiles.push(filePath);
            }
          });
          
          // Add only new files
          if (newFiles.length > 0) {
            selectedFiles = [...selectedFiles, ...newFiles];
            renderFileList();
            if (processFilesBtn) processFilesBtn.disabled = false;
          }
          
          // Show feedback
          if (duplicates.length > 0 && window.showToast) {
            const msg = duplicates.length === 1 
              ? `File "${duplicates[0]}" is already in the queue`
              : `${duplicates.length} files already in queue (duplicates ignored)`;
            window.showToast(msg, 'info');
          }
          
          if (newFiles.length === 0 && duplicates.length > 0 && window.showToast) {
            window.showToast('No new files added - all selected files are already in the queue', 'warning');
          }
        }
      }
    });
  }

  if (processImagesToggle) {
    processImagesToggle.addEventListener('change', () => {
      processImages = !!processImagesToggle.checked;
    });
  }

  if (combineFilesToggle) {
    combineFilesToggle.addEventListener('change', () => {
      processCombined = !!combineFilesToggle.checked;
      renderFileList();
    });
  }

  // Save model selection when changed
  if (modelSelect) {
    modelSelect.addEventListener('change', async () => {
      const selectedModel = modelSelect.value;
      if (selectedModel) {
        // Update global variable for processing
        window.selectedModel = selectedModel;
        
        try {
          const settings = await window.electronAPI.getSettings();
          settings.model = selectedModel;
          await window.electronAPI.saveSettings(settings);
        } catch (error) {
          console.error('Error saving model selection:', error);
        }
      }
    });
  }

  // Add Clear All button handler
  const clearFileListBtn = document.getElementById('clearFileList');
  if (clearFileListBtn) {
    clearFileListBtn.addEventListener('click', () => {
      selectedFiles = [];
      renderFileList();
      if (window.showToast) {
        window.showToast('Queue cleared', 'info');
      }
    });
  }

  window.workspaceModule = {
    removeFile(filePath) {
      const index = selectedFiles.indexOf(filePath);
      if (index !== -1) {
        selectedFiles.splice(index, 1);
        renderFileList();
      }
    },
    renderFileList,
    displayResults,
    loadAvailableModels,
    updateProviderAlert,
    state: {
      get selectedFiles() {
        return [...selectedFiles];
      },
      get processCombined() {
        return processCombined;
      },
      set processCombined(val) {
        processCombined = !!val;
        renderFileList();
      },
      get processImages() {
        return processImages;
      },
      set processImages(val) {
        processImages = !!val;
      },
      get isProcessingBatch() {
        return isProcessingBatch;
      },
      get processingBatchSize() {
        return processingBatchSize;
      },
      get currentFileIndexMap() {
        return currentFileIndexMap;
      }
    }
  };
}

module.exports = {
  init,
  renderFileList,
  displayResults,
  loadAvailableModels,
  updateProviderAlert
};
