import { CROPS, UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';

const PLANNER_SCOPE_KEY = 'farming420-planner-scope-v1';

function pageId() {
  return document.querySelector('.sidebar .nav-link.active')?.dataset.page || '';
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function currentCropId() {
  return document.querySelector('#cropSelect')?.value || 'melon';
}

function setCrop(id) {
  const select = document.querySelector('#cropSelect');
  if (!select || select.value === id) return;
  select.value = id;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function simplifyTopbar() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  topbar.classList.add('topbar-simplified-addon');
  const cropSwitch = topbar.querySelector('.crop-switch');
  if (cropSwitch) cropSwitch.hidden = true;
}

function uniqueTools() {
  const byKey = new Map();
  for (const crop of CROPS) {
    const key = toolKeyForCropId(crop.id);
    const entry = byKey.get(key) || { key, tool: crop.tool, cropIds: [], cropNames: [] };
    entry.cropIds.push(crop.id);
    entry.cropNames.push(crop.name);
    byKey.set(key, entry);
  }
  return [...byKey.values()];
}

function enhanceTools() {
  if (pageId() !== 'tools') return;
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.tool-context-addon')) return;

  const head = content.querySelector('.page-head');
  const title = head?.querySelector('h1');
  const copy = head?.querySelector('p');
  if (title) title.textContent = 'Farming Tools';
  if (copy) copy.textContent = 'Track each physical tool separately. Crop choice is only needed later when comparing profit or choosing the next upgrade.';

  const filter = content.querySelector('.filter-line');
  if (filter) {
    const badges = [...filter.querySelectorAll('.badge')];
    for (const badge of badges.slice(1)) badge.remove();
  }

  const tools = uniqueTools();
  const selectedKey = toolKeyForCropId(currentCropId());
  const box = document.createElement('section');
  box.className = 'tool-context-addon compact-context-addon';
  box.innerHTML = `
    <div>
      <div class="eyebrow">Physical tool</div>
      <strong>Choose the tool you want to inspect</strong>
      <p>This selection controls which physical farming tool is shown below.</p>
    </div>
    <select data-tool-focus aria-label="Physical farming tool">
      ${tools.map(tool => `<option value="${tool.cropIds[0]}" ${tool.key === selectedKey ? 'selected' : ''}>${tool.tool}${tool.cropNames.length > 1 ? ` · ${tool.cropNames.join(' / ')}` : ''}</option>`).join('')}
    </select>
  `;
  box.querySelector('[data-tool-focus]').addEventListener('change', event => setCrop(event.target.value));
  head?.insertAdjacentElement('afterend', box);
}

function plannerScope() {
  return localStorage.getItem(PLANNER_SCOPE_KEY) || 'global';
}

function setPlannerScope(value) {
  localStorage.setItem(PLANNER_SCOPE_KEY, value);
  if (value !== 'global') setCrop(value);
  else enhancePlanner(true);
}

function globalPlannerFilter() {
  const rows = [...document.querySelectorAll('.planner-row[data-open]')];
  let visible = 0;
  for (const row of rows) {
    const item = UPGRADES.find(entry => entry.id === row.dataset.open);
    const global = item && item.cropScope === 'Any' && item.section !== 'crops' && item.section !== 'tools';
    row.hidden = !global;
    if (global) {
      visible += 1;
      const numbers = row.querySelectorAll('.planner-number');
      if (numbers[1]) numbers[1].hidden = true;
    }
  }
  const empty = document.querySelector('.planner-global-empty-addon');
  if (empty) empty.hidden = visible > 0;
}

function enhancePlanner(force = false) {
  if (pageId() !== 'planner') return;
  const content = document.querySelector('.content');
  if (!content) return;
  if (force) content.querySelector('.planner-scope-addon')?.remove();
  if (content.querySelector('.planner-scope-addon')) return;

  const scope = plannerScope();
  if (scope !== 'global' && CROPS.some(crop => crop.id === scope) && currentCropId() !== scope) {
    setCrop(scope);
    return;
  }

  const panel = document.createElement('section');
  panel.className = 'planner-scope-addon compact-context-addon';
  panel.innerHTML = `
    <div>
      <div class="eyebrow">Evaluation scope</div>
      <strong>${scope === 'global' ? 'Global' : CROPS.find(crop => crop.id === scope)?.name || 'Global'}</strong>
      <p>${scope === 'global' ? 'Shows account-wide upgrades. Crop-specific profit is intentionally deferred until a crop is selected.' : 'Crop-specific view for next-upgrade and future coins/hour calculations.'}</p>
    </div>
    <select data-planner-scope aria-label="Upgrade evaluation scope">
      <option value="global" ${scope === 'global' ? 'selected' : ''}>Global</option>
      ${CROPS.map(crop => `<option value="${crop.id}" ${scope === crop.id ? 'selected' : ''}>${crop.name}</option>`).join('')}
    </select>
  `;
  panel.querySelector('[data-planner-scope]').addEventListener('change', event => setPlannerScope(event.target.value));

  const head = content.querySelector('.page-head');
  head?.insertAdjacentElement('afterend', panel);
  const context = content.querySelector('.planner-context');
  if (scope === 'global') {
    if (context) context.hidden = true;
    globalPlannerFilter();
    const empty = document.createElement('div');
    empty.className = 'empty planner-global-empty-addon';
    empty.hidden = true;
    empty.textContent = 'No calculated global upgrades for the current state.';
    // The core list only: `globalPlannerFilter` reads `.planner-row[data-open]`,
    // which exists nowhere else, and an enhancement list is inserted ahead of it.
    content.querySelector('.planner-list:not(.revenue-list):not(.planner-mode-list)')?.appendChild(empty);
  }
}

function applyUx() {
  simplifyTopbar();
  enhanceTools();
  enhancePlanner();
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    applyUx();
  });
});

observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
applyUx();
