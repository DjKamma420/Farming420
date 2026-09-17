/**
 * The physical-tool `select` is hidden, not enhanced.
 *
 * This module used to turn it into a list of levers, one per tool. That was the
 * same choice a third time on one page: the tool is already picked in the card
 * grid above, which shows the item art and the tier as well, and a lever is the
 * wrong control for a one-of-many choice anyway.
 *
 * The native `select` stays in the DOM and keeps working, because the rest of
 * the workspace listens to its `change` event. It is only taken out of sight.
 */
function hideDuplicateToolPicker(root = document) {
  root.querySelectorAll('#workspaceToolSelect').forEach(select => {
    if (select.dataset.duplicatePickerHidden === '1') return;
    select.dataset.duplicatePickerHidden = '1';
    select.closest('.workspace-tool-picker')?.classList.add('workspace-tool-picker-hidden');
    // An earlier build left its lever list behind in saved DOM; clear it out.
    select.parentElement?.querySelector('.workspace-direct-tool-picker')?.remove();
  });
}

if (typeof document !== 'undefined') {
  hideDuplicateToolPicker(document);
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => hideDuplicateToolPicker(document)).observe(app, {
      childList: true,
      subtree: true,
    });
  }
}
