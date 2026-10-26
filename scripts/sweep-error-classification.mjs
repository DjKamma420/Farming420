import { marketHistoryUrl } from './browser-error-classification.mjs';

/**
 * Classify Chromium console diagnostics, never uncaught page errors.
 * A known history URL alone is insufficient: retain the exact failed GET/fetch
 * and its native ERR_FAILED result, without treating it as successful delivery.
 */
export function classifySweepTransportErrors(consoleErrors, requestFailures, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const remainingConsoleErrors = [], marketTransportNotes = [];
  for (const row of consoleErrors) {
    let url = null;
    if (row.text === 'Failed to load resource: net::ERR_FAILED') {
      url = marketHistoryUrl(row.url);
    } else {
      const match = row.text.match(/^Access to fetch at '([^']+)' from origin '([^']+)' has been blocked by CORS policy: [^\r\n]+$/);
      if (match && match[2] === origin) {
        try {
          if (new URL(row.url).origin === origin) url = marketHistoryUrl(match[1]);
        } catch { /* Missing/foreign console provenance remains an error. */ }
      }
    }
    const failure = url && requestFailures.find(f => f.url === url
      && f.method === 'GET' && f.resourceType === 'fetch' && f.error === 'net::ERR_FAILED');
    if (failure) {
      marketTransportNotes.push({ kind: 'market-transport', url, method: failure.method,
        resourceType: failure.resourceType, requestFailure: failure.error,
        message: row.text, consoleUrl: row.url });
    } else {
      remainingConsoleErrors.push(row);
    }
  }
  return { remainingConsoleErrors, marketTransportNotes };
}
