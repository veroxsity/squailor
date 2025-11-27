// Theme management for Squailor

let currentTheme = localStorage.getItem('app_theme') || 'dark';
let currentAccent = localStorage.getItem('app_accent') || 'blurple';

// Accent color definitions
const accentColors = {
  blurple: { primary: '#5865F2', hover: '#4752c4', pressed: '#3c45a5' },
  green: { primary: '#57F287', hover: '#3ba55c', pressed: '#2d8049' },
  blue: { primary: '#3B82F6', hover: '#2563eb', pressed: '#1d4ed8' },
  purple: { primary: '#8B5CF6', hover: '#7c3aed', pressed: '#6d28d9' },
  pink: { primary: '#EC4899', hover: '#db2777', pressed: '#be185d' },
  orange: { primary: '#F97316', hover: '#ea580c', pressed: '#c2410c' },
  red: { primary: '#EF4444', hover: '#dc2626', pressed: '#b91c1c' }
};

function applyTheme(theme) {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  // Remove all theme classes
  document.body.classList.remove('dark-theme', 'light-theme', 'high-contrast-theme');
  document.documentElement.classList.remove('dark-theme', 'light-theme', 'high-contrast-theme');
  
  // Apply the resolved theme
  const themeClass = `${resolved}-theme`;
  document.body.classList.add(themeClass);
  document.documentElement.classList.add(themeClass);

  currentTheme = theme;
  localStorage.setItem('app_theme', theme);

  // Update theme card active states (new structure)
  document.querySelectorAll('.theme-card').forEach(card => {
    if (card.dataset.theme === theme) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Also support old theme-option class for backward compatibility
  document.querySelectorAll('.theme-option').forEach(option => {
    if (option.dataset.theme === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });

  // Listen for system theme changes
  if (theme === 'system' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (!window.__themeMqBound) {
      window.__themeMqBound = true;
      mq.addEventListener('change', () => {
        if (currentTheme === 'system') {
          applyTheme('system');
        }
      });
    }
  }
}

function applyAccent(accent) {
  const colors = accentColors[accent] || accentColors.blurple;
  
  document.documentElement.style.setProperty('--accent-primary', colors.primary);
  document.documentElement.style.setProperty('--accent-hover', colors.hover);
  document.documentElement.style.setProperty('--accent-pressed', colors.pressed);
  document.documentElement.style.setProperty('--accent', colors.primary);
  document.documentElement.style.setProperty('--accent-strong', colors.hover);
  
  currentAccent = accent;
  localStorage.setItem('app_accent', accent);

  // Update accent swatch active states
  document.querySelectorAll('.accent-swatch').forEach(swatch => {
    if (swatch.dataset.accent === accent) {
      swatch.classList.add('active');
    } else {
      swatch.classList.remove('active');
    }
  });
}

function initTheme() {
  // Apply saved theme
  applyTheme(currentTheme);
  
  // Apply saved accent
  applyAccent(currentAccent);

  // Theme card click handlers (new structure)
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const theme = card.dataset.theme;
      applyTheme(theme);
    });
  });

  // Old theme-option click handlers (backward compatibility)
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      applyTheme(theme);
    });
  });

  // Accent color click handlers
  document.querySelectorAll('.accent-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const accent = swatch.dataset.accent;
      applyAccent(accent);
    });
  });
}

module.exports = { initTheme, applyTheme, applyAccent };
