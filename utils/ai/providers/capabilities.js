const registry = {
  'openrouter': [ /gpt-4o/i, /omni/i, /vision/i, /claude-3\.5-sonnet/i, /gemini-1\.5/i, /llava/i ],
  'openai': [ /gpt-4o-mini/i, /gpt-4o/i, /omni/i, /vision/i ],
  'anthropic': [ /claude-3\.5-sonnet/i, /claude-3-vision/i ],
  'google': [ /gemini-1\.5-pro/i, /gemini-1\.5-flash/i ],
  'cohere': [],
  'groq': [ /llava/i ],
  'mistral': [],
  'xai': [],
  'azure-openai': [ /gpt-4o-mini/i, /gpt-4o/i ],
  'custom-openai': [ /vision/i ]
};

function supportsVision(model, provider) {
  if (!model || typeof model !== 'string') return false;
  const patterns = (provider && registry[provider]) || [];
  const anyProvider = [].concat(...Object.values(registry));
  const m = model.toLowerCase();
  // Prefer provider-specific match; otherwise fallback to generic patterns
  const list = patterns.length ? patterns : anyProvider;
  return list.some((re) => re.test(m));
}

module.exports = { supportsVision };
