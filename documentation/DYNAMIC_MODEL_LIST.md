# Dynamic Model List Implementation

## Overview
Implemented dynamic model list population on the home page based on the selected AI provider. The model dropdown now shows only models available for the current provider, displays the provider name, and handles cases where no API key is set.

## Changes Made

### 1. Backend (main.js)
Added `get-provider-models` IPC handler that returns provider-specific model lists:

```javascript
ipcMain.handle('get-provider-models', async (event, provider) => {
  // Returns { success, models } where models is array of { value, label, group }
});
```

**Model counts per provider:**
- **OpenRouter**: 13 models (OpenAI, Anthropic, Google, Meta, Other)
- **OpenAI**: 5 models (GPT-4, GPT-3.5)
- **Anthropic**: 4 models (Claude 3.5, Claude 3)
- **Google**: 3 models (Gemini 1.5, 1.0)
- **Cohere**: 4 models (Command series)
- **Groq**: 4 models (Llama 3.3, 3.1, Mixtral)
- **Mistral**: 3 models (Mistral series)
- **xAI**: 1 model (Grok)
- **Azure OpenAI**: 5 models (GPT-4, GPT-3.5)
- **Custom OpenAI**: 2 models (Generic compatible)

### 2. IPC Bridge (preload.js)
Exposed the new method to the renderer:

```javascript
getProviderModels: (provider) => ipcRenderer.invoke('get-provider-models', provider)
```

### 3. Frontend (renderer.js)
#### Added Provider Display Names
```javascript
const providerDisplayNames = {
  'openrouter': 'OpenRouter',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'cohere': 'Cohere',
  'groq': 'Groq',
  'mistral': 'Mistral',
  'xai': 'xAI',
  'azure-openai': 'Azure OpenAI',
  'custom-openai': 'Custom OpenAI'
};
```

#### Added `populateModels()` Function
Dynamically populates the model dropdown based on provider and API key availability:

```javascript
async function populateModels(provider, hasApiKey) {
  // Updates currentProviderLabel with provider name
  // If no API key: shows "No API key set - go to Settings"
  // If has API key: fetches models from backend and builds optgroups
  // Preserves selected model if it exists in new list
}
```

**Features:**
- Updates "Current provider: {name}" label
- Shows "No API key set - go to Settings" when no key is configured
- Dynamically builds optgroups based on model data
- Preserves user's selected model when switching providers (if valid)
- Disables dropdown when no models are available

#### Integration Points
The `populateModels()` function is called in:

1. **Initial load** (DOMContentLoaded):
   ```javascript
   await populateModels(currentProvider, !!apiKey);
   ```

2. **Provider dropdown change**:
   ```javascript
   providerSelect.addEventListener('change', async () => {
     // ... update provider ...
     await populateModels(currentProvider, !!apiKey);
   });
   ```

3. **Save provider credentials**:
   ```javascript
   saveProviderBtn.addEventListener('click', async () => {
     // ... save credentials ...
     await populateModels(currentProvider, !!apiKey);
   });
   ```

4. **Delete provider credentials**:
   ```javascript
   deleteProviderKeyBtn.addEventListener('click', async () => {
     // ... delete credentials ...
     await populateModels(currentProvider, false);
   });
   ```

### 4. UI (index.html)
Updated the home page model select to include provider label:

```html
<label for="modelSelect" class="font-medium">
  Model 
  <span id="currentProviderLabel" class="text-muted">Current provider: Loading...</span>
</label>
<select id="modelSelect" class="select-field">
  <option value="">Loading models...</option>
</select>
```

## User Experience

### Before
- Static model list showing all providers' models
- No indication of current provider
- Confusing when trying to use a model from a different provider

### After
- Dynamic model list showing only current provider's models
- Clear "Current provider: {name}" label
- Helpful message when no API key is set: "No API key set - go to Settings"
- Model list updates automatically when:
  - App loads
  - Provider is changed in settings
  - API key is saved or deleted
- Previously selected model is preserved when switching providers (if valid)

## Benefits

1. **Prevents User Errors**: Users can't select models incompatible with their provider
2. **Clearer Context**: Always shows which provider is currently active
3. **Better Guidance**: Clear message when API key is missing
4. **Seamless UX**: Model list updates automatically when provider changes
5. **Persistent Selection**: Remembers user's model choice when possible

## Technical Notes

- Model lists are hardcoded in `main.js` for simplicity and speed
- Each model has: `value` (API model ID), `label` (display name), `group` (optgroup category)
- Groups are automatically built from model data
- Disabled state prevents confusing interactions when no models available
- All model changes are reactive and update across the app
