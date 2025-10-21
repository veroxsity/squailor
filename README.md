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

## 📖 Key Features

### 📄 Universal Document Support
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
- **Cross-reference sources** with "Source 1/2/3" attributions
- **Resolve contradictions** and highlight unique insights

### ⚡ Real-Time Experience
- **Live streaming output** — watch the AI generate summaries word-by-word
- **Progress stages:** Duplicate check → Extract → Combine → Summarize → Save
- **Duplicate detection** with SHA-256 content hashing (skip re-processing)

### 💬 Interactive Q&A
- **Chat with your summaries** — ask follow-up questions
- **Context-aware answers** using the full document
- **Streaming responses** for instant feedback

---

## ⬇️ Downloads

- [Latest installers and portable builds](https://github.com/veroxsity/Squailor/releases)
  - **Windows:** Installer (.exe, recommended) or ZIP portable
  - **macOS:** DMG or ZIP
  - **Linux:** AppImage or DEB

> **Tip:** On Windows, use the installer for seamless auto-updates. Portable mode is available for all platforms.

---

## 🧰 System Requirements

- Windows 10/11, macOS 12+, or a modern Linux distro
- Node.js 18+ and npm 9+ (for building from source)
- Internet connection and an OpenRouter API key
- (Optional) For best PDF thumbnails: install system dependencies for [canvas](https://www.npmjs.com/package/canvas)

---

## 💻 Getting Started

1. **Download** a release from [Releases](https://github.com/veroxsity/Squailor/releases), or build from source.
2. **Get an OpenRouter API key:** https://openrouter.ai/keys
3. **Launch the app → Settings → paste your API key → Save & Validate.**
4. *(Optional)* In Settings → Image Settings, adjust "Max Images per Document" to control cost and speed.
5. **Start summarizing from the Home page!**

**Build it yourself:**

```powershell
# Clone and install
git clone https://github.com/veroxsity/Squailor.git
cd Squailor
npm install

# Run in dev
npm run start
# Windows (alternate): npm run dev

# Build installers
npm run build       # default platform
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

> For best PDF thumbnail OCR, install canvas: 
pm install canvas  
> On macOS/Linux, use 
pm run start for development. The dev script is Windows-specific.

---

## 🚀 Usage

1. Click "Choose Files" (PDF, PPTX, DOCX). Optionally toggle "Combine into one summary".
2. Pick Summary Type (short/normal/longer), Style (teaching/notes), and Tone (casual/formal/informative/easy).
3. Choose an AI model. Defaults to openai/gpt-4o-mini (vision-capable via OpenRouter).
4. Click Generate. Watch per-file progress cards and streaming text.
5. Open the result, copy it, or export as Markdown/Text. Everything is saved in History.
6. Open a summary to chat with it: ask follow-ups in the Q&A panel.

**Tips:**

- For vision: pick a model with image support (e.g., 4o, 4o-mini, Gemini/Haiku variants that support images).
- Control cost: lower the "Max Images per Document" setting (0–10). Fewer images = fewer tokens.
- Combined mode is capped to 3 files to keep results focused and costs predictable.

---

## ⚙️ Settings

**Theme**
- Light or Dark. Applies instantly.

**AI Model**
- Choose from OpenRouter models (OpenAI, Anthropic, Google, Meta, etc.). Vision models unlock OCR features.

**Image Settings**
- Max Images per Document: 0–10 (defaults to 3). Lower this to accelerate runs and reduce API spend.

**Storage Location**
- Switch between OS AppData and a local app folder. The app will move existing files safely.

**Portable Mode**
- Choose "Local app folder" in Storage to keep all data next to the executable (portable usage).

**API Key**
- Save & validate securely. Keys are encrypted at rest; you can delete them anytime.

**App Version**
- The Settings page shows the current app version, pulled from the runtime (helpful for support and reports).

**Auto-updates**
- Packaged builds can check for updates under Settings → Updates. On Windows, the installer will close the main window and restart to install automatically.

---

## 🔒 Storage & Privacy

**Where files live:**

- Windows: %APPDATA%/Squailor/data
- macOS: ~/Library/Application Support/Squailor/data
- Linux: ~/.config/Squailor/data

**Inside data/:**

- documents/ — one folder per processed document (original file + summary.json)
- keystore.enc — your encrypted OpenRouter API key
- settings.json — theme, model, maxImageCount, storage location, etc.

**Portable mode:**

- If run in a portable directory, Squailor can keep data/ next to the executable. See Settings → Storage.

**Privacy:**

- Squailor does not collect telemetry. Your data stays on your machine.
- Only the minimal text/images needed for summarization are sent to your chosen model via OpenRouter.

---

## 🛠️ Troubleshooting

- **"No text found"**
  - Some PDFs are images only. Use a vision model and enable images; thumbnails will provide limited OCR context.

- **Images didn't affect the summary**
  - Ensure the selected model supports vision. Otherwise, the app will summarize from text only.

- **Rate limits / quota errors**
  - These come from the model provider via OpenRouter. Try a cheaper/faster model or smaller inputs.

- **Exports look odd**
  - Switch to Markdown export for better formatting.

**Update diagnostics:**

- If an update doesn't install on Windows, check the startup log at:
  - %APPDATA%/Squailor/startup.log (packaged builds)
- You can also trigger updates manually in Settings → Updates.

---

## ⚠️ Known Issues

- Very large PDFs (50MB+) may process slowly depending on the selected model and image settings.
- On macOS/Linux development, use 
pm run start (the dev script sets a Windows-style env var).
- Some scanned PDFs may require enabling images and selecting a vision-capable model for best results.

---

## ❓ FAQ

**Why is combined mode limited to 3 files?**
- It keeps prompts concise and costs predictable while still capturing cross-source insights.

**Does Squailor read all images in a doc?**
- It respects "Max Images per Document" and uses best-effort extraction. PPTX/DOCX images are prioritized; PDFs use page thumbnails.

**Which models support vision?**
- Commonly: OpenAI 4o/4o-mini, some Anthropic/Google models via OpenRouter. If unsupported, the app will automatically fall back to text-only.

---

## 🗺️ Roadmap

- Smarter image selection (saliency per slide)
- Higher-quality PDF image rendering
- More export formats (docx/pdf)
- Per-project presets

See documentation/ for deeper architecture and change notes.

Also see: documentation/SUGGESTIONS.md for a curated list of future enhancements.

---

## 🧑‍💻 Development

- **Codebase:** Electron (main/renderer/preload), vanilla HTML/CSS UI
- **Utilities:** pdf-parse-fork, pdfjs-dist, JSZip/XML for PPTX/DOCX, OpenRouter client
- **Storage:** folder-per-document with summary.json; encrypted keystore
- **Updater:** electron-updater (GitHub Releases)

For detailed docs, explore the documentation/ folder:

- GETTING_STARTED.md, BUILD_INSTRUCTIONS.md, STORAGE_ARCHITECTURE.md, ENCRYPTION.md, POWERPOINT_PREVIEW_FIX.md, and more

---

## 🧩 Support

- Found a bug or have a request? [Open an issue](https://github.com/veroxsity/Squailor/issues)
- Check the documentation index: documentation/DOCUMENTATION_INDEX.md
- See the changelog for version history: documentation/CHANGELOG.md

---

## 📝 Changelog

See documentation/CHANGELOG.md for detailed release notes.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo and create a branch
2. Make changes with clear commit messages
3. Open a PR against main

Please also review the documentation/ folder for style and architecture notes.

---

## 📄 License

ISC. See LICENSE for details.
