# Quick Reference - Building Squailor

## Build Commands

```bash
# Build both portable and installer for Windows
npm run build:win

# Build only portable version
npm run build:portable

# Build only installer version  
npm run build:installer

# Build for all platforms
npm run build
```

## Output Files

After building, find your executables in the `dist` folder:

| File | Type | Purpose |
|------|------|---------|
| `Squailor Setup 1.0.0.exe` | Installer | Traditional installation with uninstaller |
| `Squailor-1.0.0-Portable.exe` | Portable | Single-file, run from anywhere |

## Key Differences

### Installable Version
- ✅ Traditional installation process
- ✅ Start Menu and Desktop shortcuts
- ✅ Full uninstaller included
- ✅ Data in `%APPDATA%\Squailor` by default
- ✅ Per-user installation (no admin needed)

### Portable Version  
- ✅ No installation required
- ✅ Run from any folder
- ✅ Data stored in `data` folder next to .exe
- ✅ Perfect for USB drives
- ✅ No registry entries
- ✅ Can be moved/copied freely

## How Data Storage Works

### Portable: Local Storage
```
📁 Your-Folder/
├── Squailor-1.0.0-Portable.exe
└── data/                    ← Created automatically
    ├── documents/
    ├── settings.json
    └── keystore.enc
```

### Installed: AppData Storage
```
📁 C:\Users\YourName\AppData\Roaming\Squailor\
└── data/
    ├── documents/
    ├── settings.json
    └── keystore.enc
```

## Switching Storage Locations

Users can switch between storage modes in **Settings** at any time:
1. Open app → Settings tab
2. Select desired storage location:
   - **AppData**: Standard Windows location
   - **Local App**: Next to executable
3. Click "Switch Storage Location"
4. Data automatically migrates

## Development

```bash
# Run in development mode
npm start

# Run with DevTools open
npm run dev
```

## Distribution

For end users:
1. Share the appropriate .exe file
2. For portable: Recommend placing in a dedicated folder
3. For installer: Users run and follow installation wizard

## Troubleshooting

**Portable version not creating data folder:**
- Ensure folder has write permissions
- Try different location (not Program Files)
- Check if antivirus is blocking

**Can't switch storage locations:**
- Check folder permissions
- Ensure target location is writable
- Try running as administrator (one time only)

**Data not migrating:**
- Manually copy `data` folder from old to new location
- Check Settings tab for current location
