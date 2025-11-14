# UI/UX Update Checklist (Electron App)

This checklist helps you plan and execute a full UI/UX refresh for Squailor (Electron + web stack). It’s organized by phases with clear, actionable checkboxes. Use it as a living document—check items off, add owners/dates, and attach links to artifacts.

Tip: For accessibility items, validate with automated tools (axe, WAVE, Lighthouse) and manual checks (keyboard, screen reader). For platform-native behavior, compare against Windows/macOS/Linux conventions.

---

## How to use this checklist
- [ ] Duplicate this file to a dated working copy (e.g., `UI_UX_UPDATE_2025-11.md`).
- [ ] Assign an owner for each section and set target dates.
- [ ] Link research, mockups, and issues next to the relevant checklist items.
- [ ] Keep “Definition of Done” visible in PRs.

---

## Phase 0 — Goals, Constraints, and Success Metrics
- [ ] Define primary user goals and top 3 jobs-to-be-done (JTBD).
- [ ] List constraints (tech, time, compliance, budget, team availability).
- [ ] Define success metrics (task success rate, time-on-task, NPS/CSAT, error rate, churn, trial→active conversion, feature adoption).
- [ ] Map metrics to analytics events (anonymized where possible; see Privacy and Telemetry section).
- [ ] Identify key flows to optimize (onboarding, model selection, document parsing, encryption operations, export flows).

---

## Phase 1 — Audit and Inventory
### 1.1 UI Inventory
- [ ] Capture all screens/windows (main window, splash, dialogs, settings, progress, errors).
- [ ] Inventory components (buttons, inputs, selects, tables, lists, tabs, accordions, modals, toasts, progress, skeletons).
- [ ] Document states: default, hover, active, focus, disabled, error, success, loading, empty.
- [ ] Map navigation and information architecture (IA) today.

### 1.2 UX Heuristic Review (Nielsen, WCAG, OS conventions)
- [ ] Visibility of system status (progress, skeletons, spinners, toasts).
- [ ] Match between system and real world (naming, units, mental models).
- [ ] User control and freedom (undo/redo, cancel, back, escape hatches).
- [ ] Consistency and standards (controls, spacing, terminology, OS patterns).
- [ ] Error prevention and helpful recovery (validation, inline messages, retry, diagnostics).
- [ ] Recognition over recall (exposed options, affordances, previews, defaults).
- [ ] Flexibility and efficiency (shortcuts, power user paths, batch actions).
- [ ] Aesthetic and minimalist design (signal-to-noise, whitespace, typographic rhythm).
- [ ] Help and documentation (empty states, tooltips, quick tips, contextual help).

### 1.3 Accessibility (WCAG 2.2 AA+)
- [ ] Keyboard navigation for all interactive elements; visible focus style.
- [ ] Screen reader labels/roles for buttons, inputs, icons, toggles, progress.
- [ ] Color contrast ≥ 4.5:1 text, ≥ 3:1 UI components; verify dark mode too.
- [ ] Non-color indicators for status and input validation.
- [ ] Resizable text (200%) and responsive layout without loss of content/function.
- [ ] Motion sensitivity: reduce motion setting respected; no motion-only cues.
- [ ] Timeouts and async states announced (aria-live where appropriate).
- [ ] Test with NVDA/JAWS/VoiceOver and Windows High Contrast.

---

## Phase 2 — Foundations and Design System
### 2.1 Visual Foundations
- [ ] Brand tokens: colors, typography scale, spacing, radii, elevation, motion.
- [x] Light/Dark/High-Contrast palettes with semantic tokens (bg, surface, border, text, success/warn/error/info).
- [ ] Typography: base size, line-height, headings scale, code styles, truncation/overflow rules.
- [ ] Iconography set: sizes, stroke/fill rules, empty-state illustrations.
- [ ] Grid and layout rules (content width, gutters, breakpoints—even for desktop resize).

### 2.2 Component Library
- [ ] Button variants (primary, secondary, ghost, destructive) + states.
- [ ] Inputs (text, number, password, file picker, select, multiselect, slider, checkbox, radio) + validation.
- [ ] Navigation (sidebar, topbar, breadcrumbs, tabs, wizard/steps).
- [ ] Feedback (toast, banner, inline alert, tooltip, dialog, progress bar/spinner, skeleton).
- [ ] Data display (table with sorting/filtering/pagination, cards, list with virtualized scroll if needed).
- [ ] Overlays (modal, drawer) with focus trap and ESC to close.
- [ ] Empty states and zero-data patterns for each feature area.
- [ ] Responsive and resizable window behaviors (min/max window sizes, layout adapts on resize).

### 2.3 Theming and Tokens in Code
- [x] Centralize CSS variables/tokens in `styles.css` (or a tokens file).
- [x] Implement theme switch (Light/Dark/High-Contrast) and persist preference.
- [x] Respect OS color scheme (prefers-color-scheme) unless user overrides.
- [ ] Ensure Electron titlebar/custom frame styling alignment across platforms.

---

## Phase 3 — Information Architecture and Navigation
- [ ] Validate left-nav vs top-nav based on feature breadth and frequency.
- [ ] Define content hierarchy for key screens; ensure primary actions have prominence.
- [ ] Standardize page templates (header, content area, actions, help link, status).
- [ ] Provide breadcrumbs or clear indicators of current context.
- [ ] Ensure discoverability of advanced features without cluttering basics.

---

## Phase 4 — Critical Flows (Design and Copy)
- [ ] Onboarding and first-run experience (quick tour, sample data, minimal setup).
- [ ] Model selection and capability hints (explain differences; safe defaults).
- [ ] File open/import workflows (drag-and-drop, file dialogs, recent files, validation, errors).
- [ ] Document parsing (docx/pptx/pdf) progress with cancel and retry; graceful failures.
- [ ] Encryption setup and operations: clear mental model, warnings, key management, recovery.
- [ ] Summarization/AI task flows: prompt scaffolding, progress, limits, retry on rate-limit.
- [ ] Export/share (PDF, images): destination selection, overwrite prompts, success feedback.
- [ ] Settings: structured by category; searchable; restore defaults; explainers/tooltips.

Copy and Content Style
- [ ] Establish voice and tone guidelines (neutral, helpful, concise).
- [ ] Microcopy: labels, helper text, placeholders, empty states, errors, success.
- [ ] Terminology glossary; avoid jargon; align with documentation.

---

## Phase 5 — Accessibility Deep-Dive (Build + Test)
- [ ] Add automated checks in renderer (axe-core integration during development build is optional).
- [ ] Verify tab order, roving tabindex in composite widgets.
- [ ] Focus management on route/dialog open/close; return focus to invoker.
- [ ] aria-live regions for async status updates; avoid announcements loops.
- [ ] Keyboard shortcuts listed in a dedicated help modal; ensure remapping or disable.
- [x] High Contrast theme: visible boundaries and outlines retained.

---

## Phase 6 — Performance and Quality of Experience
- [ ] Measure paint time for main window; eliminate layout thrash and forced sync.
- [ ] Defer heavy work to Node/Electron main or worker threads; avoid blocking renderer.
- [ ] Use skeletons over spinners for longer loads; add progress for known-length tasks.
- [ ] Preload critical assets; lazy-load non-critical UI.
- [ ] Cache and debounce user-triggered heavy work; show optimistic UI where safe.
- [ ] Memory and leak checks; observe long-running session stability.
- [ ] Minimize reflow with CSS containment and consistent layout patterns.

---

## Phase 7 — Platform Conventions and OS Integration
- [ ] Window behaviors: min/max/restore, draggable regions, snap, multi-monitor.
- [ ] Menus: app, context, and shortcuts consistent with OS norms.
- [ ] System dialogs for open/save; file associations if applicable.
- [ ] Tray/dock behaviors; badges; notifications with clear source and opt-outs.
- [ ] Clipboard support; drag and drop; hover previews.
- [ ] Installer/uninstaller UX; first-launch permissions; splash screen polish and perceived performance.

---

## Phase 8 — Error Handling, Empty States, and Recovery
- [ ] Prevent errors where possible (validation before submit, constraints, guardrails).
- [ ] Inline, specific error messages with actions (retry, open logs, diagnostics).
- [ ] Friendly empty states with examples and quick starts.
- [ ] Network/offline states; rate-limit feedback with backoff guidance.
- [ ] Undo/redo and autosave; recovery after crash/restart; persist unsubmitted inputs.
- [ ] Safe mode UI if configuration is corrupt.

---

## Phase 9 — Internationalization and Localization
- [ ] Externalize all user-facing strings; avoid concatenation and mixed variables.
- [ ] Pluralization, date/time/number formatting, right-to-left checks.
- [ ] Layout resilience for longer strings.
- [ ] Locale-aware shortcuts and typography rules.

---

## Phase 10 — Documentation, Help, and In-App Guidance
- [ ] Update help links to relevant docs; add context-aware tips.
- [ ] Add a “What’s New” surface for post-update release notes.
- [ ] Provide a feedback entry point; link to issue templates.
- [ ] Update screenshots/GIFs across README and documentation.

---

## Phase 11 — Privacy, Security, and Telemetry UX
- [ ] Clear privacy policy link and concise in-app summary.
- [ ] Telemetry/analytics opt-in (default off unless justified); explain what’s collected.
- [ ] Pseudonymize/anonymize events; allow easy opt-out; store preference securely.
- [ ] Sensitive operations (encryption, keys) have confirm prompts and offline clarity.
- [ ] Respect OS-level privacy settings.

---

## Phase 12 — Testing and Validation
- [ ] Unit tests for component logic and accessibility contracts (focus management, aria attributes present).
- [ ] E2E smoke for critical flows (open → process → export; error handling; settings changes persist).
- [ ] Visual regression baseline screenshots for key screens and states.
- [ ] Cross-platform checklist (Windows/macOS/Linux) and screen scaling (125%, 150%, 200%).
- [ ] Manual assistive tech pass (NVDA on Windows, VoiceOver on macOS); keyboard-only pass.
- [ ] Performance budgets enforced (e.g., first render under X ms on reference hardware).

---

## Phase 13 — Rollout and Change Management
- [ ] Feature flags for risky components or layouts; gradual enable.
- [ ] Migration notes for users (changed locations, renamed settings, defaults changes).
- [ ] Backwards compatibility or safe fallbacks where feasible.
- [ ] Release notes with before/after visuals and key benefits.
- [ ] Support playbook update (known issues, workarounds, rollback procedure).

---

## Definition of Done (DoD) for the UI/UX Update
- [ ] Heuristic and accessibility audits pass with documented fixes.
- [ ] All core flows redesigned, implemented, and verified via tests.
- [x] Theming implemented with semantic tokens and persisted preference.
- [ ] Critical performance KPIs meet agreed thresholds.
- [ ] Docs, screenshots, and What’s New updated.
- [ ] Telemetry/consent model implemented as designed.
- [ ] Cross-platform parity verified.

---

## References and Tools
- Accessibility: WCAG 2.2, axe DevTools, WAVE, NVDA/JAWS, VoiceOver.
- Performance: Chrome DevTools Performance, Lighthouse (within Electron via remote targets), React/Vue/Svelte devtools if used.
- Visual testing: Playwright + @playwright/test, Storybook + Chromatic (optional).
- Design system: Tokens (CSS vars), Figma (or preferred), Radix/ARIA guidelines.

---

## Workspace Pointers (Squailor)
- App shell and renderer: `index.html`, `renderer.js`, `styles.css`.
- Electron main: `main.js`, preload bridge: `preload.js`.
- Splash screen: `splash.html`.
- Utilities touching UX (feedback/progress/errors): check `utils/*` and provider UIs in `utils/ai/providers/*`.
- Tests: `__tests__/` for unit/integration—extend with UI tests.

> Keep this checklist close to PRs. For each PR, copy relevant sections and tick them off before merge.