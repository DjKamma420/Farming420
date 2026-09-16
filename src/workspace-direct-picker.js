function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function renderDirectToolPicker(select) {
  if (!select || select.dataset.directPickerEnhanced === '1') return;

  const options = [...select.options];
  if (!options.length) return;

  select.dataset.directPickerEnhanced = '1';
  select.classList.add('workspace-native-tool-select');

  const picker = document.createElement('div');
  picker.className = 'workspace-direct-tool-picker';
  picker.setAttribute('role', 'radiogroup');
  picker.setAttribute('aria-label', 'Physical farming tool');
  picker.innerHTML = options.map(option => `
    <button
      type="button"
      class="workspace-tool-button ${option.selected ? 'selected' : ''}"
      data-workspace-tool-value="${esc(option.value)}"
      role="radio"
      aria-checked="${option.selected ? 'true' : 'false'}"
    >
      <span class="workspace-tool-button-state" aria-hidden="true"></span>
      <span class="workspace-tool-button-copy">
        <strong>${esc(option.textContent || option.value)}</strong>
        <small>${option.selected ? 'Selected' : 'Select tool'}</small>
      </span>
    </button>
  `).join('');

  select.insertAdjacentElement('afterend', picker);

  picker.querySelectorAll('[data-workspace-tool-value]').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset.workspaceToolValue;
      if (!value || value === select.value) return;
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function enhanceDirectToolPicker(root = document) {
  root.querySelectorAll('#workspaceToolSelect').forEach(renderDirectToolPicker);
}

if (typeof document !== 'undefined') {
  enhanceDirectToolPicker(document);
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => enhanceDirectToolPicker(document)).observe(app, {
      childList: true,
      subtree: true,
    });
  }
}
