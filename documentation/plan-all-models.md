# Multi‑Provider AI Support ("all models")

This plan removes the current OpenRouter lock-in and adds first‑class support for multiple AI providers with a selectable provider in the Models settings page. It introduces a clean provider abstraction, per‑provider credentials, error normalization, and model capability detection (vision, max tokens, streaming, etc.).

## Goals

- Allow choosing an AI provider in the UI and persist that choice in settings.
- Support multiple major providers out of the box, plus a generic OpenAI-compatible/custom endpoint.
- Store credentials securely (encrypted) per provider; support provider-specific config (e.g., Azure endpoint/deployment).
- Keep a single summarization/Q&A code path via a provider adapter interface.
- Normalize errors (rate limit, quota, invalid key) to the existing main process semantics.
- Maintain vision support detection per model.
- Backwards compatible with current OpenRouter defaults and single-key keystore.

## Target providers (initial set)

- OpenAI (api.openai.com)
- Azure OpenAI (resource endpoint + deployment names)
- Anthropic (Claude)
- Google (Gemini)
- Mistral
- Groq
- Cohere
- xAI (Grok)
- OpenRouter (existing)
- Local/OpenAI-compatible (e.g., LM Studio, vLLM, Ollama via OpenAI bridge)

Notes:
- Ollama native API differs; recommend supporting via an “OpenAI-compatible” bridge first. Native Ollama can be a later addition.

## User-facing changes (Settings UI)

- Add "Provider" dropdown in the Models settings panel.
  - Values: openai, azure-openai, anthropic, google, mistral, groq, cohere, xai, openrouter, custom-openai.
- Model input becomes provider-aware: show placeholder/examples per provider; optionally a fetch button to list models (where supported and safe).
- Credentials panel switches fields by provider:
  - openai: API key
  - azure-openai: API key, Endpoint (https://{resource}.openai.azure.com), Deployment name, API version (optional)
  - anthropic: API key
  - google: API key (or SA), Project ID (optional)
  - mistral/groq/cohere/xai/openrouter: API key
  - custom-openai: Base URL, API key
- Buttons: "Test connection" (validates key/config), "Save" (encrypts and stores), "Clear".
- Display non-sensitive config (endpoint, deployment) in settings.json; API keys go into encrypted keystore.

## Settings and storage

Files referenced:
- `main.js` (IPC handlers)
- `renderer.js` + `index.html` (settings UI)
- `preload.js` (IPC surface)
- `utils/aiSummarizer.js` (core summary + Q&A)
- `utils/encryption.js` (no API change; extend usage)

### settings.json additions

```jsonc
{
  // existing fields …
  "aiProvider": "openrouter",           // NEW: selected provider key
  "aiModel": "openai/gpt-4o-mini",      // keep, but provider-aware; examples update per provider
  "aiConfig": {                           // NEW: non-secret provider configs
    "openai": {},
    "azure-openai": {
      "endpoint": "",
      "deployment": "",
      "apiVersion": "2024-08-01-preview"
    },
    "custom-openai": {
      "baseURL": "http://localhost:1234/v1"
    }
  }
}
```

### Keystore format (encrypted file `keystore.enc`)

- Backwards compatible: if content decrypts to a plain string, treat it as the key for the previously selected provider (default: `openrouter`).
- New JSON map:

```json
{
  "openai": { "apiKey": "..." },
  "azure-openai": { "apiKey": "..." },
  "anthropic": { "apiKey": "..." },
  "google": { "apiKey": "..." },
  "mistral": { "apiKey": "..." },
  "groq": { "apiKey": "..." },
  "cohere": { "apiKey": "..." },
  "xai": { "apiKey": "..." },
  "openrouter": { "apiKey": "..." },
  "custom-openai": { "apiKey": "..." }
}
```

Utilities in `main.js` for saving/loading keys will be updated to read/write this map while keeping single-key compatibility.

## IPC surface changes

- validate-api-key(provider, config?) → { valid, error? }
  - Provider-specific validation: ping list models or minimal chat.
- save-provider-credentials(provider, secret, config?) → { success, error? }
  - Writes key into keystore JSON map; writes non-secrets into settings.json (`aiConfig[provider]`).
- load-provider-credentials(provider) → { success, hasKey, config }
  - Returns only non-secret config and a boolean `hasKey`.
- get-model-capabilities(provider, model) → { vision: bool, maxInputTokens?: number, supportsImages?: bool }
  - Backed by a local capability map + provider detection.
- process-documents / process-documents-combined
  - Add `provider` param (defaults to settings.aiProvider). Keep `model` param.
  - Internally pick the right adapter using provider + model; fetch key from keystore.

Existing channels (e.g., error mapping, progress events) remain unchanged.

## Provider adapter architecture

Introduce a small abstraction in `utils/aiSummarizer.js` (or split into `utils/ai/providers/*`).

Interface (TypeScript-esque):

```ts
export interface ProviderAdapter {
  id: string; // e.g., "openai", "azure-openai"
  // Create an SDK or HTTP client using provided secrets/config
  createClient(opts: { apiKey?: string; baseURL?: string; endpoint?: string; deployment?: string; apiVersion?: string; projectId?: string; }): any;

  // Core operations used by the app
  summarize(args: {
    client: any;
    text: string;
    summaryType: string;
    responseTone: string;
    model: string;
    summaryStyle: string;
    onProgress?: (p: ProgressEvent) => void;
    images?: Array<{ mimeType: string; data: string }>; // base64
  }): Promise<string>;

  answerQuestion(args: {
    client: any;
    summary: string;
    question: string;
    model: string;
  }): Promise<string>;

  supportsVision(model: string): boolean;

  // Optional helper: normalize errors
  normalizeError(e: unknown): { code: "RATE_LIMIT"|"QUOTA_EXCEEDED"|"INVALID_API_KEY"|"UNKNOWN"; message: string };
}
```

Implementation notes:
- Each adapter focuses on that provider’s API (SDK or HTTP). Start with minimal chat/stream features.
- Streaming: standardize callbacks to emit `{ type: 'delta' | 'chunk-start' | 'chunk-done' | 'combine-start' | 'done', ... }` exactly like current behavior.
- Capability info can be a small map + heuristics (e.g., `gpt-4o`, `claude-3-5-*`, `gemini-1.5-*` support images).

A `ProviderRegistry` returns the adapter for a given provider key.

## Refactor touch-points

- `utils/aiSummarizer.js`
  - Replace hardcoded OpenRouter calls with provider-agnostic flow:
    - Resolve provider from settings or param
    - Load secret/config
    - Instantiate adapter client
    - Call adapter.summarize/answerQuestion
    - Use adapter.supportsVision(model)
    - Catch and normalize errors to existing `RATE_LIMIT:`, `QUOTA_EXCEEDED:`, `INVALID_API_KEY:` prefixes
- `main.js`
  - IPC changes listed above (validate/save/load credentials, provider param passthrough)
  - `validate-api-key` must branch by provider; move current OpenRouter validation into the OpenRouter adapter; main delegates.
- `renderer.js` / `index.html`
  - Settings UI for provider selection + dynamic fields
  - Test connection button triggers `validate-api-key(provider, config)`
  - Persist non-secrets via `save-settings`; secrets via `save-provider-credentials`
- `preload.js`
  - Expose new IPC methods with clear signatures and type hints in JSDoc

## Error normalization matrix

Map provider errors to our unified codes:
- 429 / rate-limited → `RATE_LIMIT: <friendly message>`
- quota/billing errors → `QUOTA_EXCEEDED: <friendly message>`
- 401/403/invalid credentials → `INVALID_API_KEY: <friendly message>`
- else → pass through message, categorize as `UNKNOWN` (no prefix)

Adapters implement `normalizeError` and aiSummarizer uses it centrally.

## Model ID and examples

- Keep `aiModel` as a free string, provider-aware.
- Example values:
  - openai: `gpt-4o-mini`, `o4-mini` (text+vision), `gpt-4.1-mini`
  - azure-openai: use Deployment name (e.g., `my-gpt4o-mini`); model mapping happens in Azure config
  - anthropic: `claude-3-5-sonnet-20241022`
  - google: `gemini-1.5-flash`, `gemini-1.5-pro`
  - mistral: `mistral-large-latest`
  - groq: `llama-3.1-70b-versatile`, `mixtral-8x7b-instruct`
  - cohere: `command-r-plus`
  - xai: `grok-2-mini`
  - openrouter: `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`
  - custom-openai: model as provided by the server

## Vision support detection

- Adapters return `supportsVision(model)` using simple checks (maintain a central list).
- Main summarization respects `processImages` flag + capability.

## Migration

- On load of keystore:
  1) Try decrypt → JSON parse; if JSON with provider keys, use as-is.
  2) If plaintext string, migrate to `{ "openrouter": { "apiKey": <thatString> } }` and re-save.
- On settings:
  - If no `aiProvider`, default to `openrouter` (current behavior).
  - Keep existing `aiModel` value; UI nudges to update if switching provider.

## Security

- Continue using `utils/encryption.js` for keystore.
- Don’t expose secrets to renderer; only boolean `hasKey`.
- Avoid logging secrets; redact in diagnostics.

## Testing & QA

- Unit tests for adapters with mocked HTTP/SDK.
- Integration smoke tests (behind a flag) for 1-2 real providers when keys present.
- UI tests for settings form validation and provider switching.
- Regression: duplicate detection, vision/no-vision paths, combined summaries.

## Phased implementation plan

1) Plumbing & storage (1–2 days)
- Add `aiProvider` and `aiConfig` to settings.json persistence.
- Extend keystore to map provider→key with migration.
- IPC: save/load credentials, validate key (provider param).

2) Adapters (2–4 days)
- Implement OpenAI, OpenRouter, Anthropic, Google.
- Add custom-openai.
- Normalize errors.

3) Summarizer refactor (1–2 days)
- Replace direct OpenRouter usage with adapter calls.
- Keep streaming callbacks intact.

4) UI wiring (1–2 days)
- Provider dropdown; dynamic fields; test connection.
- Persist non-secrets; store secrets via IPC.

5) Additional providers (2–3 days)
- Azure OpenAI, Mistral, Groq, Cohere, xAI.
- Capability mapping (vision/token caps).

6) Hardening & QA (1–2 days)
- Edge cases, error messages, offline/timeout behavior, token limits.

## Acceptance criteria

- Provider can be selected in settings and persisted.
- Separate credentials stored per provider (encrypted), with migration from single-key storage.
- Summaries and Q&A work across at least OpenAI, Anthropic, Google, OpenRouter, and custom-openai.
- Errors are normalized to existing prefixes and displayed appropriately.
- Vision usage respects provider/model capability flags.
- No secrets exposed to renderer logs or saved in plain settings.

## Provider specifics cheat sheet

- OpenAI
  - Base URL: https://api.openai.com/v1
  - SDK: `openai` (official). Streaming via `responses` or chat completions.
  - Validate: list models or minimal chat.
- Azure OpenAI
  - Endpoint: https://{resource}.openai.azure.com
  - Deployment: user-provided logical name
  - API version often required
  - Validate: `GET /openai/deployments?api-version=...` or a minimal chat
- Anthropic
  - Base URL: https://api.anthropic.com
  - Models: Claude 3.5 family
  - Validate: model list or chat with short prompt
- Google (Gemini)
  - SDK: `@google/generative-ai`
  - Validate: generate with a trivial prompt
- Mistral, Groq, Cohere, xAI
  - REST/SDK with straightforward key header; trivial chat for validation
- OpenRouter
  - Base URL: https://openrouter.ai/api/v1 (current default)
- Custom OpenAI-compatible
  - Base URL configurable; test with a trivial chat

---

## Work items checklist (engineering)

- [ ] settings.json schema updated; default `aiProvider` added
- [ ] keystore migration implemented; JSON map for multiple providers
- [ ] New IPC: validate/save/load credentials; provider param on processing handlers
- [ ] ProviderRegistry + adapters scaffolded
- [ ] OpenAI, OpenRouter, Anthropic, Google adapters working (streaming + error normalization)
- [ ] UI: provider dropdown + provider forms + Test connection
- [ ] aiSummarizer uses adapters; vision detection centralized
- [ ] Docs: update GET_STARTED.md and QUICK_START.md on multi-provider setup
