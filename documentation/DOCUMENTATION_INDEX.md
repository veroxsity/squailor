# Squailor Documentation Index

Welcome to Squailor's documentation! This index will help you find the information you need.

## 📖 For End Users

### Getting Started
- **[README.md](README.md)** - Start here! Overview, features, and basic usage instructions
- **Installation Options**:
  - Download portable version for USB drives/no-install
  - Download installer for traditional Windows installation

### Using the App
- **[README.md - Usage Section](README.md#usage)** - How to use Squailor
- **Features**:
  - Process PDF and PowerPoint files
  - Generate AI-powered summaries
  - Save and export summaries
  - Manage summary history

## 🛠️ For Developers

### Building from Source
- **[BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)** - Complete build guide
  - Build commands
  - Platform-specific instructions
  - Output file locations
  - Storage architecture details

- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick command reference
  - Build commands at a glance
  - Key differences between versions
  - Common troubleshooting

### Technical Documentation
- **[CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)** - Technical implementation details
  - What was changed and why
  - Code modifications
  - Build configuration
  - Storage detection logic

- **[STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md)** - Storage system deep dive
  - Visual diagrams
  - Storage location detection flow
  - Migration process
  - Security considerations
  - File structure examples

- **[UI_UX_UPDATE_CHECKLIST.md](UI_UX_UPDATE_CHECKLIST.md)** - Comprehensive UI/UX refresh checklist
  - Phased approach (audit → design system → flows → accessibility → rollout)
  - Accessibility and platform conventions
  - Theming, components, performance, testing, and release

### Testing
- **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** - Comprehensive testing guide
  - Pre-testing setup
  - Test scenarios
  - Expected results
  - Edge cases
  - Common issues

## 📝 Project Documentation

### Change History
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
  - Feature additions
  - Bug fixes
  - Breaking changes

## 🎯 Quick Navigation by Task

### "I want to build the app"
1. Read: [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)
2. Quick ref: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
3. Run: `npm run build:win`

### "I want to understand how storage works"
1. Visual guide: [STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md)
2. Details: [BUILD_INSTRUCTIONS.md - Storage Section](BUILD_INSTRUCTIONS.md#how-storage-works)

### "I want to test the builds"
1. Follow: [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
2. Troubleshooting: [QUICK_REFERENCE.md - Troubleshooting Section](QUICK_REFERENCE.md#troubleshooting)

### "I want to know what changed"
1. Technical: [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)
2. User-facing: [CHANGELOG.md](CHANGELOG.md)

### "I want to use the app"
1. Start: [README.md](README.md)
2. Setup: [README.md - Setup Section](README.md#setup)
3. Usage: [README.md - Usage Section](README.md#usage)

## 📂 File Structure Overview

```
Squailor/
│
├── 📄 README.md                    ← Start here
├── 📄 CHANGELOG.md                 ← Version history
│
├── 🔧 BUILD_INSTRUCTIONS.md        ← How to build
├── 🔧 QUICK_REFERENCE.md           ← Quick commands
├── 🔧 CHANGES_SUMMARY.md           ← What changed
├── 🔧 STORAGE_ARCHITECTURE.md      ← Storage details
├── 🔧 TESTING_CHECKLIST.md         ← Testing guide
│
├── 📦 package.json                 ← Build configuration
├── 🚀 main.js                      ← App entry point
├── 🎨 index.html                   ← UI
├── 🎨 renderer.js                  ← UI logic
├── 🎨 styles.css                   ← Styles
├── 🔧 preload.js                   ← IPC bridge
│
├── 📁 utils/                       ← Helper modules
│   ├── aiSummarizer.js
│   ├── encryption.js
│   ├── fileHash.js
│   └── pptxParser.js
│
├── 📁 assets/                      ← Icons and images
├── 📁 data/                        ← Development data
└── 📁 dist/                        ← Build output
    ├── Squailor Setup 1.0.0.exe
    └── Squailor-1.0.0-Portable.exe
```

## 🆘 Getting Help

### Common Questions

**Q: Which version should I use?**
- **Portable**: If you want to run from USB drives or don't want to install
- **Installer**: If you want a traditional Windows installation

**Q: Where is my data stored?**
- See [STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md) for complete details
- Portable: In `data` folder next to executable
- Installed: In `%APPDATA%\Squailor\data` by default

**Q: Can I switch storage locations?**
- Yes! See Settings tab in the app
- Data automatically migrates when switching

**Q: How do I build the app?**
- Run: `npm run build:win`
- See: [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)

**Q: Something's not working!**
- Check: [TESTING_CHECKLIST.md - Common Issues](TESTING_CHECKLIST.md#common-issues-and-solutions)
- Check: [QUICK_REFERENCE.md - Troubleshooting](QUICK_REFERENCE.md#troubleshooting)

## 🎓 Learning Path

### For New Users
1. [README.md](README.md) - Understand what Squailor does
2. Download appropriate version (portable or installer)
3. Follow setup instructions
4. Start using!

### For Developers
1. [README.md](README.md) - Understand the project
2. [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) - Learn to build
3. [STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md) - Understand architecture
4. [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md) - Recent changes
5. [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) - Test your changes

### For Contributors
1. Read all developer documentation
2. Review [CHANGELOG.md](CHANGELOG.md) for history
3. Make changes following existing patterns
4. Test using [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
5. Update relevant documentation

## 📊 Documentation Stats

- Total Documentation Files: 7
- Total Lines of Documentation: ~1,100 lines
- Coverage:
  - ✅ User guides
  - ✅ Build instructions
  - ✅ Technical architecture
  - ✅ Testing procedures
  - ✅ Troubleshooting
  - ✅ Change history

## 🔗 External Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

**Last Updated:** February 10, 2025
**Version:** 1.0.0

For questions or issues, please create an issue in the repository.
