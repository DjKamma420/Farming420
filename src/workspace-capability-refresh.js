import { applyWorkspaceUI } from './workspace-ui.js';

let queued = false;

function correctFallbackCopy(root = document) {
  root.querySelectorAll('.workspace-gemstones p').forEach(node => {
    const current = node.textContent || '';
    const corrected = current
      .replace('level 5 / 15 / 25 / 50', 'level 1 / 15 / 25 / 50')
      .replace('first at Farming Tool level 5', 'first at Farming Tool level 1');
    if (corrected !== current) node.textContent = corrected;
  });
}

export function refreshWorkspaceCapabilities(root = document) {
  const editor = root.querySelector('[data-tool-editor="1"]');
  if (!editor) return;
  delete editor.dataset.workspaceEnhanced;
  applyWorkspaceUI(root);
  correctFallbackCopy(root);
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    refreshWorkspaceCapabilities(document);
  });
}

function boot() {
  correctFallbackCopy(document);
  window.addEventListener('farming420:state-changed', schedule);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
