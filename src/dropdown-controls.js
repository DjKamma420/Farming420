/** Keyboard/focus behavior shared by the existing details/listbox pickers. */
export function bindDropdownControls(dropdown, id) {
  if (dropdown.dataset.keyboardBound === '1') return;
  dropdown.dataset.keyboardBound = '1';
  const trigger = dropdown.querySelector('summary');
  const menu = dropdown.querySelector('[role="listbox"]');
  if (!trigger || !menu) return;
  trigger.id = `${id}-trigger`;
  menu.id = `${id}-menu`;
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-controls', menu.id);
  const options = [...menu.querySelectorAll('[role="option"]')];
  const selected = options.find(option => option.getAttribute('aria-selected') === 'true') || options[0];
  for (const option of options) option.tabIndex = option === selected ? 0 : -1;
  const update = () => trigger.setAttribute('aria-expanded', String(dropdown.open));
  update();
  dropdown.addEventListener('toggle', update);
  dropdown.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dropdown.open = false;
      update();
      trigger.focus({ preventScroll: true });
      return;
    }
    if (event.key === 'Tab') {
      // Let the browser move focus normally; closing must not redirect it.
      queueMicrotask(() => { dropdown.open = false; update(); });
      return;
    }
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault();
    dropdown.open = true;
    update();
    const current = options.indexOf(dropdown.ownerDocument.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : current < 0 ? (event.key === 'ArrowUp' ? options.length - 1 : options.indexOf(selected))
      : (current + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
    for (const option of options) option.tabIndex = option === options[index] ? 0 : -1;
    options[index]?.focus({ preventScroll: true });
    options[index]?.scrollIntoView({ block: 'nearest' });
  });
  // Capture before the existing option action replaces the editor. Core focus
  // restoration can resolve this stable trigger id in the replacement DOM.
  dropdown.addEventListener('click', event => {
    if (event.target.closest('[role="option"]')) trigger.focus({ preventScroll: true });
  }, true);
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', event => {
    for (const dropdown of document.querySelectorAll('details[data-keyboard-bound="1"][open]')) {
      if (!dropdown.contains(event.target)) {
        dropdown.open = false;
        dropdown.querySelector('summary')?.setAttribute('aria-expanded', 'false');
      }
    }
  }, true);
}
