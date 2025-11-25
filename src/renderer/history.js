'use strict';

// History page logic extracted from renderer.js

let summaryHistory = [];
let historyListDiv;
let emptyHistoryDiv;
let totalSummariesSpan;
let totalDocumentsSpan;

const SUMMARY_PREVIEW_LIMIT = 600;

function cacheElements() {
  historyListDiv = document.getElementById('historyList');
  emptyHistoryDiv = document.getElementById('emptyHistory');
  totalSummariesSpan = document.getElementById('totalSummaries');
  totalDocumentsSpan = document.getElementById('totalDocuments');
}

function getSummaryPreview(summary = '') {
  if (!summary) return '';
  if (summary.length <= SUMMARY_PREVIEW_LIMIT) {
    return summary;
  }
  const truncated = summary.slice(0, SUMMARY_PREVIEW_LIMIT).trimEnd();
  return `${truncated}…`;
}

function updateHistoryStats() {
  if (totalSummariesSpan) {
    totalSummariesSpan.textContent = `${summaryHistory.length} ${summaryHistory.length === 1 ? 'summary' : 'summaries'}`;
  }

  if (totalDocumentsSpan) {
    const uniqueFiles = new Set(summaryHistory.map(item => item.fileName)).size;
    totalDocumentsSpan.textContent = `${uniqueFiles} ${uniqueFiles === 1 ? 'document' : 'documents'}`;
  }
}

function renderHistory() {
  // Re-cache elements in case they weren't ready during init
  if (!historyListDiv || !emptyHistoryDiv) {
    cacheElements();
  }
  
  if (!historyListDiv) {
    console.error('History list div not found');
    return;
  }

  updateHistoryStats();
  
  console.log('Rendering history. Count:', summaryHistory.length);
  console.log('historyListDiv:', historyListDiv ? 'found' : 'NOT FOUND');
  console.log('emptyHistoryDiv:', emptyHistoryDiv ? 'found' : 'NOT FOUND');

  if (summaryHistory.length === 0) {
    historyListDiv.innerHTML = '';
    historyListDiv.hidden = true;
    if (emptyHistoryDiv) {
      emptyHistoryDiv.hidden = false;
      emptyHistoryDiv.removeAttribute('hidden');
      console.log('Showing empty history state');
    }
    return;
  }

  console.log('Have history items, hiding empty state and showing list');
  historyListDiv.hidden = false;
  historyListDiv.removeAttribute('hidden');
  
  if (emptyHistoryDiv) {
    emptyHistoryDiv.hidden = true;
    emptyHistoryDiv.setAttribute('hidden', '');
    console.log('Empty history hidden:', emptyHistoryDiv.hidden, 'has hidden attr:', emptyHistoryDiv.hasAttribute('hidden'));
  }

  historyListDiv.innerHTML = summaryHistory.map((item, index) => {
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    const reduction = Math.round((1 - item.summaryLength / item.originalLength) * 100);
    const fileExt = item.fileName.split('.').pop().toUpperCase();
    const fileIcon = fileExt === 'PDF' ? '📕' : '📊';

    const toneMap = {
      casual: '😊 Casual',
      formal: '🎓 Formal',
      informative: '📚 Informative',
      easy: '✨ Easy'
    };
    const toneDisplay = toneMap[item.responseTone] || '😊 Casual';

    const styleMap = {
      teaching: '👨‍🏫 Teaching',
      notes: '📝 Notes',
      mcqs: '❓ MCQs'
    };
    const styleDisplay = styleMap[item.summaryStyle] || '👨‍🏫 Teaching';

    const summaryTextId = `summaryText-${index}`;
    const shouldTruncate = (item.summary || '').length > SUMMARY_PREVIEW_LIMIT;
    const previewToggle = shouldTruncate
      ? `<button class="btn btn-ghost btn-small preview-toggle" data-history-action="toggle-preview" data-history-index="${index}" aria-expanded="false">
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
            <button class="icon-btn" data-history-action="copy" data-history-index="${index}" title="Copy Summary">📋</button>
            <button class="icon-btn" data-history-action="export" data-history-index="${index}" title="Export">💾</button>
            <button class="icon-btn delete" data-history-action="delete" data-history-index="${index}" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="history-item-content">
          <div class="history-preview">
            <div class="preview-label"><span>📄</span> Document Viewer</div>
            <div class="document-viewer" id="viewer-${index}">
              <div class="viewer-loading">Loading document...</div>
            </div>
          </div>
          <div class="summary-preview">
            <div class="preview-label"><span>✨</span> Summary</div>
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
            <button class="btn btn-outline btn-small" data-history-action="view-full" data-history-index="${index}">👁️ View Full</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

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
      if (window.workspaceModule && typeof window.workspaceModule.loadDocumentViewer === 'function') {
        window.workspaceModule.loadDocumentViewer(index, item);
      }
    });
  });
}

async function loadHistoryPage() {
  try {
    const result = await window.electronAPI.getSummaryHistory();
    if (result.success) {
      summaryHistory = result.history;
      // Update global reference so summaryView can access it
      window.summaryHistory = summaryHistory;
      console.log('History loaded:', summaryHistory.length, 'items');
    }
    renderHistory();
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

function toggleHistoryPreview(index) {
  const textEl = document.getElementById(`summaryText-${index}`);
  // Find the button using data attribute instead of ID
  const toggleBtn = document.querySelector(`[data-history-action="toggle-preview"][data-history-index="${index}"]`);
  
  if (!textEl) {
    console.error('Summary text element not found for index:', index);
    return;
  }
  
  if (!toggleBtn) {
    console.error('Toggle button not found for index:', index);
    return;
  }

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
}

async function deleteHistoryItem(index) {
  const ok = await window.showConfirm('Are you sure you want to delete this history item?');
  if (!ok) return;
  const item = summaryHistory[index];

  if (item.folderId) {
    await window.electronAPI.deleteSummaryFromHistory(item.folderId);
  }

  const result = await window.electronAPI.getSummaryHistory();
  if (result.success) {
    summaryHistory = result.history;
  }
  renderHistory();
}

async function copyHistorySummary(index) {
  const item = summaryHistory[index];
  if (!item || !item.summary) {
    window.showToast('Summary content is not available yet.', 'info');
    return;
  }
  await window.copyTextToClipboard(item.summary, {
    successMessage: 'Summary copied to clipboard!',
    failureMessage: 'Failed to copy summary to clipboard. Please try again.'
  });
}

function exportHistoryItem(index) {
  const item = summaryHistory[index];
  const toneMap = {
    casual: 'Casual',
    formal: 'Formal',
    informative: 'Informative',
    easy: 'Easy to Understand'
  };
  const toneDisplay = toneMap[item.responseTone] || 'Casual';

    const styleMap = {
      teaching: 'Teaching',
      notes: 'Notes',
      mcqs: 'MCQs'
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

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>\"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

function init() {
  cacheElements();
  
  // Expose functions globally first, before any rendering
  window.historyModule = {
    loadHistoryPage,
    toggleHistoryPreview,
    deleteHistoryItem,
    copyHistorySummary,
    exportHistoryItem,
    getSummaryHistory: () => summaryHistory  // Expose the history array
  };
  
  // Also expose globally for compatibility
  window.summaryHistory = summaryHistory;
  
  console.log('History module initialized, functions exposed:', Object.keys(window.historyModule));
  
  // Add event delegation for history buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-history-action]');
    if (!target) return;
    
    const action = target.dataset.historyAction;
    const index = parseInt(target.dataset.historyIndex, 10);
    
    console.log('History button clicked:', action, 'index:', index);
    
    if (isNaN(index)) {
      console.error('Invalid history index:', target.dataset.historyIndex);
      return;
    }
    
    switch (action) {
      case 'copy':
        copyHistorySummary(index);
        break;
      case 'export':
        exportHistoryItem(index);
        break;
      case 'delete':
        deleteHistoryItem(index);
        break;
      case 'toggle-preview':
        toggleHistoryPreview(index);
        break;
      case 'view-full':
        if (window.summaryViewModule && typeof window.summaryViewModule.viewFullSummary === 'function') {
          window.summaryViewModule.viewFullSummary(index);
        }
        break;
      default:
        console.warn('Unknown history action:', action);
    }
  });
}

module.exports = { init, loadHistoryPage };
