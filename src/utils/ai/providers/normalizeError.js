function normalizeError(e) {
  const msg = (e && (e.message || e.toString())) || '';
  if (/rate limit/i.test(msg) || /429/.test(msg)) {
    return { code: 'RATE_LIMIT', message: `You've hit a rate limit. ${msg}` };
  }
  if (/insufficient[_\s-]?quota/i.test(msg) || /billing|credit/i.test(msg)) {
    return { code: 'QUOTA_EXCEEDED', message: 'Your account has insufficient credits or quota.' };
  }
  if (/invalid[_\s-]?api[_\s-]?key/i.test(msg) || /401|403/.test(msg)) {
    return { code: 'INVALID_API_KEY', message: 'Your API key is invalid or unauthorized.' };
  }
  return { code: 'UNKNOWN', message: msg || 'Unknown error' };
}

module.exports = { normalizeError };
