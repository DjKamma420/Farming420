import { UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';

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

function setLevel(item, value) {
  const raw = load();
  const target = bucket(raw, item);
  const next = Math.max(0, Math.min(Number(item.max || 1), Math.floor(Number(value) || 0)));
  if (next) {
    target.levels[item.id] = next;
    target.owned[item.id] = true;
  } else {
    delete target.levels[item.id];
    target.owned[item.id] = false;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function enhance(card) {
  if (card.dataset.directReady === '1') return;
  const item = UPGRADES.find(entry => entry.id === card.dataset.open);
  if (!item) return;
  card.dataset.directReady = '1';

  const raw = load();
  const current = level(raw, item);
  const max = Math.max(1, Number(item.max || 1));
  const bar = document.createElement('span');
  bar.className = 'sb-card-controls';
  bar.innerHTML = max === 1
    ? `<span class="sb-card-power ${current ? 'on' : ''}" data-direct-power="${item.id}">${current ? 'ON' : 'OFF'}</span>`
    : `<span class="sb-card-minus" data-direct-minus="${item.id}">−</span><span class="sb-card-level">${current}/${max}</span><span class="sb-card-plus" data-direct-plus="${item.id}">+</span>`;
  card.append(bar);

  bar.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (event.target.closest('[data-direct-power]')) setLevel(item, current ? 0 : 1);
    if (event.target.closest('[data-direct-minus]')) setLevel(item, current - 1);
    if (event.target.closest('[data-direct-plus]')) setLevel(item, Math.max(1, current + 1));
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
