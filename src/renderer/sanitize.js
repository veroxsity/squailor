'use strict';

/**
 * HTML Sanitization utilities for renderer
 * Provides consistent sanitization across all innerHTML usage
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text || '');
  }
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  };
  
  return text.replace(/[&<>"'`]/g, char => htmlEscapes[char]);
}

/**
 * Sanitize HTML content using the preload API or fallback
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitize(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Try to use the preload API's sanitization
  if (window.electronAPI && typeof window.electronAPI.sanitizeHtml === 'function') {
    const result = window.electronAPI.sanitizeHtml(html);
    if (result !== null) {
      return result;
    }
  }
  
  // Fallback: basic sanitization
  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove data: URLs in sensitive contexts
    .replace(/(<[^>]*(?:href|src)\s*=\s*["']?)data:/gi, '$1#blocked:');
}

/**
 * Create safe HTML from a template and values
 * Values are automatically escaped
 * @param {string[]} strings - Template literal strings
 * @param {...*} values - Values to interpolate (will be escaped)
 * @returns {string} Safe HTML string
 */
function safeHtml(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const value = i < values.length ? escapeHtml(values[i]) : '';
    return result + str + value;
  }, '');
}

/**
 * Set innerHTML safely with sanitization
 * @param {HTMLElement} element - Element to set content on
 * @param {string} html - HTML content
 */
function setInnerHtmlSafe(element, html) {
  if (!element) return;
  element.innerHTML = sanitize(html);
}

/**
 * Create an element with text content (safe by default)
 * @param {string} tag - Tag name
 * @param {string} textContent - Text content
 * @param {Object} [attrs] - Attributes to set
 * @returns {HTMLElement}
 */
function createElement(tag, textContent, attrs = {}) {
  const el = document.createElement(tag);
  if (textContent !== undefined && textContent !== null) {
    el.textContent = String(textContent);
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  return el;
}

/**
 * Build a list of items safely
 * @param {Array} items - Items to render
 * @param {Function} renderFn - Function that returns safe HTML for each item
 * @returns {string} Combined safe HTML
 */
function buildSafeList(items, renderFn) {
  if (!Array.isArray(items)) return '';
  return items.map((item, index) => renderFn(item, index)).join('');
}

/**
 * Parse markdown to HTML and sanitize the result
 * @param {string} markdown - Markdown text
 * @returns {string} Sanitized HTML
 */
function markdownToSafeHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  // Try to use the preload API's markdown parsing
  if (window.electronAPI && typeof window.electronAPI.parseMarkdown === 'function') {
    const html = window.electronAPI.parseMarkdown(markdown);
    if (html) {
      return sanitize(html);
    }
  }
  
  // Fallback: escape and do basic formatting
  let safe = escapeHtml(markdown);
  
  // Basic markdown conversion (very limited fallback)
  safe = safe
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>');
  
  return safe;
}

// Export for both CommonJS and browser usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    sanitize,
    safeHtml,
    setInnerHtmlSafe,
    createElement,
    buildSafeList,
    markdownToSafeHtml
  };
}

// Also expose globally for renderer scripts that don't use require
if (typeof window !== 'undefined') {
  window.sanitizeUtils = {
    escapeHtml,
    sanitize,
    safeHtml,
    setInnerHtmlSafe,
    createElement,
    buildSafeList,
    markdownToSafeHtml
  };
}
