const azure = require('../../src/utils/ai/providers/azure-openai');

function makeReader(chunks) {
  let i = 0;
  return {
    async read() {
      if (i >= chunks.length) return { done: true, value: undefined };
      const part = chunks[i++];
      return { done: false, value: new TextEncoder().encode(part) };
    },
  };
}

describe('azure-openai SSE streaming', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('accumulates deltas across partial chunks', async () => {
    const chunks = [
      // Split in the middle of JSON to ensure our parser buffers correctly
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo, "}}]}\n',
      '\n',
      'data: {"choices":[{"delta":{"content":"world"}}]}\n\n',
      'data: [DONE]\n\n',
    ];

    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: { getReader: () => makeReader(chunks) },
    }));

    const client = azure.createClient({ apiKey: 'k', endpoint: 'https://a.b', deployment: 'gpt', apiVersion: '2024-08-01-preview' });
    const received = [];
    const full = await azure.chat({
      client,
      model: '',
      messages: [{ role: 'user', content: 'hello' }],
      temperature: 0,
      maxTokens: 10,
      stream: true,
      onDelta: (d) => received.push(d),
    });

    expect(full).toBe('Hello, world');
    expect(received.join('')).toBe('Hello, world');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions?api-version='),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
