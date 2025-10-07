# Getting Started with Squailor

## Which Version Should I Download?

### 🎒 Portable Version (Recommended for most users)
**File:** `Squailor-1.0.0-Portable.exe`

**Choose this if you:**
- ✅ Want to run without installation
- ✅ Use multiple computers
- ✅ Want to run from a USB drive
- ✅ Don't want to clutter your system
- ✅ Need to place the app in a specific folder

**How it works:**
- Download the .exe file
- Place it in any folder you like
- Run it directly - no installation needed
- A `data` folder will be created next to the .exe
- All your documents and settings stay in that folder

### 💻 Installer Version (Traditional Windows App)
**File:** `Squailor Setup 1.0.0.exe`

**Choose this if you:**
- ✅ Want a traditional Windows installation
- ✅ Want Start Menu and Desktop shortcuts
- ✅ Prefer standard Windows app experience
- ✅ Want uninstaller in Control Panel

**How it works:**
- Download and run the installer
- Choose installation location
- App installs like any Windows program
- Data stored in your AppData folder
- Shortcuts added to Start Menu

## Installation Steps

### For Portable Version:
1. Download `Squailor-1.0.0-Portable.exe`
2. Create a folder for it (e.g., `C:\MyApps\Squailor` or on USB drive)
3. Move the .exe into that folder
4. Double-click to run
5. That's it! ✨

**Folder structure after first run:**
```
Your-Folder/
├── Squailor-1.0.0-Portable.exe  ← The app
└── data/                         ← Created automatically
    ├── documents/                ← Your processed docs
    ├── settings.json            ← Your preferences
    └── keystore.enc             ← Your API key (encrypted)
```

### For Installer Version:
1. Download `Squailor Setup 1.0.0.exe`
2. Double-click to run the installer
3. Choose installation directory (or use default)
4. Click through the installation wizard
5. Launch from Start Menu or Desktop shortcut

## First-Time Setup

1. **Get an OpenAI API Key**
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Sign in or create account
   - Create a new API key
   - Copy the key (it starts with `sk-`)

2. **Enter Your API Key in Squailor**
   - When you first open Squailor, you'll see the setup screen
   - Paste your API key
   - Click "Save Key"
   - ✅ Your key is encrypted and stored securely

3. **Choose Summary Settings** (Optional)
   - Summary Type: Normal (detailed) or Short (quick bullets)
   - Response Tone: Casual or Professional
   - You can change these anytime

## Using Squailor

### Process Your First Document

1. **Choose Files**
   - Click "Choose Files" button
   - Select PDF or PowerPoint files
   - You can select multiple files at once

2. **Configure Summary**
   - Choose "Normal" for detailed summaries
   - Or "Short" for quick bullet points
   - Select tone: Casual (friendly) or Professional (formal)

3. **Generate**
   - Click "Generate Summaries"
   - Wait while AI processes (may take 30-60 seconds per document)
   - Progress shown on screen

4. **View Results**
   - Summaries appear in the results section
   - Click "View Full Text" to see original content
   - Click "Save Summary" to export as .txt or .md file

### View History

- Click "History" tab to see all processed documents
- Search by filename
- View previous summaries
- Delete old summaries if needed

### Adjust Settings

- Click "Settings" tab
- Change storage location (AppData vs Local folder)
- Update API key
- View storage usage statistics

## Tips & Tricks

### 💡 Portable Version Tips
- **USB Drive**: Perfect for carrying between computers
- **Backup**: Just copy the entire folder (app + data folder)
- **Move Anywhere**: Move the folder anywhere, data moves with it
- **Multiple Installs**: Run from different folders with separate data

### 💡 General Tips
- **Batch Processing**: Select multiple files to process at once
- **Large Files**: Very large documents may take longer to process
- **API Costs**: Each summary costs a few cents with GPT-4o-mini
- **Privacy**: Documents processed locally, only text sent to OpenAI

## Storage Locations

### Portable Version Default:
```
📁 [Where you placed the .exe]/data/
```

### Installed Version Default:
```
📁 C:\Users\[YourName]\AppData\Roaming\Squailor\data/
```

### Can I Switch?
Yes! Go to Settings → Storage Location → Choose new location
Your data will automatically migrate to the new location.

## Troubleshooting

### Problem: Portable version doesn't create data folder
**Solution:** 
- Make sure the folder is writable (not in Program Files)
- Run from a location where you have permissions
- Try a different folder (like Desktop or Documents)

### Problem: API key errors
**Solution:**
- Verify your API key is correct (starts with `sk-`)
- Check you have credits in your OpenAI account
- Try re-entering the key

### Problem: Can't process documents
**Solution:**
- Ensure you have internet connection
- Check file is valid PDF or PPTX
- Try a different document
- Verify API key is saved

### Problem: App won't start
**Solution:**
- For portable: Check folder permissions
- For installed: Try running as administrator once
- Check Windows Defender isn't blocking it

## Uninstalling

### Portable Version:
1. Close the app
2. Delete the folder containing the .exe
3. That's it! No registry entries or system files

### Installed Version:
1. Open Control Panel → Programs and Features
2. Find "Squailor" in the list
3. Click Uninstall
4. Follow the wizard

**Note:** Your data in AppData is preserved after uninstall. Manually delete `%APPDATA%\Squailor` if you want to remove all data.

## Need More Help?

- **Full Documentation**: See `DOCUMENTATION_INDEX.md`
- **Build from Source**: See `BUILD_INSTRUCTIONS.md`
- **Technical Details**: See `STORAGE_ARCHITECTURE.md`

## Privacy & Security

✅ **Your data stays local** - Documents stored on your computer only  
✅ **API keys encrypted** - Stored with strong encryption  
✅ **Only text sent to OpenAI** - Not the entire document files  
✅ **No tracking** - No analytics or data collection  
✅ **Open Source** - Inspect the code yourself  

## System Requirements

- **OS**: Windows 10 or later (64-bit)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk**: 200 MB for app + space for your documents
- **Internet**: Required for AI processing
- **OpenAI Account**: Required (with API credits)

## What's Next?

Now that you're set up:
1. ✅ Process your first document
2. ✅ Explore the History tab
3. ✅ Try different summary types
4. ✅ Customize settings to your preference

Enjoy using Squailor! 🎉
