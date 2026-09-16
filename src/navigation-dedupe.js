import { STORAGE_KEY } from './config.js';

export const DUPLICATE_PAGE_TARGETS = Object.freeze({
  gear: 'setups',
  pets: 'setups',
});

export function canonicalPage(page) {
  return DUPLICATE_PAGE_TARGETS[page] || page;
}

export function canonicalizeStoredPage({ storage = globalThis.localStorage, key = STORAGE_KEY } = {}) {
  if (!storage?.getItem || !storage?.setItem) return false;
  let state;
  try {
    const raw = storage.getItem(key);
    if (!raw) return false;
    state = JSON.parse(raw);
  } catch {
    return false;
  }
  const next = canonicalPage(state?.page);
  if (!state || next === state.page) return false;
  storage.setItem(key, JSON.stringify({ ...state, page: next }));
  return true;
}

export function removeDuplicateNavigation(root = globalThis.document) {
  if (!root?.querySelectorAll) return 0;
  let removed = 0;
  for (const page of Object.keys(DUPLICATE_PAGE_TARGETS)) {
    for (const element of root.querySelectorAll(`[data-page="${page}"]`)) {
      if (element.closest?.('nav')) {
        element.remove();
        removed += 1;
      } else {
        element.dataset.page = DUPLICATE_PAGE_TARGETS[page];
      }
    }
  }
  return removed;
}

export function installNavigationDedupe({ root = globalThis.document } = {}) {
  if (!root) return;
  const changed = canonicalizeStoredPage();
  if (changed && globalThis.location?.reload) {
    globalThis.location.reload();
    return;
  }

  removeDuplicateNavigation(root);
  const app = root.getElementById?.('app');
  if (!app || typeof MutationObserver !== 'function') return;
  const observer = new MutationObserver(() => removeDuplicateNavigation(root));
  observer.observe(app, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') installNavigationDedupe();
