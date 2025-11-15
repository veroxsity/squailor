const Anthropic = require('@anthropic-ai/sdk');
const { normalizeError } = require('./normalizeError');
const { supportsVision } = require('./capabilities');

function createClient({ apiKey } = {}) {
  return new Anthropic({ apiKey });
}

async function validate({ apiKey } = {}) {
  try {
    const client = createClient({ apiKey });
    // Minimal request
    await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }]
    });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e && e.message) || String(e) };
  }
}

async function chat({ client, model, messages, temperature = 0.3, maxTokens = 3000, stream = false, onDelta }) {
  try {
    // Non-streaming for initial implementation
    const userContent = messages.map(m => (m.role === 'user' ? m.content : null)).filter(Boolean).join('\n\n');
    const systemPrompt = (messages.find(m => m.role === 'system') || {}).content || '';

    const resp = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt || undefined,
      messages: [{ role: 'user', content: userContent }]
    });
    const out = resp?.content?.map(p => p.text).join('') || '';
    return out.trim();
  } catch (e) {
    const n = normalizeError(e);
    const prefix = n.code === 'RATE_LIMIT' ? 'RATE_LIMIT:' : n.code === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED:' : n.code === 'INVALID_API_KEY' ? 'INVALID_API_KEY:' : '';
    throw new Error(prefix ? `${prefix} ${n.message}` : n.message);
  }
}

module.exports = {
  id: 'anthropic',
  createClient,
  validate,
  chat,
  supportsVision,
  normalizeError
};
