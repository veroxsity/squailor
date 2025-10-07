# Changelog

All notable changes to Squailor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-10

### Added
- Initial release of Squailor
- PDF document text extraction and summarization
- PowerPoint (PPTX/PPT) presentation text extraction and summarization
- Two summary modes:
  - Normal mode: Detailed, educational summaries
  - Short mode: Concise bullet-point summaries
- OpenAI GPT-4o-mini integration for AI-powered summarization
- API key management with local storage
- API key validation
- Batch processing support (multiple files at once)
- Save summaries as text or markdown files
- Modern, gradient-based UI design
- Progress indicators during processing
- Error handling and user feedback
- Multi-platform support (Windows, macOS, Linux)
- Comprehensive documentation:
  - README.md
  - QUICK_START.md
  - DEVELOPMENT.md
  - ARCHITECTURE.md

### Features
- Context isolation for security
- Secure IPC communication
- Automatic text chunking for large documents
- Multi-chunk summary consolidation
- File type detection and appropriate parsing
- Responsive and intuitive user interface
- Local API key storage (never sent to external servers)

### Technical Stack
- Electron 38.2.0
- OpenAI SDK 6.0.1
- pdf-parse-fork for PDF parsing
- JSZip and xml2js for PowerPoint parsing
- Vanilla JavaScript (no framework dependencies)

## [Unreleased]

### Planned Features
- Support for more document formats (DOCX, RTF, etc.)
- Export summaries in multiple formats (PDF, HTML)
- Summary history and management
- Custom prompt templates
- Dark mode theme
- Offline mode with cached summaries
- Multiple AI model support
- Language selection for summaries
- Summary comparison view
- Keyboard shortcuts
- Drag and drop file support

### Future Improvements
- Performance optimization for very large documents
- Streaming responses for real-time feedback
- Cloud storage integration (optional)
- Collaborative summary sharing
- Mobile companion app

---

## Version History

**[1.0.0]** - Initial Release
- Core functionality implemented
- Production-ready application
- Full documentation

---

## How to Use This Changelog

When making changes:

1. Add new entries under `[Unreleased]`
2. Categorize changes:
   - **Added** for new features
   - **Changed** for changes in existing functionality
   - **Deprecated** for soon-to-be removed features
   - **Removed** for now removed features
   - **Fixed** for any bug fixes
   - **Security** for security updates
3. When releasing, move unreleased items to new version section
4. Follow semantic versioning (MAJOR.MINOR.PATCH)

### Version Numbers

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)
