<div align="center">

## 🐙 Squailor

AI-powered summarization for PDFs, Word, and PowerPoint — with live progress, image OCR, and beautiful UX.

[![Latest Release](https://img.shields.io/github/v/release/veroxsity/Squailor)](https://github.com/veroxsity/Squailor/releases)
[![Downloads](https://img.shields.io/github/downloads/veroxsity/Squailor/total)](https://github.com/veroxsity/Squailor/releases)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

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

- Getting Started
- Features
- Usage
- Settings
- Storage & Privacy
- Troubleshooting
- FAQ
- Roadmap
- Development
- Contributing
- License

—

## 💻 Getting Started

1) Download a release from the Releases page, or build from source.

2) Get an OpenRouter API key: https://openrouter.ai/keys

3) Launch the app → Settings → paste your API key → Save & Validate.

4) Optional: In Settings → Image Settings, set the “Max Images per Document” to control cost and speed.

5) Start summarizing from the Home page.

Build it yourself

- Clone and install
   - git clone https://github.com/veroxsity/Squailor.git
   - cd Squailor
   - npm install
- Run in dev
   - npm run dev
- Build installers
   - npm run build       # default platform
   - npm run build:win   # Windows
   - npm run build:mac   # macOS
   - npm run build:linux # Linux

Note: For best PDF thumbnail OCR, install canvas: npm install canvas

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

API Key

- Save & validate securely. Keys are encrypted at rest; you can delete them anytime.

App Version

- The Settings page shows the current app version, pulled from the runtime (helpful for support and reports).

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

## 🛠️ Troubleshooting

- “No text found”
   - Some PDFs are images only. Use a vision model and enable images; thumbnails will provide limited OCR context.
- Images didn’t affect the summary
   - Ensure the selected model supports vision. Otherwise, the app will summarize from text only.
- Rate limits / quota errors
   - These come from the model provider via OpenRouter. Try a cheaper/faster model or smaller inputs.
- Exports look odd
   - Switch to Markdown export for better formatting.

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

—

## 🧑‍💻 Development

- Codebase: Electron (main/renderer/preload), vanilla HTML/CSS UI
- Utilities: pdf‑parse‑fork, pdfjs‑dist, JSZip/XML for PPTX/DOCX, OpenRouter client
- Storage: folder‑per‑document with summary.json; encrypted keystore
- Updater: electron‑updater (GitHub Releases)

For detailed docs, explore the documentation/ folder:

- GETTING_STARTED.md, BUILD_INSTRUCTIONS.md, STORAGE_ARCHITECTURE.md, ENCRYPTION.md, POWERPOINT_PREVIEW_FIX.md, and more

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
