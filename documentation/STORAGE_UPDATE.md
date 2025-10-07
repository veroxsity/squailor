# Storage Location Update

## Changes Made

### 1. Auto-Detection of Storage Location on Startup
- **New Function**: `detectStorageLocation()` in `main.js`
- The app now automatically detects where data is stored by checking:
  1. Local app directory first (`./data`)
  2. AppData directory second (`%AppData%/Squailor/data`)
  3. Defaults to AppData if neither exists
- This ensures the app always finds your data no matter where it's stored

### 2. Removed Custom Folder Selection
- Removed the "Custom Location" option from settings
- Only two storage options remain:
  - **AppData (Default)**: Standard Windows application data folder
  - **App Folder**: Portable, stores data with the application
- Simplified the UI by removing custom folder picker button
- Removed `chooseCustomFolder` IPC handler from main.js and preload.js

### 3. Improved Storage Location Migration
- **Complete File Migration**: When changing storage locations:
  - All documents are copied to new location
  - Settings file is copied
  - Encrypted keystore is copied
  - Old files are deleted after successful copy
  - Old directories are cleaned up (removed if empty)
- **Enhanced Error Handling**: Better logging and error recovery during migration
- **User Feedback**: Updated success message to confirm cleanup

### 4. Updated Files

#### main.js
- Added `detectStorageLocation()` function
- Modified `loadSettings()` to use auto-detection
- Updated `changeStorageLocation()` to:
  - Remove custom path parameter
  - Delete old files after copying
  - Clean up old directories
  - Only support 'appdata' and 'local-app' options

#### renderer.js
- Removed custom folder related variables and event handlers
- Simplified `loadStorageSettings()` function
- Updated `saveStorageLocation` event handler to remove custom path logic
- Removed storage location radio change handlers for custom folder

#### preload.js
- Removed `chooseCustomFolder` IPC bridge
- Updated `changeStorageLocation` to take only one parameter

#### index.html
- Removed "Custom Location" radio button and UI
- Removed "Choose Folder" button
- Updated info box to reflect only two storage options
- Improved warning message about automatic migration

## Benefits

1. **Automatic Data Discovery**: No more lost data - app finds it wherever it is
2. **Simpler UI**: Two clear options instead of three
3. **Clean Migration**: Old locations are properly cleaned up
4. **Better UX**: Clear feedback during migration process
5. **Portable Support**: Local folder option still available for portable installations

## How It Works

### On App Startup
```
1. Check if ./data/documents exists → Use Local App storage
2. Else check if AppData/Squailor/data/documents exists → Use AppData storage
3. Else default to AppData storage (first run)
```

### When Changing Storage Location
```
1. Create new data directory structure
2. Copy all documents to new location
3. Copy settings.json to new location
4. Copy keystore.enc to new location
5. Delete all files from old location
6. Remove old directories
7. Update settings with new location
```

## Migration Path

For existing installations:
- Data in AppData: No change needed
- Data in local folder: Will be auto-detected on startup
- Custom folder users: Data will need to be manually moved to either AppData or App folder

## Notes

- The encrypted keystore remains secure during migration
- Settings are preserved during migration
- Document history is maintained
- No data loss during properly completed migrations
