import { readStoredAppState, writeStoredAppState } from './app-storage.js';
import { UPGRADES } from './data.js';
import { applyFarmingToolReforge, FARMING_TOOL_REFORGE_ENTRY_IDS, selectedFarmingToolReforge } from './item-capabilities.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { EXCLUSIVE_ENTRY_GROUPS } from './exclusivity.js';

const DERIVED_ONLY_SECTIONS = new Set(['gear']);

function load() {
  try { return readStoredAppState({}); } catch { return {}; }
}

function cropId(raw) {
  return document.querySelector('#cropSelect')?.value || raw.selectedCrop || 'melon';
}

function bucket(raw, item) {
  raw.profile ||= {};
  let target = raw.profile;
  if (item.section === 'crops') {
    raw.profile.cropProgress ||= {};
    raw.profile.cropProgress[cropId(raw)] ||= {};
    target = raw.profile.cropProgress[cropId(raw)];
  }
  if (item.section === 'tools') {
    const key = toolKeyForCropId(cropId(raw));
    raw.profile.toolProgress ||= {};
    raw.profile.toolProgress[key] ||= {};
    target = raw.profile.toolProgress[key];
  }
  target.levels ||= {};
  target.owned ||= {};
  return target;
}

function level(raw, item) {
  const target = bucket(raw, item);
  if (Object.values(FARMING_TOOL_REFORGE_ENTRY_IDS).includes(item.id)) {
    const selected = selectedFarmingToolReforge(target, raw.profile?.toolReforges?.[toolKeyForCropId(cropId(raw))]);
    return selected && FARMING_TOOL_REFORGE_ENTRY_IDS[selected] === item.id ? 1 : 0;
  }
  return Math.max(0, Math.min(Number(item.max || 1), Number(target.levels[item.id] || 0)));
}

function clearExclusivePeers(raw, item) {
  for (const group of EXCLUSIVE_ENTRY_GROUPS) {
    if (!group.members.includes(item.id)) continue;
    for (const peerId of group.members) {
      if (peerId === item.id) continue;
      const peer = UPGRADES.find(entry => entry.id === peerId);
      if (!peer) continue;
      const target = bucket(raw, peer);
      delete target.levels[peer.id];
      delete target.owned[peer.id];
    }
  }
}

function writeLevel(raw, item, value) {
  const target = bucket(raw, item);
  const next = Math.max(0, Math.min(Number(item.max || 1), Math.floor(Number(value) || 0)));
  const reforge = Object.entries(FARMING_TOOL_REFORGE_ENTRY_IDS).find(([, id]) => id === item.id)?.[0];
  if (reforge) {
    applyFarmingToolReforge(target, next > 0 ? reforge : null);
    return writeStoredAppState(raw);
  }
  if (next > 0) {
    clearExclusivePeers(raw, item);
    target.levels[item.id] = next;
    target.owned[item.id] = true;
  } else {
    delete target.levels[item.id];
    delete target.owned[item.id];
  }
  return writeStoredAppState(raw);
}

function commit(item, updater) {
  const raw = load();
  const current = level(raw, item);
  writeLevel(raw, item, updater(current));
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function binaryControl(item, current) {
  const on = current > 0;
  return `<button type="button" class="sb-card-switch ${on ? 'on' : ''}" data-direct-value="${on ? 0 : 1}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${item.name}: ${on ? 'on' : 'off'}">
    <span class="sb-card-switch-track" aria-hidden="true"><span class="sb-card-switch-knob"></span></span>
    <span class="sb-card-switch-label">${on ? 'ON' : 'OFF'}</span>
  </button>`;
}

function chainControl(item, current, max) {
  return `<span class="sb-card-chain" role="group" aria-label="${item.name} level">${Array.from({ length: max + 1 }, (_, value) =>
    `<button type="button" class="sb-card-stage ${value === current ? 'selected' : ''}" data-direct-value="${value}" aria-pressed="${value === current ? 'true' : 'false'}">${value}</button>`
  ).join('')}</span>`;
}

function enhance(card) {
  if (card.dataset.directReady === '1') return;
  const item = UPGRADES.find(entry => entry.id === card.dataset.open);
  if (!item || DERIVED_ONLY_SECTIONS.has(item.section)) {
    if (item) card.dataset.derivedOnly = '1';
    return;
  }

  const raw = load();
  const current = level(raw, item);
  const max = Math.max(1, Number(item.max || 1));
  const bar = document.createElement('span');
  bar.className = 'sb-card-controls';
  bar.dataset.directFor = item.id;
  bar.innerHTML = max === 1
    ? binaryControl(item, current)
    : chainControl(item, current, max);

  card.dataset.directReady = '1';
  card.append(bar);

  bar.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const direct = event.target.closest('[data-direct-value]');
    if (direct) {
      commit(item, () => Number(direct.dataset.directValue));
      return;
    }
  });
}

function apply() {
  document.querySelectorAll('.item-card[data-open]').forEach(enhance);
}

function boot() {
  apply();
  const root = document.querySelector('#app');
  if (!root) return;
  new MutationObserver(() => queueMicrotask(apply)).observe(root, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
