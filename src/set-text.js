/**
 * One text write, guarded. No side effects, nothing observed, nothing booted.
 *
 * This lived in `setup-selection-ui.js`, and two other modules imported it
 * from there -- which pulled that enhancer's *boot* into their module graph and
 * moved it ahead of its own `<script>` position in `index.html`. That is rule
 * 10 of docs/RENDER_FREEZE_SAFETY.md: core boot must not depend on optional DOM
 * enhancers. A shared function is worth sharing; a shared boot order is not.
 */

/**
 * Set `textContent` only when it differs, and report whether it changed.
 *
 * Inside a `MutationObserver`ed subtree this is not an optimisation. Assigning
 * the same string still replaces the text node and emits another `childList`
 * mutation, which is exactly how the PR #90 freeze looped.
 */
export function setTextIfChanged(node, value) {
  if (!node) return false;
  const next = String(value ?? '');
  if (node.textContent === next) return false;
  node.textContent = next;
  return true;
}
