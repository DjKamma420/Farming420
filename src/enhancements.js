import { enchantPresentation } from './enchant-presentation.js';
import { parseSkyBlockTooltip, recognizeSkyBlockTooltip } from './tooltip-scanner.js';

/**
 * Every nav page belongs to exactly one group.
 *
 * Pages left out of this table are not dropped -- they stay in the nav, ahead
 * of the groups, because `groupSidebar` appends groups after whatever it did
 * not move. With `setups`, `guide` and `setup` missing, the rail opened with a
 * set of items and two bare letters before Dashboard, which is not where a
 * first-time reader looks. `tests/nav-groups.test.js` fails if a page is
 * missing here.
 */
const GROUPS = [
  ['Progress', ['dashboard', 'account', 'accessories', 'crops', 'tools']],
  ['Loadout', ['setups', 'gear', 'pets', 'buffs']],
  ['Specialized', ['chips', 'shards', 'pests']],
  ['Analysis', ['planner', 'research', 'coming']],
  ['Getting started', ['guide', 'setup']],
  ['System', ['settings']],
];

const HUBS = [
  ['account', 'Layer 1', 'Account', 'Skills, Garden, Anita and global upgrades.'],
  ['crops', 'Layer 2', 'Crop', 'Crop-specific Fortune and progression.'],
  ['tools', 'Layer 3', 'Tool', 'Reforge, enchantments, gemstones and Farming for Dummies.'],
  ['gear', 'Layer 4', 'Items & Setup', 'Armor, equipment, pets, chips, shards and buffs.'],
];

const scannerBySlot = new Map();

function clickPage(id) {
  document.querySelector(`.sidebar [data-page="${id}"]`)?.click();
}

function groupSidebar(root) {
  const nav = root.querySelector('.sidebar nav');
  if (!nav || nav.dataset.grouped === '1') return;
  nav.dataset.grouped = '1';

  for (const [label, ids] of GROUPS) {
    const group = document.createElement('div');
    group.className = 'nav-group-addon';

    const title = document.createElement('div');
    title.className = 'nav-group-title-addon';
    title.textContent = label;
    group.appendChild(title);

    for (const id of ids) {
      const button = nav.querySelector(`[data-page="${id}"], [data-nav-id="${id}"]`);
      if (button) group.appendChild(button);
    }
    nav.appendChild(group);
  }
}


function simplifyDashboard(root) {
  const heading = root.querySelector('.page-head h1');
  if (!heading || heading.textContent.trim() !== 'Your Farming Progress') return;
  const content = root.querySelector('.content');
  const hero = content?.querySelector('.hero-grid');
  if (!content || !hero || content.querySelector('.layer-hub-grid-addon')) return;

  [...content.children].forEach((node, index) => {
    if (index > [...content.children].indexOf(hero)) node.classList.add('dashboard-detail-addon');
  });

  const section = document.createElement('section');
  section.className = 'dashboard-layer-addon';
  section.innerHTML = '<div class="section-row"><div><h2>Progress layers</h2><p>Account → Crop → Tool → Items. Details appear only after opening a layer.</p></div></div>';

  const grid = document.createElement('div');
  grid.className = 'layer-hub-grid-addon';

  for (const [page, eyebrow, title, description] of HUBS) {
    const button = document.createElement('button');
    button.className = 'layer-hub-addon';
    button.innerHTML = `<span>${eyebrow}</span><strong>${title}</strong><p>${description}</p><b>Open →</b>`;
    button.addEventListener('click', () => clickPage(page));
    grid.appendChild(button);
  }

  section.appendChild(grid);
  hero.insertAdjacentElement('afterend', section);
}

function enhanceCropWorkspace(root) {
  const heading = root.querySelector('.page-head h1');
  if (!heading || heading.textContent.trim() !== 'Crop progression') return;

  const picker = root.querySelector('.crop-grid');
  const panel = root.querySelector('.crop-detail-panel');
  if (!picker || !panel || panel.dataset.workspace === '1') return;

  picker.classList.add('crop-picker-addon');
  panel.classList.add('crop-workspace-addon');
  panel.dataset.workspace = '1';

  // Older cached markup can still contain the former pseudo-tabs. They mixed
  // three different pages into one panel and looked interactive even when the
  // navigation target was elsewhere. Hide them if an old render survives.
  panel.querySelector('.layer-tabs')?.setAttribute('hidden', '');

  const cropGrid = panel.querySelector(':scope > .card-grid');
  cropGrid?.classList.add('workspace-grid-addon', 'crop-layer-grid-addon');
}

function improveToolsPage(root) {
  const active = root.querySelector('.sidebar .nav-link.active');
  if (active?.dataset.page !== 'tools') return;
  const content = root.querySelector('.content');
  if (!content || content.querySelector('.tool-context-addon')) return;

  const heading = content.querySelector('.page-head');
  if (!heading) return;

  const cropSelect = root.querySelector('#cropSelect');
  const cropName = cropSelect?.selectedOptions?.[0]?.textContent?.trim() || 'Crop';
  const toolBadge = content.querySelector('.filter-line .badge:last-child');
  const toolName = toolBadge?.textContent?.trim() || 'Crop Tool';

  const context = document.createElement('div');
  context.className = 'tool-context-addon';
  context.innerHTML = `
    <div><span>Crop</span><strong>${cropName}</strong></div>
    <div class="tool-context-arrow">→</div>
    <div><span>Active tool</span><strong>${toolName}</strong></div>
    <button type="button">Crop workspace</button>
  `;
  context.querySelector('button').addEventListener('click', () => clickPage('crops'));
  heading.insertAdjacentElement('afterend', context);
}

function decorateEnchantRow(row) {
  const nameInput = row.querySelector('[data-ench-name], [data-ench-new]');
  const levelInput = row.querySelector('[data-ench-level], [data-ench-new-level]');
  if (!nameInput || !levelInput) return;

  const presentation = enchantPresentation(nameInput.value, levelInput.value);
  row.classList.remove('enchant-maxed', 'enchant-active', 'enchant-missing', 'enchant-unverified');
  row.classList.add(`enchant-${presentation.state}`);
  if (presentation.maxLevel !== null) {
    row.dataset.enchantMax = String(presentation.maxLevel);
    row.title = presentation.state === 'maxed'
      ? `Verified max level ${presentation.maxLevel}`
      : `Verified max level: ${presentation.maxLevel}`;
  } else {
    delete row.dataset.enchantMax;
    row.title = 'Maximum level not verified yet';
  }
}

function decorateEnchantments(root) {
  root.querySelectorAll('.enchant-row').forEach(row => {
    decorateEnchantRow(row);
    if (row.dataset.enchantVisualBound === '1') return;
    row.dataset.enchantVisualBound = '1';
    row.addEventListener('input', () => decorateEnchantRow(row));
  });
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function scannerState(slotId) {
  if (!scannerBySlot.has(slotId)) scannerBySlot.set(slotId, { file: null, text: '', scan: null, status: '', progress: 0 });
  return scannerBySlot.get(slotId);
}

function currentReforgeCandidates(editor) {
  return [...editor.querySelectorAll('#reforge-options option')].map(option => option.value || option.getAttribute('value')).filter(Boolean);
}

function parseScannerText(editor, slotId, text) {
  const state = scannerState(slotId);
  state.text = String(text || '');
  state.scan = parseSkyBlockTooltip(state.text, { reforgeCandidates: currentReforgeCandidates(editor) });
  state.status = state.scan.lines.length ? 'Tooltip parsed. Review the result before applying it.' : 'No tooltip text was recognized.';
  state.progress = state.scan.lines.length ? 1 : 0;
  return state.scan;
}

function createPreviewLine(label, value) {
  const row = document.createElement('div');
  row.className = 'scanner-result-line-addon';
  const key = document.createElement('span');
  key.textContent = label;
  const text = document.createElement('strong');
  text.textContent = value || '—';
  row.append(key, text);
  return row;
}

function renderScannerPreview(panel, slotId) {
  const state = scannerState(slotId);
  const progress = panel.querySelector('[data-scan-progress]');
  const status = panel.querySelector('[data-scan-status]');
  const textarea = panel.querySelector('[data-scan-text]');
  const result = panel.querySelector('[data-scan-result]');
  const apply = panel.querySelector('[data-scan-apply]');

  if (progress) {
    progress.value = Math.max(0, Math.min(1, Number(state.progress) || 0));
    progress.hidden = !state.status;
  }
  if (status) status.textContent = state.status || 'Drop, paste or choose a screenshot of one SkyBlock item tooltip.';
  if (textarea && textarea.value !== state.text) textarea.value = state.text;
  if (!result) return;
  result.replaceChildren();

  const scan = state.scan;
  if (!scan) {
    if (apply) apply.disabled = true;
    return;
  }

  result.append(
    createPreviewLine('Item', scan.displayName),
    createPreviewLine('Rarity', scan.rarity),
    createPreviewLine('Reforge', scan.reforge),
    createPreviewLine('Enchantments', Object.entries(scan.enchantments || {}).map(([name, level]) => `${name} ${level}`).join(', ')),
    createPreviewLine('Gemstones', (scan.gems || []).join(', ')),
  );

  if (scan.recombobulated === true) result.append(createPreviewLine('Recombobulated', 'Yes'));
  if (scan.farmingForDummies !== null) result.append(createPreviewLine('Farming for Dummies', String(scan.farmingForDummies)));

  if (scan.warnings?.length) {
    const warnings = document.createElement('ul');
    warnings.className = 'scanner-warnings-addon';
    for (const warning of scan.warnings) {
      const item = document.createElement('li');
      item.textContent = warning;
      warnings.appendChild(item);
    }
    result.appendChild(warnings);
  }

  if (apply) apply.disabled = !scan.displayName && !Object.keys(scan.enchantments || {}).length && !(scan.gems || []).length;
}

function dispatchChange(element) {
  element?.dispatchEvent(new Event('change', { bubbles: true }));
}

function freshSlotElement(slotId, selector) {
  return document.querySelector(`.slot-editor ${selector.replaceAll('{slot}', slotId)}`);
}

function applyScannerResult(slotId, scan) {
  if (!scan) return;

  if (scan.displayName) {
    const itemSelect = freshSlotElement(slotId, `[data-slot-item="{slot}"]`);
    const match = itemSelect ? [...itemSelect.options].find(option => option.textContent.trim().toLowerCase() === scan.displayName.toLowerCase()) : null;
    if (match) {
      itemSelect.value = match.value;
      dispatchChange(itemSelect);
    } else {
      const name = freshSlotElement(slotId, `[data-slot-name="{slot}"]`);
      if (name) {
        name.value = scan.displayName;
        dispatchChange(name);
      }
    }
  }

  if (scan.reforge) {
    const reforge = freshSlotElement(slotId, `[data-slot-reforge="{slot}"]`);
    if (reforge) {
      reforge.value = scan.reforge;
      dispatchChange(reforge);
    }
  }

  if (scan.recombobulated !== null) {
    const recomb = freshSlotElement(slotId, `[data-slot-recomb="{slot}"]`);
    if (recomb) {
      recomb.checked = Boolean(scan.recombobulated);
      dispatchChange(recomb);
    }
  }

  for (const [enchantId, level] of Object.entries(scan.enchantments || {})) {
    const rows = [...document.querySelectorAll('.slot-editor .enchant-row')];
    const existing = rows.find(row => normalizeValue(row.querySelector('[data-ench-name]')?.value) === normalizeValue(enchantId));
    if (existing) {
      const levelInput = existing.querySelector('[data-ench-level]');
      if (levelInput) {
        levelInput.value = String(level);
        dispatchChange(levelInput);
      }
      continue;
    }

    const nameInput = freshSlotElement(slotId, `[data-ench-new="{slot}"]`);
    const levelInput = freshSlotElement(slotId, `[data-ench-new-level="{slot}"]`);
    const addButton = freshSlotElement(slotId, `[data-ench-add="{slot}"]`);
    if (!nameInput || !levelInput || !addButton) continue;
    nameInput.value = enchantId;
    levelInput.value = String(level);
    addButton.click();
  }

  for (const gem of scan.gems || []) {
    const existing = [...document.querySelectorAll(`.slot-editor [data-gem-value="${slotId}"]`)]
      .some(input => normalizeValue(input.value) === normalizeValue(gem));
    if (existing) continue;
    const input = freshSlotElement(slotId, `[data-gem-new="{slot}"]`);
    const addButton = freshSlotElement(slotId, `[data-gem-add="{slot}"]`);
    if (!input || !addButton) continue;
    input.value = gem;
    addButton.click();
  }

  const state = scannerState(slotId);
  state.status = 'Recognized fields were applied. Uncertain fields were left unchanged.';
  state.progress = 1;
}

function bindScannerPanel(panel, editor, slotId) {
  const state = scannerState(slotId);
  const fileInput = panel.querySelector('[data-scan-file]');
  const text = panel.querySelector('[data-scan-text]');

  fileInput?.addEventListener('change', () => {
    state.file = fileInput.files?.[0] || null;
    state.status = state.file ? `Ready to scan ${state.file.name}.` : '';
    state.progress = 0;
    renderScannerPreview(panel, slotId);
  });

  panel.addEventListener('dragover', event => {
    event.preventDefault();
    panel.classList.add('dragging');
  });
  panel.addEventListener('dragleave', () => panel.classList.remove('dragging'));
  panel.addEventListener('drop', event => {
    event.preventDefault();
    panel.classList.remove('dragging');
    const file = [...(event.dataTransfer?.files || [])].find(entry => entry.type.startsWith('image/'));
    if (!file) return;
    state.file = file;
    state.status = `Ready to scan ${file.name}.`;
    state.progress = 0;
    renderScannerPreview(panel, slotId);
  });
  panel.addEventListener('paste', event => {
    const file = [...(event.clipboardData?.files || [])].find(entry => entry.type.startsWith('image/'));
    if (!file) return;
    state.file = file;
    state.status = 'Screenshot pasted. Ready to scan.';
    state.progress = 0;
    renderScannerPreview(panel, slotId);
  });

  panel.querySelector('[data-scan-image]')?.addEventListener('click', async () => {
    if (!state.file) {
      state.status = 'Choose, drop or paste a screenshot first.';
      renderScannerPreview(panel, slotId);
      return;
    }
    const button = panel.querySelector('[data-scan-image]');
    button.disabled = true;
    try {
      const recognized = await recognizeSkyBlockTooltip(state.file, {
        onProgress(update) {
          state.status = update.status || 'Recognizing tooltip…';
          state.progress = Number(update.progress) || 0;
          renderScannerPreview(panel, slotId);
        },
      });
      parseScannerText(editor, slotId, recognized);
    } catch (error) {
      state.status = error?.message || String(error);
      state.progress = 0;
    } finally {
      button.disabled = false;
      renderScannerPreview(panel, slotId);
    }
  });

  panel.querySelector('[data-scan-parse]')?.addEventListener('click', () => {
    parseScannerText(editor, slotId, text?.value || '');
    renderScannerPreview(panel, slotId);
  });

  panel.querySelector('[data-scan-apply]')?.addEventListener('click', () => {
    applyScannerResult(slotId, state.scan);
    const freshPanel = document.querySelector(`[data-scanner-slot="${slotId}"]`);
    if (freshPanel) renderScannerPreview(freshPanel, slotId);
  });
}

function addScreenshotScanner(root) {
  const editor = root.querySelector('.slot-editor');
  const nameInput = editor?.querySelector('[data-slot-name]');
  const slotId = nameInput?.dataset.slotName;
  if (!editor || !slotId || editor.querySelector('[data-scanner-slot]')) return;

  const panel = document.createElement('section');
  panel.className = 'scanner-panel-addon';
  panel.dataset.scannerSlot = slotId;
  panel.tabIndex = 0;
  panel.innerHTML = `
    <div class="scanner-head-addon">
      <div><div class="eyebrow">Screenshot scanner</div><h3>Read this item from a tooltip</h3></div>
      <label class="ghost small scanner-file-addon">Choose image<input data-scan-file type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
    </div>
    <p class="scanner-copy-addon">Drop or paste a SkyBlock tooltip screenshot here. OCR runs in your browser; recognized values are reviewed before they change this slot.</p>
    <div class="scanner-actions-addon">
      <button class="primary-btn" type="button" data-scan-image>Scan screenshot</button>
      <button class="ghost small" type="button" data-scan-parse>Parse text</button>
    </div>
    <progress class="scanner-progress-addon" data-scan-progress max="1" value="0" hidden></progress>
    <div class="hint" data-scan-status></div>
    <details class="scanner-text-addon">
      <summary>Recognized / pasted tooltip text</summary>
      <textarea data-scan-text rows="7" spellcheck="false" placeholder="You can also paste tooltip text here and parse it without OCR."></textarea>
    </details>
    <div class="scanner-result-addon" data-scan-result></div>
    <button class="primary-btn scanner-apply-addon" type="button" data-scan-apply disabled>Apply recognized fields to this slot</button>
  `;

  editor.prepend(panel);
  bindScannerPanel(panel, editor, slotId);
  renderScannerPreview(panel, slotId);
}

function enhance() {
  const root = document.querySelector('#app');
  if (!root) return;
  groupSidebar(root);
  simplifyDashboard(root);
  enhanceCropWorkspace(root);
  improveToolsPage(root);
  decorateEnchantments(root);
  addScreenshotScanner(root);
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    enhance();
  });
});

observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
enhance();
