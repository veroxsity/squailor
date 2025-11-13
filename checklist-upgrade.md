# Squailor Upgrade & Hardening Checklist

This checklist tracks high-impact fixes, hardening, and quality upgrades across the app. Use it during the next release cycle. Items are grouped and mapped to the internal TODO IDs for traceability.

---

## Security

- [x] (T4, T14) Sanitize AI-rendered summaries before injecting into the DOM
  - Add DOMPurify (or sanitize-html) and sanitize `marked.parse()` output in `renderer.js`
  - Consider disabling raw HTML in marked; document decision
  - Add a strict CSP in `index.html` and verify the UI still works
- [x] (T7) Add strong Content Security Policy in `index.html`
  - Disallow inline scripts or add nonces
  - Verify preload-only scripting works; confirm no eval/Function used
- [x] (T13) Validate IPC inputs and preload-exposed API parameters
  - Type-check and guard arrays, strings, enums
  - Return clean error objects without stack traces to the renderer
- [ ] (T29) Outbound network allowlist and telemetry check
  - Confirm only: provider API, GitHub updater endpoints
  - Document proxy support and how to disable updates

## Stability and Correctness

- [x] (T1) Fix undefined `log` usage in `main.js` during blocking update error path
  - Replace with scoped `electron-log` or `console.warn`
- [x] (T3, T17, T23) Fix storage-location migration for folder-based storage
  - Implement recursive copy (fs.cp) for `documents/`
  - Replace deprecated `fs.rmdir` with `fs.rm`
  - Add atomicity/rollback notes and better user feedback
- [x] (T2) Switch duplicate detection to SHA-256 (docs already claim SHA-256)
  - Update `utils/fileHash.js` and validate compatibility
- [x] (T6) Remove `originalText` from IPC results to reduce memory/IPC load
- [x] (T16) Audit blocking updater flow vs non-blocking listeners
  - Ensure splash always closes; no double event firing; robust timeout path

## UX improvements

- [x] (T5, T25) Register one `processing-progress` listener and gate verbose logs to dev mode
- [ ] (T26) Duplicate dialog: Add "Open existing" action to jump to History entry
- [ ] (T27) Ensure Q&A `qa-progress` listeners are disposed when leaving summary view
- [x] (T19) If `canvas` is missing, show a Settings tip for improved PDF thumbnails
- [ ] (T30) Normalize rate-limit/quota/api-key errors into friendlier messages and hints

## AI/Model routing

- [x] (T11) Token-aware chunking (replace char-based chunking)
- [x] (T12) Model vision capability map by provider (fewer heuristic misses)
- [x] (T18) Externalize provider model lists (JSON or on-demand fetch), keep safe fallbacks
- [x] (T9) Update OpenRouter referer/headers to actual repo/title
- [ ] (T28) Consider Azure streaming support (optional)

## Build, Packaging, Tooling

- [x] (T22) Add ESLint + Prettier, wire to prebuild
- [x] (T10) Add Jest tests for encryption, hashing, parsing, and chunking
- [ ] (T24) Evaluate enabling `asar`; add `extraResources`/`asarUnpack` if needed
- [ ] Ensure scripts/verify-deps stays green (npm audit high/critical = fail)

## Documentation

- [x] (T15) Fix README and docs references (e.g., `utils/pdfParser.js` → `utils/pdfImages.js`)
- [x] Add a brief Security section covering CSP, sanitization, storage encryption, and network endpoints

---

## Quick validation steps

- Run in development (Windows PowerShell):
  ```powershell
  npm ci
  npm run start
  ```
- Build locally:
  ```powershell
  npm run build
  ```
- Unit tests (after Jest added):
  ```powershell
  npm test
  ```

## Notes

- IDs in parentheses map to the internal TODO list. Keep this file updated as items complete.
- Prioritize Security and Stability items first (top two sections) before feature work.
