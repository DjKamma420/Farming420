import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { FARMING_TOOL_REFORGES, cropReforgeRecommendations, reforgeById } from './farming-reforges.js';

const LEGACY_REFORGE_ENTRY_IDS = Object.freeze({
  bountiful: 'tool-reforge-bountiful-reforge',
  blessed: 'tool-reforge-blessed-reforge',
});

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cropForState(state) {
  return CROPS.find(crop => crop.id === state?.selectedCrop) || CROPS[0];
}

function toolBucket(state, cropId) {
  state.profile ||= {};
  state.profile.toolProgress ||= {};
  const key = toolKeyForCropId(cropId);
  const bucket = state.profile.toolProgress[key] ||= {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.manualGain ||= {};
  return bucket;
}

function selectedReforge(state, cropId) {
  const bucket = toolBucket(state, cropId);
  if (bucket.reforge && reforgeById(bucket.reforge)) return bucket.reforge;
  if (bucket.owned?.[LEGACY_REFORGE_ENTRY_IDS.bountiful]) return 'bountiful';
  if (bucket.owned?.[LEGACY_REFORGE_ENTRY_IDS.blessed]) return 'blessed';
  return null;
}

function setSelectedReforge(state, cropId, reforgeId) {
  const bucket = toolBucket(state, cropId);
  const next = reforgeById(reforgeId)?.id || null;
  bucket.reforge = next;
  for (const id of Object.values(LEGACY_REFORGE_ENTRY_IDS)) {
    delete bucket.levels[id];
    delete bucket.owned[id];
  }
  const legacyId = LEGACY_REFORGE_ENTRY_IDS[next];
  if (legacyId) {
    bucket.levels[legacyId] = 1;
    bucket.owned[legacyId] = true;
  }
}

function uniqueTools() {
  const byName = new Map();
  for (const crop of CROPS) {
    const existing = byName.get(crop.tool);
    if (existing) existing.crops.push(crop);
    else byName.set(crop.tool, { tool: crop.tool, cropId: crop.id, crops: [crop] });
  }
  return [...byName.values()];
}

function goalTag(label, id, activeId) {
  const item = reforgeById(id);
  return `<span class="workspace-goal ${id === activeId ? 'active' : ''}"><b>${label}</b>${item?.name || id}</span>`;
}

function recommendationBox(crop, activeId) {
  const rec = cropReforgeRecommendations(crop.id);
  return `<section class="workspace-recommendations">
    <div class="workspace-section-head"><div><h3>Recommended for ${crop.name}</h3><p>Recommendations are goal-specific. There is no single reforge that is best for every farming objective.</p></div></div>
    <div class="workspace-goals">
      ${goalTag('Coins', rec.money, activeId)}
      ${goalTag('Collection', rec.collection, activeId)}
      ${goalTag('Farming XP', rec.xp, activeId)}
      ${goalTag('Rare Crops / Greenhouse', rec.rareCrops, activeId)}
      ${goalTag('Feast Seasoning', rec.feastSeasoning, activeId)}
      ${goalTag('Sowdust', rec.sowdust, activeId)}
    </div>
  </section>`;
}

function reforgeRows(activeId) {
  return FARMING_TOOL_REFORGES.map(reforge => `<label class="workspace-choice ${reforge.id === activeId ? 'selected' : ''}">
    <input type="radio" name="workspace-reforge" value="${reforge.id}" ${reforge.id === activeId ? 'checked' : ''}>
    <span class="workspace-radio" aria-hidden="true"></span>
    <span class="workspace-choice-copy"><strong>${reforge.name}</strong><small>${reforge.stone}</small><em>${reforge.summary}</em></span>
  </label>`).join('');
}

function toolSelector(state) {
  const crop = cropForState(state);
  const tools = uniqueTools();
  const currentKey = toolKeyForCropId(crop.id);
  return `<label class="workspace-tool-picker"><span>Tool</span><select id="workspaceToolSelect">
    ${tools.map(entry => `<option value="${entry.cropId}" ${toolKeyForCropId(entry.cropId) === currentKey ? 'selected' : ''}>${entry.tool}${entry.crops.length > 1 ? ` — ${entry.crops.map(c => c.name).join(' / ')}` : ''}</option>`).join('')}
  </select></label>`;
}

function enhanceToolsPage(root) {
  const editor = root.querySelector('[data-tool-editor="1"]');
  if (!editor || editor.dataset.workspaceEnhanced === '1') return;
  const state = readState();
  if (!state) return;
  const crop = cropForState(state);
  const activeId = selectedReforge(state, crop.id);
  editor.dataset.workspaceEnhanced = '1';

  const content = root.querySelector('.content');
  const pageHead = content?.querySelector('.page-head');
  if (pageHead && !content.querySelector('.workspace-tool-picker')) {
    pageHead.insertAdjacentHTML('afterend', `<div class="workspace-context">${toolSelector(state)}<div class="workspace-context-copy"><span>Crop context</span><strong>${crop.name}</strong></div></div>`);
  }

  const sections = [...editor.querySelectorAll('.item-editor-section')];
  const reforgeSection = sections.find(section => section.querySelector('h3')?.textContent.trim() === 'Reforge');
  if (reforgeSection) {
    reforgeSection.innerHTML = `<div class="workspace-section-head"><div><h3>Reforge</h3><p>One tool can carry exactly one reforge. All current farming reforges are shown here.</p></div></div><div class="workspace-choice-list">${reforgeRows(activeId)}</div>${recommendationBox(crop, activeId)}`;
  }

  const scoredHeading = [...content.querySelectorAll('.section-row')].find(row => row.querySelector('h2')?.textContent.includes('Every scored tool entry'));
  const scoredGrid = scoredHeading?.nextElementSibling;
  if (scoredHeading) scoredHeading.classList.add('workspace-secondary-analysis');
  if (scoredGrid) scoredGrid.classList.add('workspace-secondary-analysis');

  root.querySelector('#workspaceToolSelect')?.addEventListener('change', event => {
    const cropSelect = root.querySelector('#cropSelect');
    if (!cropSelect) return;
    cropSelect.value = event.target.value;
    cropSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });

  root.querySelectorAll('input[name="workspace-reforge"]').forEach(input => input.addEventListener('change', event => {
    const nextState = readState();
    if (!nextState) return;
    setSelectedReforge(nextState, cropForState(nextState).id, event.target.value);
    writeState(nextState);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));
}

function simplifyGlobalContext(root) {
  const cropSwitch = root.querySelector('.topbar .crop-switch');
  if (cropSwitch) cropSwitch.classList.add('workspace-hidden-crop-switch');
  const search = root.querySelector('.topbar .search-wrap');
  if (search) search.setAttribute('aria-label', 'Search current workspace');
}

export function applyWorkspaceUI(root = document) {
  simplifyGlobalContext(root);
  enhanceToolsPage(root);
}

if (typeof document !== 'undefined') {
  applyWorkspaceUI(document);
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => applyWorkspaceUI(document)).observe(app, { childList: true, subtree: true });
  }
}
