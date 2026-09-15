/**
 * Minimal synchronous localStorage stand-in.
 *
 * The persistence modules touch `localStorage` only inside functions, so
 * installing this on `globalThis` from a test body is enough and no runtime
 * flag or DOM implementation is needed.
 */
export function installLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  const stub = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
    clear: () => store.clear(),
    get length() { return store.size; },
    key: index => [...store.keys()][index] ?? null,
    _dump: () => Object.fromEntries(store),
  };
  globalThis.localStorage = stub;
  return stub;
}

export function uninstallLocalStorage() {
  delete globalThis.localStorage;
}
