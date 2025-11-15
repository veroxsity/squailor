// Navigation handling extracted from renderer.js (simplified starter version)

// Get page elements lazily to avoid querying before DOM is ready
function getPageElements() {
  return {
    workspace: document.getElementById('workspacePage'),
    history: document.getElementById('historyPage'),
    summary: document.getElementById('summaryViewPage'),
    settings: document.getElementById('settingsPage')
  };
}

const headerCopy = {
  workspace: {
    title: 'Document Workspace',
    subtitle: 'Upload and summarize your documents with AI'
  },
  history: {
    title: 'Summary history',
    subtitle: 'Search, filter, and revisit previous summaries.'
  },
  settings: {
    title: 'App settings',
    subtitle: 'Manage API keys, models, storage, and preferences.'
  }
};

function updateHeaderForPage(pageKey) {
  const appHeading = document.getElementById('appHeading');
  const appSubtitle = document.getElementById('appSubtitle');
  const copy = headerCopy[pageKey] || headerCopy.workspace;
  if (appHeading && copy && copy.title) appHeading.textContent = copy.title;
  if (appSubtitle && copy && copy.subtitle) appSubtitle.textContent = copy.subtitle;
}

function activatePage(pageName) {
  const key = pageName === 'summaryView' ? 'summary' : pageName;
  const pageElements = getPageElements();

  Object.entries(pageElements).forEach(([name, el]) => {
    if (!el) return;
    const isActive = name === key;
    el.classList.toggle('page-active', isActive);
    el.classList.toggle('active', isActive);
    el.hidden = !isActive;
  });

  updateHeaderForPage(key);
  
  // Load page-specific data when activated
  if (key === 'history' && window.historyModule && typeof window.historyModule.loadHistoryPage === 'function') {
    window.historyModule.loadHistoryPage();
  }
}

function initNavigation() {
  const railItems = Array.from(document.querySelectorAll('.rail-item'));
  const pageTriggers = document.querySelectorAll('[data-page]');
  const appContent = document.querySelector('.app-content');

  console.log(`[Navigation] Found ${railItems.length} rail items`);
  console.log(`[Navigation] Found ${pageTriggers.length} page triggers`);

  function setRailActive(pageKey) {
    railItems.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageKey);
    });
  }

  function handleActivate(page) {
    console.log(`[Navigation] Activating page: ${page}`);
    activatePage(page);
    setRailActive(page === 'summaryView' ? 'summary' : page);
  }

  pageTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const targetPage = trigger.dataset.page;
      console.log(`[Navigation] Button clicked, target page: ${targetPage}`);
      if (!targetPage) return;
      handleActivate(targetPage);
    });
  });
  
  // Expose navigation functions globally
  window.navigationModule = {
    activatePage
  };
  
  console.log('[Navigation] Initialization complete');
}

module.exports = { initNavigation, activatePage };
