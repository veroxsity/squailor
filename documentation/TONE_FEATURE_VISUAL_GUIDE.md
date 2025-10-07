# Visual Guide: Response Tones Feature

## Home Page - New Tone Selector

The home page now has two configuration cards:

```
┌─────────────────────────────────────────┐
│  ⚡ Summary Mode                         │
│  Choose how detailed you want           │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐    │
│  │ 📝 Normal    │  │ ⚡ Short      │    │
│  │ Detailed     │  │ Quick bullet │    │
│  │ summary      │  │ points       │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🎭 Response Tone                        │
│  Choose the writing style               │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐    │
│  │ 😊 Casual    │  │ 🎓 Formal    │    │
│  │ Friendly and │  │ Professional │    │
│  │ conversational│ │ and academic │    │
│  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ 📚 Informative│ │ ✨ Easy      │    │
│  │ Fact-focused │  │ Simplified   │    │
│  │ comprehensive│  │ language     │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
```

## Selection States

### Unselected
- Light background
- Regular border
- Normal icon size

### Selected (Active)
- Gradient background (purple/blue)
- White text
- Glowing border effect
- Slightly enlarged icon
- Elevated appearance (scale: 1.02)

## History Page - Tone Display

Summary cards now show the tone used:

```
┌─────────────────────────────────────────┐
│ 📕 Document.pdf                         │
│ 📅 Jan 2, 2024  🕐 1:17 PM             │
│ [normal] [😊 Casual] 📉 75% reduction  │
├─────────────────────────────────────────┤
│ [Document Preview]  [Summary Preview]   │
└─────────────────────────────────────────┘
```

## Summary View Page

Full summary view includes tone in metadata:

```
┌─────────────────────────────────────────┐
│ ← Back to History                        │
│                                          │
│ Document.pdf                             │
│ Jan 2, 2024 • NORMAL • Casual • GPT-4o  │
├─────────────────────────────────────────┤
│ ✨ AI Generated Summary                  │
│ Original: 5,000 chars • Summary: 1,250  │
│                                          │
│ [Formatted Summary with Markdown]        │
└─────────────────────────────────────────┘
```

## Export Format

Exported text files include tone:

```
File: Document.pdf
Date: 1/2/2024, 1:17:38 PM
Type: NORMAL
Tone: Casual
Model: gpt-4o-mini

SUMMARY:
[Summary content here...]
```

## Mobile Responsive

On screens < 768px:
- Tone grid switches to single column
- All four options stack vertically
- Touch-friendly larger tap targets
- Maintains all functionality

```
Mobile View:
┌─────────────┐
│ 😊 Casual   │
├─────────────┤
│ 🎓 Formal   │
├─────────────┤
│ 📚 Informative│
├─────────────┤
│ ✨ Easy     │
└─────────────┘
```

## Color Scheme

### Dark Theme (Default)
- Background: Dark blue-gray (#1e293b)
- Selected gradient: Purple to Blue (#667eea → #764ba2)
- Text: Light gray (#f1f5f9)
- Icons: White background when selected

### Light Theme
- Background: White (#ffffff)
- Selected gradient: Purple to Blue (#667eea → #764ba2)
- Text: Dark gray (#1f2937)
- Icons: White background when selected

## Animation & Transitions

All tone options feature smooth transitions:
- Hover: Border color change + upward movement (-2px)
- Selection: Gradient background + scale (1.02)
- Icon: Scale up (1.1) and white background
- Duration: 0.2s ease

## Accessibility

- Clear visual indicators for selection
- High contrast between selected/unselected states
- Icons + text labels for clarity
- Keyboard navigable (radio buttons)
- Screen reader friendly labels
