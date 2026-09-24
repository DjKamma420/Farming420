import { CROPS, UPGRADES } from './data.js';
import { FARMING_ACCESSORY_GROUPS, farmingAccessoryByItemId } from './farming-accessories.js';
import { FARMING_PETS } from './setup-pet-catalog.js';
import { searchEntries } from './global-search.js';
import { accessoryCapabilityState } from './accessory-capabilities.js';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { applyComputedStatsToState, computeStatTotals } from './computed-stats.js';
import { ACTIVITY_MODE, activityLabel, activityModeForState, setupIdForActivity } from './activity-mode.js';
import {
  FARMING_CONTEXT_OPTIONS,
  farmingContextForState,
  farmingContextLabel,
  farmingContextScopes,
  isGrandFeastContext,
  isHarvestFeastContext,
} from './farming-context.js';
import {
  AVERAGE_CROP_PRICE_STATUS,
  averageCropPriceNote,
  averageCropUnitPrice,
  averageHarvestFeastMaterialPrice,
} from './average-crop-price.js';
import { costOriginNote, resolveUpgradeCost } from './upgrade-cost-resolution.js';
import { formatApproxCoins } from './compact-coins.js';
import { marketAverageTimestampLabel } from './market-average-prices.js';
import { upgradePriceSummary } from './upgrade-price-summary.js';
import { MEASURED_FEAST_KEY, measuredBaseline } from './measured-baseline.js';
import { ensureProgressBucket, migrateState, toolKeyForCropId } from './migrations.js';
import { applySnapshotToProgress, isAutoApplied } from './snapshot-apply.js';
import { LOCATION_STATUS, isSyncFilled, locationFor } from './help-locations.js';
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
  applyCandidateSetupSafely,
  createEmptyItem,
  createSetup,
  nextSetupId,
  normalizeSetups,
  prefillSetupFromSnapshot,
  setupSummary,
  writeLinkedSetupSlot,
} from './setups.js';
import { buildSetupCandidates } from './setup-candidates.js';
import {
  SETUP_OBJECTIVE,
  evaluateSetupObjective,
  setupObjectiveForActivity,
} from './setup-objective-evaluation.js';
import {
  normalizeRecentPestKills,
  normalizeSprayonatorActive,
  setupRuntimeContextForState,
} from './setup-runtime-context.js';
import {
  intrinsicEnchantmentsForCatalogItem,
  itemsForSlot,
  loadItemCatalog,
  readCachedCatalog,
  slotHasOfficialCategory,
} from './item-catalog.js';
import { itemCapabilities } from './item-capabilities.js';
import { FARMING_TOOL_REFORGES } from './farming-reforges.js';
import { farmingToolSkyblockId } from './exact-farming-items.js';
import {
  physicalItemBuildValue,
  physicalItemValueComponents,
  refreshPhysicalItemBuildValue,
} from './physical-item-value.js';
import {
  GARDEN_PESTS,
  LOOT_PIPELINE,
  PEST_HEALTH,
  PEST_STAT_SIDES,
  SPAWN_PIPELINE,
  UNMODELLED_PESTS,
  guaranteedDropText,
} from './pest-model.js';
import {
  backupFilename,
  createBackupPayload,
  downloadJson,
  readJsonFile,
  validateBackupPayload,
} from './backup.js';
import { FRACTION_2, formatNumber } from './format-number.js';

const NAV = [
  ['dashboard', 'Dashboard'],
  ['accessories', 'Accessories'],
  ['crops', 'Garden'],
  ['tools', 'Tools'],
  ['setups', 'Setups'],
  ['gear', 'Gear'],
  ['pets', 'Pets'],
  ['chips', 'Garden Chips'],
  ['shards', 'Shards'],
  ['buffs', 'Effects'],
  ['pests', 'Pests'],
  ['qol', 'QoL'],
  ['info', 'Info'],
  ['focus', 'Focus on next'],
  ['planner', 'Upgrade Planner'],
];

const INFO_UPGRADE_TOPICS = Object.freeze([
  Object.freeze({
    id: 'recombobulator',
    label: 'Rarity upgrade',
    title: 'Recombobulator 3000',
    summary: 'Raises an eligible item by exactly one rarity. For farming gear the main benefit is indirect: rarity-scaled reforge and gemstone values can increase with the higher effective rarity. It is not a flat Farming Fortune bonus by itself.',
    keywords: ['recomb', 'recombobulator', 'rarity upgrade', 'mythic rarity'],
  }),
  Object.freeze({
    id: 'gemstones',
    label: 'Item sockets',
    title: 'Gemstones',
    summary: 'Gemstone sockets belong to the concrete item. Farming420 only exposes official sockets that item can actually have; slot type, unlock requirements, gemstone quality and effective rarity determine what the socket can contribute.',
    keywords: ['gem', 'gems', 'gemstone', 'gemstones', 'socket', 'slots'],
  }),
  Object.freeze({
    id: 'reforges',
    label: 'Item modifier',
    title: 'Reforges',
    summary: 'Reforges change the stats or role of a specific item. Their values can depend on item rarity, so a rarity change can also change the value of the reforge already installed. Farming, spawning and killing reforges are not interchangeable.',
    keywords: ['reforge', 'reforges', 'modifier'],
  }),
  Object.freeze({
    id: 'enchantments',
    label: 'Item upgrade',
    title: 'Enchantments',
    summary: 'Enchantments are item-compatible upgrades with their own levels and conditions. Some add direct Fortune while others change a conditional farming or Pest effect, so Farming420 tracks the exact enchantment and level instead of treating every enchant as generic stats.',
    keywords: ['enchant', 'enchants', 'enchantment', 'enchantments'],
  }),
  Object.freeze({
    id: 'rarity',
    label: 'Item capability',
    title: 'Rarity and item capabilities',
    summary: 'Base rarity and effective rarity are separate. Recombobulation raises effective rarity by one step, while the concrete item decides whether it can be recombobulated, reforged or socketed at all.',
    keywords: ['rarity', 'item capability', 'capabilities', 'effective rarity'],
  }),
]);

const SETTINGS_SEARCH_TOPICS = Object.freeze([
  Object.freeze({
    id: 'live-sync',
    title: 'Live sync',
    subtitle: 'Minecraft UUID, SkyBlock profile and Sync now',
    keywords: ['profile sync', 'uuid', 'minecraft uuid', 'sync profile'],
  }),
  Object.freeze({
    id: 'hypixel-access',
    title: 'Hypixel access',
    subtitle: 'API key stored in this browser',
    keywords: ['api', 'api key', 'hypixel key', 'developer key'],
  }),
  Object.freeze({
    id: 'backup',
    title: 'Backup & Restore',
    subtitle: 'Download, restore or reset local Farming420 data',
    keywords: ['backup', 'restore', 'export', 'import', 'reset data'],
  }),
  Object.freeze({
    id: 'app-updates',
    title: 'App & Updates',
    subtitle: 'Install Farming420 or reload the latest deployment',
    keywords: ['install', 'update', 'reload', 'version', 'pwa'],
  }),
]);

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
    farmingContext: 'normal',
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
  if (loaded.page === 'guide') loaded.page = 'info';
  if (!NAV.some(([id]) => id === loaded.page)) loaded.page = 'dashboard';

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
  return UPGRADES.filter(item => section ? item.section === section : true);
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

let activeSearchResults = [];
let cachedCatalogSearchSource = null;
let cachedCatalogSearchEntries = [];

function pageForUpgrade(item) {
  if (item?.section === 'account') return 'crops';
  return NAV.some(([id]) => id === item?.section) ? item.section : 'planner';
}

function selectableCatalogSearchEntries() {
  if (cachedCatalogSearchSource === itemCatalog) return cachedCatalogSearchEntries;
  cachedCatalogSearchSource = itemCatalog;

  const byItem = new Map();
  for (const slot of SETUP_SLOTS.filter(entry => slotHasOfficialCategory(entry.id))) {
    for (const item of itemsForSlot(itemCatalog, slot.id)) {
      const key = String(item.id || item.name);
      const existing = byItem.get(key) || {
        item,
        slots: [],
      };
      if (!existing.slots.some(entry => entry.id === slot.id)) existing.slots.push(slot);
      byItem.set(key, existing);
    }
  }

  cachedCatalogSearchEntries = [...byItem.values()].map(({ item, slots }) => ({
    id: `catalog:${item.id}`,
    kind: 'Selectable item',
    title: item.name,
    subtitle: `Can be selected for ${slots.map(slot => slot.label).join(', ')}`,
    keywords: [item.id, item.category, item.tier, ...slots.map(slot => slot.label)],
    target: {
      type: 'catalog-item',
      page: 'setups',
      itemId: item.id,
      slotId: slots[0]?.id || null,
    },
  }));
  return cachedCatalogSearchEntries;
}

function globalSearchEntries() {
  const entries = [];

  for (const [page, label] of NAV) {
    entries.push({
      id: `page:${page}`,
      kind: 'Page',
      title: label,
      subtitle: 'Open this Farming420 section',
      keywords: [page],
      priority: 80,
      target: { type: 'page', page },
    });
  }

  for (const cropEntry of CROPS) {
    entries.push({
      id: `crop:${cropEntry.id}`,
      kind: 'Crop',
      title: cropEntry.name,
      subtitle: `Garden crop · ${cropEntry.tool || 'farming tool'}`,
      keywords: [cropEntry.id, cropEntry.tool],
      priority: 120,
      target: { type: 'crop', page: 'crops', cropId: cropEntry.id },
    });
  }

  for (const item of UPGRADES) {
    entries.push({
      id: `upgrade:${item.id}`,
      kind: item.section === 'shards' || item.category === 'Attribute Shard' ? 'Shard / upgrade' : 'Upgrade',
      title: item.name,
      subtitle: `${item.category} · ${pageForUpgrade(item)}`,
      keywords: [item.id, item.notes, item.metric, item.attribute, item.cropScope, item.modeScope],
      priority: 160,
      target: { type: 'upgrade', page: pageForUpgrade(item), itemId: item.id },
    });
  }

  for (const group of FARMING_ACCESSORY_GROUPS) {
    for (const accessory of group.items) {
      entries.push({
        id: `accessory:${accessory.itemId}`,
        kind: 'Accessory',
        title: accessory.name,
        subtitle: `${group.title} · ${accessory.condition}`,
        keywords: [accessory.itemId, accessory.effect, group.note],
        priority: 140,
        target: { type: 'accessory', page: 'accessories', itemId: accessory.itemId },
      });
    }
  }

  for (const pet of FARMING_PETS) {
    entries.push({
      id: `pet:${pet.id}`,
      kind: 'Selectable pet',
      title: pet.name,
      subtitle: `Setups pet picker · level ${pet.levelMin}-${pet.levelMax}`,
      keywords: [pet.id, ...(pet.rarities || [])],
      priority: 150,
      target: { type: 'setup-slot', page: 'setups', slotId: 'pet' },
    });
  }

  for (const topic of INFO_UPGRADE_TOPICS) {
    entries.push({
      id: `info:${topic.id}`,
      kind: 'Info',
      title: topic.title,
      subtitle: topic.summary,
      keywords: topic.keywords,
      priority: 1200,
      target: { type: 'info', page: 'info', anchor: `info-upgrade-${topic.id}` },
    });
  }

  for (const topic of SETTINGS_SEARCH_TOPICS) {
    entries.push({
      id: `settings:${topic.id}`,
      kind: 'Setting',
      title: topic.title,
      subtitle: topic.subtitle,
      keywords: topic.keywords,
      priority: 700,
      target: { type: 'settings', section: topic.id },
    });
  }

  return [...entries, ...selectableCatalogSearchEntries()];
}

function searchResultsMarkup(query) {
  activeSearchResults = searchEntries(globalSearchEntries(), query, 12);
  if (!String(query || '').trim()) return '';
  if (!activeSearchResults.length) {
    return '<div class="search-no-results">No direct match. Try an item, shard, setting, stat or upgrade name.</div>';
  }
  return activeSearchResults.map((entry, index) => `
    <button class="search-result" type="button" role="option" data-search-result="${index}">
      <span class="search-result-kind">${esc(entry.kind)}</span>
      <span class="search-result-copy">
        <strong>${esc(entry.title)}</strong>
        <small>${esc(entry.subtitle || '')}</small>
      </span>
    </button>`).join('');
}

function updateSearchResults(query) {
  const panel = document.getElementById('searchResults');
  const input = document.getElementById('search');
  if (!panel) return;
  panel.innerHTML = searchResultsMarkup(query);
  panel.hidden = !String(query || '').trim();
  input?.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
}

function clearGlobalSearch() {
  state.search = '';
  saveState();
  const input = document.getElementById('search');
  if (input) input.value = '';
  updateSearchResults('');
}

function scrollToSearchAnchor(id) {
  if (!id) return;
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
}

function navigateSearchResult(entry) {
  if (!entry?.target) return;
  const target = entry.target;
  state.search = '';
  state.drawer = null;

  if (target.type === 'settings') {
    saveState();
    const input = document.getElementById('search');
    if (input) input.value = '';
    updateSearchResults('');
    window.dispatchEvent(new CustomEvent('farming420:open-settings', { detail: { section: target.section } }));
    return;
  }

  if (target.type === 'crop') {
    state.selectedCrop = target.cropId;
    state.page = target.page;
  } else if (target.type === 'upgrade') {
    state.page = target.page;
    state.drawer = target.itemId;
  } else if (target.type === 'accessory') {
    state.page = target.page;
  } else if (target.type === 'catalog-item' || target.type === 'setup-slot') {
    state.page = target.page;
    if (target.slotId) state.setupSlot = target.slotId;
  } else {
    state.page = target.page || state.page;
  }

  saveState();
  render({ preserveScroll: false });

  if (target.type === 'info') {
    scrollToSearchAnchor(target.anchor);
  } else if (target.type === 'accessory') {
    requestAnimationFrame(() => {
      [...document.querySelectorAll('[data-accessory-item-id]')]
        .find(node => node.dataset.accessoryItemId === target.itemId)
        ?.scrollIntoView({ block: 'center' });
    });
  } else if (target.type === 'catalog-item' || target.type === 'setup-slot') {
    requestAnimationFrame(() => {
      const editor = target.slotId
        ? [...document.querySelectorAll('[data-item-editor]')].find(node => node.dataset.itemEditor === target.slotId)
        : null;
      editor?.scrollIntoView({ block: 'center' });
      editor?.querySelector('select, input')?.focus({ preventScroll: true });
    });
  }
}

function plannerCandidates() {
  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(appliesToCrop)
    .filter(item => !isMaxed(item))
    .map(item => {
      const gain = gainFor(item);
      const costSource = resolveUpgradeCost(itemStore(item), item.id);
      const cost = costSource.acquisitionMode === 'BUYABLE' && costSource.coins > 0
        ? Number(costSource.coins)
        : 0;
      const rel = relativeGainPct(item);
      const efficiency = cost > 0 ? rel / (cost / 1_000_000) : null;
      return { item, gain, rel, cost, efficiency, costSource };
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
  const pricing = upgradePriceSummary(itemStore(item), item);
  const priceTagCoins = isShard
    ? pricing.unitShardCoins
    : level >= max
      ? pricing.entryMarketCoins
      : pricing.costToMaxCoins ?? pricing.entryMarketCoins;
  const priceTagLabel = isShard
    ? '1 shard'
    : level >= max
      ? 'replacement'
      : pricing.costToMaxCoins != null ? 'to max' : 'item';
  return `
    <button class="item-card ${status} ${isShard ? 'shard-card' : ''} ${compact ? 'compact' : ''}" data-open="${esc(item.id)}">
      <div class="card-layer"></div>
      <div class="card-head">
        ${item.packAsset || isShard ? `<span class="card-portrait${isShard ? ' shard-portrait' : ''}"${item.packAsset ? ` data-pack-asset="${esc(item.packAsset)}"` : ''}></span>` : ''}
        <div>
          <div class="eyebrow">${esc(item.category)}</div>
          <div class="item-title">${esc(item.name)}</div>
        </div>
        ${priceTagCoins != null ? badge(`${formatApproxCoins(priceTagCoins)} · ${priceTagLabel}`, 'price-tag') : ''}
        ${badge(item.status === 'VERIFY' ? 'verify' : (isMaxed(item) ? 'max' : isOwned(item) ? 'owned' : 'missing'), status)}
        ${isSynced(item) ? badge('derived', 'synced') : ''}
      </div>
      <div class="card-meta">
        ${max > 1 ? `<span>Level ${level}/${max}</span>` : `<span>${isOwned(item) ? 'Owned' : 'Not set'}</span>`}
        ${gain ? `<span>+${formatNumber(Number(gain))} ${esc(item.metric === 'Crop Yield' ? 'Fortune/step' : item.metric)}</span>` : '<span>dynamic</span>'}
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
        <div class="search-wrap">
          <input id="search" aria-label="Search Farming420" aria-controls="searchResults" aria-expanded="${state.search.trim() ? 'true' : 'false'}" autocomplete="off" placeholder="Search items, shards, settings, effects…" value="${esc(state.search)}" />
          <div id="searchResults" class="search-results" role="listbox" ${state.search.trim() ? '' : 'hidden'}>${searchResultsMarkup(state.search)}</div>
        </div>
      </header>
      <section class="content">${content}</section>
    </main>
    ${drawer()}
  </div>`;
}

function pageHeader(kicker, title, text='') {
  return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1>${text?`<p>${esc(text)}</p>`:''}</div></div>`;
}

function compactDashboardCoins(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(number >= 10_000_000_000 ? 1 : 2)}b`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 1 : 2)}m`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 1 : 2)}k`;
  return formatNumber(Math.round(number));
}

function dashboardMeasuredValues(cropId, mode) {
  const key = `${cropId}:${mode}`;
  return { ...(state.profile.plannerMeasured?.[key] || {}) };
}

function dashboardProfitEstimate(cropId, mode, context, stats) {
  if (mode === ACTIVITY_MODE.PEST_KILL) {
    return {
      result: null,
      values: dashboardMeasuredValues(cropId, mode),
      normalPrice: null,
      feastPrice: null,
      display: '—',
      note: 'Pest Killing needs a Vacuum/loot throughput model; crop Coins/h is not substituted here.',
    };
  }

  const stored = dashboardMeasuredValues(cropId, mode);
  // Old backups can contain manually entered coin fields. Preserve them in the
  // backup, but never read them into a calculation again.
  const values = { ...stored };
  delete values.coinsPerUnit;
  delete values.feastMaterialCoins;

  const normalPrice = averageCropUnitPrice(cropId);
  if (normalPrice.status === AVERAGE_CROP_PRICE_STATUS.AVERAGE) {
    values.coinsPerUnit = normalPrice.coinsPerUnit;
  }

  const feastActive = isHarvestFeastContext(context);
  const feastPrice = feastActive ? averageHarvestFeastMaterialPrice(cropId) : null;
  if (feastActive) {
    values[MEASURED_FEAST_KEY] = true;
    if (feastPrice?.status === AVERAGE_CROP_PRICE_STATUS.AVERAGE) {
      values.feastMaterialCoins = feastPrice.coinsPerUnit;
    }
  } else {
    delete values[MEASURED_FEAST_KEY];
  }

  const result = measuredBaseline(values, {
    farmingFortune: stats.globalFortune,
    cropFortune: stats.cropFortune,
    overbloom: stats.overbloom,
  }, cropId);

  if (result.normalCropCoinsPerHour == null) {
    const modelNote = result.cropDataStatus !== 'VERIFIED'
      ? 'This crop still lacks a verified base-drop model.'
      : 'Enter breaks/s and farming uptime; crop value comes from the rolling 90-day Bazaar average.';
    return { result, values: stored, normalPrice, feastPrice, display: '—', note: modelNote };
  }

  const rareKnown = feastActive && result.rareCropCoinsPerHour != null;
  const total = result.normalCropCoinsPerHour + (rareKnown ? result.rareCropCoinsPerHour : 0);
  const display = feastActive && !rareKnown
    ? `≥ ${compactDashboardCoins(total)}/h`
    : `${compactDashboardCoins(total)}/h`;
  const note = feastActive
    ? rareKnown
      ? `Normal crop + priced Feast crop · ${farmingContextLabel(context)}${isGrandFeastContext(context) ? ' · Kernels/Seasoning progression excluded' : ''}`
      : `Normal crop only · Feast material value is unavailable${isGrandFeastContext(context) ? ' · Kernels/Seasoning progression excluded' : ''}`
    : mode === ACTIVITY_MODE.PEST_SPAWN
      ? 'Crop stream only; Pest spawn/kill value is not added without a verified spawn-profit model.'
      : 'Calculated from current Fortune, crop drops, throughput and sell price.';

  return { result, values: stored, normalPrice, feastPrice, display, note };
}

function dashboard() {
  const mode = activityModeForState(state);
  const selectedCrop = crop();
  const context = farmingContextForState(state);
  const contextScopes = farmingContextScopes(context);
  const stats = computeStatTotals(state, selectedCrop.id, mode, contextScopes);
  const estimate = dashboardProfitEstimate(selectedCrop.id, mode, context, stats);
  const measuredValues = estimate.values || {};
  const marker = count => count ? ' ~' : '';
  const number = value => formatNumber(Number(value || 0), FRACTION_2);
  const effectiveIncomplete = stats.incomplete.globalFortune.length
    + stats.incomplete.cropFortune.length
    + stats.incomplete.pestFortune.length;
  const sourceNote = (values, axis) => {
    const sources = Number(values.sourceCount?.[axis] || 0);
    const unresolved = values.incomplete?.[axis]?.length || 0;
    if (!sources) return 'No configured sources in this context';
    if (unresolved) return `${sources} configured source${sources === 1 ? '' : 's'} · ${unresolved} unresolved`;
    return `${sources} configured source${sources === 1 ? '' : 's'} · fully modeled`;
  };
  const priceNote = estimate.normalPrice
    ? averageCropPriceNote(estimate.normalPrice)
    : 'crop price unavailable';
  const contextHelp = context === 'normal'
    ? 'Only always-active configured sources are included.'
    : `${farmingContextLabel(context)}-only configured effects are included in the totals below.`;

  const cropRows = CROPS.map(entry => {
    const values = computeStatTotals(state, entry.id, mode, contextScopes);
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
    ${pageHeader('Dashboard', 'Calculated Farming Stats', `Result overview · ${activityLabel(mode)} · ${farmingContextLabel(context)}. Event context changes only documented conditional effects.`)}
    <section class="dashboard-context-panel">
      <label>
        <span>Farming context</span>
        <select data-dashboard-context>
          ${FARMING_CONTEXT_OPTIONS.map(option => `<option value="${esc(option.id)}" ${option.id === context ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}
        </select>
      </label>
      <div>
        <strong>${esc(farmingContextLabel(context))}</strong>
        <small>${esc(contextHelp)}</small>
      </div>
    </section>

    <div class="card-grid dashboard-results-grid">
      <article class="stat-card dashboard-total-card">
        <span>Effective Fortune · ${esc(selectedCrop.name)}</span>
        <strong>${number(stats.effectiveFortune)} FF${marker(effectiveIncomplete)}</strong>
        <small>Global ${number(stats.globalFortune)} + Crop ${number(stats.cropFortune)}${stats.pestFortune ? ` + Pest ${number(stats.pestFortune)}` : ''}</small>
        <small>${esc(farmingContextLabel(context))} context</small>
      </article>
      <article class="stat-card dashboard-profit-card">
        <span>Estimated Coins/h · ${esc(selectedCrop.name)}</span>
        <strong>${esc(estimate.display)}</strong>
        <small>${esc(estimate.note)}</small>
        <small>${esc(priceNote)}</small>
      </article>
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

    <details class="dashboard-estimate-inputs">
      <summary>Coins/h estimate inputs</summary>
      <div class="dashboard-estimate-grid">
        <label><span>Crop breaks/s</span><input type="number" min="0" step="0.1" data-dashboard-estimate="breaksPerSecond" value="${esc(measuredValues.breaksPerSecond ?? '')}" placeholder="required"></label>
        <label><span>Farming uptime %</span><input type="number" min="0" max="100" step="1" data-dashboard-estimate="uptimePercent" value="${esc(measuredValues.uptimePercent ?? '')}" placeholder="required"></label>
        <div class="dashboard-estimate-readonly"><span>Crop sell value</span><strong>${estimate.normalPrice?.coinsPerUnit ? `${formatNumber(Math.round(estimate.normalPrice.coinsPerUnit))} Coins` : '—'}</strong><small>${esc(estimate.normalPrice ? averageCropPriceNote(estimate.normalPrice) : '90-day Bazaar average unavailable')}</small></div>
        ${isHarvestFeastContext(context) ? `<div class="dashboard-estimate-readonly"><span>Feast crop value</span><strong>${estimate.feastPrice?.coinsPerUnit ? `${formatNumber(Math.round(estimate.feastPrice.coinsPerUnit))} Coins` : '—'}</strong><small>${esc(estimate.feastPrice ? averageCropPriceNote(estimate.feastPrice) : '90-day Bazaar average unavailable')}</small></div>` : ''}
      </div>
      <small>Coin values are fixed rolling 90-day market averages and cannot be entered manually. Throughput remains measurable; unknown market history stays unknown.</small>
      <small>Market history: <a href="https://sky.coflnet.com/data" target="_blank" rel="noreferrer">SkyCofl</a>.</small>
    </details>

    <aside class="dashboard-farm-tip">
      <div>
        <span>Farm layout reference</span>
        <strong>Copy a working Garden farm</strong>
        <small>Visit the Garden in-game to inspect the layout and use it as a build reference.</small>
      </div>
      <code>/v Dj_Kamma420</code>
    </aside>

    <div class="section-row">
      <div>
        <h2>All crops</h2>
        <p>Each crop total is Global Farming Fortune + that crop's own Crop Fortune in the selected farming context. The selected crop is highlighted.</p>
      </div>
    </div>
    <div class="card-grid dashboard-crop-results">${cropRows}</div>
  `;
}

function gardenAccountProgression() {
  const groups = [
    ['Farming progression',['Account/Skill','Account Upgrade','Anita']],
    ['Garden progression',['Garden','Greenhouse']]
  ];
  return `
    <div class="input-strip">
      <label>Global Farming Fortune<input type="number" id="globalFortune" value="${Number(state.profile.globalFortune||0)}"></label>
      ${inputHint('input:globalFortune', 'Used only for relative upgrade evaluation. Ownership remains a separate state.')}
    </div>
    ${groups.map(([title,cats]) => `<div class="group"><div class="section-row"><div><h2>${title}</h2></div></div><div class="card-grid">${visibleUpgrades('account').filter(x=>cats.includes(x.category)).map(x=>card(x)).join('')}</div></div>`).join('')}`;
}

function effectsPage() {
  const permanent = visibleUpgrades('account').filter(x => ['Consumable','Chocolate Factory'].includes(x.category));
  const temporary = visibleUpgrades('buffs');
  return `${pageHeader('Effects', 'Farming Effects', 'Permanent farming effects and temporary buffs, mixins, cakes and event effects in one place.')}
    <div class="group">
      <div class="section-row"><div><h2>Permanent effects</h2><p>Account-wide consumables and permanent effect sources.</p></div></div>
      <div class="card-grid">${permanent.map(x=>card(x)).join('') || '<div class="empty">No matches.</div>'}</div>
    </div>
    <div class="group">
      <div class="section-row"><div><h2>Temporary effects</h2><p>God Potion, mixins, cakes, event bonuses and other active effects.</p></div></div>
      <div class="card-grid">${temporary.map(x=>card(x)).join('') || '<div class="empty">No matches.</div>'}</div>
    </div>`;
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
  const groups = FARMING_ACCESSORY_GROUPS.map(group => ({
    ...group,
    items: group.items,
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
  return `${pageHeader('Garden', 'Garden & Crop Progression', 'Manage account-wide farming progression, Garden progression and crop-specific Fortune from one page. Tool and loadout settings stay on their own pages.')}
    ${gardenAccountProgression()}
    <div class="section-row"><div><h2>Crop progression</h2><p>Select a crop to edit only progression and Fortune that belong directly to that crop.</p></div></div>
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
          <div class="eyebrow">Crop section</div>
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

const TURBO_ENCHANT_KEY_BY_CROP = Object.freeze({
  wheat: 'turbo_wheat',
  carrot: 'turbo_carrot',
  potato: 'turbo_potato',
  pumpkin: 'turbo_pumpkin',
  melon: 'turbo_melon',
  mushroom: 'turbo_mushrooms',
  cactus: 'turbo_cactus',
  'sugar-cane': 'turbo_cane',
  'cocoa-beans': 'turbo_coco',
  'nether-wart': 'turbo_warts',
  sunflower: 'turbo_sunflower',
  moonflower: 'turbo_moonflower',
  'wild-rose': 'turbo_wild_rose',
});

function buildValueText(value) {
  if (value?.totalCoins == null) return '—';
  return `${value.complete ? '' : '≥ '}${formatApproxCoins(value.totalCoins)}`;
}

const physicalValueRefreshes = new Set();
function queuePhysicalValueRefresh(slotId, item, extraComponents = []) {
  const components = physicalItemValueComponents(slotId, item, { extraComponents });
  const key = components.map(row => `${row.itemTag}:${row.quantity}`).sort().join('|');
  if (!key || physicalValueRefreshes.has(key)) return;
  physicalValueRefreshes.add(key);
  refreshPhysicalItemBuildValue(slotId, item, { extraComponents })
    .then(updated => {
      if (updated > 0) globalThis.dispatchEvent?.(new Event('farming420:item-value-updated'));
    })
    .catch(() => {});
}



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

function currentToolBuildRecord() {
  const mk3 = TOOL_PANEL_ENTRIES.get('tool-mk-iii');
  const mk2 = TOOL_PANEL_ENTRIES.get('tool-mk-ii');
  const tier = mk3 && isOwned(mk3) ? 3 : mk2 && isOwned(mk2) ? 2 : 1;
  const skyblockId = farmingToolSkyblockId(crop().tool, tier);
  const reforge = FARMING_TOOL_REFORGES.find(row => {
    const entry = TOOL_PANEL_ENTRIES.get(`tool-reforge-${row.id}-reforge`);
    return entry && isOwned(entry);
  })?.id || null;

  const enchantments = {};
  const enchantRows = [
    ['tool-enchant-cultivating-x', 'cultivating'],
    ['tool-enchant-dedication', 'dedication'],
    ['tool-enchant-harvesting-vi', 'harvesting'],
  ];
  for (const [entryId, enchantKey] of enchantRows) {
    const entry = TOOL_PANEL_ENTRIES.get(entryId);
    const level = entry ? currentLevel(entry) : 0;
    if (level > 0) enchantments[enchantKey] = level;
  }
  const turbo = TOOL_PANEL_ENTRIES.get('tool-enchant-turbo-crop');
  const turboLevel = turbo ? currentLevel(turbo) : 0;
  const turboKey = TURBO_ENCHANT_KEY_BY_CROP[state.selectedCrop];
  if (turboLevel > 0 && turboKey) enchantments[turboKey] = turboLevel;

  const recomb = TOOL_PANEL_ENTRIES.get('tool-recombobulator-effect-on-tool-stats');
  const peridot = TOOL_PANEL_ENTRIES.get('tool-gem-perfect-peridot-on-farming-tool');
  const overclocker = TOOL_PANEL_ENTRIES.get('tool-overclocker-3000');
  const dummies = TOOL_PANEL_ENTRIES.get('tool-farming-for-dummies');
  const extraComponents = [
    { id: 'overclocker', label: 'Overclocker 3000', itemTag: 'OVERCLOCKER_3000', quantity: overclocker ? currentLevel(overclocker) : 0 },
    { id: 'farming-for-dummies', label: 'Farming for Dummies', itemTag: 'FARMING_FOR_DUMMIES', quantity: dummies ? currentLevel(dummies) : 0 },
  ].filter(row => row.quantity > 0);

  return {
    item: {
      skyblockId,
      displayName: crop().tool,
      reforge,
      recombobulated: Boolean(recomb && isOwned(recomb)),
      enchantments,
      gems: peridot && isOwned(peridot) ? ['PERFECT PERIDOT'] : [],
    },
    extraComponents,
  };
}

function toolBuildValuePanel() {
  const build = currentToolBuildRecord();
  const value = physicalItemBuildValue('tool', build.item, { extraComponents: build.extraComponents });
  const missing = value.missing.length
    ? `${value.missing.length} component${value.missing.length === 1 ? '' : 's'} still unpriced`
    : 'base item + installed priced upgrades';
  const freshness = value.computedAtMs != null
    ? marketAverageTimestampLabel({ computedAtMs: value.computedAtMs })
    : '';
  return `<div class="setup-bar tool-build-value" data-tool-build-value>
    <div><div class="eyebrow">Estimated replacement value</div><strong>${esc(buildValueText(value))}</strong>
    <div class="hint">${esc([missing, 'rolling 90-day market averages', freshness].filter(Boolean).join(' · '))}</div></div>
  </div>`;
}

function toolEntryLine(item) {
  const max = Number(item.max || 1);
  const level = currentLevel(item);
  const on = isOwned(item);
  const control = levelControlFor(max);
  const state = isMaxed(item) ? 'maxed' : on ? 'active' : 'missing';
  const gain = Number(item.stepGain || 0);
  const pricing = upgradePriceSummary(itemStore(item), item);
  const remainingText = pricing.costToMaxCoins != null && currentLevel(item) < max
    ? `${pricing.costToMaxComplete ? '' : '≥ '}${formatApproxCoins(pricing.costToMaxCoins)} to max`
    : '';

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
      <span class="enchant-max">${remainingText || (max > 1 ? `max ${control === 'number' ? max : esc(toRoman(max))}` : gain ? `+${gain} FF` : 'owned or not')}</span>
    </div>`;
}

function toolItemPanel() {
  return `${toolBuildValuePanel()}<div class="item-editor rarity-unknown" data-tool-editor="1">
    ${TOOL_PANEL.map(group => `<section class="item-editor-section" data-tool-section="${esc(group.id)}">
      <div class="section-row"><div><h3>${esc(group.title)}</h3><p>${esc(group.note)}</p></div></div>
      <div class="enchant-grid">${group.entries.map(id => toolEntryLine(TOOL_PANEL_ENTRIES.get(id))).join('')}</div>
    </section>`).join('')}
  </div>`;
}

function bindToolPanel() {
  const rerender = () => { saveState(); render(); };
  const build = currentToolBuildRecord();
  queuePhysicalValueRefresh('tool', build.item, build.extraComponents);
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
    ${section === 'tools' ? toolItemPanel() : ''}
    ${section === 'tools' ? '<div class="section-row"><div><h2>Every scored tool entry</h2><p>The same values, with the Fortune each one contributes and the source behind it.</p></div></div>' : ''}
    <div class="${gridClass}">${items.map(x=>card(x)).join('') || '<div class="empty">No matches.</div>'}</div>`;
}

function qolPage() {
  return `${pageHeader('QoL', 'Quality of Life', 'Convenience, farm-building and setup tools live here. They are tracked separately from Farming Fortune and profit because their value is saved setup time and easier operation rather than a comparable stat gain.')}
    <div class="qol-list"><div class="empty">Loading QoL items…</div></div>`;
}

function focusNextPage() {
  return `${pageHeader('Focus', 'Good to focus on next', 'Earned progression is separated from coin-cost upgrades. Farming420 estimates one next-step session with a fixed planning average and shows the calculated Fortune/Overbloom value beside it.')}
    <div class="focus-next-list"><div class="empty">Calculating focus suggestions…</div></div>`;
}

function plannerPage() {
  const candidates = plannerCandidates().slice(0,20);
  return `${pageHeader('Planner', 'Upgrades', 'Coin-cost upgrades stay here. Earned progression and time-based goals live in Focus on next, so buying decisions are not mixed with grind priorities.')}
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
        <div class="planner-number"><strong>+${formatNumber(x.gain)}</strong><span>marginal</span></div>
        <div class="planner-number"><strong>${x.rel.toFixed(2)}%</strong><span>relative</span></div>
        <div class="planner-number"><strong>${x.cost?`${formatNumber(Math.round(x.cost))} Coins`:'—'}</strong><span>${x.efficiency!==null?`${x.efficiency.toFixed(3)} / 1M`:'Cost missing'}</span></div>
      </button>`).join('') || '<div class="empty">No calculated upgrades for the current state.</div>'}
    </div>`;
}

function drawer() {
  if (!state.drawer) return '';
  const item = UPGRADES.find(x=>x.id===state.drawer);
  if (!item) return '';
  const level = currentLevel(item);
  const max = Number(item.max||1);
  const store = itemStore(item);
  const costSource = resolveUpgradeCost(store, item.id);
  const pricing = upgradePriceSummary(store, item);
  const costText = pricing.nextCostCoins != null
    ? formatApproxCoins(pricing.nextCostCoins)
    : costSource.acquisitionMode === 'EARNED'
      ? 'Earned progression'
      : '—';
  const toMaxText = level >= max
    ? 'Maxed'
    : pricing.costToMaxCoins != null
      ? `${pricing.costToMaxComplete ? '' : '≥ '}${formatApproxCoins(pricing.costToMaxCoins)}`
      : '—';
  const toMaxNote = [
    pricing.remainingEarnedSteps ? `${pricing.remainingEarnedSteps} earned step${pricing.remainingEarnedSteps === 1 ? '' : 's'}` : '',
    pricing.remainingUnknownSteps ? `${pricing.remainingUnknownSteps} unpriced step${pricing.remainingUnknownSteps === 1 ? '' : 's'}` : '',
    pricing.costToMaxComputedAtMs != null
      ? marketAverageTimestampLabel({ computedAtMs: pricing.costToMaxComputedAtMs })
      : '',
  ].filter(Boolean).join(' · ');
  const isShard = item.section === 'shards' || item.category === 'Attribute Shard';
  const manual = store.manualGain[item.id] ?? '';
  return `<div class="drawer-backdrop" data-close-drawer><aside class="drawer">
    <div class="drawer-top"><div><div class="eyebrow">${esc(item.category)}</div><h2>${esc(item.name)}</h2></div><button class="close" data-close-drawer>×</button></div>
    <div class="drawer-badges">${badge(item.status,item.status==='VERIFY'?'verify':'soft')} ${isCropScopedItem(item)?badge(crop().name,'soft'):(item.cropScope!=='Any'?badge(item.cropScope,'soft'):'')} ${item.modeScope!=='Any'?badge(item.modeScope,'soft'):''}</div>
    ${isSynced(item) ? '<div class="drawer-synced">Farming420 worked this value out for you, from your profile sync and your active setup. Editing it here overrides it until the next sync or setup change.</div>' : ''}
    <div class="drawer-section"><h3>Ownership & Level</h3>
      ${max>1 ? `<div class="stepper"><button data-step="-1" data-id="${item.id}">−</button><strong>${level}/${max}</strong><button data-step="1" data-id="${item.id}">+</button><button class="ghost small" data-max="${item.id}">Max</button></div>` : `<label class="switch-row"><span>Owned</span><input type="checkbox" data-owned="${item.id}" ${isOwned(item)?'checked':''}></label>`}
    </div>
    <div class="drawer-section"><h3>Evaluation</h3><div class="detail-grid"><div><span>Next step</span><strong>+${formatNumber(gainFor(item))}</strong></div><div><span>Relative effect</span><strong>${relativeGainPct(item).toFixed(2)}%</strong></div></div>
      <div class="detail-grid">
        <div><span>Next cost</span><strong>${esc(costText)}</strong><small>${esc(costOriginNote(costSource))}</small></div>
        <div><span>Cost to max</span><strong>${esc(toMaxText)}</strong><small>${esc(toMaxNote || (pricing.costToMaxComplete ? 'all remaining priced steps included' : 'remaining market route incomplete'))}</small></div>
      </div>
      ${isShard ? `<div class="detail-grid shard-price-details">
        <div><span>1 shard</span><strong>${esc(pricing.unitShardCoins != null ? formatApproxCoins(pricing.unitShardCoins) : '—')}</strong></div>
        <div><span>Current level replacement value</span><strong>${esc(pricing.currentShardValueCoins != null ? formatApproxCoins(pricing.currentShardValueCoins) : '—')}</strong><small>${esc([`${pricing.shardCountOwned ?? '—'} shard${pricing.shardCountOwned === 1 ? '' : 's'} equivalent`, pricing.entryMarketComputedAtMs != null ? marketAverageTimestampLabel({ computedAtMs: pricing.entryMarketComputedAtMs }) : ''].filter(Boolean).join(' · '))}</small></div>
        <div><span>Shards to max</span><strong>${pricing.shardCountToMax ?? '—'}</strong><small>${esc(pricing.costToMaxCoins != null ? formatApproxCoins(pricing.costToMaxCoins) : 'price unavailable')}</small></div>
      </div>` : ''}
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
  writeLinkedSetupSlot(all, all.activeId, slotId, item);
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
  const minLevel = Math.max(1, Number(row.minLevel) || 1);
  const levels = row.maxLevel
    ? [...new Set([
      ...Array.from({ length: Math.max(0, row.maxLevel - minLevel + 1) }, (_, index) => index + minLevel),
      row.level,
    ].filter(value => value > 0))].sort((a, b) => a - b)
    : [...new Set([row.level, 1, 2, 3, 4, 5].filter(value => value > 0))].sort((a, b) => a - b);
  const maximum = row.maxLevel
    ? `max ${esc(toRoman(row.maxLevel))}${row.trueMaxLevel > row.maxLevel ? ` · special ${esc(toRoman(row.trueMaxLevel))}` : ''}`
    : 'level unknown';
  return `<div class="enchant-line enchant-${esc(row.state)} ${row.active ? 'on' : 'off'}" data-ench-row="${esc(row.storageKey)}">
      ${leverInput('data-ench-toggle', slotId, row.storageKey, row.active, `${row.label} on this item`)}
      <span class="enchant-name">${esc(row.label)}${row.kind === 'ultimate' ? '<em class="enchant-tag">ultimate</em>' : ''}${row.known ? '' : '<em class="enchant-tag unknown">not verified</em>'}</span>
      <select class="enchant-level" data-ench-select="${esc(slotId)}" data-ench-key="${esc(row.storageKey)}" data-ench-max="${row.maxLevel || 0}" ${row.active ? '' : 'disabled'}>
        ${levels.map(level => `<option value="${level}" ${level === row.level ? 'selected' : ''}>${esc(toRoman(level))}</option>`).join('')}
      </select>
      <span class="enchant-max">${maximum}</span>
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
  const catalogItems = itemsForSlot(itemCatalog, slotId);
  const capabilities = itemCapabilities(slotId, item, itemCatalog);
  const reforges = capabilities.reforges.map(option => ({ value: option.id, source: 'official' }));
  const rows = enchantRowsFor(slotId, item);
  const gems = item.gems || [];
  const filled = Boolean(item.displayName);
  const buildValue = filled ? physicalItemBuildValue(slotId, item) : null;
  const buildValueNote = buildValue
    ? [
      buildValue.complete
        ? 'base + installed priced upgrades'
        : `${buildValue.missing.length} component${buildValue.missing.length === 1 ? '' : 's'} still unpriced`,
      buildValue.computedAtMs != null
        ? marketAverageTimestampLabel({ computedAtMs: buildValue.computedAtMs })
        : '',
    ].filter(Boolean).join(' · ')
    : '';

  return `<div class="item-editor ${esc(rarityClass(item.rarity))}" data-item-editor="${esc(slotId)}">
    <header class="item-editor-head item-editor-actions">
      ${filled ? `<div class="item-build-value"><span>Estimated replacement value</span><strong>${esc(buildValueText(buildValue))}</strong><small>${esc(buildValueNote)}</small></div>` : ''}
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

      ${capabilities.canReforge ? `<label class="settings-field"><span>Reforge</span>
        <input list="reforge-options" type="text" data-slot-reforge="${esc(slotId)}" value="${esc(item.reforge || '')}" placeholder="e.g. mossy">
        <datalist id="reforge-options">${reforges.map(option => `<option value="${esc(option.value)}"></option>`).join('')}</datalist>
      </label>` : ''}
    </div>

    ${capabilities.canRecombobulate ? `<div class="item-editor-row">
      ${leverInput('data-slot-recomb', slotId, '', Boolean(item.recombobulated), 'Recombobulated')}
      <div><strong>Recombobulated</strong><span class="hint">Raises the item one rarity, which raises reforge and gemstone values with it.</span></div>
    </div>` : ''}

    ${rows.length ? `<section class="item-editor-section">
      <div class="section-row"><div><h3>Enchantments</h3><p>Everything that can sit on this ${esc(slot.label.toLowerCase())}. Flip the ones you have, then pick the level.</p></div></div>
      <div class="enchant-grid">${rows.map(row => enchantLine(slotId, row)).join('')}</div>
    </section>` : `<p class="hint">A ${esc(slot.label.toLowerCase())} takes no farming enchantments.</p>`}

    ${capabilities.gemstoneSlots.length ? `<section class="item-editor-section">
      <div class="section-row"><div><h3>Gemstones</h3><p>${capabilities.gemstoneSlots.length} official socket${capabilities.gemstoneSlots.length === 1 ? '' : 's'} on this item.</p></div></div>
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
    </section>` : ''}
  </div>`;
}

function activeSetupObjective() {
  const mode = activityModeForState(state);
  if (mode === ACTIVITY_MODE.FARM) {
    return state.setupFarmObjective === SETUP_OBJECTIVE.JACOB_CONTEST
      ? SETUP_OBJECTIVE.JACOB_CONTEST
      : SETUP_OBJECTIVE.NORMAL_CROP;
  }
  return setupObjectiveForActivity(mode);
}

function setupCandidateLabel(candidate) {
  if (!candidate) return 'Unknown setup';
  const pet = candidate.setup?.slots?.pet?.displayName || 'No pet';
  const armor = candidate.components?.armorSetId || 'no armor set';
  const equipment = candidate.components?.equipmentSetId || 'no equipment set';
  return `${armor} · ${equipment} · ${pet}`;
}

function setupObjectiveMetricText(key, value) {
  const number = Number(value);
  const formatted = Number.isFinite(number) ? formatNumber(number, FRACTION_2) : '—';
  if (key === 'effectiveFortune') return `${formatted} effective FF`;
  if (key === 'bonusPestChance') return `${formatted} BPC`;
  if (key === 'pestCooldownReductionPct') return `${formatted}% Pest CDR`;
  if (key === 'pestFortune') return `${formatted} Pest FF`;
  if (key === 'overbloom') return `${formatted} Overbloom`;
  return `${formatted} ${key}`;
}

function setupObjectivePanel() {
  const synced = snapshot();
  if (!synced) {
    return `<div class="setup-bar setup-objective-panel">
      <div><div class="eyebrow">Owned setup objective</div><strong>Sync a profile to evaluate owned combinations</strong>
      <div class="hint">No setup is guessed from missing ownership data.</div></div>
    </div>`;
  }

  const objective = activeSetupObjective();
  const mode = activityModeForState(state);
  const runtimeContext = setupRuntimeContextForState(state);
  const candidates = buildSetupCandidates(synced, { phase: mode });
  const result = evaluateSetupObjective(state, candidates, { objective, ...runtimeContext });
  const candidateById = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const frontierRows = result.rows.filter(row => row.frontier).slice(0, 4);

  const selector = mode === ACTIVITY_MODE.FARM
    ? `<label class="inline-input">Farming objective
        <select data-setup-farm-objective>
          <option value="${SETUP_OBJECTIVE.NORMAL_CROP}" ${objective === SETUP_OBJECTIVE.NORMAL_CROP ? 'selected' : ''}>Normal crop</option>
          <option value="${SETUP_OBJECTIVE.JACOB_CONTEST}" ${objective === SETUP_OBJECTIVE.JACOB_CONTEST ? 'selected' : ''}>Jacob Contest</option>
        </select>
      </label>`
    : mode === ACTIVITY_MODE.PEST_SPAWN
      ? `<div class="setup-runtime-context">
          <label class="inline-input">Pests killed in last 10m
            <input type="number" min="0" max="20" step="1" placeholder="unknown"
              data-setup-recent-pest-kills
              value="${runtimeContext.recentPestKills === null ? '' : runtimeContext.recentPestKills}">
          </label>
          <label class="inline-input">Sprayonator on this plot
            <select data-setup-sprayonator-active>
              <option value="" ${runtimeContext.sprayonatorActive === null ? 'selected' : ''}>Unknown</option>
              <option value="true" ${runtimeContext.sprayonatorActive === true ? 'selected' : ''}>Yes</option>
              <option value="false" ${runtimeContext.sprayonatorActive === false ? 'selected' : ''}>No</option>
            </select>
          </label>
          <div class="hint">20 kills is the Mantid cap. Empty/Unknown stays unknown, never zero.</div>
        </div>`
      : '';

  let headline = 'No complete owned candidate can be scored yet';
  let detail = 'Unknown mechanics and missing runtime context stay unknown instead of becoming zero.';
  if (result.recommendation.status === 'clear') {
    const chosen = candidateById.get(result.recommendation.candidateId);
    headline = setupCandidateLabel(chosen);
    detail = `Clear match for ${result.label} across ${result.eligibleCount} complete owned combination${result.eligibleCount === 1 ? '' : 's'}.`;
  } else if (result.recommendation.status === 'tradeoff') {
    headline = `${result.frontierCount} non-dominated setup options`;
    detail = 'No single setup is better on every primary objective, so Farming420 does not invent a weighted winner.';
  } else if (result.recommendation.status === 'tie') {
    headline = `${result.frontierCount} tied setup options`;
    detail = 'The modeled objective values are identical; no arbitrary winner is selected.';
  }

  const frontier = frontierRows.length
    ? `<div class="setup-objective-frontier">${frontierRows.map(row => {
        const candidate = candidateById.get(row.candidateId);
        const metrics = Object.entries(row.metrics)
          .map(([key, value]) => setupObjectiveMetricText(key, value))
          .join(' · ');
        return `<div class="hint"><strong>${esc(setupCandidateLabel(candidate))}</strong><br>${esc(metrics)}
          <button class="ghost small" type="button" data-setup-objective-apply="${esc(row.candidateId)}">Use this setup</button>
        </div>`;
      }).join('')}</div>`
    : '';

  return `<div class="setup-bar setup-objective-panel" data-setup-objective-panel>
    <div>
      <div class="eyebrow">Owned setup objective · ${esc(result.label)}</div>
      <strong>${esc(headline)}</strong>
      <div class="hint">${esc(detail)}</div>
      ${state.setupRecommendationNotice ? `<div class="hint"><strong>${esc(state.setupRecommendationNotice)}</strong></div>` : ''}
      ${frontier}
    </div>
    ${selector}
  </div>`;
}

function setupGroupTitle(group) {
  if (group !== 'Armor') return group;
  const mode = activityModeForState(state);
  return mode === ACTIVITY_MODE.PEST_SPAWN ? 'Armor · BPC set' : 'Armor · FF set';
}

function setupsPage() {
  const all = setups();
  const current = activeSetup(all);
  const summary = setupSummary(current);
  const synced = snapshot();
  const hasSnapshot = Boolean(synced?.items?.length || synced?.pets?.some(pet => pet?.active === true));

  return `${pageHeader('Setups', 'Your gear, item by item', 'A setup is one complete configuration you can actually wear. Setups sit beside each other because they are alternatives, never added together.')}
    ${setupObjectivePanel()}
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
      <div class="section-row"><div><h2>${esc(setupGroupTitle(group))}</h2></div></div>
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
  document.querySelectorAll('[data-setup-objective-apply]').forEach(button => {
    button.addEventListener('click', () => {
      const synced = snapshot();
      if (!synced) return;
      const objective = activeSetupObjective();
      const mode = activityModeForState(state);
      const runtimeContext = setupRuntimeContextForState(state);
      const candidates = buildSetupCandidates(synced, { phase: mode });
      const analysis = evaluateSetupObjective(state, candidates, { objective, ...runtimeContext });
      const candidateId = button.dataset.setupObjectiveApply;
      const row = analysis.rows.find(entry =>
        entry.candidateId === candidateId && entry.eligible && entry.frontier);
      const candidate = candidates.find(entry => entry.id === candidateId);

      if (!row || !candidate) {
        state.setupRecommendationNotice = 'That recommendation is no longer current; the owned setup list was recalculated.';
        rerender();
        return;
      }

      const targetSetupId = setupIdForActivity(analysis.phase);
      const applied = applyCandidateSetupSafely(all, targetSetupId, candidate.setup);
      if (applied.applied) {
        state.setupRecommendationNotice = applied.backupId
          ? `Applied to ${targetSetupId}. Previous setup preserved as ${applied.backupId}.`
          : `Applied to ${targetSetupId}.`;
      } else {
        state.setupRecommendationNotice = applied.reason || 'No setup change was needed.';
      }
      state.setupSlot = null;
      rerender();
    });
  });

  document.querySelector('[data-setup-recent-pest-kills]')?.addEventListener('change', event => {
    state.profile ||= {};
    state.profile.setupRuntimeContext ||= {};
    state.profile.setupRuntimeContext.recentPestKills = event.target.value === ''
      ? null
      : normalizeRecentPestKills(event.target.value);
    state.setupRecommendationNotice = null;
    rerender();
  });

  document.querySelector('[data-setup-sprayonator-active]')?.addEventListener('change', event => {
    state.profile ||= {};
    state.profile.setupRuntimeContext ||= {};
    state.profile.setupRuntimeContext.sprayonatorActive = normalizeSprayonatorActive(event.target.value);
    state.setupRecommendationNotice = null;
    rerender();
  });

  document.querySelector('[data-setup-farm-objective]')?.addEventListener('change', event => {
    state.setupRecommendationNotice = null;
    state.setupFarmObjective = event.target.value === SETUP_OBJECTIVE.JACOB_CONTEST
      ? SETUP_OBJECTIVE.JACOB_CONTEST
      : SETUP_OBJECTIVE.NORMAL_CROP;
    rerender();
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
  const itemForValue = currentItem();
  if (itemForValue?.displayName) queuePhysicalValueRefresh(slotId, itemForValue);
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
      // Choosing a different catalogue item means a different physical object.
      physicalItemId: changingItem ? null : currentItem().physicalItemId,
      itemUuid: changingItem ? null : currentItem().itemUuid,
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
  // beside it says at which level. Turning one on starts at the enchantment's
  // lowest obtainable tier rather than at its maximum.
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
  cachedCatalogSearchSource = null;
  if (state.search.trim()) updateSearchResults(state.search);

  // Do not replace the global search input while the player is typing. The
  // setup/accessory page can repaint after the search loses focus or another
  // explicit state change happens.
  const searchHasFocus = document.activeElement?.id === 'search';
  if (!searchHasFocus && ['setups', 'accessories'].includes(state.page) && (result.items.length || result.error)) render();
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

const BEGINNER_PLACES = Object.freeze([
  {
    name: 'Farm Merchant',
    location: 'Starter farming shop',
    detail: 'Buy the Rookie Hoe and Rookie Farming Axe here before the Garden becomes your main farming area.',
  },
  {
    name: 'Sam',
    location: 'Garden unlock',
    detail: 'At SkyBlock Level 5, speak to Sam to unlock The Garden. From then on, treat the Garden as the main farming hub.',
  },
  {
    name: 'SkyMart',
    location: 'The Garden',
    detail: 'Early Garden tools and utility items cost Copper here. Do not spread Copper over every tool; build the crop you actually farm.',
  },
  {
    name: 'Garden Desk',
    location: 'The Garden',
    detail: 'Crop Upgrades live here. After the Sundial hand-in, the Desk also gives per-crop Speed settings.',
  },
  {
    name: 'Beth',
    location: 'Desert Settlement',
    detail: 'Start her quest early and keep serving her when she visits. The quest later gates the Crop Analyzer.',
  },
  {
    name: 'Jacob & Anita',
    location: 'Farming contest progression',
    detail: 'Jacob contests start at Farming 10. Gold results in unique crops feed Anita’s Farming level-cap upgrades later.',
  },
  {
    name: 'Pesthunter Phillip',
    location: 'Pest progression',
    detail: 'Pests can be converted into temporary Farming Fortune before longer Pest-farming sessions.',
  },
]);

function infoCropName(pest) {
  return CROPS.find(entry => entry.id === pest.cropId)?.name || pest.cropId;
}

function infoPipelineMarkup(steps) {
  return steps.map((entry, index) => `
    <li class="pest-step">
      <span class="pest-step-index">${index + 1}</span>
      <div><strong>${esc(entry.step)}</strong><p>${esc(entry.detail)}</p></div>
    </li>`).join('');
}

function infoPestGuide() {
  return `<section class="info-section" id="info-pests">
    <div class="section-row">
      <div>
        <div class="eyebrow">Pest guide</div>
        <h2>Two pipelines, different stats</h2>
        <p>Use this as the mental model before buying Pest upgrades. Spawning, killing, guaranteed drops and rare drops are four different jobs.</p>
      </div>
    </div>
    <div class="pest-sides">
      ${Object.entries(PEST_STAT_SIDES).map(([key, side]) => `
        <div class="pest-side" data-pest-side="${esc(key)}">
          <strong>${esc(side.label)}</strong>
          <p>${esc(side.note)}</p>
        </div>`).join('')}
    </div>
    <div class="pest-pipelines">
      <div class="pest-pipeline">
        <h3>Spawn</h3>
        <ol>${infoPipelineMarkup(SPAWN_PIPELINE)}</ol>
      </div>
      <div class="pest-pipeline">
        <h3>Loot</h3>
        <ol>${infoPipelineMarkup(LOOT_PIPELINE)}</ol>
      </div>
    </div>
    <div class="info-pest-loop">
      <strong>Practical Pest loop from Farming 40</strong>
      <ol>
        <li>Farm normally while the Pest cooldown runs.</li>
        <li>Shortly before it ends, swap to the spawning setup and keep breaking crops.</li>
        <li>After the Pests spawn, swap to the killing setup and clear them with the Vacuum.</li>
        <li>Return to the normal farming setup immediately after the clear.</li>
      </ol>
      <p>${PEST_HEALTH.normal} HP per normal Pest. Bonus Pest Chance belongs to spawning; Vacuum damage belongs to killing; Farming/Crop Fortune affects guaranteed Pest drops; Overbloom affects the non-guaranteed roll.</p>
    </div>
    <div class="section-row info-pest-map-head"><div><h3>Which pest, which crop</h3><p>The crop on the plot decides the standard Pest type.</p></div></div>
    <div class="pest-list">
      ${GARDEN_PESTS.map(pest => {
        const cropName = infoCropName(pest);
        return `<div class="pest-row${pest.status === 'VERIFIED' ? '' : ' pest-row-unverified'}">
          <span class="pest-crop-icon"><span class="pest-crop-letter">${esc(cropName.slice(0, 1))}</span></span>
          <div class="pest-main"><strong>${esc(pest.name)}</strong><span>${esc(cropName)}</span></div>
          <div class="pest-drop"><strong>${esc(guaranteedDropText(pest) || 'Guaranteed drop scaling not verified')}</strong><span>guaranteed drop</span></div>
          <div class="pest-vinyl"><strong>${esc(pest.vinyl || '—')}</strong><span>vinyl</span></div>
        </div>`;
      }).join('')}
    </div>
    ${UNMODELLED_PESTS.length ? `<p class="pest-note">Special Pest types not in the normal crop mapping: ${UNMODELLED_PESTS.map(pest =>
      `${esc(pest.name)}${pest.notes ? ` — ${esc(pest.notes)}` : ''}`).join('; ')}</p>` : ''}
  </section>`;
}

function infoPage() {
  const earlyStages = STAGES.slice(0, 4);
  return `${pageHeader('Info', 'Farming Info & Beginner Guide', 'Explanations, beginner strategy and where each system lives. Configuration and calculated values stay on their own tabs.')}
    <div class="info-home">
      <section class="info-section info-start">
        <div class="section-row">
          <div><div class="eyebrow">Start here</div><h2>Early-game strategy</h2><p>Follow the stage that matches your Farming level. The detailed 0-60 guide remains below.</p></div>
        </div>
        <div class="info-strategy-grid">
          ${earlyStages.map(stage => `<article class="info-card">
            <span>Farming ${stage.levelFrom}-${stage.levelTo}</span>
            <strong>${esc(stage.name)}</strong>
            <p>${esc(stage.summary)}</p>
            <ul>${stage.steps.slice(0, 4).map(step => `<li>${esc(step)}</li>`).join('')}</ul>
          </article>`).join('')}
        </div>
      </section>

      <section class="info-section" id="info-item-upgrades">
        <div class="section-row">
          <div><div class="eyebrow">Item upgrade reference</div><h2>What generic item upgrades actually do</h2><p>These systems are not tied to one single Farming420 card, so global search routes generic questions here.</p></div>
        </div>
        <div class="info-upgrade-grid">
          ${INFO_UPGRADE_TOPICS.map(topic => `<article class="info-card" id="info-upgrade-${esc(topic.id)}">
            <span>${esc(topic.label)}</span>
            <strong>${esc(topic.title)}</strong>
            <p>${esc(topic.summary)}</p>
          </article>`).join('')}
        </div>
      </section>

      <section class="info-section" id="info-places">
        <div class="section-row">
          <div><div class="eyebrow">Where to go</div><h2>Important places and NPCs</h2><p>Use this as a routing sheet when a guide tells you to buy, unlock or start something.</p></div>
        </div>
        <div class="info-place-grid">
          ${BEGINNER_PLACES.map(place => `<article class="info-place-card">
            <span>${esc(place.location)}</span>
            <strong>${esc(place.name)}</strong>
            <p>${esc(place.detail)}</p>
          </article>`).join('')}
        </div>
      </section>

      ${infoPestGuide()}

      <section class="info-section info-progression" id="info-progression">
        ${guidePage(true)}
      </section>
    </div>`;
}

function guidePage(embedded = false) {
  const level = farmingLevel();
  const current = level === null ? null : stageForLevel(level);
  const openStage = state.guideStage || current?.id || STAGES[0].id;
  const next = level === null ? null : nextArmorSet(level);

  const header = embedded
    ? '<div class="section-row"><div><div class="eyebrow">Progression reference</div><h2>Farming 0 to 60</h2><p>Every stage from the first crop to a maxed setup, with sourced alternatives and level gates.</p></div></div>'
    : pageHeader('Guide', 'Farming 0 to 60', 'Every stage from the first crop to a maxed setup, with the alternatives the source names as equal or only slightly worse.');

  return `${header}
    <div class="planner-context">
      <div><span>Your Farming level</span><strong>${level === null ? 'Unknown' : level}</strong></div>
      <div><span>Current stage</span><strong>${esc(current?.name || 'Sync to find out')}</strong></div>
      <div><span>Next armour</span><strong>${esc(next ? `${next.set} at ${next.level}` : (level === null ? '—' : 'All reached'))}</strong></div>
      <div><span>Stages</span><strong>${STAGES.length}</strong></div>
    </div>
    ${level === null ? '<div class="hint">Sync your profile in Settings, or enter your Farming Skill level on the Garden page, and this guide will follow along.</div>' : ''}

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

    <div class="section-row"><div><h2>Pets</h2><p>The useful pet changes between levelling, farming crops, spawning Pests and killing them. These cards explain the role only; pet configuration stays outside Info.</p></div></div>
    ${PET_OPTIONS.map(group => `
      <div class="pet-group">
        <div class="eyebrow">${esc(group.label)}</div>
        <div class="pet-options">
          ${group.options.map(option => `<article class="pet-option">
            <div class="pet-head">${badge(TIER_LABEL[option.tier], option.tier === 'best' ? 'maxed' : (option.tier === 'budget' ? 'soft' : 'owned'))}<strong>${esc(option.name)}</strong></div>
            <p>${esc(option.note)}</p>
          </article>`).join('')}
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
    case 'accessories': content = accessoriesPage(); break;
    case 'crops': content = cropsPage(); break;
    // The heading says what the page is; the picker and the editor below both
    // name the selected tool, so repeating it a third time here added nothing.
    case 'tools': content = genericSectionPage('tools','Tools','Farming tools','Pick the tool, then set what is actually on it: reforge, enchantments, gemstones, counters and tier.'); break;
    case 'gear': content = genericSectionPage('gear','Gear','Armor & Equipment','Armor, equipment, reforges, gemstones and enchantments remain a separate setup layer.'); break;
    case 'pets': content = genericSectionPage('pets','Pets','Pets & Pet Items','Pets are mutually exclusive setup choices and are never added together.'); break;
    case 'chips': content = genericSectionPage('chips','Garden Chips','Garden Chips','Each chip has its own level path and activation conditions.'); break;
    case 'shards': content = genericSectionPage('shards','Attribute Shards','Shards','Track day/night, pest-conditional and general Farming Fortune shards separately.'); break;
    case 'buffs': content = effectsPage(); break;
    case 'pests': content = genericSectionPage('pests','Pests','Pest Analysis','Vacuum kill thresholds and Pesthunter Phillip calculations live here. Explanations and strategy are in Info.'); break;
    case 'qol': content = qolPage(); break;
    case 'info': content = infoPage(); break;
    case 'setups': content = setupsPage(); break;
    case 'focus': content = focusNextPage(); break;
    case 'planner': content = plannerPage(); break;
    default: content = dashboard();
  }
  document.getElementById('app').innerHTML = shell(content);
  bind();
  if (state.page === 'setups') bindSetups();
  if (['setups', 'accessories'].includes(state.page)) ensureItemCatalog();
  if (state.page === 'tools') bindToolPanel();
  if (state.page === 'info') bindGuide();

  // Restoring a scroll position that is already zero still costs a full forced
  // layout: assigning `scrollTop` and calling `window.scrollTo` make the browser
  // lay out the markup that was assigned one line earlier. Measured at 412px
  // with 4x CPU throttling this block was 166 ms of a 338 ms boot -- more than
  // building every page's markup -- and at boot there is provably nothing to
  // restore, because the document was just created at the origin.
  const hasScrollToRestore = Boolean(scrollState && (
    scrollState.main || scrollState.nav || scrollState.windowX || scrollState.windowY || relativeAnchor
  ));

  if (hasScrollToRestore) {
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

  document.querySelector('[data-dashboard-context]')?.addEventListener('change', event => {
    const option = FARMING_CONTEXT_OPTIONS.find(entry => entry.id === event.target.value);
    state.profile.farmingContext = option?.id || 'normal';
    saveState();
    render();
  });

  document.querySelectorAll('[data-dashboard-estimate]').forEach(input => input.addEventListener('change', event => {
    state.profile.plannerMeasured ||= {};
    const key = `${state.selectedCrop}:${activityModeForState(state)}`;
    state.profile.plannerMeasured[key] ||= {};
    const field = event.target.dataset.dashboardEstimate;
    const raw = String(event.target.value || '').trim();
    if (raw === '') delete state.profile.plannerMeasured[key][field];
    else state.profile.plannerMeasured[key][field] = Math.max(0, Number(raw) || 0);
    saveState();
    render();
  }));
  const search = document.getElementById('search');
  const searchResults = document.getElementById('searchResults');
  if (search) {
    search.addEventListener('input', event => {
      state.search = event.target.value;
      saveState();
      updateSearchResults(state.search);
      if (!catalogRequested) ensureItemCatalog();
    });
    search.addEventListener('focus', () => {
      updateSearchResults(search.value);
      if (!catalogRequested) ensureItemCatalog();
    });
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearGlobalSearch();
        search.focus();
      } else if (event.key === 'Enter' && activeSearchResults[0]) {
        event.preventDefault();
        navigateSearchResult(activeSearchResults[0]);
      } else if (event.key === 'ArrowDown') {
        const first = searchResults?.querySelector('[data-search-result]');
        if (first) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }
  searchResults?.addEventListener('click', event => {
    const button = event.target.closest('[data-search-result]');
    if (!button) return;
    navigateSearchResult(activeSearchResults[Number(button.dataset.searchResult)]);
  });
  searchResults?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const button = event.target.closest('[data-search-result]');
    if (!button) return;
    event.preventDefault();
    navigateSearchResult(activeSearchResults[Number(button.dataset.searchResult)]);
  });
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
      window.dispatchEvent(new Event('farming420:state-changed'));
    } catch (error) {
      alert(error.message);
      e.target.value='';
    }
  });
}

// Warm the derived stat cache before the first paint.
//
// `computed-stats-ui.js` used to do this on its first observer pass, find the
// stored cache stale, write it, and dispatch `farming420:state-changed` to make
// the core pick it up -- a second full render of a page that had just been
// rendered. Doing it here instead means the enhancer's comparison finds nothing
// to change and stays silent, which is also what rule 5 of
// `docs/RENDER_FREEZE_SAFETY.md` asks of it.
//
// `saveState` is a no-op while the stored data came from a newer app version,
// so this cannot write over state this build does not understand.
applyComputedStatsToState(state);
saveState();

render();

// Settings writes synced values straight to storage; re-read and repaint so the
// cards show them without a manual reload.
window.addEventListener('farming420:state-changed', () => {
  state = loadState();
  render();
});

// Market refresh changes only the price cache, not profile state. Do not
// globally repaint editors/setups when background market requests finish:
// that would replace interactive DOM under the user. The Dashboard is the one
// core-rendered surface that needs an immediate repaint for its price cards.
window.addEventListener('farming420:market-average-updated', () => {
  const safePricePages = new Set(['dashboard', 'accessories', 'crops', 'gear', 'pets', 'chips', 'shards', 'buffs', 'pests', 'qol', 'planner', 'focus']);
  if (safePricePages.has(state.page)) render();
});

window.addEventListener('farming420:item-value-updated', () => {
  if (state.page === 'setups' || state.page === 'tools') render();
});
