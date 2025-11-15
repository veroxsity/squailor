const cohere = require('cohere-ai');
const { normalizeError } = require('./normalizeError');

function createClient({ apiKey } = {}) {
  cohere.init(apiKey);
  return cohere;
}

async function validate({ apiKey } = {}) {
  try {
    const client = createClient({ apiKey });
    await client.chat({ model: 'command', message: 'ping' });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e && e.message) || String(e) };
  }
}

async function chat({ client, model, messages, temperature = 0.3, maxTokens = 3000 /*, stream*/ }) {
  try {
    const userText = messages.map(m => (m.role === 'user' ? (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)) : '')).filter(Boolean).join('\n\n');
    const systemText = (messages.find(m => m.role === 'system') || {}).content || '';
    const resp = await client.chat({ model, message: `${systemText ? systemText + '\n\n' : ''}${userText}`, temperature, max_tokens: maxTokens });
    const out = resp?.text || resp?.message?.content || '';
    return (typeof out === 'string' ? out : JSON.stringify(out)).trim();
  } catch (e) {
    const n = normalizeError(e);
    const prefix = n.code === 'RATE_LIMIT' ? 'RATE_LIMIT:' : n.code === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED:' : n.code === 'INVALID_API_KEY' ? 'INVALID_API_KEY:' : '';
    throw new Error(prefix ? `${prefix} ${n.message}` : n.message);
  }
}

function supportsVision() { return false; }

module.exports = {
  id: 'cohere',
  createClient,
  validate,
  chat,
  supportsVision,
  normalizeError
};
