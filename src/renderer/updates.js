// Update and diagnostics panel logic extracted from renderer.js

let checkUpdatesBtn;
let installUpdateBtn;
let applyOnRestartBtn;
let updateStatusDiv;
let currentVersionValue;
let latestVersionValue;
let autoApplyUpdatesToggle;
let updateProgressDetails;
let manualDownloadBtn;
let updateProviderSelect;
let updateGenericUrlInput;
let genericUrlRow;
let diagRefreshBtn;
let diagExportBtn;
let diagClearBtn;
let diagList;
let diagCount;

function cacheElements() {
  checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
  installUpdateBtn = document.getElementById('installUpdateBtn');
  applyOnRestartBtn = document.getElementById('applyOnRestartBtn');
  updateStatusDiv = document.getElementById('updateStatus');
  currentVersionValue = document.getElementById('currentVersionValue');
  latestVersionValue = document.getElementById('latestVersionValue');
  autoApplyUpdatesToggle = document.getElementById('autoApplyUpdatesToggle');
  updateProgressDetails = document.getElementById('updateProgressDetails');
  manualDownloadBtn = document.getElementById('manualDownloadBtn');
  updateProviderSelect = document.getElementById('updateProviderSelect');
  updateGenericUrlInput = document.getElementById('updateGenericUrlInput');
  genericUrlRow = document.getElementById('genericUrlRow');
  diagRefreshBtn = document.getElementById('diagRefreshBtn');
  diagExportBtn = document.getElementById('diagExportBtn');
  diagClearBtn = document.getElementById('diagClearBtn');
  diagList = document.getElementById('diagList');
  diagCount = document.getElementById('diagCount');
}

function bindUpdateButtons() {
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
      if (updateStatusDiv) {
        updateStatusDiv.textContent = 'Checking for updates...';
      }
      try {
        const res = await window.electronAPI.checkForUpdates();
        if (res && res.success) {
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
      try {
        if (updateStatusDiv) updateStatusDiv.textContent = 'Restarting to apply update...';
        await window.electronAPI.installUpdate(false);
      } catch (err) {
        if (updateStatusDiv) updateStatusDiv.textContent = `Install failed: ${err && err.message}`;
      }
    });
  }

  if (applyOnRestartBtn) {
    applyOnRestartBtn.addEventListener('click', async () => {
      try {
        if (updateStatusDiv) updateStatusDiv.textContent = 'Update will install on next restart.';
      } catch (_) {}
    });
  }
}

function bindUpdateIpcEvents() {
  if (!window.electronAPI) return;

  if (window.electronAPI.onUpdateChecking) {
    window.electronAPI.onUpdateChecking(() => {
      if (updateStatusDiv) updateStatusDiv.textContent = 'Checking for updates...';
      if (installUpdateBtn) installUpdateBtn.style.display = 'none';
      if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
      const badge = document.getElementById('updateReadyBadge');
      if (badge) badge.style.display = 'none';
    });
  }

  if (window.electronAPI.onUpdateAvailable) {
    window.electronAPI.onUpdateAvailable((info) => {
      if (updateStatusDiv) updateStatusDiv.textContent = `Update available: ${info.version} — downloading...`;
      if (installUpdateBtn) installUpdateBtn.style.display = 'none';
      if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
      if (latestVersionValue) latestVersionValue.textContent = info.version;
    });
  }

  if (window.electronAPI.onUpdateProgress) {
    window.electronAPI.onUpdateProgress((progress) => {
      if (updateStatusDiv) updateStatusDiv.textContent = `Downloading update: ${Math.round(progress.percent || 0)}%`;
      if (updateProgressDetails) {
        let line = '';
        if (progress.transferredMB != null && progress.totalMB != null) {
          line += `${progress.transferredMB}/${progress.totalMB} MB`;
        }
        if (progress.speedMBps != null) {
          line += (line ? ' • ' : '') + `${progress.speedMBps} MB/s`;
        }
        if (progress.etaHuman && progress.percent < 100) {
          line += (line ? ' • ' : '') + `ETA ${progress.etaHuman}`;
        }
        updateProgressDetails.textContent = line;
      }
    });
  }

  if (window.electronAPI.onUpdateDownloaded) {
    window.electronAPI.onUpdateDownloaded((info) => {
      if (updateStatusDiv) updateStatusDiv.textContent = `Update downloaded: ${info.version}`;
      if (installUpdateBtn) installUpdateBtn.style.display = 'inline-block';
      if (applyOnRestartBtn) {
        if (autoApplyUpdatesToggle && autoApplyUpdatesToggle.checked) {
          applyOnRestartBtn.style.display = 'none';
        } else {
          applyOnRestartBtn.style.display = 'inline-block';
        }
      }
      try {
        const badge = document.getElementById('updateReadyBadge');
        if (badge && !(autoApplyUpdatesToggle && autoApplyUpdatesToggle.checked)) {
          badge.style.display = '';
        }
      } catch (_) {}
      try {
        if (autoApplyUpdatesToggle && autoApplyUpdatesToggle.checked) {
          updateStatusDiv.textContent = 'Applying update...';
          window.electronAPI.installUpdate(true);
        }
      } catch (e) { console.error('Auto-apply failed', e); }
    });
  }

  if (window.electronAPI.onUpdateNotAvailable) {
    window.electronAPI.onUpdateNotAvailable(() => {
      if (updateStatusDiv) updateStatusDiv.textContent = 'No updates available';
      if (installUpdateBtn) installUpdateBtn.style.display = 'none';
      if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
      const badge = document.getElementById('updateReadyBadge');
      if (badge) badge.style.display = 'none';
    });
  }

  if (window.electronAPI.onUpdateError) {
    window.electronAPI.onUpdateError((err) => {
      if (updateStatusDiv) updateStatusDiv.textContent = `Update error: ${err && err.message}`;
      if (installUpdateBtn) installUpdateBtn.style.display = 'none';
      if (applyOnRestartBtn) applyOnRestartBtn.style.display = 'none';
      const badge = document.getElementById('updateReadyBadge');
      if (badge) badge.style.display = 'none';
    });
  }
}

async function initUpdateSettingsPanel() {
  cacheElements();
  bindUpdateButtons();
  bindUpdateIpcEvents();

  try {
    if (currentVersionValue) {
      const v = await window.electronAPI.getAppVersion();
      currentVersionValue.textContent = v;
    }
    await refreshLatestVersionLabel();
    const settings = await window.electronAPI.getSettings();
    if (autoApplyUpdatesToggle && settings && typeof settings.autoApplyUpdates === 'boolean') {
      autoApplyUpdatesToggle.checked = settings.autoApplyUpdates;
    }
    if (updateProviderSelect) {
      updateProviderSelect.value = settings.updateProvider || 'github';
      if (genericUrlRow) genericUrlRow.style.display = (updateProviderSelect.value === 'generic') ? 'block' : 'none';
    }
    if (updateGenericUrlInput) {
      updateGenericUrlInput.value = settings.updateGenericUrl || '';
    }
    if (autoApplyUpdatesToggle) {
      autoApplyUpdatesToggle.addEventListener('change', async () => {
        const s = await window.electronAPI.getSettings();
        s.autoApplyUpdates = !!autoApplyUpdatesToggle.checked;
        await window.electronAPI.saveSettings({ autoApplyUpdates: s.autoApplyUpdates });
      });
    }
    if (updateProviderSelect) {
      updateProviderSelect.addEventListener('change', async () => {
        const provider = updateProviderSelect.value;
        if (genericUrlRow) genericUrlRow.style.display = (provider === 'generic') ? 'block' : 'none';
        await window.electronAPI.saveSettings({ updateProvider: provider });
        await refreshLatestVersionLabel();
      });
    }
    if (updateGenericUrlInput) {
      updateGenericUrlInput.addEventListener('change', async () => {
        const url = updateGenericUrlInput.value.trim();
        await window.electronAPI.saveSettings({ updateGenericUrl: url });
        await refreshLatestVersionLabel();
      });
    }
  } catch (e) { console.error('Failed update settings init', e); }
}

async function refreshLatestVersionLabel() {
  try {
    if (!latestVersionValue) return;
    const meta = await window.electronAPI.getLatestReleaseInfo();
    if (meta && meta.success && meta.version) latestVersionValue.textContent = meta.version; else latestVersionValue.textContent = '—';
  } catch {
    if (latestVersionValue) latestVersionValue.textContent = '—';
  }
}

async function initDiagnosticsPanel() {
  cacheElements();
  try {
    await loadDiagnostics();
    if (diagRefreshBtn && !diagRefreshBtn.__bound) {
      diagRefreshBtn.__bound = true;
      diagRefreshBtn.addEventListener('click', loadDiagnostics);
    }
    if (diagClearBtn && !diagClearBtn.__bound) {
      diagClearBtn.__bound = true;
      diagClearBtn.addEventListener('click', async () => {
        try { await window.electronAPI.clearNetworkDiagnostics(); } catch(_){}
        await loadDiagnostics();
      });
    }
    if (diagExportBtn && !diagExportBtn.__bound) {
      diagExportBtn.__bound = true;
      diagExportBtn.addEventListener('click', async () => {
        const data = await window.electronAPI.getNetworkDiagnostics();
        const payload = {
          generatedAt: new Date().toISOString(),
          count: (data && data.count) || 0,
          suspiciousHosts: (data && data.suspiciousHosts) || []
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'squailor-network-diagnostics.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
      });
    }
  } catch (e) {
    console.error('Diagnostics init failed', e);
  }
}

async function loadDiagnostics() {
  try {
    const res = await window.electronAPI.getNetworkDiagnostics();
    const hostSummaries = (res && res.suspiciousHosts) || [];
    const recentEvents = (res && res.recentEvents) || [];
    const totals = (res && res.totals) || { hosts: hostSummaries.length, events: recentEvents.length };

    if (diagCount) {
      diagCount.textContent = `Hosts: ${totals.hosts ?? hostSummaries.length} • Events: ${totals.events ?? recentEvents.length}`;
    }

    if (diagList) {
      if (hostSummaries.length === 0) {
        diagList.innerHTML = '<div style="opacity:.7">No suspicious hosts recorded.</div>';
      } else {
        const formatTimestamp = ts => {
          try {
            const date = ts ? new Date(ts) : null;
            return date && !Number.isNaN(date.valueOf()) ? date.toLocaleString() : 'Unknown';
          } catch (_) {
            return 'Unknown';
          }
        };

        const renderSamplePaths = (paths = []) => {
          if (!paths || !paths.length) return '<em>No sample paths</em>';
          return `
            <div class="diag-paths">
              ${paths.map(p => `<code>${escapeHtml(p)}</code>`).join(' ')}
            </div>
          `;
        };

        const renderEventsTable = () => {
          if (!recentEvents.length) return '';
          const rows = recentEvents.slice(0, 25).map(ev => `
            <tr>
              <td>${escapeHtml(ev.method || 'GET')}</td>
              <td>${escapeHtml(ev.host)}</td>
              <td>${escapeHtml(ev.path || '/')}</td>
              <td>${escapeHtml(ev.protocol || 'http')}</td>
              <td>${escapeHtml(ev.port || '-')}</td>
              <td>${formatTimestamp(ev.timestamp)}</td>
            </tr>
          `).join('');
          return `
            <div class="diag-events">
              <div class="diag-table-heading">Recent events</div>
              <div class="diag-table-wrapper">
                <table class="diag-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Host</th>
                      <th>Path</th>
                      <th>Protocol</th>
                      <th>Port</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        };

        diagList.innerHTML = `
          <div class="diag-hosts">
            ${hostSummaries.map(entry => `
              <article class="diag-host-card">
                <header>
                  <div>
                    <div class="diag-host">${escapeHtml(entry.host)}</div>
                    <div class="diag-meta">${entry.count || 0} request${entry.count === 1 ? '' : 's'}</div>
                  </div>
                  <div class="diag-meta diag-timestamp">Last seen: ${formatTimestamp(entry.lastSeen)}</div>
                </header>
                <dl>
                  <div><dt>First seen</dt><dd>${formatTimestamp(entry.firstSeen)}</dd></div>
                  <div><dt>Protocol</dt><dd>${escapeHtml(entry.lastProtocol || 'Unknown')}</dd></div>
                  <div><dt>Port</dt><dd>${escapeHtml(entry.lastPort || '—')}</dd></div>
                </dl>
                <div class="diag-sample-label">Sample paths</div>
                ${renderSamplePaths(entry.samplePaths)}
              </article>
            `).join('')}
          </div>
          ${renderEventsTable()}
        `;
      }
    }
  } catch (e) {
    if (diagList) diagList.textContent = 'Failed to load diagnostics';
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"]/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[s]));
}

function initUpdateNavigationHooks() {
  // Observe navigation clicks for updates/privacy panels
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('.settings-nav-item[data-panel="updates"]')) {
      setTimeout(initUpdateSettingsPanel, 50);
    }
    if (t.matches('.settings-nav-item[data-panel="privacy"]')) {
      setTimeout(initDiagnosticsPanel, 50);
    }
  });
}

function initUpdatesAndDiagnostics() {
  cacheElements();
  bindUpdateButtons();
  bindUpdateIpcEvents();
  initUpdateNavigationHooks();
}

module.exports = {
  initUpdatesAndDiagnostics,
  initUpdateSettingsPanel,
  initDiagnosticsPanel
};
