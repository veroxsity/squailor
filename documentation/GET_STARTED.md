# 🎉 Welcome to Squailor!

Your AI-powered document summarizer is ready to use!

## What is Squailor?

Squailor is an Electron desktop application that uses artificial intelligence to summarize PDF and PowerPoint documents. It's perfect for:

- 📚 **Students**: Summarize lecture notes and reading materials
- 💼 **Professionals**: Create executive summaries of reports
- 🎓 **Researchers**: Quickly review academic papers
- 📊 **Anyone**: Who needs to process lots of documents efficiently

## Quick Links

- 🚀 **[QUICK_START.md](QUICK_START.md)** - Get up and running in 5 minutes
- 📖 **[README.md](README.md)** - Complete documentation
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical overview
- 💻 **[DEVELOPMENT.md](DEVELOPMENT.md)** - For developers
- 📋 **[CHANGELOG.md](CHANGELOG.md)** - Version history

## First Time? Start Here!

### 1️⃣ Get Your OpenAI API Key
Visit https://platform.openai.com/api-keys and create an API key

### 2️⃣ Launch the App
```bash
npm start
```

### 3️⃣ Configure
Enter your API key in the app and click "Save Key"

### 4️⃣ Summarize!
- Choose your files (PDF or PowerPoint)
- Select summary type (Normal or Short)
- Click "Generate Summaries"
- Review and save your summaries!

## Two Summary Modes

### 📝 Normal Mode
- Detailed, comprehensive summaries
- Great for learning and understanding
- Maintains important context and examples
- Perfect for studying

### ⚡ Short Mode  
- Quick bullet-point summaries
- Focuses on key takeaways only
- Great for quick reviews
- Perfect for busy professionals

## Features at a Glance

✅ Support for PDF and PowerPoint files  
✅ AI-powered intelligent summarization  
✅ Two summary modes (Normal & Short)  
✅ Batch processing (multiple files)  
✅ Save summaries as text files  
✅ Secure local API key storage  
✅ Modern, beautiful interface  
✅ Cross-platform (Windows, macOS, Linux)  

## Project Structure

```
Squailor/
├── 📄 main.js              # Main application
├── 🎨 index.html           # User interface
├── 💅 styles.css           # Styling
├── 🖱️ renderer.js          # UI logic
├── 🔒 preload.js           # Security layer
├── 📁 utils/               # Utility modules
│   ├── pptxParser.js       # PowerPoint parsing
│   └── aiSummarizer.js     # AI integration
└── 📚 Documentation files
```

## Commands

```bash
npm start              # Start the application
npm run dev            # Start with developer tools
npm run build          # Build for distribution
npm run build:win      # Build for Windows
npm run build:mac      # Build for macOS
npm run build:linux    # Build for Linux
```

## System Requirements

- **Node.js**: 14 or higher
- **Operating System**: Windows 10+, macOS 10.13+, or Linux
- **RAM**: 4GB minimum (8GB recommended)
- **Internet**: Required for AI processing
- **OpenAI Account**: For API access (pay-as-you-go)

## Cost Information

Using GPT-4o-mini is very affordable:
- Typical 10-page document: ~$0.01-0.02
- 100 documents per month: ~$1-2
- Pay only for what you use!

## Privacy & Security

- ✅ API keys stored locally only
- ✅ No data collection or tracking
- ✅ Documents processed securely
- ✅ Only text sent to OpenAI (not full files)
- ✅ Open source - verify yourself!

## Need Help?

### Common Issues

**"Invalid API key"**
- Ensure you copied the complete key (starts with `sk-`)
- Check your OpenAI account has credits
- Verify internet connection

**"No text found"**
- PDF might be scanned images (not searchable)
- PowerPoint might not contain text
- Try opening file in native app to verify content

**App won't start**
- Ensure Node.js is installed: `node --version`
- Reinstall dependencies: `npm install`
- Check for errors in console

### Getting Support

1. Check documentation files
2. Review QUICK_START.md for setup help
3. See DEVELOPMENT.md for technical issues
4. Create an issue with details if problem persists

## What's Next?

### For Users
1. Read [QUICK_START.md](QUICK_START.md) for detailed usage
2. Start summarizing your documents!
3. Share feedback or suggestions

### For Developers
1. Read [DEVELOPMENT.md](DEVELOPMENT.md) for contribution guide
2. Check [ARCHITECTURE.md](ARCHITECTURE.md) to understand the code
3. Submit pull requests with improvements!

## Tips for Best Results

✨ **Document Quality**: Better source = better summary  
✨ **Clear Text**: Ensure PDFs have selectable text  
✨ **Reasonable Length**: Very long documents take more time  
✨ **Right Mode**: Use Normal for learning, Short for quick reference  
✨ **Batch Processing**: Process similar documents together  

## Future Plans

- 📄 More document formats (DOCX, RTF, etc.)
- 🎨 Export to PDF and HTML
- 📊 Summary history and management
- 🌙 Dark mode
- 🌍 Multi-language support
- ⌨️ Keyboard shortcuts
- 📱 Mobile companion app

## Credits

Built with:
- **Electron** - Desktop framework
- **OpenAI** - AI summarization
- **pdf-parse-fork** - PDF parsing
- **JSZip & xml2js** - PowerPoint parsing

## License

ISC License - See LICENSE file for details

---

## Ready to Start?

### 🚀 Launch now:
```bash
npm start
```

### 📖 Read the quick start:
Open [QUICK_START.md](QUICK_START.md)

### 💬 Questions?
Check the documentation or create an issue!

---

**Made with ❤️ for better productivity and learning**

Enjoy using Squailor! 🎉
