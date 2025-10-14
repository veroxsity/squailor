# Squailor

**AI-Powered Document Summarizer**

Squailor is a cross-platform Electron application that leverages OpenRouter-compatible AI (e.g., GPT-4o mini) to extract, summarize, and analyze content from PDF, PowerPoint, and Word documents. It offers real-time progress, multi-file aggregation, and even vision-assisted OCR for images embedded in slides or documents.

---

## Key Features

- **Single-File Summaries**: Select any PDF, DOCX, or PPTX and generate detailed notes or teaching-style explanations.
- **Aggregate Summaries**: Combine up to 3 documents into a cohesive, cross-source summary that resolves contradictions and attributes unique points.
- **AI Streaming Feedback**: View live progress—token-level updates and chunk progress—as the AI constructs the summary.
- **Image Recognition & OCR**: Automatically extract images from slides, Word files, or PDF pages (thumbnails) and transcribe visible text verbatim before summarization.
- **Duplicate Detection**: Prevent redundant processing by detecting identical documents via content hashing.
- **Secure Settings & API Key Storage**: Encrypt and store your OpenRouter API key locally.
- **Granular Progress Reporting**: Track stages such as duplicate check, extraction, combining, summarizing, and saving in the UI.
- **Cross-Platform Packaging**: Windows, macOS, and Linux builds via Electron Builder.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/veroxsity/Squailor.git
   cd Squailor
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```
4. Build distributables:
   ```bash
   npm run build       # default platform
   npm run build:win   # Windows
   npm run build:mac   # macOS
   npm run build:linux # Linux
   ```

> **Note:** For PDF image thumbnails, install [canvas](https://www.npmjs.com/package/canvas):
> ```bash
> npm install canvas
> ```

---

## Usage

1. **Select File(s)**: Click **Choose Files** and pick PDF/DOCX/PPTX documents.
2. **Toggle Aggregate Mode**: Enable **Combine into one summary** (max 3 files).
3. **Configure Options**:
   - Summary Type: `short`, `normal`, or `longer`
   - Style: `teaching` or `notes`
   - Tone: `casual`, `formal`, `informative`, or `easy`
   - Model: e.g., `openai/gpt-4o-mini` (vision-enabled)
4. **Start**: Click **Summarize** and watch the progress cards update in real time.
5. **View & Export**: Read the generated summary in the built-in viewer or save as `.txt`/`.md`.

---

## Settings & API Key

- Open **Settings** to change theme, storage location, or AI model.
- Save your OpenRouter API key securely; Squailor validates and encrypts it.

---

## Storage & History

- Summaries are saved under `%APPDATA%/Squailor/data/documents` on Windows (or `~/Library/Application Support/Squailor` on macOS).
- View past summaries in the **History** panel; delete or export them at any time.

---

## Troubleshooting

- **No Text Extracted**: Ensure documents contain selectable text or images; OCR only applies to slides and thumbnails.
- **Images Not OCR’d**: Confirm you have a vision-capable model (e.g., `4o mini`) and installed `canvas` for PDFs.
- **Rate Limits / Quota**: Monitor your OpenRouter/OpenAI usage; switch to a faster model or reduce document size.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Commit your changes with clear messages.
3. Open a Pull Request against `main`.

---

## License

Licensed under the ISC License. See [LICENSE](LICENSE) for details.
