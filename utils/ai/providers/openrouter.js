const OpenAI = require('openai');
const { normalizeError } = require('./normalizeError');
const { supportsVision } = require('./capabilities');

function createClient({ apiKey } = {}) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/yourusername/squailor',
      'X-Title': 'Squailor Document Summarizer'
    }
  });
}

async function validate({ apiKey } = {}) {
  const client = createClient({ apiKey });
  try {
    await client.models.list();
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e && e.message) || String(e) };
  }
}

async function chat({ client, model, messages, temperature = 0.3, maxTokens = 3000, stream = true, onDelta }) {
  try {
    if (stream) {
      let full = '';
      const s = await client.chat.completions.create({ model, messages, temperature, max_tokens: maxTokens, stream: true });
      for await (const part of s) {
        const delta = part?.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          if (typeof onDelta === 'function') onDelta(delta);
        }
      }
      return full.trim();
    } else {
      const r = await client.chat.completions.create({ model, messages, temperature, max_tokens: maxTokens });
      return (r.choices?.[0]?.message?.content || '').trim();
    }
  } catch (e) {
    const n = normalizeError(e);
    const prefix = n.code === 'RATE_LIMIT' ? 'RATE_LIMIT:' : n.code === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED:' : n.code === 'INVALID_API_KEY' ? 'INVALID_API_KEY:' : '';
    throw new Error(prefix ? `${prefix} ${n.message}` : n.message);
  }
}

module.exports = {
  id: 'openrouter',
  createClient,
  validate,
  chat,
  supportsVision,
  normalizeError
};
