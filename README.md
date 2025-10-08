# Squailor 📚

An AI-powered Electron app that summarizes PowerPoint presentations and PDF documents to help you learn more efficiently.

## Features

- 📄 **Multi-format Support**: Supports common document types

### Supported document types

- PDF (.pdf)
- PowerPoint (.pptx, .ppt)
- Word (.docx, .doc) — .docx is fully supported; .doc (binary) has limited support and may be less reliable. We recommend using .docx when possible.
- 🤖 **AI-Powered Summaries**: Uses OpenAI's GPT models for intelligent summarization
- 📝 **Two Summary Modes**:
  - **Normal Mode**: Detailed summaries that help you learn and understand content
  - **Short Mode**: Quick bullet-point summaries with key takeaways
- 💾 **Save Summaries**: Export summaries as text or markdown files
- 📦 **Batch Processing**: Process multiple documents at once
- 🔒 **Secure**: API keys stored locally with encryption
- 💼 **Two Build Options**:
  - **Installable**: Traditional installation with Start Menu shortcuts
  - **Portable**: Single executable that runs from any folder with data stored locally
- 🗂️ **Flexible Storage**: Choose between AppData storage or local folder storage
- 📜 **Summary History**: Access all previously generated summaries
- 🎨 **Modern UI**: Clean, intuitive interface with dark theme

## Installation

### For End Users

**Download Pre-built Releases:**

1. **Installable Version** (Recommended for permanent installation)
   - Download `Squailor Setup X.X.X.exe` 
   - Run the installer
   - Data stored in `%APPDATA%\Squailor`

2. **Portable Version** (No installation required)
   - Download `Squailor-X.X.X-Portable.exe`
   - Place in any folder (USB drive, desktop, etc.)
   - Run directly - creates a `data` folder next to the executable
   - Perfect for running from any location without installation

### For Developers

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Building from Source

Build both installable and portable versions:
```bash
npm run build:win          # Build both versions
npm run build:portable     # Build portable only
npm run build:installer    # Build installer only
```

See [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) for detailed build information.

## Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Launch the application:
   ```bash
   npm start
   ```
3. Enter your API key in the app and click "Save Key"

## Usage

1. **Enter your OpenAI API Key** in the setup section (only needed once)
2. **Choose Summary Type**:
   - Normal: For detailed, educational summaries
   - Short: For quick bullet-point summaries
3. **Select Files**: Click "Choose Files" and select your PDF or PowerPoint files
4. **Generate Summaries**: Click "Generate Summaries" and wait for processing
5. **Review Results**: View the summaries in the results section
6. **Save**: Click "Save Summary" to export any summary

## Development

Run in development mode with DevTools:
```bash
npm run dev
```

## Technologies Used

- **Electron**: Desktop app framework
- **OpenAI API**: GPT-4o-mini for AI summarization
- **pdf-parse**: PDF text extraction
- **JSZip & xml2js**: PowerPoint parsing
- Modern HTML/CSS/JavaScript

## Requirements

- Node.js 14 or higher
- OpenAI API key (requires active account)

## Notes

- The app uses GPT-4o-mini model which is cost-effective
- Large documents are automatically split into chunks for processing
- API keys are stored locally with encryption
- Internet connection required for AI processing
- **Portable Mode**: Data is stored next to the executable in a `data` folder
- **Installed Mode**: Data is stored in `%APPDATA%\Squailor` by default
- Storage location can be changed in Settings at any time
- Switching storage locations automatically migrates all data

## Privacy

- Your documents are processed locally and only text is sent to OpenAI
- API keys are stored locally on your machine
- No data is collected or shared with third parties

## License

ISC

## Support

For issues or questions, please create an issue in the repository.
