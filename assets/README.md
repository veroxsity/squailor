# App Icons

Place your application icons in this directory:

## Required Icons

- **icon.png** - 512x512 PNG for Linux and as base icon
- **icon.ico** - Windows icon file (multi-size: 16x16, 32x32, 48x48, 256x256)
- **icon.icns** - macOS icon file (generated from PNG)

## How to Create Icons

### Quick Method (Online Tools)
1. Create a 1024x1024 PNG image with your app icon
2. Use online converter like:
   - https://cloudconvert.com/png-to-ico (for Windows)
   - https://cloudconvert.com/png-to-icns (for macOS)
   - Or use tools like https://icon.kitchen/

### Professional Method (Using Electron Icon Maker)
```bash
npm install -g electron-icon-maker
electron-icon-maker --input=icon.png --output=./assets
```

## Design Tips

- Use simple, recognizable design
- Make sure it looks good at small sizes (16x16)
- Use high contrast
- Consider using the 📚 book emoji concept
- Blue/purple gradient theme matches the app

## Temporary Solution

For now, the app works without custom icons.
Electron will use default icons until you add your own.

## Icon Ideas for Squailor

Given the app name and purpose:
- Book with AI/sparkle effect
- Document with summary lines
- Brain with document
- Minimalist "S" lettermark
- Graduation cap with document
