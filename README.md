
<div align="center">

# 🐙 Squailor

**AI-powered document intelligence for PDFs, Word, and PowerPoint — with vision OCR, live streaming, and zero compromise on privacy.**

[![Latest Release](https://img.shields.io/github/v/release/veroxsity/Squailor?style=for-the-badge&logo=github&color=5A67D8)](https://github.com/veroxsity/Squailor/releases)
[![Downloads](https://img.shields.io/github/downloads/veroxsity/Squailor/total?style=for-the-badge&logo=github&color=10B981)](https://github.com/veroxsity/Squailor/releases)
[![License](https://img.shields.io/badge/license-ISC-blue.svg?style=for-the-badge)](LICENSE)
[![Platforms](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#downloads)
[![Platforms](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)](#downloads)
[![Platforms](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)](#downloads)

[📥 Download Now](https://github.com/veroxsity/Squailor/releases/latest) • [📚 Documentation](documentation/) • [🐛 Report Issue](https://github.com/veroxsity/Squailor/issues) • [💡 Suggestions](documentation/SUGGESTIONS.md)

---

</div>

---

## 🚀 Quick Start

1. **[Download the latest release](https://github.com/veroxsity/Squailor/releases/latest)** for your OS (Windows, macOS, Linux)
2. **Get a free [OpenRouter API key](https://openrouter.ai/keys)** and paste it in Settings → API Key
3. **Drop your PDF, PPTX, or DOCX** and click Generate — watch live streaming summaries!

> 💡 **Pro Tip:** Enable a vision model (GPT-4o, Claude 3.5 Sonnet) to extract insights from images, charts, and slides.

---

## 🌟 Features at a Glance

- **Summarize PDFs, PowerPoint, and Word** — text and images
- **Vision OCR:** Extracts text from images, charts, and scanned pages
- **Combine up to 3 files** into a single, cross-referenced summary
- **Live streaming output** and per-stage progress
- **Q&A chat:** Ask follow-up questions about any summary
- **Duplicate detection** (SHA-256 content hashing)
- **Encrypted API key storage** (AES-256)
- **Portable mode** (run from USB, all data local)
- **Auto-updates** (Windows installer, all platforms via GitHub)
- **No telemetry, no cloud storage, your data stays local**

---

## 🌟 Key Features

### � Universal Document Support
- **PDFs** with text + image extraction (including scanned pages)
- **PowerPoint** (.pptx/.ppt) with slide images and speaker notes
- **Word** (.docx/.doc) with embedded images and full formatting

### 🧠 Intelligent Summarization
- **Multiple Styles:** Teaching explanations or bullet-point notes
- **Flexible Length:** Short (key points), Normal (balanced), or Detailed
- **Custom Tones:** Casual, Formal, Informative, or Easy-to-understand
- **Smart Chunking:** Handles 100+ page documents automatically

### 🎨 Vision-Powered OCR
- **Extract from images:** Charts, graphs, diagrams, slide text
- **Configurable limits:** Control cost with 0-10 images per document
- **Auto-fallback:** Seamlessly switches to text-only for non-vision models

### 🔗 Multi-Document Intelligence
- **Combine up to 3 files** into one cohesive summary
# Squailor

Squailor is a privacy-first desktop app for extracting, combining, and summarizing information from documents using modern large-language models and on-device processing. Built with Electron, Squailor helps you turn PDFs, Word/PPTX files, and images into concise summaries, quick Q&A, and shareable notes — all without sending your local files to unknown servers.

---

## Key highlights

- Fast, local-first document summarization and Q&A powered by configurable AI models.
- Supports PDFs, DOCX and PPTX (text + slides), and images (OCR where available).
- Streams model output live to the UI for fast, readable summaries.
- Stores results per-document in an easy-to-browse history with folder-based storage.
- Encrypted API key storage and an explicit zero-telemetry policy.

---

## Quick demo

(If you have screenshots or a short GIF, replace these placeholders with real images in `assets/screenshots/`)

![screenshot-1](assets/screenshots/summary-list.png)

---

## 3-step Quick Start

1. Install dependencies and run in development:

```powershell
npm install
npm run dev
```

2. Start the app in development (opens Electron window):

```powershell
npm run start
```

3. Drop one or more documents onto the app, click "Process", and watch the live summary stream.

---

## Downloads

Prebuilt releases are published to GitHub Releases. Use the appropriate asset for your OS:

- Windows: NSIS installer (.exe) and portable ZIP
- macOS: .dmg or .zip
- Linux: AppImage or .deb

See the Releases page on the project repository for the latest builds.

---

## Features at a glance

- Combined multi-document summaries (merge several files into one cohesive summary).
- Duplicate detection and intelligent merging to avoid repeated content.
- Streaming model output into a progress card with stage-level progress.
- Per-summary quick Q&A panel with conversational history.
- Export summaries as Markdown and save them alongside original documents.
- Encrypted local storage for API keys (`keystore.enc`) and explicit settings file (`settings.json`).

---

## How Squailor works (brief)

1. Files are inspected and optionally de-duplicated using hash-based detection.
2. Text is extracted from supported formats (PDF, DOCX, PPTX, images).
3. Extracted content is chunked and sent to the selected AI model for summarization.
4. The app streams responses to the UI, builds a final summary, and saves it into the document folder.

All heavy I/O and parsing runs locally; only model calls go to the configured AI provider (you configure your own API key).

---

## Settings & privacy

- API keys are stored encrypted on-disk. No keys are embedded in the app. You control which provider and model to use.
- Squailor does not collect or transmit telemetry by default. Any optional integrations (e.g., crash reporting) must be enabled explicitly.
- Document content is not uploaded by the app unless you explicitly permit it (for example if you configure a remote model endpoint that requires uploading content).

---

## Storage layout

By default Squailor stores data in a per-document folder structure under `data/documents/`:

- data/documents/<short-uuid>/originals/  — original uploaded files
- data/documents/<short-uuid>/summary.md  — generated Markdown summary
- data/documents/<short-uuid>/meta.json     — metadata and processing history

Settings and keys:

- settings.json — application settings
- keystore.enc — encrypted API key storage (requires your password to unlock)

---

## Troubleshooting

- App doesn't start?
   - Confirm Node and npm are installed (Node 18+ recommended).
   - Run `npm run dev` to start in dev mode and watch the renderer console for errors.

- Missing model responses or long delays?
   - Check API key is configured under Settings and decrypted successfully.
   - Verify the configured provider (OpenAI/OpenRouter/etc.) and model name. Use smaller models for quick tests.

- PDF/PPTX text missing or garbled?
   - Some PDFs are image-only — enable OCR/image parsing or convert pages to text externally.
   - Large files might need longer processing time; try smaller sample files to validate.

---

## For developers

- Code structure:
   - `main.js` — Electron main process, IPC handlers, file parsing orchestration.
   - `renderer.js` — UI logic, progress cards, history viewer.
   - `preload.js` — secure IPC bridge between renderer and main.
   - `utils/` — parsers and helpers (PDF/PPTX/DOCX parsing, encryption, hashing).

- Run the app in dev:

```powershell
npm ci
npm run dev
```

- Build distributables:

```powershell
npm run build
# or platform-specific
npm run build:win
npm run build:mac
npm run build:linux
```

See `scripts/build.js` and `BUILD_INSTRUCTIONS.md` in `documentation/` for more packaging details.

---

## Roadmap & where to help

Top near-term priorities:

- Add unit and integration tests for document parsing and encryption code paths.
- Improve OCR support and slide extraction for PPTX previews.
- Make the model-selection UI more discoverable and add on-device short summaries for offline use.

Longer-term:

- Add workspace-level indexing and fuzzy search across saved summaries.
- Support shared team workspaces with optional server sync.
- Add plugin hooks so third-party parsers and exporters can be added.

If you'd like to help, check `documentation/SUGGESTIONS.md` for a prioritized list of issues and ideas.

---

## Contributing

Contributions are welcome. Please open issues for feature requests and file PRs against `main` for code changes. Follow the existing style in the repo and include tests where practical.

---

## License

Squailor is released under the terms in `LICENSE` (see the project root).

---

If you'd like further style changes, more screenshots, or a shorter / longer README variant (dev vs. user), tell me which direction you'd prefer and I'll iterate again.
- “No text found”
