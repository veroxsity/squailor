# Folder-Based Storage Update

## What Changed

The app now uses a **folder-based storage system** instead of storing files individually with a centralized summary index.

### Old Structure
```
data/
├── documents/
│   ├── 1234567890_document.pdf
│   ├── 1234567891_presentation.pptx
│   └── ...
├── summaries.json               # Centralized index
├── keystore.enc
└── settings.json
```

### New Structure
```
data/
├── documents/
│   ├── a1b2c3d4/                # Each document gets its own folder
│   │   ├── document.pdf         # Original document
│   │   └── summary.json         # Document's summary data
│   ├── e5f6g7h8/
│   │   ├── presentation.pptx
│   │   └── summary.json
│   └── ...
├── keystore.enc
└── settings.json
```

## Benefits

1. **Self-contained**: Each document and its metadata are stored together
2. **Better organization**: Clear folder structure with unique IDs
3. **Easier management**: Delete a folder to remove everything related to that document
4. **More scalable**: Better file system performance with organized folders
5. **Easier backup**: Just copy the data folder
6. **Portable**: Move individual documents between installations

## Folder IDs

Each document folder is assigned a unique **8-character alphanumeric ID** (e.g., `a1b2c3d4`). This ensures:
- No naming conflicts
- Clean, URL-safe identifiers
- Easy reference in code

## Summary.json Content

Each folder contains a `summary.json` file with all metadata:

```json
{
  "fileName": "document.pdf",
  "fileType": ".pdf",
  "summary": "The full AI-generated summary...",
  "originalLength": 15234,
  "summaryLength": 543,
  "summaryType": "normal",
  "timestamp": "2024-01-02T12:34:56.789Z",
  "model": "gpt-4o-mini",
  "preview": "First 500 characters..."
}
```

## Automatic Migration

The app automatically migrates old data when it starts:

1. **Detects** old `summaries.json` file
2. **Creates** new folders with unique IDs
3. **Moves** document files into their folders
4. **Creates** individual `summary.json` files
5. **Removes** old `summaries.json` after successful migration

No action needed from users! The migration happens transparently.

## Code Changes

### Main Changes

1. **main.js**:
   - Added `generateShortUUID()` for folder ID generation
   - Rewrote `loadSummaryHistory()` to read from folders
   - Added `saveSummaryToFolder()` to save individual summaries
   - Added `migrateOldStorage()` for automatic migration
   - Updated all IPC handlers to work with folder IDs

2. **renderer.js**:
   - Updated `addToHistory()` - now a no-op (summaries saved during processing)
   - Updated `deleteHistoryItem()` to delete folders
   - Updated `clearHistory()` to delete all folders
   - Updated `loadDocumentViewer()` to use folder IDs
   - Updated navigation to reload history from disk

3. **Document Processing**:
   - Each processed document creates a unique folder
   - Document and summary saved together
   - Folder ID returned for future reference

## Backwards Compatibility

✅ **Fully compatible** - Old data is automatically migrated on first run with the new version.

## Testing

To verify the migration:

1. Start the app
2. Check console for migration messages
3. Navigate to the History page
4. Verify all old summaries appear correctly
5. Check the `data/documents` folder to see the new structure

## Future Improvements

With this structure, we can now easily add:
- Thumbnail previews stored in the folder
- Multiple summary versions
- Custom metadata files
- Export/import of individual documents
- Easier sharing of summaries
