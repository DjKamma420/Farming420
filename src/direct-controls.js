import { UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { EXCLUSIVE_ENTRY_GROUPS } from './exclusivity.js';

const SMALL_CHAIN_MAX = 10;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
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
  return Math.max(0, Math.min(Number(item.max || 1), Number(bucket(raw, item).levels[item.id] || 0)));
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
  if (next > 0) {
    clearExclusivePeers(raw, item);
    target.levels[item.id] = next;
    target.owned[item.id] = true;
  } else {
    delete target.levels[item.id];
    delete target.owned[item.id];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

function commit(item, updater) {
  const raw = load();
  const current = level(raw, item);
  writeLevel(raw, item, updater(current));
  window.location.reload();
}

function binaryControl(item, current) {
  return `<button type="button" class="sb-card-power ${current ? 'on' : ''}" data-direct-value="${current ? 0 : 1}" aria-pressed="${current ? 'true' : 'false'}">${current ? 'ON' : 'OFF'}</button>`;
}

function chainControl(item, current, max) {
  return `<span class="sb-card-chain" role="group" aria-label="${item.name} level">${Array.from({ length: max + 1 }, (_, value) =>
    `<button type="button" class="sb-card-stage ${value === current ? 'selected' : ''}" data-direct-value="${value}" aria-pressed="${value === current ? 'true' : 'false'}">${value}</button>`
  ).join('')}</span>`;
}

function stepperControl(current, max) {
  return `<button type="button" class="sb-card-minus" data-direct-step="-1" aria-label="Decrease">−</button><span class="sb-card-level">${current}/${max}</span><button type="button" class="sb-card-plus" data-direct-step="1" aria-label="Increase">+</button>`;
}

function enhance(card) {
  if (card.dataset.directReady === '1') return;
  const item = UPGRADES.find(entry => entry.id === card.dataset.open);
  if (!item) return;

  const raw = load();
  const current = level(raw, item);
  const max = Math.max(1, Number(item.max || 1));
  const bar = document.createElement('span');
  bar.className = 'sb-card-controls';
  bar.dataset.directFor = item.id;
  bar.innerHTML = max === 1
    ? binaryControl(item, current)
    : max <= SMALL_CHAIN_MAX
      ? chainControl(item, current, max)
      : stepperControl(current, max);

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
    const step = event.target.closest('[data-direct-step]');
    if (step) commit(item, value => Math.max(0, Math.min(max, value + Number(step.dataset.directStep))));
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
