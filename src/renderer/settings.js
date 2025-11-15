'use strict';

// Settings page interaction wiring: handles left nav tabs switching panels
// and updates section title/subtitle. Designed to be lightweight and resilient
// if some panels are missing.

function cacheSettingsDom() {
  return {
    navItems: Array.from(document.querySelectorAll('.settings-nav-item')),
    panelsHost: document.getElementById('settingsPanels'),
    panels: Array.from(document.querySelectorAll('.settings-panel')),
    titleEl: document.getElementById('settingsSectionTitle'),
    subtitleEl: document.getElementById('settingsSectionSubtitle'),
    headerActionBtn: document.getElementById('settingsHeaderAction')
  };
}

const panelCopy = {
  models: {
    title: 'AI Providers',
    subtitle: 'Configure provider credentials and choose a model.'
  },
  image: {
    title: 'Image Settings',
    subtitle: 'Control OCR and vision features.'
  },
  appearance: {
    title: 'Appearance',
    subtitle: 'Theme, density, and accessibility preferences.'
  },
  storage: {
    title: 'Storage',
    subtitle: 'Manage where summaries and documents are saved.'
  },
  updates: {
    title: 'Updates',
    subtitle: 'Check for new versions and manage update policy.'
  },
  about: {
    title: 'About',
    subtitle: 'Version info and project credits.'
  },
  privacy: {
    title: 'Privacy & Network',
    subtitle: 'Review network diagnostics and privacy options.'
  }
};

function setActivePanel(panelKey, dom) {
  const { panels, navItems, titleEl, subtitleEl, headerActionBtn } = dom;
  panels.forEach(p => {
    const isTarget = p.id === `panel-${panelKey}`;
    p.classList.toggle('active', isTarget);
    p.hidden = !isTarget;
  });
  navItems.forEach(btn => {
    const isTarget = btn.dataset.panel === panelKey;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    if (!isTarget) btn.setAttribute('tabindex', '-1'); else btn.removeAttribute('tabindex');
  });

  const copy = panelCopy[panelKey] || panelCopy.models;
  if (titleEl && copy.title) titleEl.textContent = copy.title;
  if (subtitleEl && copy.subtitle) subtitleEl.textContent = copy.subtitle;

  // Contextual header button (optional future actions)
  if (headerActionBtn) {
    headerActionBtn.hidden = true;
    headerActionBtn.textContent = '';
    if (panelKey === 'models') {
      headerActionBtn.hidden = false;
      headerActionBtn.textContent = 'Refresh Models';
      headerActionBtn.onclick = () => {
        window.showToast && window.showToast('Refreshing model list…', 'info');
        document.dispatchEvent(new CustomEvent('refresh-models-request'));
      };
    } else if (panelKey === 'updates') {
      headerActionBtn.hidden = false;
      headerActionBtn.textContent = 'Check Updates';
      headerActionBtn.onclick = () => {
        window.showToast && window.showToast('Checking for updates…', 'info');
        const btn = document.getElementById('checkUpdatesBtn');
        btn && btn.click();
      };
    }
  }
}

function initSettingsNavigation() {
  const dom = cacheSettingsDom();
  if (!dom.navItems.length || !dom.panels.length) return;

  dom.navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const panel = item.dataset.panel;
      if (!panel) return;
      setActivePanel(panel, dom);
      // Fire custom event for modules that lazily initialize when panel is shown
      document.dispatchEvent(new CustomEvent('settings-panel-activated', { detail: { panel } }));
    });
  });

  // Keyboard navigation (arrow up/down)
  document.addEventListener('keydown', e => {
    if (!['ArrowUp','ArrowDown'].includes(e.key)) return;
    const focused = document.activeElement;
    if (!focused || !focused.classList.contains('settings-nav-item')) return;
    e.preventDefault();
    const items = dom.navItems;
    const idx = items.indexOf(focused);
    if (idx === -1) return;
    const nextIdx = e.key === 'ArrowDown' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
    items[nextIdx].focus();
  });

  // Initialize default active (models)
  setActivePanel('models', dom);

  window.settingsModule = {
    activate(panelKey) { setActivePanel(panelKey, dom); },
    state: {
      get activePanel() {
        const active = dom.panels.find(p => p.classList.contains('active'));
        return active ? active.id.replace('panel-', '') : 'models';
      }
    }
  };
}

module.exports = { initSettingsNavigation };