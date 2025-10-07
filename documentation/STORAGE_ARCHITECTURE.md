# Storage Architecture Diagram

## Portable Version - Storage Structure

```
📁 Any Folder (Desktop, USB Drive, etc.)
│
├── 📦 Squailor-1.0.0-Portable.exe    ← Single executable file
│
└── 📁 data/                           ← Auto-created on first run
    │
    ├── 📁 documents/                  ← Stores all processed documents
    │   │
    │   ├── 📁 abc12345/               ← Unique folder per document
    │   │   ├── 📄 MyPresentation.pptx ← Original file
    │   │   └── 📄 summary.json        ← Summary + metadata
    │   │
    │   ├── 📁 xyz67890/
    │   │   ├── 📄 Report.pdf
    │   │   └── 📄 summary.json
    │   │
    │   └── 📁 [more documents...]
    │
    ├── 📄 settings.json               ← User preferences
    │                                     {
    │                                       "storageLocation": "local-app",
    │                                       "theme": "dark",
    │                                       "aiModel": "gpt-4o-mini"
    │                                     }
    │
    └── 🔒 keystore.enc                ← Encrypted API key
```

## Installable Version - Storage Structure

```
📁 C:\Users\YourName\AppData\Roaming\Squailor\
│
└── 📁 data/
    │
    ├── 📁 documents/                  ← Same structure as portable
    │   ├── 📁 abc12345/
    │   ├── 📁 xyz67890/
    │   └── ...
    │
    ├── 📄 settings.json
    │       {
    │         "storageLocation": "appdata",
    │         "theme": "dark",
    │         "aiModel": "gpt-4o-mini"
    │       }
    │
    └── 🔒 keystore.enc
```

## Storage Location Detection Flow

```
┌─────────────────────────────────────────┐
│     App Starts                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Check: Does "data" folder exist        │
│  in executable directory?               │
└──────┬──────────────────┬───────────────┘
       │ YES              │ NO
       ▼                  ▼
┌──────────────┐   ┌──────────────────────┐
│ Use Local    │   │ Check: Does "data"   │
│ App Mode     │   │ exist in AppData?    │
└──────────────┘   └──────┬───────────────┘
                          │
                   ┌──────┴────────┐
                   │ YES           │ NO
                   ▼               ▼
            ┌──────────┐   ┌────────────────┐
            │ Use      │   │ Create in      │
            │ AppData  │   │ AppData        │
            │ Mode     │   │ (default)      │
            └──────────┘   └────────────────┘
```

## Storage Migration Flow

```
User Switches Storage Location in Settings
                   │
                   ▼
┌──────────────────────────────────────────┐
│  Determine Source and Target Locations   │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  1. Create target "data" folder          │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  2. Copy all documents/ folders          │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  3. Copy settings.json                   │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  4. Copy keystore.enc (API key)          │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  5. Delete old files                     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  6. Update settings with new location    │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  ✅ Migration Complete                   │
└──────────────────────────────────────────┘
```

## Document Storage Structure (Individual Document)

```
📁 documents/abc12345/
│
├── 📄 MyPresentation.pptx         ← Original file (preserved)
│
└── 📄 summary.json                ← Metadata + Summary
        {
          "fileName": "MyPresentation.pptx",
          "fileType": ".pptx",
          "fileHash": "sha256:...",        ← For duplicate detection
          "summary": "This presentation...",
          "originalLength": 15420,
          "summaryLength": 850,
          "summaryType": "normal",
          "responseTone": "casual",
          "timestamp": "2025-02-10T16:23:45.123Z",
          "model": "gpt-4o-mini",
          "preview": "First 500 chars..."
        }
```

## Comparison: Portable vs Installable

```
┌────────────────────────────────────────────────────────────────┐
│                   PORTABLE VERSION                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📦 Squailor-1.0.0-Portable.exe                               │
│  📁 data/                                                     │
│     ├── documents/                                            │
│     ├── settings.json                                         │
│     └── keystore.enc                                          │
│                                                                │
│  ✓ Self-contained                                             │
│  ✓ Can be moved anywhere                                      │
│  ✓ Perfect for USB drives                                     │
│  ✓ No installation                                            │
│  ✓ No registry entries                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                  INSTALLABLE VERSION                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📁 C:\Program Files\Squailor\                                │
│     └── [App Files]                                           │
│                                                                │
│  📁 C:\Users\Name\AppData\Roaming\Squailor\                   │
│     └── data/                                                 │
│         ├── documents/                                        │
│         ├── settings.json                                     │
│         └── keystore.enc                                      │
│                                                                │
│  📁 Start Menu\                                               │
│     └── Squailor.lnk                                          │
│                                                                │
│  📁 Desktop\                                                  │
│     └── Squailor.lnk                                          │
│                                                                │
│  ✓ Professional installation                                  │
│  ✓ Start Menu integration                                     │
│  ✓ Desktop shortcut                                           │
│  ✓ Uninstaller included                                       │
│  ✓ Follows Windows conventions                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Path Examples

### Portable - Executable Directory
```
E:\MyApps\Squailor-1.0.0-Portable.exe
E:\MyApps\data\documents\abc12345\...
```

### Portable - USB Drive
```
F:\PortableApps\Squailor-1.0.0-Portable.exe
F:\PortableApps\data\documents\abc12345\...
```

### Installable - AppData (Default)
```
C:\Program Files\Squailor\Squailor.exe
C:\Users\John\AppData\Roaming\Squailor\data\documents\abc12345\...
```

### Installable - Switched to Local
```
C:\Program Files\Squailor\Squailor.exe
C:\Program Files\Squailor\data\documents\abc12345\...
```

## Security Considerations

```
📄 settings.json         → Plain text (contains preferences)
🔒 keystore.enc          → Encrypted (contains API key)
📄 documents/*/summary.json → Plain text (contains summaries)
📦 documents/*/*.pptx    → Original format (user files)
```

**Encryption Details:**
- API keys encrypted using built-in encryption module
- Encryption keys derived from machine-specific identifiers
- Keys cannot be transferred between machines
- Re-enter API key if moving to new computer
