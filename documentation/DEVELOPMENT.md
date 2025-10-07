# Development Guide - Squailor

## Setup Development Environment

### Prerequisites
- Node.js 14+ installed
- npm or yarn package manager
- Git (optional, for version control)
- Code editor (VS Code recommended)

### Initial Setup
```bash
# Clone or navigate to project directory
cd Squailor

# Install dependencies
npm install

# Start in development mode
npm run dev
```

## Development Commands

```bash
# Start application
npm start

# Start with DevTools open
npm run dev

# Build for distribution
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Project Architecture

### Main Process (main.js)
- Handles system-level operations
- Manages windows and dialogs
- Processes documents
- IPC communication with renderer

### Renderer Process (renderer.js)
- User interface logic
- Event handlers
- Results display
- LocalStorage management

### Preload Script (preload.js)
- Secure bridge between main and renderer
- Context isolation
- Exposes safe APIs only

## Adding New Features

### Adding New Document Format

1. Create parser in `utils/`:
```javascript
// utils/docxParser.js
async function parseDocument(filePath) {
  // Your parsing logic
  return extractedText;
}
module.exports = { parseDocument };
```

2. Update `main.js`:
```javascript
const { parseDocument } = require('./utils/docxParser');

// In process-documents handler:
else if (ext === '.docx') {
  text = await parseDocument(filePath);
}
```

3. Update file filter in `main.js`:
```javascript
filters: [
  { name: 'Documents', extensions: ['pdf', 'pptx', 'ppt', 'docx'] }
]
```

### Adding New Summary Type

1. Update `index.html` radio buttons:
```html
<label class="radio-label">
  <input type="radio" name="summaryType" value="academic">
  <span>🎓 Academic</span>
</label>
```

2. Update `utils/aiSummarizer.js`:
```javascript
if (summaryType === 'academic') {
  systemPrompt = 'You are an academic expert...';
  userPrompt = 'Create an academic summary...';
}
```

## Customization

### Changing AI Model

In `utils/aiSummarizer.js`:
```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4',  // Change to 'gpt-4', 'gpt-3.5-turbo', etc.
  // ...
});
```

### Adjusting Summary Length

In `utils/aiSummarizer.js`:
```javascript
max_tokens: summaryType === 'short' ? 1000 : 3000  // Adjust these values
```

### Changing Theme Colors

In `styles.css`:
```css
/* Main gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Change to your colors */
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
```

## Testing

### Manual Testing Checklist

- [ ] API key validation works
- [ ] File selection opens dialog
- [ ] PDF parsing extracts text
- [ ] PPTX parsing extracts text
- [ ] Normal summary generates correctly
- [ ] Short summary generates correctly
- [ ] Save summary works
- [ ] Multiple files process correctly
- [ ] Error handling displays properly
- [ ] App remembers API key after restart

### Testing with Sample Files

1. Create test PDF with text content
2. Create test PPTX with text slides
3. Test with large files (100+ pages)
4. Test with files containing no text
5. Test with corrupted files

## Debugging

### Enable DevTools

```bash
npm run dev
```

Or in `main.js`:
```javascript
mainWindow.webContents.openDevTools();
```

### Console Logging

Add debug logs:
```javascript
console.log('Processing file:', filePath);
console.log('Extracted text length:', text.length);
```

### Common Issues

**API Key Error**
- Check key format (starts with 'sk-')
- Verify OpenAI account status
- Check internet connection

**No Text Extracted**
- Verify file isn't image-based PDF
- Check file isn't corrupted
- Ensure file has actual content

**Memory Issues**
- Reduce maxChunkSize in aiSummarizer.js
- Process fewer files at once
- Increase Node.js memory: `node --max-old-space-size=4096`

## Performance Optimization

### For Large Documents

1. Adjust chunk size in `aiSummarizer.js`:
```javascript
const maxChunkSize = 8000; // Smaller chunks for faster processing
```

2. Add progress indicators
3. Implement streaming responses (advanced)

### For Batch Processing

1. Add queue system
2. Process files sequentially with progress
3. Implement cancellation

## Security Best Practices

- Never commit API keys
- Use environment variables for sensitive data
- Keep dependencies updated: `npm audit`
- Enable context isolation (already done)
- Validate all user inputs
- Sanitize file paths

## Building for Production

### Before Building

1. Update version in `package.json`
2. Test thoroughly
3. Update README and CHANGELOG
4. Add application icons to `assets/`
5. Review build configuration

### Build Process

```bash
# Build for current platform
npm run build

# Output will be in dist/ directory
```

### Distribution

1. Test the built application
2. Create installer/package
3. Sign code (Windows/macOS)
4. Distribute via website or store

## Contributing

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add comments for complex logic
- Follow existing patterns
- Keep functions small and focused

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add: your feature description"

# Push and create PR
git push origin feature/your-feature
```

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [pdf-parse-fork](https://www.npmjs.com/package/pdf-parse-fork)
- [JSZip](https://stuk.github.io/jszip/)

## Support

For questions or issues:
1. Check existing documentation
2. Search for similar issues
3. Create detailed bug report with:
   - OS version
   - Node version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors

---

Happy coding! 🚀
