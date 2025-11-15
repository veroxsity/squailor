const openai = require('./openai');
const openrouter = require('./openrouter');
const customOpenAI = require('./custom-openai');
const anthropic = require('./anthropic');
const google = require('./google');
const cohere = require('./cohere');
const groq = require('./groq');
const mistral = require('./mistral');
const xai = require('./xai');
const azure = require('./azure-openai');

const adapters = {
  [openai.id]: openai,
  [openrouter.id]: openrouter,
  [customOpenAI.id]: customOpenAI,
  [anthropic.id]: anthropic,
  [google.id]: google,
  [cohere.id]: cohere,
  [groq.id]: groq,
  [mistral.id]: mistral,
  [xai.id]: xai,
  [azure.id]: azure
};

function getAdapter(provider) {
  return adapters[provider] || null;
}

module.exports = { getAdapter };
