# Squailor Project Structure

```
Squailor/
├── main.js                 # Main Electron process
├── preload.js             # Preload script for secure IPC
├── index.html             # Main UI markup
├── styles.css             # Application styling
├── renderer.js            # Renderer process logic
├── package.json           # Project dependencies
├── README.md              # Full documentation
├── QUICK_START.md         # Quick start guide
├── .gitignore            # Git ignore rules
│
├── utils/                 # Utility modules
│   ├── pptxParser.js     # PowerPoint parsing logic
│   └── aiSummarizer.js   # OpenAI integration
│
└── node_modules/         # Dependencies (auto-generated)
```

## File Descriptions

### Core Files

**main.js**
- Electron main process
- Handles file dialogs, IPC communication
- Manages document processing pipeline

**preload.js**
- Secure bridge between main and renderer
- Exposes safe APIs to the frontend

**index.html**
- Main application interface
- Form for API key and file selection
- Results display area

**styles.css**
- Modern, gradient-based design
- Responsive layout
- Smooth animations and transitions

**renderer.js**
- Frontend logic
- Handles user interactions
- Manages local storage for API key
- Displays results dynamically

### Utils Directory

**pptxParser.js**
- Extracts text from PowerPoint files
- Handles PPTX ZIP structure
- Parses XML content from slides
- Supports both .ppt and .pptx formats

**aiSummarizer.js**
- Integrates with OpenAI API
- Handles two summary modes (normal/short)
- Splits large documents into chunks
- Combines multi-chunk summaries

## Technology Stack

- **Electron 38**: Desktop app framework
- **OpenAI SDK 6**: AI API integration  
- **pdf-parse-fork**: PDF text extraction
- **JSZip**: PowerPoint file handling
- **xml2js**: XML parsing for PPTX
- Vanilla JavaScript (no framework needed!)

## Architecture

```
User Interface (Renderer Process)
        ↓
IPC Communication (Secure)
        ↓
Main Process
        ↓
File Processing → Text Extraction → AI Summarization
        ↓
Return Results
```

## Security Features

- Context isolation enabled
- No remote content loading
- API keys stored in localStorage (local only)
- Secure IPC channels
- No eval() or unsafe code execution
