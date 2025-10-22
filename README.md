<div align="center">

# 🐙 Squailor

**Transform your documents into intelligent summaries — AI-powered analysis for PDFs, PowerPoint, and Word with live streaming, vision OCR, and complete privacy.**

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

1. **[Download the latest release](https://github.com/veroxsity/Squailor/releases/latest)** for Windows, macOS, or Linux
2. **Get an API key from your preferred AI provider:**
   - [OpenRouter](https://openrouter.ai/keys) — Unified access to 10+ providers (recommended for flexibility)
   - [OpenAI](https://platform.openai.com/api-keys) — Direct access to GPT models
   - [Anthropic](https://console.anthropic.com/) — Claude models
   - [Google AI Studio](https://aistudio.google.com/app/apikey) — Gemini models
   - Or use Groq, Cohere, Mistral, xAI, Azure OpenAI
3. **Launch Squailor → Settings → AI Providers → select provider → paste API key → Save**
4. **Go to Home → drop your files → click Generate** — watch your summaries stream in real-time!

> 💡 **Pro Tip:** Select a vision-capable model (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) to extract text from images, charts, and diagrams embedded in your documents.

---

## 🌟 What Squailor Does

Squailor is a desktop application that reads your PDFs, PowerPoint presentations, and Word documents, then uses advanced AI models from multiple providers to generate concise, customizable summaries. Everything runs locally on your machine — only the text extraction and AI requests are sent to your chosen provider.

### ⚡ Core Features

- **Multi-provider AI support:** Choose from OpenRouter, OpenAI, Anthropic, Google, Cohere, Groq, Mistral, xAI, Azure OpenAI, or custom OpenAI-compatible APIs
- **Dynamic model selection:** Model list adapts based on your active provider — see only relevant options
- **Multi-format support:** PDF, PPTX, PPT, DOCX, DOC
- **Vision OCR:** Extracts text from embedded images, charts, diagrams, and slides (when using vision-capable models)
- **Live streaming:** Watch summaries generate word-by-word in real-time
- **Customizable output:**
  - **Length:** Short (key points), Normal (balanced), or Longer (detailed)
  - **Style:** Teaching format (paragraphs & explanations) or Notes format (bullets & concise)
  - **Tone:** Casual, Formal, Informative, or ELI5 (Explain Like I'm 5)
- **Combined summaries:** Merge up to 3 files into one cross-referenced summary that identifies themes and resolves contradictions
- **Duplicate detection:** SHA-256 content hashing prevents reprocessing the same document
- **Q&A chat:** Ask follow-up questions about any generated summary with streaming responses
- **Per-document folders:** Each summary is stored with the original file, metadata, and preview in an organized folder structure
- **History & search:** Browse all past summaries, filter by type/tone, and quickly jump back into any document

### 🔐 Privacy & Security

- **Local-first:** Documents stay on your machine (stored in AppData or a portable folder you choose)
- **Encrypted API keys:** Your API keys are encrypted at rest using AES-256-GCM with machine-specific encryption
- **Zero telemetry:** Squailor does not track usage or send analytics
- **Portable mode:** Run from a USB drive with all data self-contained
- **No vendor lock-in:** Switch between AI providers anytime without losing your data

### 🎨 Modern UI

- **Dark and light themes**
- **Multi-page workspace:** Home (process files), History (browse past work), Settings (manage keys & preferences)
- **Progress stages:** Visual feedback for duplicate check → extract → combine → summarize → save
- **Export options:** Copy to clipboard, export as Markdown or TXT

---

## ⬇️ Downloads

Prebuilt installers and portable builds are available on the [Releases page](https://github.com/veroxsity/Squailor/releases):

- **Windows:** `.exe` installer (with auto-updates) or portable `.zip`
- **macOS:** `.dmg` or `.zip`
- **Linux:** `AppImage` or `.deb`

> **Tip:** The Windows installer supports seamless auto-updates via GitHub Releases. Portable mode is available on all platforms — just choose "Application folder" in Settings → Storage.

---

## 🧰 System Requirements

- **Operating System:** Windows 10/11, macOS 12+, or a modern Linux distro
- **For building from source:**
  - Node.js 18+ and npm 9+
  - (Optional) System dependencies for [canvas](https://www.npmjs.com/package/canvas) if you want enhanced PDF thumbnail rendering

---

## 💻 Getting Started

### Option 1: Download a Release (Recommended)

1. Download a prebuilt installer from [Releases](https://github.com/veroxsity/Squailor/releases)
2. Install and launch Squailor
3. Get an API key from your preferred provider (see Quick Start above)
4. Go to **Settings → AI Providers → select provider → paste API key → Test connection → Save**
5. *(Optional)* In **Settings → Image Settings**, adjust "Max Images per Document" (0–10, default 3) to control OCR usage and cost
6. Return to **Home**, drop your files, configure summary options (Length/Style/Tone), and click **Generate**!

### Option 2: Build from Source

```powershell
# Clone the repository
git clone https://github.com/veroxsity/Squailor.git
cd Squailor

# Install dependencies
npm install

# Run in development
npm run start
# (On Windows, you can also use: npm run dev)

# Build installers for distribution
npm run build          # Build for your current platform
npm run build:win      # Windows (NSIS + ZIP)
npm run build:mac      # macOS (DMG + ZIP)
npm run build:linux    # Linux (AppImage + DEB)
```

> **Note:** For best PDF thumbnail OCR, install canvas: `npm install canvas`  
> On macOS/Linux, use `npm run start` for development. The `dev` script is Windows-specific.

---

## 🚀 How to Use Squailor

1. **Select files:** Click "📁 Browse files" or drag & drop PDFs, PPTX, or DOCX onto the upload zone
2. **Configure summary options:**
   - **Length:** Short, Normal, or Longer
   - **Tone:** Casual, Formal, Informative, or ELI5 (Explain Like I'm 5)
   - **Format:** Teaching (paragraphs) or Notes (bullets)
   - **AI Model:** Choose from your active provider's available models (home page shows "Current provider: [name]")
   - **Image analysis:** Toggle "Analyze images (OCR)" on/off
   - **Combined mode:** Enable "Combine files" to merge up to 3 documents into one summary
3. **Click Generate:** Watch real-time progress with stage-by-stage status (duplicate check → extract → combine → summarize → save)
4. **Review results:** Open any summary to read, chat with Q&A, copy, or export as Markdown/TXT
5. **Browse history:** Visit the History page to search, filter, and revisit all past summaries

### Tips

- **Switch providers anytime:** Go to Settings → AI Providers to change your active AI provider
- **Model selection updates automatically:** The model dropdown on the home page shows only models available for your current provider
- **For vision features:** Select a model that supports images (e.g., GPT-4o, GPT-4o Mini, Claude 3.5 Sonnet, Gemini 1.5 Pro)
- **Control costs:** Lower "Max Images per Document" in Settings → Image Settings (fewer images = fewer tokens)
- **Combined mode best for:** Multi-part lectures, related research papers, or documents that should be cross-referenced
- **Longer summaries:** Use the "Longer" length option for detailed explanations — the AI will preserve more content and detail
- **ELI5 tone:** Perfect for making complex academic or technical content accessible to anyone, regardless of background

---

## ⚙️ Settings

Squailor provides extensive configuration options via the Settings page:

### 🤖 AI Providers
- **Provider Selection:** Choose from 10 AI providers:
  - **OpenRouter** — Unified access to multiple providers (recommended)
  - **OpenAI** — Direct access to GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
  - **Anthropic** — Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
  - **Google** — Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro
  - **Cohere** — Command R+, Command R, Command series
  - **Groq** — Fast Llama 3.3, Llama 3.1, Mixtral models
  - **Mistral** — Mistral Large, Medium, Small
  - **xAI** — Grok Beta
  - **Azure OpenAI** — Enterprise GPT models with your Azure deployment
  - **Custom OpenAI** — Any OpenAI-compatible API endpoint
- **API Key Management:** Each provider has its own encrypted API key storage
- **Provider-specific Configuration:**
  - Azure OpenAI: Endpoint URL, Deployment name, API version
  - Custom OpenAI: Base URL for your API endpoint
- **Test Connection:** Validate your API key before saving
- **Current Provider Display:** Home page shows which provider is active

### 🖼️ Image Settings
- **Max Images per Document:** 0–10 (default: 3) — controls how many images are extracted and sent for OCR/vision analysis
- **Max Files to Combine:** 1–10 (default: 3) — caps the number of documents processed in combined mode

### 🎨 Appearance
- **Theme:** Light or Dark — applies instantly across the entire app

### 💾 Storage Location
- **AppData (default):** Stores data in your OS user directory
  - Windows: `%APPDATA%/Squailor/data`
  - macOS: `~/Library/Application Support/Squailor/data`
  - Linux: `~/.config/Squailor/data`
- **Application folder (portable):** Stores data in the same directory as the executable — ideal for USB drives

### ⬆️ Updates
- **Check for updates:** Manually trigger an update check
- **Auto-updates:** Windows installer supports automatic restart-and-install; other platforms can download new releases from GitHub

### 🔒 Privacy
- Squailor does **not collect telemetry** or send analytics
- Your documents stay on your machine
- Only minimal text/image excerpts are sent to your chosen AI provider for processing
- API keys are encrypted using AES-256-GCM with machine-specific keys

---

## 🔒 Storage & Data

### Where Squailor Stores Your Data

By default, Squailor uses your OS-specific application data folder. You can switch to portable mode in Settings → Storage.

**Default paths:**
- Windows: `%APPDATA%\Squailor\data`
- macOS: `~/Library/Application Support/Squailor/data`
- Linux: `~/.config/Squailor/data`

**Inside the `data/` folder:**
- `documents/` — per-document folders, each named with a short UUID:
  - `originals/` — copy of the original uploaded file
  - `summary.json` — generated summary, metadata, preview, and settings used
  - *(future)* `meta.json` and other versioned data
- `keystore.enc` — your encrypted OpenRouter API key
- `settings.json` — app settings (theme, model, image limits, storage location, etc.)

### Portable Mode

If you select "Application folder" in Settings → Storage:
- All data moves to a `data/` folder next to the Squailor executable
- Perfect for running from a USB drive or keeping everything self-contained

### Duplicate Detection

Squailor uses SHA-256 content hashing to detect duplicate documents:
- If you try to process the same file again, Squailor will find the existing summary
- You can choose to overwrite or create a new version

---

## 🛠️ Troubleshooting

### App won't start or crashes immediately
- **Check logs:** Packaged builds write startup logs to:
  - Windows: `%APPDATA%\Squailor\startup.log`
- Confirm Node.js 18+ is installed (if building from source)
- Try running in dev mode: `npm run dev`

### "No text found" or empty summaries
- **PDFs with images only:** Enable "Analyze images (OCR)" and select a vision-capable model (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro)
- **Scanned documents:** May require vision models to extract text from page thumbnails
- **Large files:** Try a smaller sample first to validate setup

### Images didn't affect the summary
- Ensure the selected model supports vision — check the model list in Settings → AI Models
- Non-vision models will automatically fall back to text-only processing
- Increase "Max Images per Document" if you want more images analyzed (higher cost)

### Rate limit or quota errors
- These errors come from OpenRouter / your model provider
- Try a cheaper/faster model (e.g., GPT-4o Mini, Gemini 1.5 Flash)
- Reduce "Max Images per Document" to lower token usage
- Split large documents into smaller chunks

### Update doesn't install (Windows)
- Check the startup log: `%APPDATA%\Squailor\startup.log`
- The installer may require administrator privileges
- Manually download the latest release and run the installer
- Check that no other Squailor processes are running (Task Manager)

### Exports look odd or formatting is broken
- Use **Markdown export** for best formatting (preserves headings, lists, emphasis)
- TXT export is plain text only

---

## ⚠️ Known Issues

- **Very large PDFs (50MB+)** may process slowly depending on the model and image settings — try smaller files or disable image analysis
- **macOS/Linux development:** Use `npm run start` (the `dev` script sets a Windows-specific environment variable)
- **Scanned PDFs:** May require a vision-capable model and "Analyze images" enabled for best results
- **Combined mode limit:** Capped at 3 files by default to keep prompts manageable and costs predictable (configurable in Settings → Image Settings)

---

## ❓ FAQ

**Q: Why does Squailor use OpenRouter instead of direct OpenAI/Anthropic/Google APIs?**  
A: OpenRouter provides a unified API for multiple providers, allowing you to switch models easily without managing separate API keys. It also offers competitive pricing and access to a wider range of models.

**Q: Do I need to pay for OpenRouter?**  
A: OpenRouter offers a free tier with limited credits. For regular use, you'll need to add credits to your account. Pricing depends on the model you choose.

**Q: Why is combined mode limited to 3 files?**  
A: To keep prompts concise, costs predictable, and summaries focused. You can increase the limit in Settings → Image Settings (max 10).

**Q: Does Squailor send all images in my document to the AI?**  
A: No. Squailor respects your "Max Images per Document" setting (default: 3). For PPTX/DOCX, it prioritizes embedded images. For PDFs, it extracts page thumbnails as needed.

**Q: Which models support vision/OCR?**  
A: Commonly: OpenAI GPT-4o/4o Mini, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro/Flash. If your selected model doesn't support vision, Squailor automatically falls back to text-only processing.

**Q: Can I run Squailor completely offline?**  
A: No. Squailor requires an internet connection to send requests to OpenRouter. Document parsing and storage are local, but AI summarization happens via API.

**Q: Is my data private?**  
A: Yes. Documents stay on your machine. Only the extracted text (and optionally, images) are sent to OpenRouter for AI processing. Squailor does not collect telemetry or store data in the cloud.

---

## 🗺️ Roadmap

**Near-term priorities:**
- Enhanced image selection (saliency detection for slides and charts)
- Improved PDF thumbnail rendering quality
- Additional export formats (DOCX, PDF)
- Per-project presets and custom prompts
- Unit and integration tests for parsers and encryption

**Long-term vision:**
- Workspace-level indexing and fuzzy search across all summaries
- Shared team workspaces with optional cloud sync
- Plugin system for custom parsers, exporters, and model providers
- On-device summarization for offline use (via local LLMs)

See [`documentation/SUGGESTIONS.md`](documentation/SUGGESTIONS.md) for a curated list of future enhancements and feature ideas.

---

## 🧑‍💻 Development

### Architecture Overview

- **Electron app:** Main process (`main.js`), renderer (`renderer.js`), preload bridge (`preload.js`)
- **Parser utilities:** `utils/pdfParser.js`, `utils/pptxParser.js`, `utils/docxParser.js`, `utils/pdfImages.js`
- **AI integration:** `utils/aiSummarizer.js` (OpenRouter client with streaming support)
- **Security:** `utils/encryption.js` (AES-256 for API key storage), `utils/fileHash.js` (SHA-256 for duplicate detection)
- **Storage:** Per-document folder structure under `data/documents/`, each with `summary.json` and original file
- **Auto-updates:** `electron-updater` configured to check GitHub Releases on startup (blocking flow for packaged builds)

### Key Files

- **`main.js`**: App lifecycle, IPC handlers, document processing orchestration, blocking auto-update flow, settings management
- **`renderer.js`**: UI logic, event wiring, progress streaming, history rendering, summary viewer, Q&A chat
- **`index.html`**: Main UI structure with multi-page workspace (Home, History, Summary View, Settings)
- **`styles.css`**: Dark/light theme styling with CSS variables
- **`splash.html`**: Splash screen with auto-update progress indicators

### Running in Development

```powershell
npm ci              # Clean install dependencies
npm run start       # Launch Electron app
npm run dev         # (Windows only) Launch with NODE_ENV=development
```

### Building for Distribution

```powershell
npm run build          # Build for your current platform
npm run build:win      # Windows (NSIS installer + portable ZIP)
npm run build:mac      # macOS (DMG + ZIP)
npm run build:linux    # Linux (AppImage + DEB)
```

See [`documentation/BUILD_INSTRUCTIONS.md`](documentation/BUILD_INSTRUCTIONS.md) for detailed build configuration and packaging notes.

### Documentation

Explore the `documentation/` folder for in-depth guides:
- `GETTING_STARTED.md` — Onboarding for new users
- `BUILD_INSTRUCTIONS.md` — Packaging and release workflow
- `STORAGE_ARCHITECTURE.md` — Per-document folder structure and migration
- `ENCRYPTION.md` — API key encryption implementation
- `PROGRESS_VISUAL_GUIDE.md` — How multi-stage progress works
- `POWERPOINT_PREVIEW_FIX.md` — PPTX rendering improvements
- `CHANGELOG.md` — Version history and release notes

---

## 🧩 Support

- **Found a bug?** [Open an issue](https://github.com/veroxsity/Squailor/issues)
- **Feature request?** [Open an issue](https://github.com/veroxsity/Squailor/issues) or see [`documentation/SUGGESTIONS.md`](documentation/SUGGESTIONS.md)
- **Documentation index:** [`documentation/DOCUMENTATION_INDEX.md`](documentation/DOCUMENTATION_INDEX.md)
- **Changelog:** [`documentation/CHANGELOG.md`](documentation/CHANGELOG.md)

---

## 📝 Changelog

See [`documentation/CHANGELOG.md`](documentation/CHANGELOG.md) for detailed version history and release notes.

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository** and create a feature branch
2. **Make your changes** with clear, descriptive commit messages
3. **Test locally** (run the app, try different file types and settings)
4. **Open a Pull Request** against `main` with a summary of your changes

Please review the [`documentation/`](documentation/) folder for architecture notes and style guidelines.

---

## 📄 License

ISC License — see [`LICENSE`](LICENSE) for details.
