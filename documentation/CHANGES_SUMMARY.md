# Changes Summary - Portable and Installable Build Support

## Problem
The application was only building as an installable app and didn't support portable mode properly. When running as a one-file executable, the app couldn't store data in a folder next to the executable, making true portability impossible.

## Solution

### 1. Updated Build Configuration (`package.json`)

**Added proper build targets:**
- **NSIS Installer**: Full-featured installer with user options
- **Portable Executable**: Single-file portable version with custom naming

**New build scripts:**
```bash
npm run build:win        # Build both versions
npm run build:portable   # Build portable only
npm run build:installer  # Build installer only
```

**NSIS Configuration:**
- `oneClick: false` - Users can choose installation directory
- `perMachine: false` - Per-user installation (no admin required)
- `allowToChangeInstallationDirectory: true` - Users have control
- Desktop and Start Menu shortcuts created automatically

**Portable Configuration:**
- Custom artifact naming: `Squailor-X.X.X-Portable.exe`
- Single-file executable
- Runs from any location

### 2. Fixed Portable Mode Detection (`main.js`)

**Key change:**
```javascript
const getExecutableDir = () => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  if (!app.isPackaged) {
    return app.getAppPath();
  }
  // Use directory containing the executable for portable mode
  return path.dirname(app.getPath('exe'));
};
```

**Why this matters:**
- `app.getAppPath()` returns the ASAR resources folder (read-only)
- `path.dirname(app.getPath('exe'))` returns the actual executable directory
- This allows the portable version to create a `data` folder next to the .exe

### 3. How Storage Works Now

**Portable Version (`Squailor-1.0.0-Portable.exe`):**
```
📁 Any Folder (USB, Desktop, etc.)
├── Squailor-1.0.0-Portable.exe
└── data/                          (Auto-created)
    ├── documents/
    ├── settings.json
    └── keystore.enc
```

**Installable Version (`Squailor Setup 1.0.0.exe`):**
```
📁 %APPDATA%\Squailor\
└── data/
    ├── documents/
    ├── settings.json
    └── keystore.enc
```

### 4. Storage Location Flexibility

Users can switch between storage modes:
- **AppData Mode**: Data in `%APPDATA%\Squailor\data`
- **Local App Mode**: Data next to the executable in `data` folder

**Auto-detection logic:**
1. Checks if `data` folder exists next to executable
2. Checks if `data` folder exists in AppData
3. Falls back to AppData if nothing exists
4. Automatically migrates data when switching locations

### 5. Documentation

Created two comprehensive documents:
- **BUILD_INSTRUCTIONS.md**: Detailed build and deployment guide
- **Updated README.md**: User-facing documentation

## Files Changed

1. **package.json**
   - Added NSIS and portable build targets
   - Added build scripts for selective building
   - Configured NSIS installer options
   - Set custom portable artifact naming

2. **main.js**
   - Fixed `getExecutableDir()` function for proper portable mode detection
   - Ensures data folder is created next to executable in portable mode

3. **README.md**
   - Added installation instructions for both versions
   - Documented portable vs installable differences
   - Added build instructions

4. **BUILD_INSTRUCTIONS.md** (NEW)
   - Comprehensive build guide
   - Testing instructions
   - Troubleshooting tips
   - Storage location details

## Testing the Builds

### Test Portable Version:
1. Copy `dist/Squailor-1.0.0-Portable.exe` to a new folder
2. Run it
3. Process a document
4. Verify `data` folder is created in the same directory
5. Close and reopen - verify data persists

### Test Installable Version:
1. Run `dist/Squailor Setup 1.0.0.exe`
2. Install to desired location
3. Launch app
4. Process a document
5. Verify data in `%APPDATA%\Squailor\data`

## Benefits

✅ **True Portability**: Portable version stores data locally  
✅ **User Choice**: Two installation options  
✅ **Data Migration**: Seamlessly switch storage locations  
✅ **Flexible Storage**: Works on USB drives, restricted folders  
✅ **Professional Installers**: NSIS with full uninstall support  
✅ **Single Command Build**: Both versions built together  

## Build Output

Running `npm run build:win` produces:
- `Squailor Setup 1.0.0.exe` (~112 MB) - Installer
- `Squailor-1.0.0-Portable.exe` (~112 MB) - Portable
- `.blockmap` files for updates

## Next Steps

1. Test both versions thoroughly
2. Consider code signing for production releases
3. Set up auto-update mechanism (optional)
4. Create release workflow for GitHub Actions
