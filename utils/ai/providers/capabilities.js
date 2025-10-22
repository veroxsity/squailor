function supportsVision(model) {
  if (!model || typeof model !== 'string') return false;
  const m = model.toLowerCase();
  return (
    m.includes('gpt-4o') || m.includes('gpt4o') ||
    m.includes('4o') || m.includes('4-0') ||
    m.includes('omni') || m.includes('vision') ||
    m.includes('claude-3.5-sonnet') ||
    m.includes('gemini-1.5') ||
    m.includes('llava')
  );
}

module.exports = { supportsVision };
