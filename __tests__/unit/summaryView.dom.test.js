

const fs = require('fs');

describe('summaryView renderer behavior', () => {
  // If the Jest environment isn't the browser-like DOM, skip the DOM-heavy assertions
  if (typeof document === 'undefined') {
    test('skipping DOM test because no document environment', () => {
      expect(true).toBe(true);
    });
    return;
  }
  beforeEach(() => {
    // Minimal DOM elements that summaryView expects
    document.body.innerHTML = `
      <section id="summaryViewPage">
        <button id="backFromSummary">Back</button>
        <h2 id="summaryViewHeading"></h2>
        <p id="summaryViewMeta"></p>
        <p id="summaryViewStats"></p>
        <div id="summaryMetaChips"></div>
        <div id="summarySplit">
          <div id="qaSidebar"></div>
          <div id="tocSidebar"></div>
        </div>
        <div id="summaryViewContent"> <div class="viewer-loading">Loading summary...</div></div>
        <button id="copySummaryView"></button>
        <button id="exportSummaryMD"></button>
        <button id="exportSummaryTXT"></button>
        <button id="shareSummaryView"></button>
      </section>
    `;

    // Minimal navigation module so viewFullSummary won't throw
    window.navigationModule = { activatePage: () => {} };

    // Minimal electronAPI for parsing fallback
    window.electronAPI = { parseMarkdown: () => null, sanitizeHtml: () => null };
  });

  test('viewFullSummary handles missing metadata without throwing', () => {
    const sv = require('../../src/renderer/summaryView.js');
    // initialize module to expose on window
    if (sv.init) sv.init();

    // Create a history entry that lacks many optional fields
    window.summaryHistory = [
      {
        fileName: 'Crime Report - Domestic Abuse - w24037670.docx',
        // missing timestamp
        // missing summaryType, responseTone, summaryStyle, model
        originalLength: undefined,
        summaryLength: undefined,
        summary: 'This is a test summary content.\n\nSecond paragraph.'
      }
    ];

    expect(() => window.summaryViewModule.viewFullSummary(0)).not.toThrow();

    const heading = document.getElementById('summaryViewHeading');
    const content = document.getElementById('summaryViewContent');

    expect(heading.textContent).toContain('Crime Report');
    expect(content.textContent).toContain('This is a test summary content');
  });

  test('viewFullSummary renders MCQ interactive UI and reveal works', () => {
    const sv = require('../../src/renderer/summaryView.js');
    if (sv.init) sv.init();

    window.summaryHistory = [
      {
        fileName: 'Short Doc',
        summaryStyle: 'mcqs',
        summary: `Intro paragraph about topic.\n\n1) Which number is even?\nA) 1\nB) 2\nC) 3\nAnswer: B\nExplanation: 2 is even.`
      }
    ];

    window.summaryViewModule.viewFullSummary(0);

    const list = document.querySelector('.mcq-list');
    expect(list).not.toBeNull();
    const items = list.querySelectorAll('.mcq-item');
    expect(items.length).toBeGreaterThan(0);
    const reveal = items[0].querySelector('.mcq-reveal-btn');
    expect(reveal).not.toBeNull();

    const answerPanel = items[0].querySelector('.mcq-answer');
    const copyBtn = document.querySelector('.mcq-copy-json');
    expect(copyBtn).not.toBeNull();
    expect(answerPanel.hidden).toBeTruthy();
    // Click reveal
    reveal.click();
    expect(answerPanel.hidden).toBeFalsy();
      // The correct option should be highlighted when revealed
      const correctLi = items[0].querySelector('.mcq-options li.mcq-correct');
      expect(correctLi).not.toBeNull();

      // Click hide and ensure highlight is removed
      reveal.click();
      expect(answerPanel.hidden).toBeTruthy();
      const correctHidden = items[0].querySelector('.mcq-options li.mcq-correct');
      expect(correctHidden).toBeNull();
  });
});
