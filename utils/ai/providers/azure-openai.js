const { normalizeError } = require('./normalizeError');

function createClient({ apiKey, endpoint, deployment, apiVersion } = {}) {
  if (!endpoint) throw new Error('azure-openai requires endpoint');
  if (!deployment) throw new Error('azure-openai requires deployment');
  const base = endpoint.replace(/\/$/, '');
  const url = `${base}/openai/deployments/${deployment}/chat/completions`;
  return { apiKey, url, apiVersion: apiVersion || '2024-08-01-preview' };
}

async function validate({ apiKey, endpoint, deployment, apiVersion } = {}) {
  try {
    const client = createClient({ apiKey, endpoint, deployment, apiVersion });
    const out = await chat({ client, model: '', messages: [{ role: 'user', content: 'ping' }], temperature: 0.0, maxTokens: 1, stream: false });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e && e.message) || String(e) };
  }
}

async function chat({ client, model, messages, temperature = 0.3, maxTokens = 3000, stream = false, onDelta }) {
  try {
    const url = `${client.url}?api-version=${encodeURIComponent(client.apiVersion)}`;
    const body = {
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: !!stream
    };

    const headers = {
      'Content-Type': 'application/json',
      'api-key': client.apiKey
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
    }

    if (stream) {
      // Azure returns an SSE stream; manually parse line-oriented chunks
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Process complete lines
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // keep last partial
        for (const line of lines) {
          const trimmed = line.trim();
            if (!trimmed) continue;
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') {
              return full.trim();
            }
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || '';
              if (delta) {
                full += delta;
                if (typeof onDelta === 'function') onDelta(delta);
              }
            } catch (_) {
              // ignore malformed line
            }
          }
        }
      }
      return full.trim();
    } else {
      const data = await resp.json();
      const out = data?.choices?.[0]?.message?.content || '';
      return (out || '').trim();
    }
  } catch (e) {
    const n = normalizeError(e);
    const prefix = n.code === 'RATE_LIMIT' ? 'RATE_LIMIT:' : n.code === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED:' : n.code === 'INVALID_API_KEY' ? 'INVALID_API_KEY:' : '';
    throw new Error(prefix ? `${prefix} ${n.message}` : n.message);
  }
}

function supportsVision(model) {
  // Azure deployments can be of vision-capable models (e.g., gpt-4o-*), leave to naming
  return /gpt-4o|gpt4o|omni|vision/i.test(model || '');
}

module.exports = {
  id: 'azure-openai',
  createClient,
  validate,
  chat,
  supportsVision,
  normalizeError
};
