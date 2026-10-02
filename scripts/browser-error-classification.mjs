/** Only an observed WebKit transport failure at the known market owner is a note. */
export function marketAccessControlUrl(engine, message) {
  if (engine !== 'webkit') return null;
  const match = String(message).match(/^(?:Error: )?Fetch API cannot load (https:(?:\/\/| \/)[^\s]+) due to access control checks\.$/);
  if (!match) return null;
  try {
    const url = new URL(match[1].replace(/^https: \//, 'https://'));
    if (url.protocol !== 'https:' || url.hostname !== 'sky.coflnet.com' || url.port || url.username || url.password || url.hash) return null;
    if (!/^\/api\/(?:bazaar\/[^/]+\/history|item\/price\/[^/]+\/history\/full)$/.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function classifyBrowserErrors(engine, errors, requestFailures = []) {
  const runtimeErrors = [], marketTransportNotes = [];
  for (const message of errors) {
    const url = marketAccessControlUrl(engine, message);
    const failure = url && requestFailures.find(row => row.url === url);
    if (failure) {
      marketTransportNotes.push({ kind: 'market-access-control', url, message, requestFailure: failure.error });
    } else {
      runtimeErrors.push(message);
    }
  }
  return { runtimeErrors, marketTransportNotes };
}

export function probeExitCode(cases) {
  return cases.some(row => row.status === 'FAIL' || row.status === 'BLOCKED') ? 1 : 0;
}
