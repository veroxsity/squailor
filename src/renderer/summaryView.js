'use strict';

// Summary view logic extracted from renderer.js

let summaryHistoryRef;

function renderSummaryContent(contentDiv, summaryText) {
  if (!contentDiv) return;
  const text = typeof summaryText === 'string' ? summaryText : '';

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
    paragraph.textContent = block.replace(/\n+/g, ' ').trim();
    if (paragraph.textContent.length > 0) {
      contentDiv.appendChild(paragraph);
    }
  });
}

function viewFullSummary(index) {
  console.log('viewFullSummary called with index:', index);
  
  const summaryHistory = summaryHistoryRef || window.summaryHistory || [];
  console.log('summaryHistory available:', summaryHistory.length, 'items');
  
  const item = summaryHistory[index];
  if (!item) {
    console.error('No history item found at index:', index);
    return;
  }
  
  console.log('Loading summary for:', item.fileName);

  window.currentSummaryIndex = index;

  if (window.navigationModule && typeof window.navigationModule.activatePage === 'function') {
    console.log('Activating summary page');
    // The navigation module refers to this page as 'summary' not 'summaryView'
    window.navigationModule.activatePage('summary');
  } else {
    console.error('Navigation module not available');
  }

  const toneMap = {
    casual: 'Casual',
    formal: 'Formal',
    informative: 'Informative',
    easy: 'Easy to Understand'
  };
  const toneDisplay = toneMap[item.responseTone] || 'Casual';

  const styleMap = {
    teaching: 'Teaching',
    notes: 'Notes'
  };
  const styleDisplay = styleMap[item.summaryStyle] || 'Teaching';

  const summaryHeading = document.getElementById('summaryViewHeading');
  if (summaryHeading) summaryHeading.textContent = item.fileName;

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
    const escapeHtml = (str) => typeof str === 'string' ? str.replace(/[&<>\"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s])) : '';
    summaryMetaChips.innerHTML = [
      item.summaryType.toUpperCase(),
      toneDisplay,
      styleDisplay,
      item.model
    ].map(value => `<span class="meta-chip">${escapeHtml(value)}</span>`).join('');
  }

  const contentDiv = document.getElementById('summaryViewContent');
  try {
    const guidanceHost = document.getElementById('canvasGuidance');
    if (guidanceHost) guidanceHost.remove();
    const isPdf = /\.pdf$/i.test(item.fileName);
    const hadImages = Array.isArray(item.images) && item.images.length > 0;
    if (isPdf && !hadImages) {
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

  renderSummaryContent(contentDiv, item.summary);

  if (window.summaryQa && typeof window.summaryQa.setupSummaryQaChat === 'function') {
    window.summaryQa.setupSummaryQaChat(item);
  }
  if (window.summaryQa && typeof window.summaryQa.buildSummaryTOC === 'function') {
    window.summaryQa.buildSummaryTOC();
  }

  const split = document.getElementById('summarySplit');
  const qaSidebar = document.getElementById('qaSidebar');
  const qaResizer = document.getElementById('qaResizer');
  const tocSidebar = document.getElementById('tocSidebar');
  const tocResizer = document.getElementById('tocResizer');

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

  const openQaBtn = document.getElementById('openQaBtn');
  const qaCloseBtn = document.getElementById('qaCloseBtn');
  const openTocBtn = document.getElementById('openTocBtn');
  const tocCloseBtn = document.getElementById('tocCloseBtn');

  function openQaPanel() {
    if (!qaSidebar || !qaResizer || !split) return;
    qaSidebar.style.display = '';
    qaSidebar.removeAttribute('hidden');
    qaResizer.style.display = '';
    qaResizer.removeAttribute('hidden');
    const savedQaW = localStorage.getItem('ui.qaWidth');
    const width = savedQaW ? parseInt(savedQaW, 10) : 400;
    split.style.setProperty('--qa-col', Math.max(260, Math.min(width, 600)) + 'px');
    split.style.setProperty('--qa-resizer-col', '6px');
    localStorage.setItem('ui.qaOpen', 'true');
    try { openQaBtn?.setAttribute('aria-expanded', 'true'); } catch(_){}
    setTimeout(() => document.getElementById('qaInput')?.focus(), 0);
  }

  function closeQaPanel() {
    if (!qaSidebar || !qaResizer || !split) return;
    split.style.setProperty('--qa-col', '0px');
    split.style.setProperty('--qa-resizer-col', '0px');
    qaSidebar.style.display = 'none';
    qaResizer.style.display = 'none';
    localStorage.setItem('ui.qaOpen', 'false');
    try { openQaBtn?.setAttribute('aria-expanded', 'false'); } catch(_){}
  }

  function openTocPanel() {
    if (!tocSidebar || !tocResizer || !split) return;
    tocSidebar.style.display = '';
    tocSidebar.removeAttribute('hidden');
    tocResizer.style.display = '';
    tocResizer.removeAttribute('hidden');
    const savedTocW = localStorage.getItem('ui.tocWidth');
    const width = savedTocW ? parseInt(savedTocW, 10) : 300;
    split.style.setProperty('--toc-col', Math.max(220, Math.min(width, 500)) + 'px');
    split.style.setProperty('--toc-resizer-col', '6px');
    localStorage.setItem('ui.tocOpen', 'true');
    try { openTocBtn?.setAttribute('aria-expanded', 'true'); } catch(_){}
  }

  function closeTocPanel() {
    if (!tocSidebar || !tocResizer || !split) return;
    split.style.setProperty('--toc-col', '0px');
    split.style.setProperty('--toc-resizer-col', '0px');
    tocSidebar.style.display = 'none';
    tocResizer.style.display = 'none';
    localStorage.setItem('ui.tocOpen', 'false');
    try { openTocBtn?.setAttribute('aria-expanded', 'false'); } catch(_){}
  }

  if (openQaBtn && split && qaSidebar && qaResizer) {
    openQaBtn.onclick = openQaPanel;
  }
  if (qaCloseBtn && split && qaSidebar && qaResizer) {
    qaCloseBtn.onclick = closeQaPanel;
  }
  if (openTocBtn && split && tocSidebar && tocResizer) {
    openTocBtn.onclick = openTocPanel;
  }
  if (tocCloseBtn && split && tocSidebar && tocResizer) {
    tocCloseBtn.onclick = closeTocPanel;
  }

  // Wire up action buttons (previously unwired)
  try {
    const copyBtn = document.getElementById('copySummaryView');
    const exportMdBtn = document.getElementById('exportSummaryMD');
    const exportTxtBtn = document.getElementById('exportSummaryTXT');
    const shareBtn = document.getElementById('shareSummaryView');
    const backBtn = document.getElementById('backFromSummary');

    // Persist current item globally for other modules if needed
    window.currentSummaryItem = item;

    function getPlainText() {
      const contentDivCurrent = document.getElementById('summaryViewContent');
      return contentDivCurrent ? contentDivCurrent.innerText.trim() : '';
    }

    function flash(btn, label) {
      if (!btn) return;
      const original = btn.textContent;
      btn.textContent = label;
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1400);
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        try {
          const text = getPlainText();
          if (!text) return flash(copyBtn, 'Empty');
          if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => flash(copyBtn, 'Copied!')).catch(() => flash(copyBtn, 'Error'));
          } else if (window.electronAPI && typeof window.electronAPI.saveSummary === 'function') {
            // Fallback: trigger a save dialog instead of clipboard
            window.electronAPI.saveSummary((item.fileName || 'summary') + '.txt', text).then(() => flash(copyBtn, 'Saved')).catch(() => flash(copyBtn, 'Error'));
          } else {
            flash(copyBtn, 'Unsupported');
          }
        } catch (_) {
          flash(copyBtn, 'Error');
        }
      };
    }

    function buildExportName(ext) {
      const base = (item.fileName || 'summary').replace(/\.[^.]+$/, '');
      return base + ext;
    }

    if (exportMdBtn) {
      exportMdBtn.onclick = () => {
        try {
          const raw = typeof item.summary === 'string' ? item.summary : '';
          if (!raw) return flash(exportMdBtn, 'Empty');
          if (window.electronAPI && typeof window.electronAPI.saveSummary === 'function') {
            window.electronAPI.saveSummary(buildExportName('.md'), raw).then(() => flash(exportMdBtn, 'Saved')).catch(() => flash(exportMdBtn, 'Error'));
          } else {
            flash(exportMdBtn, 'No API');
          }
        } catch (_) {
          flash(exportMdBtn, 'Error');
        }
      };
    }

    if (exportTxtBtn) {
      exportTxtBtn.onclick = () => {
        try {
          const text = getPlainText();
          if (!text) return flash(exportTxtBtn, 'Empty');
          if (window.electronAPI && typeof window.electronAPI.saveSummary === 'function') {
            window.electronAPI.saveSummary(buildExportName('.txt'), text).then(() => flash(exportTxtBtn, 'Saved')).catch(() => flash(exportTxtBtn, 'Error'));
          } else {
            flash(exportTxtBtn, 'No API');
          }
        } catch (_) {
          flash(exportTxtBtn, 'Error');
        }
      };
    }

    if (shareBtn) {
      shareBtn.onclick = () => {
        // Minimal implementation: copy to clipboard and flash status
        try {
          const text = getPlainText();
          if (!text) return flash(shareBtn, 'Empty');
          if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => flash(shareBtn, 'Copied')).catch(() => flash(shareBtn, 'Error'));
          } else {
            flash(shareBtn, 'Unsupported');
          }
        } catch (_) {
          flash(shareBtn, 'Error');
        }
      };
    }

    if (backBtn) {
      backBtn.onclick = () => {
        // Navigate back to history if available; fallback to workspace
        if (window.navigationModule && typeof window.navigationModule.activatePage === 'function') {
          const target = window.summaryHistory && window.summaryHistory.length ? 'history' : 'workspace';
          window.navigationModule.activatePage(target);
        } else {
          console.warn('Navigation module unavailable for back action');
        }
      };
    }
  } catch (err) {
    console.error('Failed wiring summary action buttons:', err);
  }
}

function init() {
  window.summaryViewModule = { viewFullSummary };
}

module.exports = { init, viewFullSummary };
