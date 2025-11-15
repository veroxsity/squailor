// Theme management extracted from renderer.js

let currentTheme = localStorage.getItem('app_theme') || 'dark';

function applyTheme(theme) {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  document.body.className = `${resolved}-theme`;
  const root = document.documentElement;
  if (root) {
    root.classList.remove('dark-theme', 'light-theme', 'high-contrast-theme');
    root.classList.add(`${resolved}-theme`);
  }

  currentTheme = theme;
  localStorage.setItem('app_theme', theme);

  document.querySelectorAll('.theme-option').forEach(option => {
    if (option.dataset.theme === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });

  if (theme === 'system' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (!window.__themeMqBound) {
      window.__themeMqBound = true;
      mq.addEventListener('change', () => {
        applyTheme('system');
      });
    }
  }
}

function initTheme() {
  applyTheme(currentTheme);

  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      applyTheme(theme);
    });
  });
}

module.exports = { initTheme, applyTheme };
