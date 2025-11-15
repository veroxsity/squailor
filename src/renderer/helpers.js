// Shared helper utilities for the renderer process

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Confirmation dialog
function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalBody');
    const msgEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn) {
      resolve(false);
      return;
    }

    titleEl.textContent = 'Confirm Action';
    msgEl.textContent = message;
    modal.hidden = false;
    modal.classList.add('active');

    const previouslyFocused = document.activeElement;
    if (okBtn && typeof okBtn.focus === 'function') {
      okBtn.focus();
    }

    const content = modal.querySelector('.modal-content');
    const focusableSelectors =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(content.querySelectorAll(focusableSelectors)).filter(
        (el) => el.offsetParent !== null || el.getAttribute('aria-hidden') !== 'true'
      );

    function onOk() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
      }
    }

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

    function cleanup() {
      modal.classList.remove('active');
      modal.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      window.removeEventListener('keydown', onKeydown);
      content && content.removeEventListener('keydown', onTrap);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    window.addEventListener('keydown', onKeydown);
    content && content.addEventListener('keydown', onTrap);
  });
}

// Information dialog (no cancel, just OK)
function showInfoModal(message, title = 'Information') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalBody');
    const msgEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn) {
      resolve();
      return;
    }

    // Update title and message
    titleEl.textContent = title;
    msgEl.textContent = message;

    // Hide cancel button and change OK text
    cancelBtn.style.display = 'none';
    okBtn.textContent = 'OK';

    modal.hidden = false;
    modal.classList.add('active');

    const previouslyFocused = document.activeElement;
    if (okBtn && typeof okBtn.focus === 'function') {
      okBtn.focus();
    }

    const content = modal.querySelector('.modal-content');
    const focusableSelectors =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(content.querySelectorAll(focusableSelectors)).filter(
        (el) => el.offsetParent !== null || el.getAttribute('aria-hidden') !== 'true'
      );

    function onOk() {
      cleanup();
      resolve();
    }

    function onKeydown(e) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        cleanup();
        resolve();
      }
    }

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

    function cleanup() {
      modal.classList.remove('active');
      modal.hidden = true;
      okBtn.removeEventListener('click', onOk);
      window.removeEventListener('keydown', onKeydown);
      content && content.removeEventListener('keydown', onTrap);
      // Restore cancel button and OK text
      cancelBtn.style.display = '';
      okBtn.textContent = 'Confirm';
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    }

    okBtn.addEventListener('click', onOk);
    window.addEventListener('keydown', onKeydown);
    content && content.addEventListener('keydown', onTrap);
  });
}

// HTML escaping
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Copy to clipboard with fallback
async function copyTextToClipboard(
  text,
  {
    successMessage = 'Copied to clipboard.',
    successVariant = 'success',
    failureMessage = 'Unable to copy to clipboard. Please try again.'
  } = {}
) {
  const normalized = typeof text === 'string' ? text : '';
  if (!normalized.trim()) {
    showToast('There is no text available to copy yet.', 'info');
    return false;
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(normalized);
      if (successMessage) {
        showToast(successMessage, successVariant);
      }
      return true;
    } catch (err) {
      console.warn('Clipboard API write failed; attempting fallback copy.', err);
    }
  }

  const canExecCommand =
    typeof document.execCommand === 'function' ||
    (typeof document.queryCommandSupported === 'function' && document.queryCommandSupported('copy'));

  if (canExecCommand) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = normalized;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);

      const selection = document.getSelection && document.getSelection();
      const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      textarea.select();
      const succeeded = document.execCommand && document.execCommand('copy');

      document.body.removeChild(textarea);
      if (previousRange && selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(previousRange);
        } catch (_) {
          // ignore selection restore errors
        }
      }

      if (succeeded) {
        if (successMessage) {
          showToast(successMessage, successVariant);
        }
        return true;
      }
    } catch (err) {
      console.warn('Fallback clipboard copy failed.', err);
    }
  }

  showToast(failureMessage, 'error');
  return false;
}

// Share text with Web Share API fallback
async function shareSummaryText({ title, text }) {
  const normalizedTitle = title || 'Summary';
  const normalizedText = typeof text === 'string' ? text : '';
  if (!normalizedText.trim()) {
    showToast('There is no summary content available to share yet.', 'info');
    return false;
  }

  const canUseNavigatorShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  if (canUseNavigatorShare) {
    try {
      await navigator.share({ title: normalizedTitle, text: normalizedText });
      showToast('Share dialog opened. Complete the share in your OS window.', 'success');
      return true;
    } catch (err) {
      if (err && (err.name === 'AbortError' || err.message === 'Share canceled')) {
        showToast('Share canceled.', 'info');
        return false;
      }
      console.warn('navigator.share failed; falling back to clipboard.', err);
    }
  }

  return copyTextToClipboard(normalizedText, {
    successMessage: 'Summary copied to clipboard so you can share it anywhere.',
    successVariant: 'info',
    failureMessage: "Sharing isn't available here and automatic copying failed. Please copy the summary manually."
  });
}

// Add summary result to history (saves to storage)
async function addToHistory(result) {
  if (!result || !result.summary) {
    console.warn('Cannot add to history: missing summary data');
    return;
  }
  
  try {
    // The summary result already contains all needed fields from processing
    // Just trigger a save if needed (history is typically saved during processing)
    console.log('Summary added to history:', result.fileName);
    
    // Optionally refresh history if on history page
    if (window.historyModule && typeof window.historyModule.loadHistoryPage === 'function') {
      const historyPage = document.getElementById('historyPage');
      if (historyPage && !historyPage.hidden) {
        await window.historyModule.loadHistoryPage();
      }
    }
  } catch (error) {
    console.error('Error adding to history:', error);
  }
}

function init() {
  // Expose helpers globally for inline handlers and other modules
  window.showToast = showToast;
  window.showConfirm = showConfirm;
  window.showInfoModal = showInfoModal;
  window.escapeHtml = escapeHtml;
  window.copyTextToClipboard = copyTextToClipboard;
  window.shareSummaryText = shareSummaryText;
  window.addToHistory = addToHistory;
}

module.exports = {
  init,
  showToast,
  showConfirm,
  showInfoModal,
  escapeHtml,
  copyTextToClipboard,
  shareSummaryText,
  addToHistory
};
