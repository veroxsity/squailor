<div align="center">

## 🐙 Squailor

AI-powered summarization for PDFs, Word, and PowerPoint — with live progress, image OCR, and beautiful UX.

[![Latest Release](https://img.shields.io/github/v/release/veroxsity/Squailor)](https://github.com/veroxsity/Squailor/releases)
[![Downloads](https://img.shields.io/github/downloads/veroxsity/Squailor/total)](https://github.com/veroxsity/Squailor/releases)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-5A67D8)](#system-requirements)

</div>

Squailor is a modern Electron app that turns large documents into concise, high‑quality summaries. It supports text‑only summarization and vision‑assisted OCR for images embedded in PPTX/DOCX and page thumbnails from PDFs. Built for speed, clarity, and control.

—

## ✨ Highlights

- Summarize PDFs, PPTX, and DOCX fast with live streaming output and per‑stage progress
- Combine up to 3 files into a single, cohesive summary that resolves overlaps and calls out unique points
- Vision support: extract images and OCR visible text first for higher accuracy and better context
- Duplicate detection: content hashing prevents re‑processing identical files
- Secure by default: API key is encrypted on disk; nothing is uploaded except your AI requests
- Thoughtful storage: each document gets its own folder with summary.json, original file, and metadata
- Settings that matter: choose model, tone, style, theme, storage location, and max images per doc
- Auto‑updates (packaged builds) via GitHub Releases

—

## 📜 Table of Contents

- [Downloads](#-downloads)
- [System Requirements](#-system-requirements)
- [Getting Started](#-getting-started)
- [Features](#-features)
- [Usage](#-usage)
- [Settings](#-settings)
- [Storage & Privacy](#-storage--privacy)
- [Screenshots & Demos](#-screenshots--demos)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [Roadmap](#-roadmap)
- [Development](#-development)
- [Support](#-support)
- [Changelog](#-changelog)
- [Contributing](#-contributing)
- [License](#-license)

—

## ⬇️ Downloads

- Latest installers and portable builds: https://github.com/veroxsity/Squailor/releases
   - Windows: Squailor-Setup-x.y.z.exe (recommended) or ZIP portable
   - macOS: DMG or ZIP
   - Linux: AppImage or DEB

Tip: On Windows, prefer the installer for seamless auto‑updates. Portable mode is available if you want everything in one folder.

—

## 🧰 System Requirements

- Windows 10/11, macOS 12+, or a modern Linux distro
- For building from source: Node.js 18+ and npm 9+
- Internet connection and an OpenRouter API key for AI models
- Optional (better PDF thumbnails): system dependencies for canvas on your OS

—

## 💻 Getting Started

1) Download a release from the Releases page, or build from source.

2) Get an OpenRouter API key: https://openrouter.ai/keys

3) Launch the app → Settings → paste your OpenRouter API key → Save & Validate.

4) Optional: In Settings → Image Settings, set the “Max Images per Document” to control cost and speed.

5) Start summarizing from the Home page.

Build it yourself

- Clone and install
   - git clone https://github.com/veroxsity/Squailor.git
   - cd Squailor
   - npm install
- Run in dev
   - npm run start
   - Windows (alternate): npm run dev
- Build installers
   - npm run build       # default platform
   - npm run build:win   # Windows
   - npm run build:mac   # macOS
   - npm run build:linux # Linux

Notes

- For best PDF thumbnail OCR, install canvas: npm install canvas
- On macOS/Linux, use "npm run start" for development. The "dev" script is Windows‑specific.

—

## 🔍 Features

- Single‑file summaries
   - Teaching style or bullet notes
   - Short, normal, or longer length
- Combined summaries (up to 3 files)
   - Aggregates sources, resolves contradictions, attributes unique points (Source 1/2/3)
- Vision‑assisted OCR
   - PPTX/DOCX: extract images and read on‑slide text
   - PDF: create small thumbnails for early page context (best‑effort)
   - Automatically falls back to text‑only if model lacks vision support
- Live progress and streaming
   - Stages: duplicate‑check → extraction → combining → summarizing → saving
   - Token/partial output arrives as it’s generated
- Duplicate detection
   - SHA‑256 content hash prevents reprocessing; you can overwrite or create a new copy
- Storage & history
   - Per‑document folders in data/documents
   - In‑app history list, quick preview, export to .md/.txt
- Q&A on summaries
   - Open a summary and ask follow‑up questions in the built‑in chat
   - Streaming answers with your selected model
- Secure API key storage
   - Encrypted locally in data/keystore.enc
- Auto‑updates
   - Packaged builds check GitHub Releases and can restart to install

—

## 🚀 Usage

1) Click “Choose Files” (PDF, PPTX, DOCX). Optionally toggle “Combine into one summary”.
2) Pick Summary Type (short/normal/longer), Style (teaching/notes), and Tone (casual/formal/informative/easy).
3) Choose an AI model. Defaults to openai/gpt‑4o‑mini (vision‑capable via OpenRouter).
4) Click Generate. Watch per‑file progress cards and streaming text.
5) Open the result, copy it, or export as Markdown/Text. Everything is saved in History.
6) Open a summary to chat with it: ask follow‑ups in the Q&A panel.

Tips

- For vision: pick a model with image support (e.g., 4o, 4o‑mini, Gemini/Haiku variants that support images).
- Control cost: lower the “Max Images per Document” setting (0–10). Fewer images = fewer tokens.
- Combined mode is capped to 3 files to keep results focused and costs predictable.

—

## ⚙️ Settings

Theme

- Light or Dark. Applies instantly.

AI Model

- Choose from OpenRouter models (OpenAI, Anthropic, Google, Meta, etc.). Vision models unlock OCR features.

Image Settings

- Max Images per Document: 0–10 (defaults to 3). Lower this to accelerate runs and reduce API spend.

Storage Location

- Switch between OS AppData and a local app folder. The app will move existing files safely.

Portable Mode

- Choose “Local app folder” in Storage to keep all data next to the executable (portable usage).

API Key

- Save & validate securely. Keys are encrypted at rest; you can delete them anytime.

App Version

- The Settings page shows the current app version, pulled from the runtime (helpful for support and reports).

Auto‑updates

- Packaged builds can check for updates under Settings → Updates. On Windows, the installer will close the main window and restart to install automatically.

—

## 🔒 Storage & Privacy

Where files live

- Windows: %APPDATA%/Squailor/data
- macOS: ~/Library/Application Support/Squailor/data
- Linux: ~/.config/Squailor/data

Inside data/

- documents/ — one folder per processed document (original file + summary.json)
- keystore.enc — your encrypted OpenRouter API key
- settings.json — theme, model, maxImageCount, storage location, etc.

Portable mode

- If run in a portable directory, Squailor can keep data/ next to the executable. See Settings → Storage.

Privacy

- Squailor does not collect telemetry. Your data stays on your machine.
- Only the minimal text/images needed for summarization are sent to your chosen model via OpenRouter.

—

## �️ Screenshots & Demos

Want a quick tour of the UI and UX?

- Progress & stages: see documentation/PROGRESS_VISUAL_GUIDE.md
- Tone options: see documentation/TONE_FEATURE_VISUAL_GUIDE.md
- Quick start: see documentation/QUICK_START.md and documentation/GETTING_STARTED.md

Add your own screenshots to the repo (e.g., assets/screenshots/) and link them here to showcase the latest UI.

—

## �🛠️ Troubleshooting

- “No text found”
   - Some PDFs are images only. Use a vision model and enable images; thumbnails will provide limited OCR context.
- Images didn’t affect the summary
   - Ensure the selected model supports vision. Otherwise, the app will summarize from text only.
- Rate limits / quota errors
   - These come from the model provider via OpenRouter. Try a cheaper/faster model or smaller inputs.
- Exports look odd
   - Switch to Markdown export for better formatting.

Update diagnostics

- If an update doesn’t install on Windows, check the startup log at:
  - %APPDATA%/Squailor/startup.log (packaged builds)
- You can also trigger updates manually in Settings → Updates.

—

## ⚠️ Known Issues

- Very large PDFs (50MB+) may process slowly depending on the selected model and image settings.
- On macOS/Linux development, use `npm run start` (the `dev` script sets a Windows‑style env var).
- Some scanned PDFs may require enabling images and selecting a vision‑capable model for best results.

—

## ❓ FAQ

Why is combined mode limited to 3 files?

- It keeps prompts concise and costs predictable while still capturing cross‑source insights.

Does Squailor read all images in a doc?

- It respects “Max Images per Document” and uses best‑effort extraction. PPTX/DOCX images are prioritized; PDFs use page thumbnails.

Which models support vision?

- Commonly: OpenAI 4o/4o‑mini, some Anthropic/Google models via OpenRouter. If unsupported, the app will automatically fall back to text‑only.

—

## 🗺️ Roadmap

- Smarter image selection (saliency per slide)
- Higher‑quality PDF image rendering
- More export formats (docx/pdf)
- Per‑project presets

See documentation/ for deeper architecture and change notes.

Also see: documentation/SUGGESTIONS.md for a curated list of future enhancements.

—

## 🧑‍💻 Development

- Codebase: Electron (main/renderer/preload), vanilla HTML/CSS UI
- Utilities: pdf‑parse‑fork, pdfjs‑dist, JSZip/XML for PPTX/DOCX, OpenRouter client
- Storage: folder‑per‑document with summary.json; encrypted keystore
- Updater: electron‑updater (GitHub Releases)

For detailed docs, explore the documentation/ folder:

- GETTING_STARTED.md, BUILD_INSTRUCTIONS.md, STORAGE_ARCHITECTURE.md, ENCRYPTION.md, POWERPOINT_PREVIEW_FIX.md, and more

—

## 🧩 Support

- Found a bug or have a request? Open an issue: https://github.com/veroxsity/Squailor/issues
- Check the documentation index: documentation/DOCUMENTATION_INDEX.md
- See the changelog for version history: documentation/CHANGELOG.md

—

## 📝 Changelog

See documentation/CHANGELOG.md for detailed release notes.

—

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo and create a branch
2. Make changes with clear commit messages
3. Open a PR against main

Please also review the documentation/ folder for style and architecture notes.

—

## 📄 License

ISC. See LICENSE for details.
