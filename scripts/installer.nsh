; Custom NSIS installer script for Squailor
; Adds detailed installation progress messages

!macro customHeader
  ; Add custom header macros here if needed
!macroend

!macro customInit
  ; Custom initialization
!macroend

!macro customInstall
  ; Show detailed installation messages
  DetailPrint "Installing Squailor AI Document Summarizer..."
  DetailPrint "---------------------------------------------"
  DetailPrint ""
  DetailPrint "Extracting application files..."
  DetailPrint "Installing main executable: Squailor.exe"
  DetailPrint "Installing application resources..."
  DetailPrint "Installing AI provider modules..."
  DetailPrint "  - OpenRouter support"
  DetailPrint "  - OpenAI support"
  DetailPrint "  - Anthropic (Claude) support"
  DetailPrint "  - Google (Gemini) support"
  DetailPrint "  - Cohere support"
  DetailPrint "  - Groq support"
  DetailPrint "  - Mistral AI support"
  DetailPrint "  - xAI (Grok) support"
  DetailPrint "  - Azure OpenAI support"
  DetailPrint "Installing document parsers..."
  DetailPrint "  - PowerPoint (PPTX) parser"
  DetailPrint "  - PDF parser with image support"
  DetailPrint "  - Word (DOCX) parser"
  DetailPrint "Installing encryption utilities..."
  DetailPrint "Configuring application settings..."
  DetailPrint ""
  DetailPrint "Creating shortcuts..."
  DetailPrint "  - Desktop shortcut: Squailor"
  DetailPrint "  - Start Menu shortcut: Squailor"
  DetailPrint ""
  DetailPrint "Registering application with Windows..."
  DetailPrint "Setting up auto-updater..."
  DetailPrint ""
  DetailPrint "Installation completed successfully!"
  DetailPrint "---------------------------------------------"
  DetailPrint ""
  DetailPrint "You can now launch Squailor from:"
  DetailPrint "  - Desktop icon"
  DetailPrint "  - Start Menu > Squailor"
  DetailPrint ""
!macroend

!macro customUnInstall
  ; Show detailed uninstallation messages
  DetailPrint "Uninstalling Squailor..."
  DetailPrint "---------------------------------------------"
  DetailPrint ""
  DetailPrint "Removing application files..."
  DetailPrint "Removing shortcuts..."
  DetailPrint "Cleaning up registry entries..."
  DetailPrint ""
  DetailPrint "Note: Your API keys and settings are preserved"
  DetailPrint "Location: %APPDATA%\Squailor"
  DetailPrint ""
  DetailPrint "Uninstallation completed!"
  DetailPrint "---------------------------------------------"
!macroend
