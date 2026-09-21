import { CROPS, UPGRADES, HIDDEN_INTERACTIONS, COMING_SOON } from './data.js';
import { FARMING_ACCESSORY_GROUPS, farmingAccessoryByItemId } from './farming-accessories.js';
import { accessoryCapabilityState } from './accessory-capabilities.js';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { computeStatTotals } from './computed-stats.js';
import { activityLabel, activityModeForState } from './activity-mode.js';
import { ensureProgressBucket, migrateState, toolKeyForCropId } from './migrations.js';
import { applySnapshotToProgress, isAutoApplied } from './snapshot-apply.js';
import { LOCATION_STATUS, isSyncFilled, locationFor, manualEntries, manualEntrySummary } from './help-locations.js';
import {
  ARMOR_CHAIN,
  ENCHANT_LADDERS,
  PET_OPTIONS,
  PHASE_LOADOUTS,
  PROGRESSION_SOURCE,
  STAGES,
  TIER_LABEL,
  armorProgress,
  nextArmorSet,
  stageForLevel,
} from './progression.js';
import { EXCLUSIVE_ENTRY_GROUPS } from './exclusivity.js';
import {
  TOOL_PANEL,
  assertToolPanelEntries,
  enchantRowsFor,
  gemOptionValues,
  itemSummary,
  levelControlFor,
  toolPanelEntryIds,
  parseGem,
  rarityClass,
  withEnchantLevel,
  withEnchantToggled,
} from './item-editor.js';
import {
  ITEM_SOURCE,
  SETUP_SLOTS,
  activeSetup,
  createEmptyItem,
  createSetup,
  nextSetupId,
  normalizeSetups,
  prefillSetupFromSnapshot,
  setupSummary,
} from './setups.js';
import {
  intrinsicEnchantmentsForCatalogItem,
  itemsForSlot,
  loadItemCatalog,
  readCachedCatalog,
  reforgeOptions,
  slotHasOfficialCategory,
} from './item-catalog.js';
import {
  backupFilename,
  createBackupPayload,
  downloadJson,
  readJsonFile,
  validateBackupPayload,
} from './backup.js';

const NAV = [
  ['dashboard', 'Dashboard'],
  ['account', 'Account'],
  ['accessories', 'Accessories'],
  ['crops', 'Crops'],
  ['tools', 'Tools'],
  ['setups', 'Setups'],
  ['gear', 'Gear'],
  ['pets', 'Pets'],
  ['chips', 'Garden Chips'],
  ['shards', 'Shards'],
  ['buffs', 'Buffs'],
  ['pests', 'Pests'],
  ['guide', 'Guide 0-60'],
  ['setup', 'What to enter'],
  ['planner', 'Upgrade Planner'],
  ['research', 'Mechanics'],
  ['coming', 'Coming Soon'],
];

const defaultState = {
  schemaVersion: DATA_SCHEMA_VERSION,
  page: 'dashboard',
  selectedCrop: 'melon',
  search: '',
  drawer: null,
  profile: {
    name: 'My Profile',
    globalFortune: 0,
    cropFortune: {},
    cropProgress: {},
    toolProgress: {},
    levels: {},
    owned: {},
    costs: {},
    manualGain: {},
    accessoryItems: {},
  }
};

function loadState() {
  let saved;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    saved = JSON.parse(raw);
  } catch {
    return structuredClone(defaultState);
  }

  const migration = migrateState(saved);
  const loaded = {
    ...structuredClone(defaultState),
    ...migration.state,
    profile: { ...structuredClone(defaultState.profile), ...(migration.state.profile || {}) }
  };
  loaded.schemaVersion = migration.schemaVersion;

  // Data written by a newer app version is kept readable but never saved over.
  readOnlyState = migration.isNewer;
  if (readOnlyState) {
    console.warn(`Farming420: stored data uses schema ${migration.schemaVersion}, this build understands ${DATA_SCHEMA_VERSION}. Local changes are not saved.`);
  } else if (migration.applied.length) {
    migrationApplied = true;
  }
  for (const warning of migration.warnings) console.warn(`Farming420 migration: ${warning}`);

  return loaded;
}

let readOnlyState = false;
let migrationApplied = false;
let state = loadState();

let activeScrollAnchor = null;
let scrollAnchorRestoreFrame = 0;
const SCROLL_ANCHOR_MAX_AGE_MS = 1800;
const SCROLL_ANCHOR_CONTROL_SELECTOR = 'button, input, select, textarea, a, label, [role="button"], [role="radio"]';

function scrollAnchorElement(target) {
  if (!target?.closest) return null;
  let element = target.closest(SCROLL_ANCHOR_CONTROL_SELECTOR) || target;
  if (element?.tagName === 'LABEL') {
    element = element.querySelector('input, select, textarea, button') || element;
  }
  return element instanceof Element ? element : null;
}

function scrollAnchorPath(root, element) {
  const path = [];
  let node = element;
  while (node && node !== root) {
    const parent = node.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, node));
    node = parent;
  }
  return node === root ? path : null;
}

function describeScrollAnchor(root, element) {
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || '',
    attrs: [...element.attributes]
      .filter(attr => attr.name.startsWith('data-') || ['name', 'value', 'type'].includes(attr.name))
      .map(attr => [attr.name, attr.value]),
    path: scrollAnchorPath(root, element),
  };
}

function matchesScrollAnchor(element, descriptor) {
  if (!(element instanceof Element) || element.tagName.toLowerCase() !== descriptor.tag) return false;
  return (descriptor.attrs || []).every(([name, value]) => element.getAttribute(name) === value);
}

function resolveScrollAnchor(root, descriptor) {
  if (!root || !descriptor) return null;

  if (descriptor.id) {
    const byId = document.getElementById(descriptor.id);
    if (byId && root.contains(byId) && matchesScrollAnchor(byId, descriptor)) return byId;
  }

  if (descriptor.attrs?.length) {
    for (const candidate of root.querySelectorAll(descriptor.tag)) {
      if (matchesScrollAnchor(candidate, descriptor)) return candidate;
    }
  }

  let node = root;
  for (const index of descriptor.path || []) {
    node = node?.children?.[index] || null;
    if (!node) return null;
  }
  return matchesScrollAnchor(node, descriptor) ? node : null;
}

function currentScrollAnchor() {
  if (!activeScrollAnchor) return null;
  if (Date.now() - activeScrollAnchor.capturedAt <= SCROLL_ANCHOR_MAX_AGE_MS) return activeScrollAnchor;
  activeScrollAnchor = null;
  return null;
}

function clearScrollAnchor() {
  activeScrollAnchor = null;
  if (scrollAnchorRestoreFrame) {
    cancelAnimationFrame(scrollAnchorRestoreFrame);
    scrollAnchorRestoreFrame = 0;
  }
}

function restoreRelativeScrollAnchor(anchor = currentScrollAnchor()) {
  if (!anchor || anchor !== currentScrollAnchor() || anchor.page !== state.page) return false;

  const root = document.getElementById('app');
  const element = resolveScrollAnchor(root, anchor.descriptor);
  if (!element) return false;

  const delta = element.getBoundingClientRect().top - anchor.viewportTop;
  if (Math.abs(delta) < 0.5) return true;

  const main = document.querySelector('#app .main');
  const overflowY = main ? getComputedStyle(main).overflowY : '';
  const mainScrolls = Boolean(
    main
    && main.scrollHeight > main.clientHeight + 1
    && /auto|scroll|overlay/.test(overflowY),
  );

  if (mainScrolls) main.scrollTop += delta;
  else window.scrollBy(0, delta);
  return true;
}

function scheduleScrollAnchorRestore(anchor = currentScrollAnchor()) {
  if (!anchor) return;

  queueMicrotask(() => {
    if (anchor === currentScrollAnchor()) restoreRelativeScrollAnchor(anchor);
  });

  if (scrollAnchorRestoreFrame) return;
  scrollAnchorRestoreFrame = requestAnimationFrame(() => {
    scrollAnchorRestoreFrame = 0;
    if (anchor !== currentScrollAnchor()) return;
    restoreRelativeScrollAnchor(anchor);
    requestAnimationFrame(() => {
      if (anchor === currentScrollAnchor()) restoreRelativeScrollAnchor(anchor);
    });
  });
}

function rememberScrollAnchor(target) {
  const root = document.getElementById('app');
  const element = scrollAnchorElement(target);
  if (!root || !element || !root.contains(element)) return;

  activeScrollAnchor = {
    page: state.page,
    capturedAt: Date.now(),
    viewportTop: element.getBoundingClientRect().top,
    descriptor: describeScrollAnchor(root, element),
  };
  scheduleScrollAnchorRestore(activeScrollAnchor);
}

function captureInteractionScrollAnchor(event) {
  rememberScrollAnchor(event.target);
}

if (typeof document !== 'undefined') {
  for (const type of ['click', 'change', 'input']) {
    document.addEventListener(type, captureInteractionScrollAnchor, true);
  }

  const appRoot = document.getElementById('app');
  if (appRoot && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => scheduleScrollAnchorRestore()).observe(appRoot, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }
}

function saveState() {
  if (readOnlyState) return;
  state.schemaVersion = DATA_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Persist the migrated shape once, so the next load starts from the new schema.
if (migrationApplied) saveState();

function esc(s='') {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function crop() {
  return CROPS.find(c => c.id === state.selectedCrop) || CROPS[0];
}

function isCropScopedItem(item) {
  return item.section === 'crops' || item.section === 'tools';
}

/** The autoApplied scope key an entry is recorded under, matching itemStore. */
function autoScopeKey(item) {
  if (item.section === 'crops') return `crop:${state.selectedCrop}`;
  if (item.section === 'tools') return `tool:${toolKeyForCropId(state.selectedCrop)}`;
  return 'account';
}

function isSynced(item) {
  return isAutoApplied(state, autoScopeKey(item), item.id);
}

function itemStore(item) {
  if (item.section === 'crops') {
    state.profile.cropProgress ||= {};
    return ensureProgressBucket(state.profile.cropProgress, state.selectedCrop);
  }
  if (item.section === 'tools') {
    state.profile.toolProgress ||= {};
    return ensureProgressBucket(state.profile.toolProgress, toolKeyForCropId(state.selectedCrop));
  }
  return state.profile;
}

function currentLevel(item) {
  const store = itemStore(item);
  return Math.max(0, Math.min(Number(item.max || 1), Number(store.levels[item.id] || 0)));
}

function isOwned(item) {
  const store = itemStore(item);
  return Boolean(store.owned[item.id]) || currentLevel(item) > 0;
}

function isMaxed(item) {
  return currentLevel(item) >= Number(item.max || 1);
}

function appliesToCrop(item) {
  return item.cropScope === 'Any' || item.cropScope === crop().name;
}

function visibleUpgrades(section) {
  const term = state.search.trim().toLowerCase();
  return UPGRADES.filter(item => {
    const inSection = section ? item.section === section : true;
    const matches = !term || `${item.name} ${item.category} ${item.notes}`.toLowerCase().includes(term);
    return inSection && matches;
  });
}

function gainFor(item) {
  const manual = itemStore(item).manualGain[item.id];
  if (manual !== undefined && manual !== '' && !Number.isNaN(Number(manual))) return Number(manual);
  if (item.name === 'Switch to best farming pet') return item.rawMarginal || 0;
  return Number(item.stepGain || item.rawMarginal || 0);
}

function effectiveFortune() {
  return Number(state.profile.globalFortune || 0) + Number(state.profile.cropFortune[state.selectedCrop] || 0);
}

function relativeGainPct(item) {
  const g = gainFor(item);
  if (!g) return 0;
  if (item.metric === 'Crop Yield') {
    const denom = 100 + effectiveFortune();
    return denom > 0 ? (g / denom) * 100 : 0;
  }
  return g;
}

function plannerCandidates() {
  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(appliesToCrop)
    .filter(item => !isMaxed(item))
    .map(item => {
      const gain = gainFor(item);
      const cost = Number(itemStore(item).costs[item.id] || 0);
      const rel = relativeGainPct(item);
      const efficiency = cost > 0 ? rel / (cost / 1_000_000) : null;
      return { item, gain, rel, cost, efficiency };
    })
    .filter(x => x.gain > 0)
    .sort((a,b) => {
      const ae = a.efficiency ?? -1;
      const be = b.efficiency ?? -1;
      if (ae !== be) return be - ae;
      return b.rel - a.rel;
    });
}

function badge(text, cls='') {
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

function statusClass(item) {
  if (item.status === 'VERIFY') return 'verify';
  if (isMaxed(item)) return 'maxed';
  if (isOwned(item)) return 'owned';
  return 'missing';
}

function card(item, compact=false) {
  const level = currentLevel(item);
  const max = Number(item.max || 1);
  const status = statusClass(item);
  const gain = gainFor(item);
  const cropLimited = item.cropScope !== 'Any';
  const isShard = item.section === 'shards' || item.category === 'Attribute Shard';
  return `
    <button class="item-card ${status} ${isShard ? 'shard-card' : ''} ${compact ? 'compact' : ''}" data-open="${esc(item.id)}">
      <div class="card-layer"></div>
      <div class="card-head">
        ${item.packAsset || isShard ? `<span class="card-portrait${isShard ? ' shard-portrait' : ''}"${item.packAsset ? ` data-pack-asset="${esc(item.packAsset)}"` : ''}></span>` : ''}
        <div>
          <div class="eyebrow">${esc(item.category)}</div>
          <div class="item-title">${esc(item.name)}</div>
        </div>
        ${badge(item.status === 'VERIFY' ? 'verify' : (isMaxed(item) ? 'max' : isOwned(item) ? 'owned' : 'missing'), status)}
        ${isSynced(item) ? badge('derived', 'synced') : ''}
      </div>
      <div class="card-meta">
        ${max > 1 ? `<span>Level ${level}/${max}</span>` : `<span>${isOwned(item) ? 'Owned' : 'Not set'}</span>`}
        ${gain ? `<span>+${Number(gain).toLocaleString('en-US')} ${esc(item.metric === 'Crop Yield' ? 'Fortune/step' : item.metric)}</span>` : '<span>dynamic</span>'}
      </div>
      <div class="progress"><i data-progress="${Math.min(100,(level/max)*100)}"></i></div>
      <div class="chips">
        ${item.attribute ? badge(item.attribute, 'soft') : ''}
        ${isCropScopedItem(item) ? badge(crop().name, 'soft') : (cropLimited ? badge(item.cropScope, 'soft') : '')}
        ${item.hypercharge ? badge('Hypercharge', 'soft') : ''}
        ${item.modeScope !== 'Any' ? badge(item.modeScope, 'soft') : ''}
      </div>
    </button>`;
}

function shell(content) {
  const currentCrop = crop();
  return `
  <div class="app-shell">
    <aside class="sidebar">
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="primaryNav" aria-label="Open navigation"><span aria-hidden="true">⋮</span></button>
      <div class="brand">
        <div class="brand-mark">F4</div>
        <div><strong>Farming420</strong><span>SkyBlock Farming Planner</span></div>
      </div>
      <nav id="primaryNav" aria-label="Main navigation">
        ${NAV.map(([id,label]) => `<button class="nav-link ${state.page===id?'active':''}" data-page="${id}">${esc(label)}</button>`).join('')}
        <button class="nav-link" type="button" data-nav-id="settings" data-open-settings>Settings</button>
      </nav>
      <div class="side-foot">
        <div class="mini-label">Profile</div>
        <input id="profileName" value="${esc(state.profile.name)}" />
        <button class="ghost small" id="exportBtn">Export backup</button>
        <label class="ghost small file-label">Restore backup<input id="importInput" type="file" accept="application/json,.json" hidden></label>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="mobile-title">Farming420</div>
        <div class="crop-switch">
          <span>Crop</span>
          <select id="cropSelect">
            ${CROPS.map(c => `<option value="${c.id}" ${c.id===state.selectedCrop?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="search-wrap"><input id="search" placeholder="Search item, upgrade or effect…" value="${esc(state.search)}" /></div>
      </header>
      <section class="content">${content}</section>
    </main>
    ${drawer()}
  </div>`;
}

function pageHeader(kicker, title, text='') {
  return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1>${text?`<p>${esc(text)}</p>`:''}</div></div>`;
}

function dashboard() {
  const mode = activityModeForState(state);
  const selectedCrop = crop();
  const stats = computeStatTotals(state, selectedCrop.id, mode);
  const marker = count => count ? ' ~' : '';
  const number = value => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const sourceNote = (values, axis) => {
    const sources = Number(values.sourceCount?.[axis] || 0);
    const unresolved = values.incomplete?.[axis]?.length || 0;
    if (!sources) return 'No configured sources in this context';
    if (unresolved) return `${sources} configured source${sources === 1 ? '' : 's'} · ${unresolved} unresolved`;
    return `${sources} configured source${sources === 1 ? '' : 's'} · fully modeled`;
  };
  const cropRows = CROPS.map(entry => {
    const values = computeStatTotals(state, entry.id, mode);
    const totalFortune = values.globalFortune + values.cropFortune;
    const totalIncomplete = values.incomplete.globalFortune.length
      + values.incomplete.cropFortune.length;
    const incomplete = totalIncomplete
      + values.incomplete.overbloom.length
      + values.incomplete.bonusPestChance.length;
    const configured = Number(values.sourceCount?.globalFortune || 0)
      + Number(values.sourceCount?.cropFortune || 0)
      + Number(values.sourceCount?.overbloom || 0)
      + Number(values.sourceCount?.bonusPestChance || 0);
    return `
      <article class="stat-card dashboard-crop-result ${entry.id === selectedCrop.id ? 'selected' : ''}">
        <span>${esc(entry.name)}</span>
        <strong>${number(totalFortune)} FF${marker(totalIncomplete)}</strong>
        <small>Global FF ${number(values.globalFortune)} · Crop FF ${number(values.cropFortune)}</small>
        <small>Overbloom ${number(values.overbloom)}${marker(values.incomplete.overbloom.length)} · BPC ${number(values.bonusPestChance)}${marker(values.incomplete.bonusPestChance.length)}</small>
        ${incomplete
          ? '<small>~ contains sources that are not fully modeled yet</small>'
          : configured
            ? '<small>fully calculated from configured sources</small>'
            : '<small>No configured sources in this context</small>'}
      </article>`;
  }).join('');

  return `
    ${pageHeader('Dashboard', 'Calculated Farming Stats', `Read-only result overview · ${activityLabel(mode)}. Global values are shown above; crop totals are listed below.`)}
    <div class="card-grid dashboard-results-grid">
      <article class="stat-card">
        <span>Global Farming Fortune</span>
        <strong>${number(stats.globalFortune)}${marker(stats.incomplete.globalFortune.length)}</strong>
        <small>Account-wide Fortune before crop-specific Fortune is added</small>
        <small>${sourceNote(stats, 'globalFortune')}</small>
      </article>
      <article class="stat-card">
        <span>Pest Fortune</span>
        <strong>${number(stats.pestFortune)}${marker(stats.incomplete.pestFortune.length)}</strong>
        <small>Pest/Vacuum Fortune in the active context</small>
        <small>${sourceNote(stats, 'pestFortune')}</small>
      </article>
      <article class="stat-card">
        <span>Overbloom</span>
        <strong>${number(stats.overbloom)}${marker(stats.incomplete.overbloom.length)}</strong>
        <small>Calculated rare-crop multiplier stat</small>
        <small>${sourceNote(stats, 'overbloom')}</small>
      </article>
      <article class="stat-card">
        <span>Bonus Pest Chance</span>
        <strong>${number(stats.bonusPestChance)}${marker(stats.incomplete.bonusPestChance.length)}</strong>
        <small>Calculated BPC for the active set</small>
        <small>${sourceNote(stats, 'bonusPestChance')}</small>
      </article>
    </div>

    <div class="section-row">
      <div>
        <h2>All crops</h2>
        <p>Each crop total is Global Farming Fortune + that crop's own Crop Fortune. The selected crop is highlighted.</p>
      </div>
    </div>
    <div class="card-grid dashboard-crop-results">${cropRows}</div>
  `;
}

function accountPage() {
  const groups = [
    ['Account & Skill',['Account/Skill','Account Upgrade','Anita']],
    ['Garden',['Garden','Greenhouse']],
    ['Permanent account items',['Consumable','Chocolate Factory']]
  ];
  return `${pageHeader('Account', 'Global Account Progression', 'Progress that is not bound to one crop or one physical farming tool.')}
    <div class="input-strip">
      <label>Global Farming Fortune<input type="number" id="globalFortune" value="${Number(state.profile.globalFortune||0)}"></label>
      ${inputHint('input:globalFortune', 'Used only for relative upgrade evaluation. Ownership remains a separate state.')}
    </div>
    ${groups.map(([title,cats]) => `<div class="group"><div class="section-row"><div><h2>${title}</h2></div></div><div class="card-grid">${visibleUpgrades('account').filter(x=>cats.includes(x.category)).map(x=>card(x)).join('')}</div></div>`).join('')}`;
}

function accessoryItemState(accessory) {
  return state.profile.accessoryItems?.[accessory.itemId] || {};
}

function accessoryCatalogRecord(accessory) {
  return itemCatalog.find(item => String(item?.id || '').toUpperCase() === accessory.itemId) || null;
}

function accessoryCatalogCard(accessory) {
  const upgrade = accessory.upgradeId
    ? UPGRADES.find(item => item.id === accessory.upgradeId)
    : null;
  const status = upgrade ? statusClass(upgrade) : '';
  const itemState = accessoryItemState(accessory);
  const capability = accessoryCapabilityState(accessory, itemState, accessoryCatalogRecord(accessory));
  const synced = itemState.source === 'hypixel-sync';
  const rarityText = itemState.recombobulated && capability.baseRarity !== capability.effectiveRarity
    ? `${capability.baseRarity} → ${capability.effectiveRarity}`
    : capability.effectiveRarity;
  const stateBadge = synced
    ? badge('profile sync', 'synced')
    : upgrade
      ? badge(isMaxed(upgrade) ? 'owned' : 'not set', isMaxed(upgrade) ? 'maxed' : 'missing')
      : badge('manual state', 'soft');

  return `<article class="item-card accessory-catalog-card ${status}" data-accessory-item-id="${esc(accessory.itemId)}">
    <div class="card-layer"></div>
    <div class="card-head">
      <span class="card-portrait accessory-portrait" aria-hidden="true"></span>
      <div>
        <div class="eyebrow">${esc(rarityText)} · ${esc(accessory.itemId)}</div>
        <div class="item-title">${esc(accessory.name)}</div>
      </div>
      ${stateBadge}
    </div>
    <p class="accessory-effect">${esc(accessory.effect)}</p>
    <div class="chips">
      ${badge(accessory.condition, 'soft')}
      ${badge(itemState.recombobulated ? 'recombobulated' : 'base rarity', itemState.recombobulated ? 'owned' : 'soft')}
    </div>
    <div class="accessory-upgrades">
      <label class="accessory-upgrade-row">
        <span><strong>Recombobulator 3000</strong><small>Raises this accessory by exactly one rarity.</small></span>
        <input type="checkbox" data-accessory-recomb="${esc(accessory.itemId)}" ${itemState.recombobulated ? 'checked' : ''} ${capability.canRecombobulate ? '' : 'disabled'}>
      </label>
      ${upgrade ? `<button class="ghost small accessory-progression-btn" type="button" data-open="${esc(upgrade.id)}">Open calculator progression</button>` : ''}
    </div>
  </article>`;
}

function accessoriesPage() {
  const term = state.search.trim().toLowerCase();
  const groups = FARMING_ACCESSORY_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => !term
      || `${item.name} ${item.itemId} ${item.effect} ${item.condition}`.toLowerCase().includes(term)),
  })).filter(group => group.items.length);

  return `${pageHeader('Accessories', 'Farming Accessories', 'Accessory progression keeps the physical item, effective rarity and Recombobulator state.')}
    <div class="accessory-model-note">
      <strong>Exact item model and rarity</strong>
      <span>Live Hypixel item metadata wins. Exact current player-head hashes are used as an offline fallback. A Recombobulator raises the accessory by exactly one rarity and is tracked per physical accessory.</span>
    </div>
    ${groups.length ? groups.map(group => `
      <section class="accessory-group" data-accessory-group="${esc(group.id)}">
        <div class="section-row"><div><h2>${esc(group.title)}</h2><p>${esc(group.note)}</p></div></div>
        <div class="card-grid accessory-grid">${group.items.map(accessoryCatalogCard).join('')}</div>
      </section>
    `).join('') : '<div class="empty">No farming accessories match the current search.</div>'}`;
}

function cropFocusCard() {
  const c = crop();
  const specific = UPGRADES.filter(x => x.section === 'crops' && appliesToCrop(x));
  const toolSpecific = UPGRADES.filter(x=>x.section==='tools');
  const complete = specific.filter(isMaxed).length + toolSpecific.filter(isMaxed).length;
  const total = specific.length + toolSpecific.length;
  return `<button class="crop-feature" data-page="crops">
    <div class="crop-icon">${esc(c.icon)}</div>
    <div><div class="eyebrow">${esc(c.name)}</div><h3>${esc(c.tool)}</h3><p>${complete}/${total} related layers completed</p></div>
    <div class="crop-arrow">→</div>
  </button>`;
}

function cropsPage() {
  return `${pageHeader('Crops', 'Crop progression', 'Select a crop to track only the Fortune and progression that belong directly to that crop. Tool and loadout settings live on their own pages.')}
    <div class="crop-grid">
      ${CROPS.map(c => {
        const selected = c.id===state.selectedCrop;
        const cf = Number(state.profile.cropFortune[c.id]||0);
        return `<button class="crop-card ${selected?'selected':''}" data-crop="${c.id}">
          <div class="crop-icon large">${esc(c.icon)}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.tool)}</p><span>${cf} Crop Fortune</span></div>
        </button>`;
      }).join('')}
    </div>
    <div class="crop-detail-panel">
      <div class="section-row"><div><div class="eyebrow">Active crop</div><h2>${esc(crop().name)}</h2><p>Crop-specific progression and Fortune</p></div>
      <label class="inline-input">Crop Fortune<input type="number" id="cropFortune" value="${Number(state.profile.cropFortune[state.selectedCrop]||0)}"></label></div>
      ${inputHint('input:cropFortune', `Crop-specific Fortune for ${crop().name}, kept separate from your global total.`)}
      <div class="crop-scope-addon">
        <div>
          <div class="eyebrow">This page</div>
          <strong>Only bonuses that belong to ${esc(crop().name)}</strong>
          <p>Tool reforges, enchantments and gemstones are edited under Tools. Armor, equipment and pets are edited in Setups.</p>
        </div>
        <div class="crop-related-actions-addon">
          <button class="ghost" data-page="tools">Open ${esc(crop().tool)}</button>
          <button class="ghost" data-page="setups">Open active setup</button>
        </div>
      </div>
      <div class="section-row crop-progression-head-addon"><div><h2>${esc(crop().name)} progression</h2><p>Only crop-scoped sources are listed here.</p></div></div>
      <div class="card-grid">${visibleUpgrades('crops').filter(appliesToCrop).map(x=>card(x)).join('')}</div>
    </div>`;
}

// --- The physical tool, shown as one item -----------------------------------
// The cards below the panel stay the analysis surface: they carry the Fortune
// maths, the sources and the exclusivity rules. The panel is only a better way
// to say what is on the tool, and it writes to exactly the same stored values.
assertToolPanelEntries(UPGRADES.map(entry => entry.id));

const TOOL_PANEL_ENTRIES = new Map(UPGRADES.map(entry => [entry.id, entry]));

function setEntryLevel(item, level) {
  const store = itemStore(item);
  const max = Number(item.max || 1);
  const value = Math.max(0, Math.min(max, Math.floor(Number(level) || 0)));
  if (value <= 0) {
    delete store.levels[item.id];
    delete store.owned[item.id];
    return;
  }
  store.levels[item.id] = value;
  store.owned[item.id] = true;
}

/** Clears the other members of a group the game only lets you hold one of. */
function clearExclusivePeers(item) {
  for (const group of EXCLUSIVE_ENTRY_GROUPS) {
    if (!group.members.includes(item.id)) continue;
    for (const memberId of group.members) {
      if (memberId === item.id) continue;
      const peer = TOOL_PANEL_ENTRIES.get(memberId);
      if (peer) setEntryLevel(peer, 0);
    }
  }
}

function toolEntryLine(item) {
  const max = Number(item.max || 1);
  const level = currentLevel(item);
  const on = isOwned(item);
  const control = levelControlFor(max);
  const state = isMaxed(item) ? 'maxed' : on ? 'active' : 'missing';
  const gain = Number(item.stepGain || 0);

  const levelControl = control === 'lever'
    ? ''
    : control === 'select'
      ? `<select class="enchant-level" data-tool-level="${esc(item.id)}" ${on ? '' : 'disabled'}>
          ${Array.from({ length: max }, (_, index) => index + 1).map(value =>
            `<option value="${value}" ${value === level ? 'selected' : ''}>${esc(toRoman(value))}</option>`).join('')}
        </select>`
      : `<input class="enchant-level" type="number" min="1" max="${max}" value="${level || 1}" data-tool-level="${esc(item.id)}" ${on ? '' : 'disabled'}>`;

  return `<div class="enchant-line enchant-${esc(state)} ${on ? 'on' : 'off'}" data-tool-row="${esc(item.id)}">
      ${leverInput('data-tool-toggle', item.id, '', on, `${item.name} on this tool`)}
      <span class="enchant-name">${esc(item.name)}</span>
      ${levelControl || '<span></span>'}
      <span class="enchant-max">${max > 1 ? `max ${control === 'number' ? max : esc(toRoman(max))}` : gain ? `+${gain} FF` : 'owned or not'}</span>
    </div>`;
}

function toolItemPanel() {
  return `<div class="item-editor rarity-unknown" data-tool-editor="1">
    ${TOOL_PANEL.map(group => `<section class="item-editor-section">
      <div class="section-row"><div><h3>${esc(group.title)}</h3><p>${esc(group.note)}</p></div></div>
      <div class="enchant-grid">${group.entries.map(id => toolEntryLine(TOOL_PANEL_ENTRIES.get(id))).join('')}</div>
    </section>`).join('')}
  </div>`;
}

function bindToolPanel() {
  const rerender = () => { saveState(); render(); };
  document.querySelectorAll('[data-tool-toggle]').forEach(el => el.addEventListener('change', event => {
    const item = TOOL_PANEL_ENTRIES.get(el.dataset.toolToggle);
    if (!item) return;
    if (event.target.checked) clearExclusivePeers(item);
    // Turning a part on starts it at its first level, never at its maximum.
    setEntryLevel(item, event.target.checked ? Math.max(1, currentLevel(item)) : 0);
    rerender();
  }));
  document.querySelectorAll('[data-tool-level]').forEach(el => el.addEventListener('change', event => {
    const item = TOOL_PANEL_ENTRIES.get(el.dataset.toolLevel);
    if (!item) return;
    setEntryLevel(item, event.target.value);
    rerender();
  }));
}

function genericSectionPage(section, kicker, title, text) {
  const items = visibleUpgrades(section);
  const gridClass = section === 'shards' ? 'card-grid shard-gallery' : 'card-grid';
  return `${pageHeader(kicker,title,text)}
    <div class="filter-line">${badge(`${items.length} entries`,'soft')}</div>
    ${section === 'tools' && !state.search.trim() ? toolItemPanel() : ''}
    ${section === 'tools' ? '<div class="section-row"><div><h2>Every scored tool entry</h2><p>The same values, with the Fortune each one contributes and the source behind it.</p></div></div>' : ''}
    <div class="${gridClass}">${items.map(x=>card(x)).join('') || '<div class="empty">No matches.</div>'}</div>`;
}

function plannerPage() {
  const candidates = plannerCandidates().slice(0,20);
  return `${pageHeader('Planner', 'What should you do next?', 'The current prototype ranks marginal gain at your present Fortune level. The target system will rank profit, payback and unlock paths.')}
    <div class="planner-context">
      <div><span>Crop</span><strong>${esc(crop().name)}</strong></div>
      <div><span>Global FF</span><strong>${Number(state.profile.globalFortune||0)}</strong></div>
      <div><span>Crop FF</span><strong>${Number(state.profile.cropFortune[state.selectedCrop]||0)}</strong></div>
      <div><span>Effective</span><strong>${effectiveFortune()}</strong></div>
    </div>
    <div class="planner-list">
      ${candidates.map((x,i)=>`<button class="planner-row" data-open="${x.item.id}">
        <div class="rank">${i+1}</div>
        <div class="planner-main"><strong>${esc(x.item.name)}</strong><span>${esc(x.item.category)} · ${esc(x.item.metric)}</span></div>
        <div class="planner-number"><strong>+${x.gain.toLocaleString('en-US')}</strong><span>marginal</span></div>
        <div class="planner-number"><strong>${x.rel.toFixed(2)}%</strong><span>relative</span></div>
        <div class="planner-number"><strong>${x.cost?`${Math.round(x.cost).toLocaleString('en-US')} Coins`:'—'}</strong><span>${x.efficiency!==null?`${x.efficiency.toFixed(3)} / 1M`:'Cost missing'}</span></div>
      </button>`).join('') || '<div class="empty">No calculated upgrades for the current state.</div>'}
    </div>`;
}

// Thirty-six rules, four paragraphs each, was one wall of prose roughly four
// times taller than any other page. What you scan is the name and the effect;
// what you read when you care is why it is modeled separately and what the app
// does about it. So the first two stay open and the rest fold away.
//
// A <summary> must stay block-level: given `display: flex` it stops counting as
// the disclosure summary in Chromium and every card renders permanently open,
// which is the whole regression this avoids. The flex row lives on an inner div.
function researchCard(entry) {
  const needsAttention = entry.status === 'VERIFY';
  return `<details class="research-card" ${needsAttention ? 'open' : ''}>
    <summary>
      <div class="research-head">
        <div><div class="eyebrow">${esc(entry.status)}</div><h3>${esc(entry.name)}</h3></div>
        ${badge(entry.status, needsAttention ? 'verify' : 'soft')}
      </div>
      <p class="research-effect">${esc(entry.effect)}</p>
    </summary>
    <div class="research-body">
      <p><strong>Why separate:</strong> ${esc(entry.why)}</p>
      <p><strong>App logic:</strong> ${esc(entry.handling)}</p>
      <a href="${esc(entry.source)}" target="_blank" rel="noreferrer">Open source</a>
    </div>
  </details>`;
}

function researchPage() {
  const verify = HIDDEN_INTERACTIONS.filter(entry => entry.status === 'VERIFY').length;
  return `${pageHeader('Mechanics', 'Hidden and nonlinear effects', 'These rules are intentionally modeled separately instead of being treated as simple additive Fortune.')}
    <div class="filter-line">${badge(`${HIDDEN_INTERACTIONS.length} rules`, 'soft')}${verify ? ` ${badge(`${verify} need verifying`, 'verify')}` : ''}</div>
    <div class="research-list">${HIDDEN_INTERACTIONS.map(researchCard).join('')}</div>`;
}

function comingPage() {
  return `${pageHeader('Coming Soon', 'Announced but not included', 'These entries intentionally have zero planner weight until they are live and verified.')}
    <div class="research-list">${COMING_SOON.map(x=>`<article class="research-card coming"><div class="research-head"><div><div class="eyebrow">${esc(x.status)}</div><h3>${esc(x.name)}</h3></div>${badge('0 weight','coming')}</div><p>${esc(x.effect)}</p><p>${esc(x.notes)}</p><a href="${esc(x.source)}" target="_blank" rel="noreferrer">Open source</a></article>`).join('')}</div>`;
}

function drawer() {
  if (!state.drawer) return '';
  const item = UPGRADES.find(x=>x.id===state.drawer);
  if (!item) return '';
  const level = currentLevel(item);
  const max = Number(item.max||1);
  const store = itemStore(item);
  const cost = store.costs[item.id] ?? '';
  const manual = store.manualGain[item.id] ?? '';
  return `<div class="drawer-backdrop" data-close-drawer><aside class="drawer">
    <div class="drawer-top"><div><div class="eyebrow">${esc(item.category)}</div><h2>${esc(item.name)}</h2></div><button class="close" data-close-drawer>×</button></div>
    <div class="drawer-badges">${badge(item.status,item.status==='VERIFY'?'verify':'soft')} ${isCropScopedItem(item)?badge(crop().name,'soft'):(item.cropScope!=='Any'?badge(item.cropScope,'soft'):'')} ${item.modeScope!=='Any'?badge(item.modeScope,'soft'):''}</div>
    ${isSynced(item) ? '<div class="drawer-synced">Farming420 worked this value out for you, from your profile sync and your active setup. Editing it here overrides it until the next sync or setup change.</div>' : ''}
    <div class="drawer-section"><h3>Ownership & Level</h3>
      ${max>1 ? `<div class="stepper"><button data-step="-1" data-id="${item.id}">−</button><strong>${level}/${max}</strong><button data-step="1" data-id="${item.id}">+</button><button class="ghost small" data-max="${item.id}">Max</button></div>` : `<label class="switch-row"><span>Owned</span><input type="checkbox" data-owned="${item.id}" ${isOwned(item)?'checked':''}></label>`}
    </div>
    <div class="drawer-section"><h3>Evaluation</h3><div class="detail-grid"><div><span>Next step</span><strong>+${gainFor(item).toLocaleString('en-US')}</strong></div><div><span>Relative effect</span><strong>${relativeGainPct(item).toFixed(2)}%</strong></div></div>
      <label>Next cost (Coins)<input type="number" data-cost="${item.id}" value="${esc(cost)}" placeholder="optional"></label>
      <label>Manual marginal value<input type="number" step="0.01" data-manual="${item.id}" value="${esc(manual)}" placeholder="only for dynamic values"></label>
    </div>
    ${whereToFindSection(item)}
    <div class="drawer-section"><h3>Rule</h3><p>${esc(item.notes || 'No additional note.')}</p></div>
    <div class="drawer-section"><h3>Scope</h3><div class="detail-grid"><div><span>Metric</span><strong>${esc(item.metric)}</strong></div><div><span>Mode</span><strong>${esc(item.modeScope)}</strong></div><div><span>Crop</span><strong>${esc(item.cropScope)}</strong></div><div><span>Hypercharge</span><strong>${item.hypercharge?'Yes':'No'}</strong></div></div></div>
    ${item.source?`<a class="source-btn" href="${esc(item.source)}" target="_blank" rel="noreferrer">Open source</a>`:''}
  </aside></div>`;
}


/**
 * Tells the player where a value comes from: filled by a sync, found at a
 * documented in-game location, or still needing a look at the cited source.
 */
/** The location hint rendered next to a directly-typed number input. */
function inputHint(inputKey, fallback) {
  const location = locationFor(inputKey);
  if (!location.where) return `<div class="hint">${esc(fallback)}</div>`;
  return `<div class="hint"><strong>Where to find it:</strong> ${esc(location.where)}
    ${location.status === LOCATION_STATUS.UNVERIFIED ? '<span class="find-warn">(not yet confirmed against a current in-game capture)</span>' : ''}
    ${location.source ? `<a href="${esc(location.source)}" target="_blank" rel="noreferrer">Source</a>` : ''}
    <br>${esc(fallback)}</div>`;
}

function whereToFindSection(item) {
  const location = locationFor(item.id);
  if (location.status === LOCATION_STATUS.SYNCED) {
    return `<div class="drawer-section"><h3>Where do I find this?</h3>
      <p class="find-synced">${esc(location.where)}</p></div>`;
  }
  if (location.where) {
    const caveat = location.status === LOCATION_STATUS.UNVERIFIED
      ? `<p class="find-warn">Not yet confirmed against a current in-game capture.${location.note ? ` ${esc(location.note)}` : ''}</p>`
      : location.status === LOCATION_STATUS.NEEDS_RESEARCH
        ? '<p class="find-warn">This is practical lookup guidance. The exact route for this entry has not been individually verified, so use the source below for current unlock or acquisition details.</p>'
        : '';
    return `<div class="drawer-section"><h3>Where do I find this?</h3>
      <p>${esc(location.where)}</p>
      ${caveat}
      ${location.source ? `<a class="source-btn" href="${esc(location.source)}" target="_blank" rel="noreferrer">Open source</a>` : ''}</div>`;
  }
  return `<div class="drawer-section"><h3>Where do I find this?</h3>
    <p class="find-warn">Check the relevant SkyBlock or Garden menu, item tooltip, or active-effect screen for this value. Use the source below for the current unlock or acquisition route.</p>
    ${location.note ? `<p>${esc(location.note)}</p>` : ''}
    ${location.source ? `<a class="source-btn" href="${esc(location.source)}" target="_blank" rel="noreferrer">Open source</a>` : ''}</div>`;
}

function setupPage() {
  const summary = manualEntrySummary();
  const rows = manualEntries().filter(row => {
    const term = state.search.trim().toLowerCase();
    return !term || `${row.entry.name} ${row.entry.category} ${row.entry.notes}`.toLowerCase().includes(term);
  });
  // A search has already narrowed the set, so a search shows every match.
  const visibleFindRows = state.search.trim() ? rows.length : FIND_ROWS_VISIBLE;

  return `${pageHeader('What to enter', 'Values the sync cannot fill', 'A profile sync fills everything the Hypixel API exposes. These are the ones you still have to enter yourself, most valuable first.')}
    <div class="planner-context">
      <div><span>Entries total</span><strong>${summary.total}</strong></div>
      <div><span>Filled by sync</span><strong>${summary.synced}</strong></div>
      <div><span>You enter</span><strong>${summary.manual}</strong></div>
      <div><span>Already done</span><strong>${rows.filter(row => isOwned(row.entry)).length}/${rows.length}</strong></div>
    </div>
    <div class="find-list">
      ${findRows(rows.slice(0, visibleFindRows))}
    </div>
    ${rows.length > visibleFindRows ? `<details class="find-rest">
      <summary><div class="find-rest-head"><strong>${rows.length - visibleFindRows} more entries</strong>
        <span>Lower marginal value than the ones above. Same detail, folded away.</span></div></summary>
      <div class="find-list">${findRows(rows.slice(visibleFindRows))}</div>
    </details>` : ''}`;
}

// The page is ordered most-valuable-first and was showing all of it at once,
// which made it four times taller than any other page and buried its own
// headline. The top slice stays fully open -- notes, in-game location and all,
// because "where do I find this" is the question the page exists to answer --
// and the tail folds away rather than being cut.
//
// A search result is already a narrowed set, so a search shows every match.
const FIND_ROWS_VISIBLE = 12;

function findRows(rows) {
  return rows.map(row => {
        const done = isOwned(row.entry);
        const gain = Number(row.entry.stepGain || row.entry.rawMarginal || 0);
        return `<article class="find-row ${done ? 'done' : ''}">
          <div class="find-main">
            <div class="eyebrow">${esc(row.entry.category)}${row.entry.cropScope !== 'Any' ? ` \u00b7 ${esc(row.entry.cropScope)}` : ''}</div>
            <h3>${esc(row.entry.name)}</h3>
            <p>${esc(row.entry.notes || 'No additional note.')}</p>
            ${row.location.where ? `<p class="find-where">${esc(row.location.where)}</p>` : '<p class="find-warn">Check the relevant SkyBlock or Garden menu, item tooltip, or active-effect screen for this value, then use the source for current unlock or acquisition details.</p>'}
          </div>
          <div class="find-side">
            ${badge(done ? 'entered' : 'open', done ? 'maxed' : 'missing')}
            ${gain ? `<span class="find-gain">+${gain.toLocaleString('en-US')}</span>` : ''}
            <button class="ghost small" data-open="${esc(row.entry.id)}">Open</button>
            ${row.location.source ? `<a class="ghost small find-link" href="${esc(row.location.source)}" target="_blank" rel="noreferrer">Source</a>` : ''}
          </div>
        </article>`;
      }).join('') || '<div class="empty">No matches.</div>';
}

// --- Setups -----------------------------------------------------------------
// Item-centric gear editing: pick the piece, then its reforge, enchantments,
// recombobulator state and gemstones. Setups sit beside each other because they
// are alternatives a player cannot wear at once.

let itemCatalog = readCachedCatalog()?.items || [];
let catalogNotice = null;
// Tracks that a load was attempted at all. Keying the guard on the result
// instead would re-enter on every render whenever the resource came back empty
// or failed, because the re-render triggers the next attempt: an endless loop.
let catalogRequested = itemCatalog.length > 0;

function setups() {
  state.profile.setups = normalizeSetups(state.profile.setups);
  return state.profile.setups;
}

/**
 * Re-derives the progression cards from the current setup.
 *
 * The active setup is what the gear rules read, so a setup edit has to flow
 * through to the cards immediately rather than waiting for the next sync.
 */
function reapplyGear() {
  state.profile.lastApply = applySnapshotToProgress(state, state.profile.normalizedSnapshot || {});
}

function snapshot() {
  return state.profile.normalizedSnapshot || null;
}

function slotItem(slotId) {
  return activeSetup(setups()).slots[slotId] || null;
}

function writeSlot(slotId, item) {
  const all = setups();
  const current = all.list.find(entry => entry.id === all.activeId);
  current.slots[slotId] = item;
  saveState();
}

function optionList(options, current) {
  const values = options.map(option => option.value);
  if (current && !values.includes(current)) options = [{ value: current, source: 'manual' }, ...options];
  return options;
}

function slotCard(slot) {
  const item = slotItem(slot.id);
  const open = state.setupSlot === slot.id;

  return `<button class="slot-card ${item ? 'filled' : ''} ${open ? 'open' : ''} ${esc(rarityClass(item?.rarity))}" data-slot="${esc(slot.id)}">
      <span class="slot-portrait"><span class="item-portrait-fallback" aria-hidden="true">${esc(slot.label.slice(0, 2).toUpperCase())}</span></span>
      <span class="slot-text">
        <span class="eyebrow">${esc(slot.label)}</span>
        <strong>${esc(item?.displayName || 'Choose an item')}</strong>
        <span>${esc(itemSummary(slot.id, item))}</span>
      </span>
      ${item?.source === ITEM_SOURCE.SYNC ? badge('synced', 'synced') : ''}
    </button>`;
}

function toRoman(value) {
  const numerals = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = Math.max(0, Math.floor(Number(value) || 0));
  if (!rest) return '0';
  let out = '';
  for (const [size, numeral] of numerals) {
    while (rest >= size) { out += numeral; rest -= size; }
  }
  return out;
}

function leverInput(attribute, slotId, key, checked, label) {
  return `<label class="lever" title="${esc(label)}">
      <input type="checkbox" ${attribute}="${esc(slotId)}" ${key ? `data-ench-key="${esc(key)}"` : ''} ${checked ? 'checked' : ''}>
      <span class="lever-track" aria-hidden="true"></span>
      <span class="sr-only">${esc(label)}</span>
    </label>`;
}

function enchantLine(slotId, row) {
  const levels = row.maxLevel
    ? [...new Set([
      ...Array.from({ length: row.maxLevel }, (_, index) => index + 1),
      row.level,
    ].filter(value => value > 0))].sort((a, b) => a - b)
    : [...new Set([row.level, 1, 2, 3, 4, 5].filter(value => value > 0))].sort((a, b) => a - b);
  return `<div class="enchant-line enchant-${esc(row.state)} ${row.active ? 'on' : 'off'}" data-ench-row="${esc(row.storageKey)}">
      ${leverInput('data-ench-toggle', slotId, row.storageKey, row.active, `${row.label} on this item`)}
      <span class="enchant-name">${esc(row.label)}${row.kind === 'ultimate' ? '<em class="enchant-tag">ultimate</em>' : ''}${row.known ? '' : '<em class="enchant-tag unknown">not verified</em>'}</span>
      <select class="enchant-level" data-ench-select="${esc(slotId)}" data-ench-key="${esc(row.storageKey)}" data-ench-max="${row.maxLevel || 0}" ${row.active ? '' : 'disabled'}>
        ${levels.map(level => `<option value="${level}" ${level === row.level ? 'selected' : ''}>${esc(toRoman(level))}</option>`).join('')}
      </select>
      <span class="enchant-max">${row.maxLevel ? `max ${esc(toRoman(row.maxLevel))}` : 'level unknown'}</span>
    </div>`;
}

/**
 * One item, shown as an item: its art and rarity, then the things that can
 * actually be on it. The enchantment list is fixed per slot rather than typed,
 * so the player recognises what they own instead of recalling an identifier.
 */
function slotEditor(slotId) {
  const slot = SETUP_SLOTS.find(entry => entry.id === slotId);
  if (!slot) return '';
  const item = slotItem(slotId) || createEmptyItem();
  const snap = snapshot();
  const catalogItems = itemsForSlot(itemCatalog, slotId);
  const reforges = optionList(reforgeOptions(snap), item.reforge);
  const rows = enchantRowsFor(slotId, item);
  const gems = item.gems || [];
  const filled = Boolean(item.displayName);

  return `<div class="item-editor ${esc(rarityClass(item.rarity))}" data-item-editor="${esc(slotId)}">
    <header class="item-editor-head item-editor-actions">
      <button class="ghost small" data-slot-clear="${esc(slotId)}" ${filled ? '' : 'disabled'}>Clear slot</button>
    </header>

    <div class="item-editor-grid">
      <label class="settings-field"><span>Which ${esc(slot.label.toLowerCase())}</span>
        ${catalogItems.length ? `<select data-slot-item="${esc(slotId)}">
          <option value="">— none —</option>
          ${catalogItems.map(entry => `<option value="${esc(entry.id)}" ${entry.id === item.skyblockId ? 'selected' : ''}>${esc(entry.name)}</option>`).join('')}
        </select>` : ''}
        <input type="text" data-slot-name="${esc(slotId)}" value="${esc(item.displayName)}" placeholder="${catalogItems.length ? 'Or type a name the list does not have' : 'Type the item name'}">
        ${slotHasOfficialCategory(slotId) && !catalogItems.length ? `<span class="find-warn">${esc(catalogNotice || 'The official item list is not loaded, so type the name.')}</span>` : ''}
      </label>

      <label class="settings-field"><span>Reforge</span>
        <input list="reforge-options" type="text" data-slot-reforge="${esc(slotId)}" value="${esc(item.reforge || '')}" placeholder="e.g. mossy">
        <datalist id="reforge-options">${reforges.map(option => `<option value="${esc(option.value)}"></option>`).join('')}</datalist>
      </label>
    </div>

    <div class="item-editor-row">
      ${leverInput('data-slot-recomb', slotId, '', Boolean(item.recombobulated), 'Recombobulated')}
      <div><strong>Recombobulated</strong><span class="hint">Raises the item one rarity, which raises reforge and gemstone values with it.</span></div>
    </div>

    ${rows.length ? `<section class="item-editor-section">
      <div class="section-row"><div><h3>Enchantments</h3><p>Everything that can sit on this ${esc(slot.label.toLowerCase())}. Flip the ones you have, then pick the level.</p></div></div>
      <div class="enchant-grid">${rows.map(row => enchantLine(slotId, row)).join('')}</div>
    </section>` : `<p class="hint">A ${esc(slot.label.toLowerCase())} takes no farming enchantments.</p>`}

    <section class="item-editor-section">
      <div class="section-row"><div><h3>Gemstones</h3><p>One line per socket.</p></div></div>
      <div class="gem-grid">
        ${gems.map((gem, index) => `<div class="gem-line">
          <select data-gem-value="${esc(slotId)}" data-gem-index="${index}">
            ${gemOptionValues().map(value => `<option value="${esc(value)}" ${value === String(gem).toUpperCase() ? 'selected' : ''}>${esc(value)}</option>`).join('')}
            ${parseGem(gem) ? '' : `<option value="${esc(gem)}" selected>${esc(gem)}</option>`}
          </select>
          <button class="ghost small" data-gem-remove="${esc(slotId)}" data-gem-index="${index}">Remove</button>
        </div>`).join('')}
        <div class="gem-line">
          <select data-gem-new="${esc(slotId)}">
            <option value="">— add a gemstone —</option>
            ${gemOptionValues().map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}
          </select>
          <button class="ghost small" data-gem-add="${esc(slotId)}">Add</button>
        </div>
      </div>
    </section>
  </div>`;
}

function setupsPage() {
  const all = setups();
  const current = activeSetup(all);
  const summary = setupSummary(current);
  const hasSnapshot = Boolean(snapshot()?.items?.length);

  return `${pageHeader('Setups', 'Your gear, item by item', 'A setup is one complete configuration you can actually wear. Setups sit beside each other because they are alternatives, never added together.')}
    <div class="setup-tabs">
      ${all.list.map(setup => `<button class="setup-tab ${setup.id === all.activeId ? 'active' : ''}" data-setup="${esc(setup.id)}">${esc(setup.name)}</button>`).join('')}
      <button class="setup-tab add" data-setup-add="1">+ New setup</button>
    </div>

    <div class="setup-bar">
      <label class="inline-input">Setup name<input type="text" id="setupName" value="${esc(current.name)}"></label>
      <div class="setup-actions">
        <button class="ghost small" data-setup-prefill="1" ${hasSnapshot ? '' : 'disabled'}>Fill from sync</button>
        <button class="ghost small" data-setup-remove="1" ${all.list.length > 1 ? '' : 'disabled'}>Delete setup</button>
      </div>
      <div class="hint">${summary.filled}/${summary.total} slots filled${summary.fromSync ? `, ${summary.fromSync} from your last sync` : ''}.${hasSnapshot ? '' : ' Sync your profile in Settings to fill these automatically.'}</div>
    </div>

    ${['Armor', 'Equipment', 'Pet'].map(group => `
      <div class="section-row"><div><h2>${group}</h2></div></div>
      <div class="slot-grid">${SETUP_SLOTS.filter(slot => slot.group === group).map(slotCard).join('')}</div>
    `).join('')}

    ${state.setupSlot ? slotEditor(state.setupSlot) : ''}`;
}

function bindSetups() {
  const all = setups();
  const rerender = () => { reapplyGear(); saveState(); render(); };

  document.querySelectorAll('[data-setup]').forEach(el => el.addEventListener('click', () => {
    all.activeId = el.dataset.setup; state.setupSlot = null; rerender();
  }));
  document.querySelector('[data-setup-add]')?.addEventListener('click', () => {
    const id = nextSetupId(all);
    all.list.push(createSetup(id, `Setup ${all.list.length + 1}`));
    all.activeId = id; state.setupSlot = null; rerender();
  });
  document.querySelector('[data-setup-remove]')?.addEventListener('click', () => {
    if (all.list.length <= 1) return;
    if (!confirm('Delete this setup and everything in it?')) return;
    all.list = all.list.filter(setup => setup.id !== all.activeId);
    all.activeId = all.list[0].id; state.setupSlot = null; rerender();
  });
  const nameInput = document.getElementById('setupName');
  if (nameInput) nameInput.addEventListener('change', event => {
    const current = all.list.find(setup => setup.id === all.activeId);
    current.name = String(event.target.value || '').trim() || current.id;
    rerender();
  });
  document.querySelector('[data-setup-prefill]')?.addEventListener('click', () => {
    const current = all.list.find(setup => setup.id === all.activeId);
    const result = prefillSetupFromSnapshot(current, snapshot());
    Object.assign(current, result.setup);
    if (!result.filled.length) {
      alert('Your last sync contained no worn armor, equipment or active pet, so nothing could be filled in. Items sitting in storage are not assumed to be worn.');
    }
    rerender();
  });

  document.querySelectorAll('[data-slot]').forEach(el => el.addEventListener('click', () => {
    state.setupSlot = state.setupSlot === el.dataset.slot ? null : el.dataset.slot;
    rerender();
  }));

  // --- slot editor ---
  const slotId = state.setupSlot;
  if (!slotId) return;
  const currentItem = () => slotItem(slotId) || createEmptyItem();
  // Any hand edit makes the slot the player's own, so a later sync prefill
  // leaves it alone instead of overwriting their work.
  const patch = changes => writeSlot(slotId, { ...currentItem(), ...changes, source: ITEM_SOURCE.MANUAL });

  document.querySelector(`[data-slot-clear="${slotId}"]`)?.addEventListener('click', () => {
    writeSlot(slotId, null); rerender();
  });
  document.querySelector(`[data-slot-item="${slotId}"]`)?.addEventListener('change', event => {
    const chosen = itemsForSlot(itemCatalog, slotId).find(entry => entry.id === event.target.value);
    const changingItem = Boolean(chosen?.id && chosen.id !== currentItem().skyblockId);
    patch({
      skyblockId: chosen?.id ?? null,
      displayName: chosen?.name ?? currentItem().displayName,
      enchantments: changingItem ? intrinsicEnchantmentsForCatalogItem(chosen) : currentItem().enchantments,
      // Hypixel's own item resource carries the base tier, so picking an item
      // from the list colours it correctly without anyone typing a rarity. A
      // recombobulator raises the shown rarity, which the editor states
      // separately rather than folding into this base value.
      rarity: chosen?.tier ?? currentItem().rarity,
    });
    rerender();
  });
  document.querySelector(`[data-slot-name="${slotId}"]`)?.addEventListener('change', event => {
    patch({ displayName: String(event.target.value || '').trim() }); rerender();
  });
  document.querySelector(`[data-slot-reforge="${slotId}"]`)?.addEventListener('change', event => {
    patch({ reforge: String(event.target.value || '').trim().toLowerCase() || null }); rerender();
  });
  document.querySelector(`[data-slot-recomb="${slotId}"]`)?.addEventListener('change', event => {
    patch({ recombobulated: event.target.checked }); rerender();
  });

  // The lever says whether the item carries the enchantment at all; the select
  // beside it says at which level. Turning one on starts it at I rather than at
  // its maximum, so the planner never credits Fortune nobody claimed.
  document.querySelectorAll(`[data-ench-toggle="${slotId}"]`).forEach(el => el.addEventListener('change', event => {
    patch({ enchantments: withEnchantToggled(currentItem(), el.dataset.enchKey, event.target.checked) });
    rerender();
  }));
  document.querySelectorAll(`[data-ench-select="${slotId}"]`).forEach(el => el.addEventListener('change', event => {
    const max = Number(el.dataset.enchMax) || null;
    patch({ enchantments: withEnchantLevel(currentItem(), el.dataset.enchKey, event.target.value, max) });
    rerender();
  }));

  document.querySelector(`[data-gem-add="${slotId}"]`)?.addEventListener('click', () => {
    const value = document.querySelector(`[data-gem-new="${slotId}"]`)?.value?.trim().toUpperCase();
    if (!value) return;
    patch({ gems: [...currentItem().gems, value] }); rerender();
  });
  document.querySelectorAll(`[data-gem-value="${slotId}"]`).forEach(el => el.addEventListener('change', event => {
    const gems = [...currentItem().gems];
    gems[Number(el.dataset.gemIndex)] = String(event.target.value || '').trim().toUpperCase();
    patch({ gems: gems.filter(Boolean) }); rerender();
  }));
  document.querySelectorAll(`[data-gem-remove="${slotId}"]`).forEach(el => el.addEventListener('click', () => {
    const gems = currentItem().gems.filter((_, index) => index !== Number(el.dataset.gemIndex));
    patch({ gems }); rerender();
  }));
}

/**
 * The official item list is fetched once per session when an item-aware page
 * first opens, so the app does not pay for it on every start.
 */
async function ensureItemCatalog() {
  if (catalogRequested) return;
  catalogRequested = true;
  const result = await loadItemCatalog();
  itemCatalog = result.items;
  catalogNotice = result.error;
  // Only repaint when there is something new to show.
  if (['setups', 'accessories'].includes(state.page) && (result.items.length || result.error)) render();
}

// --- Guide 0-60 -------------------------------------------------------------
// A staged walkthrough driven by the player's own synced Farming level, with
// selectable alternatives where the source names more than one good answer.

const FARMING_LEVEL_ENTRY = 'account-skill-farming-skill-level';

function farmingLevel() {
  const synced = state.profile.normalizedSnapshot?.skills?.farming?.level;
  if (Number.isFinite(synced)) return synced;
  const entered = Number(state.profile.levels?.[FARMING_LEVEL_ENTRY]);
  return Number.isFinite(entered) && entered > 0 ? entered : null;
}

function petChoice(phase) {
  return state.profile.petChoices?.[phase] || null;
}

function guidePage() {
  const level = farmingLevel();
  const current = level === null ? null : stageForLevel(level);
  const openStage = state.guideStage || current?.id || STAGES[0].id;
  const next = level === null ? null : nextArmorSet(level);

  return `${pageHeader('Guide', 'Farming 0 to 60', 'Every stage from the first crop to a maxed setup, with the alternatives the source names as equal or only slightly worse.')}
    <div class="planner-context">
      <div><span>Your Farming level</span><strong>${level === null ? 'Unknown' : level}</strong></div>
      <div><span>Current stage</span><strong>${esc(current?.name || 'Sync to find out')}</strong></div>
      <div><span>Next armour</span><strong>${esc(next ? `${next.set} at ${next.level}` : (level === null ? '—' : 'All reached'))}</strong></div>
      <div><span>Stages</span><strong>${STAGES.length}</strong></div>
    </div>
    ${level === null ? '<div class="hint">Sync your profile in Settings, or enter your Farming Skill level on the Account page, and this guide will follow along.</div>' : ''}

    <div class="setup-tabs">
      ${STAGES.map(stage => `<button class="setup-tab ${stage.id === openStage ? 'active' : ''}" data-guide-stage="${esc(stage.id)}">
        ${esc(stage.name)}<small> ${stage.levelFrom}-${stage.levelTo}</small>${stage.id === current?.id ? ' •' : ''}
      </button>`).join('')}
    </div>

    ${STAGES.filter(stage => stage.id === openStage).map(stage => `
      <article class="guide-stage">
        <div class="eyebrow">Farming ${stage.levelFrom}-${stage.levelTo}${stage.id === current?.id ? ' · you are here' : ''}</div>
        <h2>${esc(stage.name)}</h2>
        <p>${esc(stage.summary)}</p>
        <ol class="guide-steps">${stage.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      </article>`).join('')}

    <div class="section-row"><div><h2>Armour chain</h2><p>The level each set unlocks at. Fortune figures are the guide's; the Farming Fortune page disagrees from Tater upward, so those are marked.</p></div></div>
    <div class="armor-chain">
      ${armorProgress(level).map(entry => `<div class="armor-step ${entry.reached === true ? 'done' : ''} ${entry.reached === false && next?.set === entry.set ? 'next' : ''}">
        <span>Farming ${entry.level}</span>
        <strong>${esc(entry.set)}</strong>
        <small>+${entry.fortune} FF${entry.disputed ? ' <i title="Sources disagree on this figure">disputed</i>' : ''}</small>
        ${entry.reached === true ? badge('reached', 'maxed') : (next?.set === entry.set ? badge('next', 'owned') : '')}
      </div>`).join('')}
    </div>

    <div class="section-row"><div><h2>Pets</h2><p>Your best pet changes between farming, spawning Pests and killing them. Pick the one you use and it is remembered.</p></div></div>
    ${PET_OPTIONS.map(group => `
      <div class="pet-group">
        <div class="eyebrow">${esc(group.label)}</div>
        <div class="pet-options">
          ${group.options.map(option => `<button class="pet-option ${petChoice(group.phase) === option.name ? 'chosen' : ''}"
              data-pet-phase="${esc(group.phase)}" data-pet-name="${esc(option.name)}">
            <div class="pet-head">${badge(TIER_LABEL[option.tier], option.tier === 'best' ? 'maxed' : (option.tier === 'budget' ? 'soft' : 'owned'))}<strong>${esc(option.name)}</strong></div>
            <p>${esc(option.note)}</p>
          </button>`).join('')}
        </div>
      </div>`).join('')}

    <div class="section-row"><div><h2>Enchantments by level</h2><p>Which level is reachable now, and what the next one takes.</p></div></div>
    <div class="ladder-grid">
      ${ENCHANT_LADDERS.map(ladder => `<article class="ladder">
        <div class="eyebrow">${esc(ladder.scope)}</div>
        <h3>${esc(ladder.name)}</h3>
        <p><strong>${esc(ladder.perLevel)}</strong> · max ${esc(ladder.max)}</p>
        <ul>${ladder.steps.map(step => `<li><b>${esc(step.levels)}</b> — ${esc(step.from)}</li>`).join('')}</ul>
        ${ladder.gate ? `<p class="find-warn">${esc(ladder.gate)}</p>` : ''}
      </article>`).join('')}
    </div>

    <div class="section-row"><div><h2>The three-phase loadout</h2><p>From budget to hypermax. Each phase has a different job, so one setup for all three always gives something up.</p></div></div>
    ${PHASE_LOADOUTS.map(loadout => `
      <div class="loadout">
        <div class="eyebrow">${esc(loadout.label)}</div>
        <div class="loadout-rows">
          ${loadout.rows.map(row => `<div class="loadout-row">
            <strong>${esc(row.phase)}</strong>
            <span><b>Armour</b> ${esc(row.armor)}</span>
            <span><b>Equipment</b> ${esc(row.equipment)}</span>
            <span><b>Pet</b> ${esc(row.pet)}</span>
          </div>`).join('')}
        </div>
      </div>`).join('')}

    <a class="source-btn" href="${esc(PROGRESSION_SOURCE)}" target="_blank" rel="noreferrer">Open the source guide</a>`;
}

function bindGuide() {
  document.querySelectorAll('[data-guide-stage]').forEach(el => el.addEventListener('click', () => {
    state.guideStage = el.dataset.guideStage; saveState(); render();
  }));
  document.querySelectorAll('[data-pet-phase]').forEach(el => el.addEventListener('click', () => {
    state.profile.petChoices ||= {};
    const phase = el.dataset.petPhase;
    // Clicking the chosen option again clears it.
    state.profile.petChoices[phase] = state.profile.petChoices[phase] === el.dataset.petName ? null : el.dataset.petName;
    saveState(); render();
  }));
}

function render({ preserveScroll = true } = {}) {
  // Most state changes only alter a control/card. Replacing #app is still the
  // core render model, but it must not behave like navigation: keep the right
  // content pane and the navigation rail exactly where the user left them.
  const relativeAnchor = preserveScroll ? currentScrollAnchor() : (clearScrollAnchor(), null);
  const scrollState = preserveScroll ? {
    main: document.querySelector('#app .main')?.scrollTop || 0,
    nav: document.querySelector('#app .sidebar nav')?.scrollTop || 0,
    windowX: window.scrollX,
    windowY: window.scrollY,
  } : null;

  let content = '';
  switch(state.page) {
    case 'dashboard': content = dashboard(); break;
    case 'account': content = accountPage(); break;
    case 'accessories': content = accessoriesPage(); break;
    case 'crops': content = cropsPage(); break;
    // The heading says what the page is; the picker and the editor below both
    // name the selected tool, so repeating it a third time here added nothing.
    case 'tools': content = genericSectionPage('tools','Tools','Farming tools','Pick the tool, then set what is actually on it: reforge, enchantments, gemstones, counters and tier.'); break;
    case 'gear': content = genericSectionPage('gear','Gear','Armor & Equipment','Armor, equipment, reforges, gemstones and enchantments remain a separate setup layer.'); break;
    case 'pets': content = genericSectionPage('pets','Pets','Pets & Pet Items','Pets are mutually exclusive setup choices and are never added together.'); break;
    case 'chips': content = genericSectionPage('chips','Garden Chips','Garden Chips','Each chip has its own level path and activation conditions.'); break;
    case 'shards': content = genericSectionPage('shards','Attribute Shards','Shards','Track day/night, pest-conditional and general Farming Fortune shards separately.'); break;
    case 'buffs': content = genericSectionPage('buffs','Buffs','Temporary Buffs & Mixins','God Potion, mixins, cakes and seasonal effects are kept separate from permanent progression.'); break;
    case 'pests': content = genericSectionPage('pests','Pests','Pest Setup','Pest-specific stats, spawn mechanics and loot logic stay separate from normal crop farming.'); break;
    case 'guide': content = guidePage(); break;
    case 'setup': content = setupPage(); break;
    case 'setups': content = setupsPage(); break;
    case 'planner': content = plannerPage(); break;
    case 'research': content = researchPage(); break;
    case 'coming': content = comingPage(); break;
    default: content = dashboard();
  }
  document.getElementById('app').innerHTML = shell(content);
  bind();
  if (state.page === 'setups') bindSetups();
  if (['setups', 'accessories'].includes(state.page)) ensureItemCatalog();
  if (state.page === 'tools') bindToolPanel();
  if (state.page === 'guide') bindGuide();

  if (scrollState) {
    const main = document.querySelector('#app .main');
    const nav = document.querySelector('#app .sidebar nav');
    if (main) main.scrollTop = scrollState.main;
    if (nav) nav.scrollTop = scrollState.nav;
    window.scrollTo(scrollState.windowX, scrollState.windowY);
    restoreRelativeScrollAnchor(relativeAnchor);
    scheduleScrollAnchorRestore(relativeAnchor);
  }
}

function closeNavigation() {
  const sidebar = document.querySelector('#app .sidebar');
  const toggle = document.querySelector('#app [data-nav-toggle]');
  if (!sidebar || !toggle) return;
  sidebar.classList.remove('nav-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
}

function bind() {
  document.querySelectorAll('[data-progress]').forEach(el => { el.style.width = `${el.dataset.progress}%`; });

  const sidebar = document.querySelector('#app .sidebar');
  const navToggle = document.querySelector('#app [data-nav-toggle]');
  navToggle?.addEventListener('click', () => {
    const open = !sidebar?.classList.contains('nav-open');
    sidebar?.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });

  document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => {
    state.page=el.dataset.page;
    state.drawer=null;
    closeNavigation();
    saveState();
    render({ preserveScroll: false });
  }));
  document.querySelectorAll('[data-open-settings]').forEach(el => el.addEventListener('click', closeNavigation));
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => { state.drawer=el.dataset.open; saveState(); render(); }));
  // The backdrop closes the drawer, but a click on the drawer itself must not:
  // it bubbles up to the backdrop, so the target is checked explicitly.
  document.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', event => {
    if (el.classList.contains('drawer-backdrop') && event.target !== el) return;
    state.drawer=null; saveState(); render();
  }));
  document.querySelectorAll('[data-crop]').forEach(el => el.addEventListener('click', () => { state.selectedCrop=el.dataset.crop; saveState(); render(); }));

  const cropSel = document.getElementById('cropSelect');
  if (cropSel) cropSel.addEventListener('change', e => { state.selectedCrop=e.target.value; saveState(); render(); });
  const search = document.getElementById('search');
  if (search) search.addEventListener('input', e => { state.search=e.target.value; saveState(); render(); });
  const profileName = document.getElementById('profileName');
  if (profileName) profileName.addEventListener('change', e => { state.profile.name=e.target.value; saveState(); });
  const gf = document.getElementById('globalFortune');
  if (gf) gf.addEventListener('change', e => { state.profile.globalFortune=Number(e.target.value||0); saveState(); render(); });
  const cf = document.getElementById('cropFortune');
  if (cf) cf.addEventListener('change', e => { state.profile.cropFortune[state.selectedCrop]=Number(e.target.value||0); saveState(); render(); });

  document.querySelectorAll('[data-accessory-recomb]').forEach(el => el.addEventListener('change', event => {
    const accessory = farmingAccessoryByItemId(event.target.dataset.accessoryRecomb);
    if (!accessory) return;
    state.profile.accessoryItems ||= {};
    const next = { ...(state.profile.accessoryItems[accessory.itemId] || {}) };
    next.recombobulated = Boolean(event.target.checked);
    next.source = 'manual';
    state.profile.accessoryItems[accessory.itemId] = next;
    saveState();
    render();
  }));

  document.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.id); if (!item) return;
    const store = itemStore(item);
    const nextLevel = Math.max(0, Math.min(Number(item.max||1), currentLevel(item)+Number(el.dataset.step)));
    if (nextLevel > 0) clearExclusivePeers(item);
    store.levels[item.id] = nextLevel;
    store.owned[item.id] = nextLevel > 0;
    saveState(); render();
  }));
  document.querySelectorAll('[data-max]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.max); if (!item) return;
    clearExclusivePeers(item);
    const store = itemStore(item);
    store.levels[item.id]=Number(item.max||1); store.owned[item.id]=true; saveState(); render();
  }));
  document.querySelectorAll('[data-owned]').forEach(el => el.addEventListener('change', e => {
    const item = UPGRADES.find(x=>x.id===e.target.dataset.owned); if (!item) return;
    if (e.target.checked) clearExclusivePeers(item);
    const store = itemStore(item);
    store.owned[item.id]=e.target.checked;
    store.levels[item.id]=e.target.checked?1:0; saveState(); render();
  }));
  document.querySelectorAll('[data-cost]').forEach(el => el.addEventListener('change', e => {
    const item = UPGRADES.find(x=>x.id===e.target.dataset.cost); if (!item) return;
    itemStore(item).costs[item.id]=Number(e.target.value||0); saveState(); render();
  }));
  document.querySelectorAll('[data-manual]').forEach(el => el.addEventListener('change', e => {
    const item = UPGRADES.find(x=>x.id===e.target.dataset.manual); if (!item) return;
    const store = itemStore(item);
    const v=e.target.value; if(v==='') delete store.manualGain[item.id]; else store.manualGain[item.id]=Number(v); saveState(); render();
  }));

  // Export/import share the versioned, validated backup format used by Settings,
  // so there is exactly one on-disk contract for user data.
  const exportBtn=document.getElementById('exportBtn');
  if(exportBtn) exportBtn.addEventListener('click',()=>{
    downloadJson(backupFilename(), createBackupPayload(state));
  });
  const importInput=document.getElementById('importInput');
  if(importInput) importInput.addEventListener('change', async e=>{
    try {
      const restored = validateBackupPayload(await readJsonFile(e.target.files?.[0]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored.state));
      location.reload();
    } catch (error) {
      alert(error.message);
      e.target.value='';
    }
  });
}

render();

// Settings writes synced values straight to storage; re-read and repaint so the
// cards show them without a manual reload.
window.addEventListener('farming420:state-changed', () => {
  state = loadState();
  render();
});
