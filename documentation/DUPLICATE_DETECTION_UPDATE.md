# Duplicate Document Detection Update

## Overview
Added intelligent duplicate document detection to prevent redundant processing and storage of the same documents.

## Features Implemented

### 1. File Hash Calculation
- Created `utils/fileHash.js` utility that calculates MD5 hash for uploaded files
- Hash is based on file content, not filename
- Allows detection of duplicate files even if they have different names

### 2. Duplicate Detection
- Before processing a document, the system calculates its hash
- Checks all existing documents in storage for matching hash
- If a duplicate is found, shows a dialog to the user

### 3. User Options Dialog
When a duplicate is detected, users are presented with three options:
- **Cancel**: Skip uploading this document entirely
- **Overwrite Existing**: Delete the old document and replace with new processing
- **Create New Copy**: Process and store as a separate document anyway

### 4. Hash Storage
- File hash is now stored in `summary.json` for each document
- Enables efficient duplicate checking without re-hashing existing files

## Technical Implementation

### New Files
- `utils/fileHash.js`: MD5 hash calculation utility

### Modified Files
- `main.js`:
  - Added `calculateFileHash` import
  - Created `findDuplicateDocument()` helper function
  - Modified `process-documents` IPC handler to:
    - Calculate hash before processing
    - Check for duplicates
    - Show dialog when duplicate found
    - Handle user's choice (cancel/overwrite/create new)
    - Store hash in summary.json

### Dialog Behavior
- Uses native Electron dialog (`dialog.showMessageBox`)
- Clearly identifies the existing document by name
- Provides three clear action buttons
- Default action is "Cancel" for safety

## User Experience

### Before
- Documents could be uploaded and processed multiple times
- Created multiple folders with same content
- Wasted storage and API calls
- No indication of duplicates

### After
- System detects duplicates immediately
- User is informed and given control
- Can choose to overwrite old summaries or keep both
- Prevents accidental duplicate processing
- Saves storage space and API costs

## Example Flow

1. User uploads "lecture.pdf"
2. System calculates hash: `a3d8f4e2...`
3. System checks existing documents
4. Finds existing document with same hash
5. Shows dialog: "A document with the same content already exists: 'lecture.pdf'"
6. User chooses action:
   - Cancel: File skipped, no processing
   - Overwrite: Old folder deleted, new processing starts
   - Create New: Both copies kept with different summaries

## Benefits
- **Cost Savings**: Prevents redundant AI API calls
- **Storage Efficiency**: Avoids storing duplicate files
- **User Control**: User decides how to handle duplicates
- **Smart Detection**: Based on content, not filename
- **Transparent**: Clear indication when duplicates are found
