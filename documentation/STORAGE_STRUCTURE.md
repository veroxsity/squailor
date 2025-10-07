# Storage Structure

## Overview

Squailor uses a folder-based storage system where each document and its summary are stored together in their own uniquely identified folder.

## Directory Structure

```
data/
├── documents/
│   ├── a1b2c3d4/                    # 8-char alphanumeric folder ID
│   │   ├── document.pdf             # Original document
│   │   └── summary.json             # Summary data
│   ├── e5f6g7h8/
│   │   ├── presentation.pptx
│   │   └── summary.json
│   └── ...
├── keystore.enc                     # Encrypted API key storage
└── settings.json                    # Application settings
```

## Folder Naming

Each document gets a unique 8-character alphanumeric folder ID (e.g., `a1b2c3d4`). This ensures:
- No naming conflicts
- Easy identification and management
- Clean URL-safe identifiers

## Summary.json Format

Each `summary.json` file contains:

```json
{
  "fileName": "document.pdf",
  "fileType": ".pdf",
  "summary": "The AI-generated summary text...",
  "originalLength": 15234,
  "summaryLength": 543,
  "summaryType": "normal",
  "timestamp": "2024-01-02T12:34:56.789Z",
  "model": "gpt-4o-mini",
  "preview": "First 500 characters of original content..."
}
```

## Benefits of This Structure

1. **Self-contained**: Each document folder contains everything related to that document
2. **Easy backup**: Copy the entire `data` folder
3. **Easy cleanup**: Delete a folder to remove a document and its summary
4. **Scalable**: Can handle thousands of documents efficiently
5. **Portable**: Move folders between different installations

## Migration

When upgrading from an older version that used a centralized `summaries.json` file:
1. The app automatically detects the old format on startup
2. Creates new folders for each existing summary
3. Migrates document files and summary data
4. Removes the old `summaries.json` file after successful migration

## Storage Location Options

Users can choose between:
- **AppData**: `%APPDATA%\squailor\data\`
- **Local App**: `<app-directory>\data\`

When changing locations, the app:
1. Creates the new location
2. Copies all document folders
3. Migrates settings and keystore
4. Deletes the old location
