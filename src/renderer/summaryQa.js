'use strict';

// Provides Q&A chat and dynamic TOC building for summary view.
// Initializes window.summaryQa with two public functions:
//  - setupSummaryQaChat(summaryItem)
//  - buildSummaryTOC()
// Minimal, non-streaming implementation; progress streaming can be added later.

function setupSummaryQaChat(summaryItem) {
  if (!summaryItem || !summaryItem.folderId) {
    return;
  }
  const qaInput = document.getElementById('qaInput');
  const qaSendBtn = document.getElementById('qaSendBtn');
  const qaTranscript = document.getElementById('qaTranscript');
  const qaStatus = document.getElementById('qaStatus');

  if (!qaInput || !qaSendBtn || !qaTranscript) return;

  function appendEntry(role, text) {
    const div = document.createElement('div');
    div.className = 'qa-entry qa-' + role;
    div.innerHTML = '<strong>' + role + ':</strong> ' + escapeHtml(text);
    qaTranscript.appendChild(div);
    qaTranscript.scrollTop = qaTranscript.scrollHeight;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  function setStatus(msg, state) {
    if (!qaStatus) return;
    qaStatus.textContent = msg || '';
    qaStatus.hidden = !msg;
    qaStatus.className = 'status-message ' + (state || '');
  }

  async function sendQuestion() {
    const question = (qaInput.value || '').trim();
    if (!question) return;
    qaSendBtn.disabled = true;
    setStatus('Asking...', 'info');
    appendEntry('You', question);
    try {
      const apiKey = window.apiKey || null;
      const model = summaryItem.model || null;
      const res = await window.electronAPI.askSummaryQuestion(summaryItem.folderId, question, apiKey, model);
      if (res && res.success && res.answer) {
        appendEntry('AI', res.answer);
        setStatus('Done', 'success');
      } else {
        appendEntry('AI', res && res.error ? ('Error: ' + res.error) : 'No answer');
        setStatus(res && res.error ? res.error : 'Failed', 'error');
      }
    } catch (err) {
      appendEntry('AI', 'Exception: ' + err.message);
      setStatus(err.message, 'error');
    } finally {
      qaSendBtn.disabled = false;
      qaInput.value = '';
      qaInput.focus();
      setTimeout(() => setStatus('', ''), 1500);
    }
  }

  // Wire button & Enter key
  if (!qaSendBtn.dataset.wired) {
    qaSendBtn.onclick = sendQuestion;
    qaSendBtn.dataset.wired = 'true';
  }
  if (!qaInput.dataset.wired) {
    qaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
      }
    });
    qaInput.dataset.wired = 'true';
  }
}

function buildSummaryTOC() {
  const content = document.getElementById('summaryViewContent');
  const tocList = document.getElementById('tocList');
  if (!content || !tocList) return;

  const headings = content.querySelectorAll('h1,h2,h3,h4,h5,h6');
  tocList.innerHTML = '';
  if (!headings.length) {
    const empty = document.createElement('div');
    empty.className = 'toc-empty';
    empty.textContent = 'No headings found';
    tocList.appendChild(empty);
    return;
  }

  headings.forEach((h, idx) => {
    if (!h.id) {
      h.id = 'summary-heading-' + idx;
    }
    const level = parseInt(h.tagName.substring(1), 10);
    const link = document.createElement('a');
    link.href = '#' + h.id;
    link.textContent = h.textContent.trim();
    link.className = 'toc-link level-' + level;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    tocList.appendChild(link);
  });
}

function init() {
  window.summaryQa = { setupSummaryQaChat, buildSummaryTOC };
}

module.exports = { init, setupSummaryQaChat, buildSummaryTOC };