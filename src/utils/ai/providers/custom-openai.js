const base = require('./openai');

function createClient({ apiKey, baseURL } = {}) {
  if (!baseURL) throw new Error('custom-openai requires baseURL');
  return base.createClient({ apiKey, baseURL });
}

async function validate({ apiKey, baseURL } = {}) {
  if (!baseURL) return { valid: false, error: 'Missing baseURL for custom-openai' };
  return base.validate({ apiKey, baseURL });
}

module.exports = {
  id: 'custom-openai',
  createClient,
  validate,
  chat: base.chat,
  supportsVision: base.supportsVision,
  normalizeError: base.normalizeError
};
