# Response Tones Feature Update

## Overview
Added support for different response tones to customize the writing style of AI-generated summaries. Users can now choose from four different tones when generating summaries.

## New Features

### 1. Tone Selection UI
Added a new "Response Tone" card on the home page with four tone options:
- **😊 Casual** - Friendly and conversational
- **🎓 Formal** - Professional and academic
- **📚 Informative** - Fact-focused and comprehensive
- **✨ Easy to Understand** - Simplified language

### 2. Tone-Specific AI Prompts
Each tone has customized system and user prompts that guide the AI to generate summaries in the appropriate style:

#### Casual Tone
- Uses friendly, conversational language
- Includes contractions and everyday expressions
- Like explaining to a friend

#### Formal Tone
- Professional academic language
- Precise terminology
- No contractions or casual expressions
- Suitable for professional/academic contexts

#### Informative Tone
- Encyclopedic style
- Fact-focused delivery
- Includes relevant details and context
- Comprehensive coverage

#### Easy to Understand Tone
- Simple, everyday words
- Breaks down complex concepts
- Explains technical terms in plain language
- Accessible to all reading levels

### 3. Tone Display in History
- Tone is now displayed in summary history items
- Shows as a badge alongside summary type
- Included in the full summary view metadata
- Exported in summary text files

## Files Modified

### 1. `index.html`
- Added new "Response Tone" card with tone selector grid
- Four radio button options with icons and descriptions

### 2. `styles.css`
- Added `.tone-grid` styles for 2-column grid layout
- `.tone-option` styles for individual tone cards
- Selected state styling with gradient background
- Icon and text styling
- Responsive design for mobile (single column)

### 3. `renderer.js`
- Added `getResponseTone()` function to get selected tone
- Updated `processDocuments` call to include tone parameter
- Updated history rendering to display tone badges
- Updated `viewFullSummary()` to show tone in metadata
- Updated `exportHistoryItem()` to include tone in export

### 4. `preload.js`
- Updated `processDocuments` IPC handler signature to accept `responseTone` parameter

### 5. `main.js`
- Updated `process-documents` IPC handler to accept and pass `responseTone` parameter
- Added `responseTone` to summary data stored in `summary.json`

### 6. `utils/aiSummarizer.js`
- Updated `summarizeText()` function signature to accept `responseTone` parameter
- Added tone-specific instruction mapping with four tone options
- Integrated tone instructions into system and user prompts
- Maintains backward compatibility with default 'casual' tone

## Usage

1. **Select Summary Type**: Choose between Normal or Short
2. **Select Response Tone**: Choose your preferred writing style
3. **Upload Documents**: Select PDF or PowerPoint files
4. **Generate Summaries**: Click the generate button

The AI will create summaries matching both your selected summary type (detail level) and tone (writing style).

## Technical Details

### Data Structure
Summary metadata now includes:
```json
{
  "fileName": "example.pdf",
  "fileType": ".pdf",
  "summary": "...",
  "summaryType": "normal",
  "responseTone": "casual",
  "timestamp": "2024-01-02T13:17:00.000Z",
  "model": "gpt-4o-mini",
  ...
}
```

### Tone Mapping
Internal tone values map to display names:
- `casual` → "😊 Casual"
- `formal` → "🎓 Formal"
- `informative` → "📚 Informative"
- `easy` → "✨ Easy to Understand"

## Backward Compatibility
- Existing summaries without a tone will default to 'casual'
- All old summaries remain accessible and functional
- New tone parameter is optional and defaults to 'casual' if not provided

## Future Enhancements
Possible future improvements:
- Custom tone definitions
- Tone preview/examples
- Combining multiple tones
- Language-specific tone variations
- User-saved tone preferences
