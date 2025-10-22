const { GoogleGenerativeAI } = require('@google/generative-ai');
const { normalizeError } = require('./normalizeError');

function createClient({ apiKey } = {}) {
  return new GoogleGenerativeAI(apiKey);
}

async function validate({ apiKey } = {}) {
  try {
    const client = createClient({ apiKey });
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e && e.message) || String(e) };
  }
}

async function chat({ client, model, messages, temperature = 0.3, maxTokens = 3000 /*, stream = false*/ }) {
  try {
    const m = client.getGenerativeModel({ model });
    const contents = [];
    for (const msg of messages) {
      const role = msg.role === 'system' ? 'user' : msg.role; // Gemini has no system role; include in first user
      const text = typeof msg.content === 'string' ? msg.content : (Array.isArray(msg.content) ? msg.content.map(p => p.text || '').join('\n') : String(msg.content));
      contents.push({ role, parts: [{ text }] });
    }
    const result = await m.generateContent({ contents, generationConfig: { temperature, maxOutputTokens: maxTokens } });
    const out = result?.response?.text() || '';
    return out.trim();
  } catch (e) {
    const n = normalizeError(e);
    const prefix = n.code === 'RATE_LIMIT' ? 'RATE_LIMIT:' : n.code === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED:' : n.code === 'INVALID_API_KEY' ? 'INVALID_API_KEY:' : '';
    throw new Error(prefix ? `${prefix} ${n.message}` : n.message);
  }
}

function supportsVision(model) {
  if (!model) return false;
  return /gemini-1\.5/i.test(model);
}

module.exports = {
  id: 'google',
  createClient,
  validate,
  chat,
  supportsVision,
  normalizeError
};
