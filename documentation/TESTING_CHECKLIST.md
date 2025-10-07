# Testing Checklist for Squailor Builds

## Pre-Testing Setup
- [ ] Build both versions: `npm run build:win`
- [ ] Verify files exist in `dist` folder:
  - [ ] `Squailor Setup 1.0.0.exe` (~112 MB)
  - [ ] `Squailor-1.0.0-Portable.exe` (~112 MB)

## Test 1: Portable Version - Fresh Install

### Setup
1. [ ] Create a new test folder (e.g., `C:\Test\Squailor-Portable`)
2. [ ] Copy `Squailor-1.0.0-Portable.exe` to the test folder
3. [ ] Ensure folder is writable

### Test Steps
1. [ ] Run `Squailor-1.0.0-Portable.exe`
2. [ ] App launches successfully
3. [ ] Enter OpenAI API key
4. [ ] Process a test document
5. [ ] Verify `data` folder is created in the same directory
6. [ ] Verify folder structure:
   ```
   Squailor-1.0.0-Portable.exe
   data/
   ├── documents/
   │   └── [document-id]/
   ├── settings.json
   └── keystore.enc
   ```
7. [ ] Close the app
8. [ ] Reopen the app
9. [ ] Verify history shows the processed document
10. [ ] Verify API key is still saved

### Expected Results
- ✅ `data` folder created in executable's directory
- ✅ Documents stored locally
- ✅ Settings persist between sessions
- ✅ API key remains saved

## Test 2: Portable Version - USB Drive Simulation

### Setup
1. [ ] Create a new folder simulating USB drive (e.g., `D:\Portable-Apps`)
2. [ ] Copy the entire folder from Test 1 (with data)

### Test Steps
1. [ ] Run from new location
2. [ ] Verify data is accessible
3. [ ] Process another document
4. [ ] Verify new document appears in history

### Expected Results
- ✅ App works from any location
- ✅ Data moves with executable

## Test 3: Installable Version - Standard Installation

### Setup
1. [ ] Ensure no previous installation exists
2. [ ] Delete `%APPDATA%\Squailor` if it exists

### Test Steps
1. [ ] Run `Squailor Setup 1.0.0.exe`
2. [ ] Choose installation directory
3. [ ] Complete installation
4. [ ] Verify Start Menu shortcut created
5. [ ] Verify Desktop shortcut created (if selected)
6. [ ] Launch app from shortcut
7. [ ] Enter API key
8. [ ] Process a test document
9. [ ] Verify data in `%APPDATA%\Squailor\data`
10. [ ] Close app
11. [ ] Reopen from shortcut
12. [ ] Verify data persists

### Expected Results
- ✅ Installation completes successfully
- ✅ Shortcuts created
- ✅ Data stored in AppData
- ✅ App accessible from Start Menu

## Test 4: Storage Location Switching

### Using Portable Version
1. [ ] Launch portable version (with existing data)
2. [ ] Open Settings tab
3. [ ] Note current storage location (should be "Local App")
4. [ ] Switch to "AppData" mode
5. [ ] Verify data migrates to `%APPDATA%\Squailor\data`
6. [ ] Verify history still shows documents
7. [ ] Process a new document
8. [ ] Switch back to "Local App" mode
9. [ ] Verify all data (including new document) migrates back

### Expected Results
- ✅ Data migrates successfully in both directions
- ✅ No data loss during migration
- ✅ App continues to function normally

## Test 5: Duplicate Detection

### Test Steps
1. [ ] Process a document
2. [ ] Try to process the same document again
3. [ ] Verify duplicate dialog appears
4. [ ] Test "Cancel" option
5. [ ] Try again, test "Overwrite Existing" option
6. [ ] Try again, test "Create New Copy" option

### Expected Results
- ✅ Duplicate detection works
- ✅ All three options function correctly

## Test 6: Uninstallation (Installable Version)

### Test Steps
1. [ ] Open Control Panel > Programs and Features
2. [ ] Find "Squailor" in the list
3. [ ] Uninstall
4. [ ] Verify app is removed from Program Files
5. [ ] Verify shortcuts are removed
6. [ ] Check if `%APPDATA%\Squailor` still exists (should exist - user data)

### Expected Results
- ✅ Clean uninstallation
- ✅ User data preserved in AppData

## Test 7: Edge Cases

### Portable in Read-Only Location
1. [ ] Copy portable exe to a read-only folder
2. [ ] Run the app
3. [ ] Verify it falls back to AppData mode
4. [ ] Settings should show "AppData" as storage location

### Portable Without Permissions
1. [ ] Copy to a restricted location (e.g., Program Files)
2. [ ] Run without admin rights
3. [ ] Verify fallback behavior

### Expected Results
- ✅ App handles permissions gracefully
- ✅ Automatic fallback to AppData when needed
- ✅ No crashes or errors

## Test 8: Data Integrity

### Test Steps
1. [ ] Process multiple documents (5-10)
2. [ ] Close app
3. [ ] Manually inspect `data/documents/` folder
4. [ ] Verify each document has:
   - [ ] Original file
   - [ ] summary.json
5. [ ] Verify summary.json contains:
   - [ ] fileName
   - [ ] fileHash
   - [ ] summary
   - [ ] timestamp
   - [ ] etc.

### Expected Results
- ✅ All data properly structured
- ✅ No corruption
- ✅ Files can be opened manually

## Success Criteria

All tests should pass with:
- ✅ No crashes or errors
- ✅ Data persistence across sessions
- ✅ Proper storage location detection
- ✅ Successful data migration
- ✅ Clean installation/uninstallation
- ✅ Portable version truly portable

## Common Issues and Solutions

### Issue: Portable version creates data in AppData instead of local folder
**Solution**: Check folder write permissions, run from a user-writable location

### Issue: Migration fails
**Solution**: Check target folder permissions, ensure no files are locked

### Issue: API key not persisting
**Solution**: Verify keystore.enc is being created, check encryption module

### Issue: Duplicate detection not working
**Solution**: Verify file hash calculation, check fileHash field in summary.json

## Post-Testing

- [ ] Clean up test folders
- [ ] Document any issues found
- [ ] Update CHANGELOG.md with test results
- [ ] Ready for release!
