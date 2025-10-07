# Build Instructions for Squailor

## Building the Application

This project builds two versions of the application for Windows:

### 1. Installable Version (NSIS Installer)
- **File**: `Squailor Setup 1.0.0.exe`
- **Storage**: Stores data in `%APPDATA%\Squailor\data`
- **Installation**: User chooses installation directory
- **Uninstallation**: Full uninstaller included

### 2. Portable Version
- **File**: `Squailor-1.0.0-Portable.exe`
- **Storage**: Can store data in a `data` folder next to the executable
- **Installation**: No installation needed - run from any folder
- **Portability**: Can be placed on USB drives or any folder

## Build Commands

```bash
# Build both versions for Windows
npm run build:win

# Build for all platforms
npm run build

# Build for specific platforms
npm run build:mac
npm run build:linux
```

## How Storage Works

### Installable Version
When installed via the NSIS installer, the app defaults to storing data in:
```
%APPDATA%\Squailor\data\
├── documents\     (Processed documents)
├── settings.json  (User settings)
└── keystore.enc   (Encrypted API key)
```

Users can switch to "Local App" mode in settings to store data next to the installation.

### Portable Version
The portable version automatically detects and uses:
1. **Local Mode** (Preferred): Creates a `data` folder next to the executable:
   ```
   Squailor-1.0.0-Portable.exe
   data\
   ├── documents\
   ├── settings.json
   └── keystore.enc
   ```
   
2. **AppData Mode** (Fallback): If the folder next to the executable is read-only or not writable, falls back to AppData.

### Switching Storage Locations
Users can switch between storage modes in the app's Settings:
- **AppData**: `%APPDATA%\Squailor\data`
- **Local App**: `data` folder next to the executable

When switching, the app automatically migrates all documents and settings.

## Testing the Builds

### Testing Portable Mode
1. Copy `Squailor-1.0.0-Portable.exe` to a test folder
2. Run the executable
3. Process a document
4. Check that a `data` folder is created in the same directory
5. Close and reopen - data should persist

### Testing Installable Mode
1. Run `Squailor Setup 1.0.0.exe`
2. Choose installation directory
3. Launch the app
4. Process a document
5. Check `%APPDATA%\Squailor\data` for stored data

## Build Configuration

The build configuration in `package.json` includes:

- **NSIS Target**: Creates a user-friendly installer with options
- **Portable Target**: Creates a single-file portable executable
- **Architecture**: x64 only
- **Code Signing**: Configured (requires signing certificate)

## Troubleshooting

### Portable Mode Not Creating Data Folder
- Ensure the folder where the portable exe is located is writable
- Check folder permissions
- Try running from a different location (not Program Files)

### Data Not Migrating
- Check Settings > Storage Location
- Manually switch storage location to trigger migration
- Check console for error messages (enable DevTools in development)

## Development Notes

The app automatically detects whether it's running as portable by checking:
1. The executable's directory for an existing `data` folder
2. Write permissions to the executable's directory
3. Falls back to AppData if local storage is not viable

The detection logic is in `main.js`:
- `getExecutableDir()`: Gets the directory containing the executable
- `detectStorageLocation()`: Auto-detects the best storage location
- `loadSettings()`: Loads settings from the detected location
