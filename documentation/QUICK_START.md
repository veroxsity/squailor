# Quick Start Guide - Squailor 🚀

## First Time Setup (5 minutes)

### 1. Get Your OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-...`)
5. **Important**: Save this key somewhere safe - you can only see it once!

### 2. Launch the App

Open your terminal in this directory and run:
```bash
npm start
```

### 3. Configure the App

When the app opens:
1. Paste your API key in the "OpenAI API Key" field
2. Click "Save Key"
3. Wait for the green checkmark ✓

## Using Squailor

### Option 1: Detailed Summary (Normal Mode)
Perfect for studying and learning:
- Select "📝 Normal (Detailed)" mode
- Provides comprehensive summaries with explanations
- Maintains important details and examples
- Better for understanding complex topics

### Option 2: Quick Summary (Short Mode)  
Perfect for quick reviews:
- Select "⚡ Short (Bullet Points)" mode
- Provides concise bullet-point summaries
- Focuses only on key takeaways
- Better for quick reference

### Processing Documents

1. Click "📁 Choose Files"
2. Select one or more PDF or PowerPoint files
3. Click "🚀 Generate Summaries"
4. Wait for processing (larger files take longer)
5. Review your summaries!

### Saving Summaries

- Click "💾 Save Summary" on any result
- Choose where to save (as .txt or .md file)
- Your summary is saved for later reference

## Supported File Types

- ✅ PDF files (.pdf)
- ✅ PowerPoint presentations (.pptx, .ppt)

## Tips & Tricks

- **Batch Processing**: Select multiple files at once for efficiency
- **Cost Effective**: The app uses GPT-4o-mini which is very affordable
- **Privacy**: Your API key is stored locally only on your computer
- **Large Documents**: Files are automatically split into chunks if needed

## Troubleshooting

### "Invalid API key" error
- Make sure you copied the entire key (starts with `sk-`)
- Check that your OpenAI account has credits
- Verify the key hasn't been revoked

### No text extracted from document
- PDF might be scanned images (not searchable text)
- PowerPoint might not contain text content
- Try opening the file in its native application to verify content

### Processing takes too long
- Large documents need more time
- First request can be slower (warming up)
- Check your internet connection

## Example Workflow

### For Students:
1. Upload lecture slides (PPTX) or reading materials (PDF)
2. Use "Normal" mode for detailed study summaries
3. Before exams, reprocess with "Short" mode for quick review

### For Professionals:
1. Upload reports or presentations
2. Use "Short" mode for executive summaries
3. Use "Normal" mode when you need full context

## Cost Information

Using GPT-4o-mini costs approximately:
- $0.15 per 1M input tokens
- $0.60 per 1M output tokens

Typical document (10 pages):
- Normal summary: ~$0.01-0.02
- Short summary: ~$0.005-0.01

Very affordable for regular use! 💰

## Need Help?

- Check the main README.md for technical details
- Create an issue in the repository
- Make sure you have the latest version

---

**Made with ❤️ for better learning and productivity**
