// Network diagnostics: track suspicious outbound hosts and recent requests
// Extracted from main.js to keep the main process file smaller and more focused.

const { session } = require('electron');

const MAX_NETWORK_DIAGNOSTIC_EVENTS = 200;
const MAX_NETWORK_SAMPLE_PATHS = 5;

function ensureNetworkDiagnosticsStore() {
  if (!global.__networkDiagnostics) {
    global.__networkDiagnostics = {
      hosts: new Map(),
      events: []
    };
  }
  return global.__networkDiagnostics;
}

function normalizeDiagnosticsPath(parsedUrl) {
  try {
    const raw = `${parsedUrl.pathname || '/'}${parsedUrl.search || ''}` || '/';
    const trimmed = raw.replace(/\s+/g, ' ').trim() || '/';
    return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
  } catch (_) {
    return '/';
  }
}

function recordSuspiciousNetworkRequest(url, method) {
  try {
    const parsed = new URL(url);
    const host = (parsed.host || '').toLowerCase();
    if (!host) return;
    const store = ensureNetworkDiagnosticsStore();
    const now = Date.now();
    const path = normalizeDiagnosticsPath(parsed);
    let hostEntry = store.hosts.get(host);
    if (!hostEntry) {
      hostEntry = {
        host,
        count: 0,
        firstSeen: now,
        lastSeen: now,
        samplePaths: [],
        lastProtocol: parsed.protocol ? parsed.protocol.replace(':', '') : null,
        lastPort: parsed.port || null
      };
      store.hosts.set(host, hostEntry);
    }
    hostEntry.count += 1;
    hostEntry.lastSeen = now;
    hostEntry.lastProtocol = parsed.protocol ? parsed.protocol.replace(':', '') : hostEntry.lastProtocol || null;
    hostEntry.lastPort = parsed.port || hostEntry.lastPort || null;
    if (path && !hostEntry.samplePaths.includes(path) && hostEntry.samplePaths.length < MAX_NETWORK_SAMPLE_PATHS) {
      hostEntry.samplePaths.push(path);
    }

    store.events.push({
      host,
      method: method || 'GET',
      path,
      protocol: parsed.protocol ? parsed.protocol.replace(':', '') : null,
      port: parsed.port || null,
      timestamp: now
    });
    const overflow = store.events.length - MAX_NETWORK_DIAGNOSTIC_EVENTS;
    if (overflow > 0) {
      store.events.splice(0, overflow);
    }
  } catch (_) {
    // Ignore malformed URLs
  }
}

function clearNetworkDiagnosticsStore() {
  const store = ensureNetworkDiagnosticsStore();
  store.hosts.clear();
  store.events = [];
  return store;
}

function getNetworkDiagnosticsSnapshot() {
  const store = ensureNetworkDiagnosticsStore();
  const hostSummaries = Array.from(store.hosts.values())
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
    .map(entry => ({
      host: entry.host,
      count: entry.count,
      firstSeen: entry.firstSeen,
      lastSeen: entry.lastSeen,
      samplePaths: entry.samplePaths,
      lastProtocol: entry.lastProtocol,
      lastPort: entry.lastPort
    }));
  const events = store.events
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return {
    totals: {
      hosts: hostSummaries.length,
      events: events.length
    },
    hostSummaries,
    events
  };
}

function attachNetworkMonitoring() {
  try {
    const allowedHostPatterns = [
      'localhost',
      '127.0.0.1',
      'openai',
      'anthropic',
      'openrouter',
      'googleapis',
      'cohere',
      'groq',
      'mistral',
      'x.ai',
      'azure',
      'github.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      // jsdelivr no longer used after bundling markdown libs locally
    ];
    ensureNetworkDiagnosticsStore();
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      try {
        const url = details.url || '';
        if (url.startsWith('http')) {
          const host = new URL(url).host.toLowerCase();
          const allowed = allowedHostPatterns.some(p => host.includes(p));
          if (!allowed) {
            recordSuspiciousNetworkRequest(url, details.method);
          }
        }
      } catch (_) { /* ignore parse errors */ }
      callback({ cancel: false });
    });
  } catch (e) { /* ignore telemetry setup errors */ }
}

module.exports = {
  MAX_NETWORK_DIAGNOSTIC_EVENTS,
  MAX_NETWORK_SAMPLE_PATHS,
  ensureNetworkDiagnosticsStore,
  normalizeDiagnosticsPath,
  recordSuspiciousNetworkRequest,
  clearNetworkDiagnosticsStore,
  getNetworkDiagnosticsSnapshot,
  attachNetworkMonitoring,
};
