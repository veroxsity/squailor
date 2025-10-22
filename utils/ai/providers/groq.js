const base = require('./openai');

function createClient({ apiKey } = {}) {
  return base.createClient({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
}

async function validate({ apiKey } = {}) {
  return base.validate({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
}

module.exports = {
  id: 'groq',
  createClient,
  validate,
  chat: base.chat,
  supportsVision: base.supportsVision,
  normalizeError: base.normalizeError
};
