import { isUnsupportedState, readStoredAppState, writeStoredAppState } from './app-storage.js';
import { applyFarmingToolReforge, FARMING_TOOL_REFORGE_ENTRY_IDS, selectedFarmingToolReforge } from './item-capabilities.js';
import { CROPS, UPGRADES } from './data.js';
import { CHIP_LEVEL_CAP, gardenChipForEntry, phillipBuffEffect } from './farming-modifiers-data.js';
import { INFO_ENTRIES, INFO_SECTIONS, allInfoEntries, cropStrategyInfo } from './info-content.js';
import { FARMING_ACCESSORY_GROUPS } from './farming-accessories.js';
import { FARMING_PETS } from './setup-pet-catalog.js';
import { searchEntries } from './global-search.js';
import { canonicalPage } from './navigation-routes.js';
import {
  ELEMENTAL_STRENGTH_SHARDS,
  FARMING_SHARD_SYNERGIES,
  atmosphericFilterEffects,
  cowFortuneDeltaForAddedStrength,
  cowFortuneDeltaForStrengthPercentChange,
  elementalStrengthFromShardLevels,
  jormungStrengthPercent,
  nextElementalShardStrength,
  strengthUntilNextCowFortune,
} from './farming-synergies.js';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { applyComputedStatsToState, computeStatTotals } from './computed-stats.js';
import { ACTIVITY_MODE, activityLabel, activityModeForState, setupIdForActivity } from './activity-mode.js';
import {
  FARMING_CONTEXT_OPTIONS,
  farmingContextForState,
  farmingContextLabel,
  farmingContextScopes,
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
import { DASHBOARD_STREAM_STATUS, calculateDashboardEconomics } from './dashboard-economics.js';
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
  itemSummary,
  levelControlFor,
  toolPanelEntryIds,
  rarityClass,
  withEnchantLevel,
  withEnchantToggled,
} from './item-editor.js';
import {
  BPC_SETUP_ID,
  FF_SETUP_ID,
  ITEM_SOURCE,
  KILLING_SETUP_ID,
  SETUP_SLOTS,
  THIRD_SETUP_ID,
  activeSetup,
  applyCandidateSetupSafely,
  createEmptyItem,
  effectiveSetup,
  farmingKillingPetShared,
  prefillSetupFromSnapshot,
  prepareFfBpcSetups,
  setupSummary,
  synchronizeFarmingKillingLoadouts,
  thirdSetupName,
  visiblePhysicalSetupIds,
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
import { gemValuesForSlotType, itemCapabilities } from './item-capabilities.js';
import { FARMING_TOOL_REFORGES } from './farming-reforges.js';
import { FARMING_TOOL_ITEM_IDS, GARDEN_VACUUM_ITEMS, farmingToolSkyblockId } from './exact-farming-items.js';
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
import { plannerUpgradeTargetEligible } from './planner-upgrade-objective.js';

const NAV = [
  ['dashboard', 'Dashboard'],
  ['setups', 'Loadouts / Farming System'],
  ['crops', 'Garden'],
  ['buffs', 'Effects'],
  ['tools', 'Tools'],
  ['shards', 'Accessories / Chips / Shards'],
  ['planner', 'Upgrades'],
  ['qol', 'QoL'],
  ['focus', 'Focus on Next'],
  ['info', 'Info'],
];

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
  dashboardCrop: 'melon',
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
    synergyShardLevels: {},
    farmingContext: 'normal',
  }
};

function loadState() {
  readOnlyState = false;
  migrationApplied = false;
  let saved;
  try {
    saved = readStoredAppState(null);
    if (!saved) return structuredClone(defaultState);
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
  loaded.page = canonicalPage(loaded.page);
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
// Render helpers may normalize an in-memory projection. Compare announcements
// against persisted input so an unchanged disk state cannot repaint that projection.
let lastObservedStoredState = JSON.stringify(readStoredAppState(null));
let pendingPriceRender = false;
let priceRenderTimer;

let activeScrollAnchor = null;
let scrollAnchorRestoreFrame = 0;
let scrollIntentGeneration = 0;
const SCROLL_ANCHOR_MAX_AGE_MS = 1800;
const SCROLL_ANCHOR_CONTROL_SELECTOR = 'button, input, select, textarea, a, label, [role="button"], [role="radio"]';

function scrollAnchorElement(target) {
  if (!target?.closest) return null;

  // Setup editors are moved/rebuilt after every item edit. Anchoring to the
  // control inside that editor is unstable because the control may disappear,
  // move, or become hidden (for example an option inside a closed <details>).
  // Anchor the interaction to the physical slot card instead; that card is the
  // stable thing the user is looking at.
  if (state.page === 'setups') {
    const editor = target.closest('[data-item-editor]');
    const slotId = editor?.dataset.itemEditor;
    if (slotId) {
      const card = [...document.querySelectorAll('.slot-card[data-slot]')].find(candidate =>
        candidate.dataset.slot === slotId
        && (!state.setupSlotTarget || candidate.dataset.setupTarget === state.setupSlotTarget));
      if (card) return card;
    }
  }

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

function scrollAnchorAttributes(element) {
  // Identity attributes must survive the state change caused by the control.
  // A setup slot keeps the same logical identity while its selected item id
  // changes, so anchoring to data-skyblock-item-id makes the old card
  // impossible to resolve after an item selection.
  if (element.matches?.('.slot-card[data-slot]')) {
    return ['data-slot', 'data-setup-target']
      .map(name => [name, element.getAttribute(name)])
      .filter(([, value]) => value !== null);
  }

  // The value attribute is mutable state, not control identity. Keeping it in
  // the descriptor makes number/text selections lose their anchor on rerender.
  return [...element.attributes]
    .filter(attr => attr.name.startsWith('data-') || ['name', 'type'].includes(attr.name))
    .map(attr => [attr.name, attr.value]);
}

function describeScrollAnchor(root, element) {
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || '',
    attrs: scrollAnchorAttributes(element),
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
  scrollIntentGeneration += 1;
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
  // Programmatic proxy events describe an implementation detail, not a new
  // user interaction. Ignore only events explicitly marked by our own proxy
  // code; ordinary browser/test clicks still exercise the real anchor path.
  if (event.farming420Proxy === true) return;
  rememberScrollAnchor(event.target);
}

function preventUnsupportedMutation(event) {
  if (!isUnsupportedState(readStoredAppState())) return;
  const target = event.target?.closest?.('button, input, select, textarea, summary, a, [role="button"]');
  if (!target) return;
  // Navigation, raw backup export and update delivery remain available. The
  // older build cannot safely interpret dependent editor/sync actions.
  if (target.matches('[data-page], [data-open-settings], [data-nav-toggle], [data-nav-close], [data-settings-close], [data-backup-download], [data-check-update], #exportBtn, a')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

if (typeof document !== 'undefined') {
  for (const type of ['wheel', 'touchstart', 'touchmove', 'pointerdown']) {
    document.addEventListener(type, clearScrollAnchor, { capture: true, passive: true });
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
      && !event.target?.matches?.('input, textarea, [contenteditable="true"]'))) clearScrollAnchor();
  }, true);
  for (const type of ['click', 'change', 'input']) {
    document.addEventListener(type, preventUnsupportedMutation, true);
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
  const written = writeStoredAppState(state);
  if (written) lastObservedStoredState = JSON.stringify(readStoredAppState(null));
  return written;
}

// Persist the migrated shape once, so the next load starts from the new schema.
if (migrationApplied) saveState();

function esc(s='') {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function crop() {
  return CROPS.find(c => c.id === state.selectedCrop) || CROPS[0];
}

function dashboardCrop() {
  return CROPS.find(c => c.id === state.dashboardCrop)
    || CROPS.find(c => c.id === state.selectedCrop)
    || CROPS[0];
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
  const reforge = Object.entries(FARMING_TOOL_REFORGE_ENTRY_IDS).find(([, id]) => id === item.id)?.[0];
  if (reforge) return selectedFarmingToolReforge(store, state.profile.toolReforges?.[toolKeyForCropId(state.selectedCrop)]) === reforge ? 1 : 0;
  return Math.max(0, Math.min(Number(item.max || 1), Number(store.levels[item.id] || 0)));
}

function isOwned(item) {
  const store = itemStore(item);
  if (Object.values(FARMING_TOOL_REFORGE_ENTRY_IDS).includes(item.id)) return currentLevel(item) > 0;
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
let activeSearchResultIndex = -1;
let pendingSearchSpotlight = null;
let cowStrengthPlannerOpen = false;
let cachedCatalogSearchSource = null;
let cachedCatalogSearchEntries = [];

function pageForUpgrade(item) {
  const page = canonicalPage(item?.section);
  return NAV.some(([id]) => id === page) ? page : 'planner';
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

  cachedCatalogSearchEntries = [...byItem.values()].map(({ item, slots }) => {
    const groups = [...new Set(slots.map(slot => slot.group).filter(Boolean))];
    const armorRoles = groups.includes('Armor') ? ['ff set', 'bpc set', 'farming set', 'pest spawning set'] : [];
    const roleLabel = groups.includes('Armor') ? ' · FF set / BPC set' : '';
    return {
      id: `catalog:${item.id}`,
      kind: groups.length === 1 ? groups[0] : 'Selectable item',
      title: item.name,
      subtitle: `${groups.join(' / ') || 'Selectable item'}${roleLabel} · ${slots.map(slot => slot.label).join(', ')}`,
      keywords: [item.id, item.category, item.tier, ...groups, ...armorRoles, ...slots.map(slot => slot.label)],
      target: {
        type: 'catalog-item',
        page: 'setups',
        itemId: item.id,
        itemName: item.name,
        slotId: slots[0]?.id || null,
      },
    };
  });
  return cachedCatalogSearchEntries;
}

function searchAnchorSlug(prefix, value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${slug || 'entry'}`;
}

function searchKeywordAliases(...values) {
  const haystack = values.flat().filter(Boolean).join(' ').toLowerCase();
  const aliases = [];
  if (haystack.includes('farming fortune')) aliases.push('ff');
  if (haystack.includes('bonus pest chance')) aliases.push('bpc');
  if (haystack.includes('pest fortune')) aliases.push('pf');
  if (haystack.includes('pest overbloom')) aliases.push('pest rng');
  if (haystack.includes('overbloom')) aliases.push('rare drop chance', 'rng');
  if (haystack.includes('vacuum')) aliases.push('vacuum damage', 'pest killing');
  if (haystack.includes('cooldown')) aliases.push('pest cooldown');
  return aliases;
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
      subtitle: `Loadout pet picker · level ${pet.levelMin}-${pet.levelMax}`,
      keywords: [pet.id, ...(pet.rarities || [])],
      priority: 150,
      target: { type: 'setup-slot', page: 'setups', slotId: 'pet', petId: pet.id, petName: pet.name },
    });
  }

  for (const [toolName, ids] of Object.entries(FARMING_TOOL_ITEM_IDS)) {
    const cropId = CROPS.find(entry => entry.tool === toolName)?.id || null;
    entries.push({
      id: `tool-item:${ids[0]}`,
      kind: 'Selectable tool',
      title: toolName,
      subtitle: 'Physical farming tool · Mk. I / II / III',
      keywords: [...ids, 'mk 1', 'mk 2', 'mk 3', 'farming tool'],
      priority: 170,
      target: { type: 'tool', page: 'tools', cropId, toolName },
    });
  }

  for (const vacuum of GARDEN_VACUUM_ITEMS) {
    entries.push({
      id: `vacuum:${vacuum.id}`,
      kind: 'Selectable vacuum',
      title: vacuum.name,
      subtitle: `${vacuum.rarity} Garden Vacuum`,
      keywords: [vacuum.id, 'vacuum', 'pest tool'],
      priority: 170,
      target: { type: 'vacuum', page: 'tools', vacuumId: vacuum.id, vacuumName: vacuum.name },
    });
  }

  for (const topic of allInfoEntries(CROPS)) {
    entries.push({
      id: `info:${topic.id}`,
      kind: 'Info',
      title: topic.title,
      subtitle: topic.what,
      keywords: topic.keywords,
      priority: topic.section === 'crops' ? 1050 : 1200,
      target: { type: 'info', page: 'info', anchor: topic.anchor },
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

  SPAWN_PIPELINE.forEach((topic, index) => {
    entries.push({
      id: `info:pest-spawn:${index}`,
      kind: 'Mechanic',
      title: topic.step,
      subtitle: topic.detail,
      keywords: ['pest', 'spawn', 'spawning', ...searchKeywordAliases(topic.step, topic.detail)],
      priority: 980,
      target: { type: 'info', page: 'info', anchor: 'info-pests' },
    });
  });

  LOOT_PIPELINE.forEach((topic, index) => {
    entries.push({
      id: `info:pest-loot:${index}`,
      kind: 'Mechanic',
      title: topic.step,
      subtitle: topic.detail,
      keywords: ['pest', 'loot', 'drops', ...searchKeywordAliases(topic.step, topic.detail)],
      priority: 980,
      target: { type: 'info', page: 'info', anchor: 'info-pests' },
    });
  });

  for (const [sideId, side] of Object.entries(PEST_STAT_SIDES)) {
    entries.push({
      id: `info:pest-side:${sideId}`,
      kind: 'Mechanic',
      title: side.label,
      subtitle: side.note,
      keywords: [sideId, 'pest stats', ...searchKeywordAliases(side.label, side.note)],
      priority: 940,
      target: { type: 'info', page: 'info', anchor: 'info-pests' },
    });
  }

  for (const pest of GARDEN_PESTS) {
    const cropName = infoCropName(pest);
    entries.push({
      id: `info:pest:${pest.name}`,
      kind: 'Pest',
      title: pest.name,
      subtitle: `${cropName} · ${guaranteedDropText(pest) || 'Pest crop mapping'}`,
      keywords: [cropName, pest.cropId, pest.vinyl, pest.notes, ...searchKeywordAliases(pest.name, cropName, pest.notes)],
      priority: 760,
      target: { type: 'info', page: 'info', anchor: searchAnchorSlug('info-pest', pest.name) },
    });
  }

  for (const stage of STAGES) {
    entries.push({
      id: `info:stage:${stage.id}`,
      kind: 'Progression',
      title: stage.name,
      subtitle: `Farming ${stage.levelFrom}-${stage.levelTo} · ${stage.summary}`,
      keywords: [stage.id, `farming ${stage.levelFrom}`, `farming ${stage.levelTo}`, ...stage.steps],
      priority: 700,
      target: { type: 'info', page: 'info', anchor: 'info-progression', guideStage: stage.id },
    });
  }

  for (const ladder of ENCHANT_LADDERS) {
    entries.push({
      id: `info:enchant:${ladder.name}`,
      kind: 'Info',
      title: ladder.name,
      subtitle: `${ladder.scope} · ${ladder.perLevel}`,
      keywords: [ladder.scope, ladder.max, ladder.gate, ...ladder.steps.flatMap(step => [step.levels, step.from])],
      priority: 760,
      target: { type: 'info', page: 'info', anchor: searchAnchorSlug('info-enchant', ladder.name) },
    });
  }

  return [...entries, ...selectableCatalogSearchEntries()];
}

function searchResultGroup(entry) {
  const kind = String(entry?.kind || '').toLowerCase();
  if (kind.includes('setting')) return 'Settings';
  if (/info|mechanic|progression|pest/.test(kind)) return 'Info & mechanics';
  if (/upgrade|shard/.test(kind)) return 'Upgrades';
  if (/page|crop/.test(kind)) return 'Navigation';
  return 'Items';
}

function searchResultButtonMarkup(entry, index) {
  return `<button id="search-result-${index}" class="search-result" type="button" role="option" aria-selected="false" data-search-result="${index}">
    <span class="search-result-kind">${esc(entry.kind)}</span>
    <span class="search-result-copy">
      <strong>${esc(entry.title)}</strong>
      <small>${esc(entry.subtitle || '')}</small>
    </span>
  </button>`;
}

function searchResultsMarkup(query) {
  activeSearchResults = searchEntries(globalSearchEntries(), query, 16);
  activeSearchResultIndex = -1;
  if (!String(query || '').trim()) return '';
  if (!activeSearchResults.length) {
    return '<div class="search-no-results">No direct match. Try an item, shard, setting, stat, mechanic or upgrade name.</div>';
  }

  const groups = new Map();
  activeSearchResults.forEach((entry, index) => {
    const group = searchResultGroup(entry);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ entry, index });
  });

  return [...groups.entries()].map(([group, rows]) => `
    <div class="search-result-group" role="group" aria-label="${esc(group)}">
      <div class="search-result-group-title">${esc(group)}</div>
      ${rows.map(({ entry, index }) => searchResultButtonMarkup(entry, index)).join('')}
    </div>`).join('');
}

function updateSearchResults(query) {
  const panel = document.getElementById('searchResults');
  const input = document.getElementById('search');
  if (!panel) return;
  panel.innerHTML = searchResultsMarkup(query);
  panel.hidden = !String(query || '').trim();
  input?.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  input?.removeAttribute('aria-activedescendant');
}

function closeSearchResults({ clear = false } = {}) {
  const panel = document.getElementById('searchResults');
  const input = document.getElementById('search');
  if (clear) {
    state.search = '';
    saveState();
    if (input) input.value = '';
    updateSearchResults('');
    return;
  }
  if (panel) panel.hidden = true;
  activeSearchResultIndex = -1;
  input?.setAttribute('aria-expanded', 'false');
  input?.removeAttribute('aria-activedescendant');
}

function clearGlobalSearch() {
  closeSearchResults({ clear: true });
}

function focusSearchResult(index) {
  const panel = document.getElementById('searchResults');
  const input = document.getElementById('search');
  const buttons = [...(panel?.querySelectorAll('[data-search-result]') || [])];
  if (!buttons.length) return false;
  const nextIndex = (Number(index) + buttons.length) % buttons.length;
  activeSearchResultIndex = nextIndex;
  buttons.forEach((button, buttonIndex) => {
    button.setAttribute('aria-selected', buttonIndex === nextIndex ? 'true' : 'false');
  });
  const target = buttons[nextIndex];
  input?.setAttribute('aria-activedescendant', target.id);
  input?.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest' });
  return true;
}

function searchSpotlightNote(host, text) {
  if (!host || !text) return;
  host.classList.add('search-target-highlight');
  const existing = host.querySelector(':scope > .search-target-note');
  if (existing) {
    existing.textContent = text;
    return;
  }
  const note = document.createElement('div');
  note.className = 'search-target-note';
  note.textContent = text;
  host.prepend(note);
}

function applyPendingSearchSpotlight(attempt = 0) {
  const target = pendingSearchSpotlight;
  if (!target) return;

  let node = null;
  if (target.type === 'catalog-item' && target.slotId) {
    node = document.querySelector(`[data-slot-item="${target.slotId}"]`);
    if (node) {
      searchSpotlightNote(node.closest('.settings-field'), `Search result: ${target.itemName}. Select it here to update this loadout.`);
    }
  } else if (target.type === 'setup-slot' && target.slotId === 'pet') {
    node = document.querySelector('[data-farming-pet-dropdown]');
    if (node) {
      searchSpotlightNote(node.closest('.settings-field') || node.parentElement, `Search result: ${target.petName}. Select it here to update this loadout.`);
    }
  } else if (target.type === 'tool' && target.cropId) {
    node = document.querySelector(`.sb-tool-card[data-sb-tool-crop="${target.cropId}"]`);
    if (node) node.classList.add('search-target-highlight');
  } else if (target.type === 'vacuum') {
    const card = document.querySelector('[data-sb-vacuum]');
    if (card && !card.classList.contains('selected')) card.click();
    node = document.querySelector('[data-vacuum-model]');
    if (node) {
      searchSpotlightNote(node.closest('.workspace-level-row') || node.parentElement, `Search result: ${target.vacuumName}. Select this model here to update your Vacuum.`);
    }
  }

  if (!node && attempt < 10) {
    requestAnimationFrame(() => applyPendingSearchSpotlight(attempt + 1));
    return;
  }
  if (!node) {
    pendingSearchSpotlight = null;
    return;
  }

  node.scrollIntoView({ block: 'center' });
  if (typeof node.focus === 'function') node.focus({ preventScroll: true });
  pendingSearchSpotlight = null;
}

function schedulePendingSearchSpotlight() {
  if (!pendingSearchSpotlight) return;
  requestAnimationFrame(() => applyPendingSearchSpotlight());
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
    pendingSearchSpotlight = target;
  } else if (target.type === 'tool') {
    state.page = target.page;
    if (target.cropId) state.selectedCrop = target.cropId;
    pendingSearchSpotlight = target;
  } else if (target.type === 'vacuum') {
    state.page = target.page;
    pendingSearchSpotlight = target;
  } else if (target.type === 'info') {
    state.page = target.page;
    if (target.guideStage) state.guideStage = target.guideStage;
  } else {
    state.page = target.page || state.page;
  }

  state.page = canonicalPage(state.page);
  saveState();
  render({ preserveScroll: false });
  schedulePendingSearchSpotlight();

  if (target.type === 'info') {
    scrollToSearchAnchor(target.anchor);
  } else if (target.type === 'accessory') {
    requestAnimationFrame(() => {
      [...document.querySelectorAll('[data-accessory-item-id]')]
        .find(node => (
          node.dataset.accessoryItemId === target.itemId
          || String(node.dataset.accessoryTierItems || '').split(',').includes(target.itemId)
        ))
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
  const mode = activityModeForState(state);
  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => plannerUpgradeTargetEligible(item, mode))
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

function card(item, compact=false, { showArt = true } = {}) {
  const level = currentLevel(item);
  const max = Number(item.max || 1);
  const status = statusClass(item);
  const gain = gainFor(item);
  const additionalGainText = Array.isArray(item.additionalEffects)
    ? item.additionalEffects.map(effect => {
        const value = Number(effect?.stepGain);
        if (!Number.isFinite(value) || value === 0) return '';
        return `+${formatNumber(value)} ${String(effect?.label || effect?.metric || 'effect')}`;
      }).filter(Boolean)
    : [];
  const primaryGainText = gain
    ? `+${formatNumber(Number(gain))} ${item.metric === 'Crop Yield' ? 'Fortune/step' : item.metric}`
    : '';
  const gainText = [primaryGainText, ...additionalGainText].filter(Boolean).join(' · ') || 'dynamic';
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
    <article class="item-card ${status} ${isShard ? 'shard-card' : ''} ${compact ? 'compact' : ''}" data-open="${esc(item.id)}"${showArt ? '' : ' data-no-item-art="1"'}>
      <div class="card-layer"></div>
      <div class="card-head">
        ${showArt && (item.packAsset || isShard) ? `<span class="card-portrait${isShard ? ' shard-portrait' : ''}"${item.packAsset ? ` data-pack-asset="${esc(item.packAsset)}"` : ''}></span>` : ''}
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
        <span>${esc(gainText)}</span>
      </div>
      <div class="progress"><i data-progress="${Math.min(100,(level/max)*100)}"></i></div>
      <div class="chips">
        ${item.attribute ? badge(item.attribute, 'soft') : ''}
        ${isCropScopedItem(item) ? badge(crop().name, 'soft') : (cropLimited ? badge(item.cropScope, 'soft') : '')}
        ${item.hypercharge ? badge('Hypercharge', 'soft') : ''}
        ${item.modeScope !== 'Any' ? badge(item.modeScope, 'soft') : ''}
      </div>
      <button type="button" class="ghost small card-open-button" data-open="${esc(item.id)}" aria-label="Details for ${esc(item.name)}">Details</button>
    </article>`;
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
        ${state.page === 'dashboard' ? '' : `<div class="crop-switch">
          <span>Crop</span>
          <select id="cropSelect">
            ${CROPS.map(c => `<option value="${c.id}" ${c.id===state.selectedCrop?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>`}
        <div class="search-wrap">
          <input id="search" aria-label="Search Farming420" aria-controls="searchResults" aria-expanded="${state.search.trim() ? 'true' : 'false'}" autocomplete="off" placeholder="Search items, shards, settings, effects…" value="${esc(state.search)}" />
          <div id="searchResults" class="search-results" role="listbox" ${state.search.trim() ? '' : 'hidden'}>${searchResultsMarkup(state.search)}</div>
        </div>
      </header>
      <section class="content">${readOnlyState ? '<p role="status" class="hint">Stored data uses a newer schema. Editing is disabled; the saved bytes remain untouched. Export a backup or reload a newer Farming420 build.</p>' : ''}${content}</section>
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
  const cropScoped = mode === ACTIVITY_MODE.FARM && Boolean(cropId);
  const stored = cropScoped ? dashboardMeasuredValues(cropId, mode) : {};
  const normalPrice = cropScoped ? averageCropUnitPrice(cropId) : null;
  const feastPrice = cropScoped && isHarvestFeastContext(context)
    ? averageHarvestFeastMaterialPrice(cropId)
    : null;

  const economics = calculateDashboardEconomics({
    cropId,
    mode,
    context,
    measured: stored,
    stats,
    cropUnitValueCoins: normalPrice?.status === AVERAGE_CROP_PRICE_STATUS.AVERAGE ? normalPrice.coinsPerUnit : null,
    feastMaterialCoins: feastPrice?.status === AVERAGE_CROP_PRICE_STATUS.AVERAGE ? feastPrice.coinsPerUnit : null,
  });

  return { ...economics, values: stored, normalPrice, feastPrice };
}

function dashboardProfitDisplay(estimate) {
  if (estimate.netCoinsPerHour != null) return `${compactDashboardCoins(estimate.netCoinsPerHour)}/h`;
  if (estimate.knownCoinsPerHour != null) return `Known ${compactDashboardCoins(estimate.knownCoinsPerHour)}/h`;
  return '—';
}

function dashboardProfitNote(estimate) {
  if (estimate.complete) return 'Complete for every revenue stream requested by the active farming context.';
  if (estimate.knownCoinsPerHour != null) return 'Partial estimate: unresolved Pest or event revenue remains separate instead of being guessed.';
  return 'No complete Coins/h baseline is available for this activity yet; missing inputs stay unknown instead of becoming zero.';
}

function dashboardRevenueCards(estimate) {
  return estimate.streams.map(stream => {
    const value = stream.status === DASHBOARD_STREAM_STATUS.KNOWN
      ? `${compactDashboardCoins(stream.coinsPerHour)}/h`
      : stream.status === DASHBOARD_STREAM_STATUS.UNMODELLED ? 'Not included' : 'Incomplete';
    return `<article class="stat-card dashboard-revenue-card ${esc(stream.status)}">
      <span>${esc(stream.label)}</span>
      <strong>${esc(value)}</strong>
      <small>${esc(stream.note)}</small>
    </article>`;
  }).join('');
}

function dashboardGroupSummary(setup, group) {
  const slots = SETUP_SLOTS.filter(slot => slot.group === group);
  const items = slots.map(slot => setup?.slots?.[slot.id]).filter(item => item?.displayName || item?.skyblockId);
  if (!items.length) return `0/${slots.length} configured`;
  const names = [...new Set(items.map(item => item.displayName || item.skyblockId).filter(Boolean))];
  const preview = names.slice(0, 2).join(', ');
  return `${items.length}/${slots.length} · ${preview}${names.length > 2 ? ` +${names.length - 2}` : ''}`;
}

function dashboardLinkedSetLabel(mode) {
  return mode === ACTIVITY_MODE.PEST_SPAWN ? 'BPC Set' : 'FF Set';
}

function dashboardPhaseLabel(mode) {
  if (mode === ACTIVITY_MODE.PEST_SPAWN) return 'Spawning';
  if (mode === ACTIVITY_MODE.PEST_KILL) return 'Killing';
  return 'Farming';
}

function dashboardLoadoutSummary(mode, selectedCrop) {
  // Dashboard phases are not extra physical sets. Resolve the phase through the
  // canonical linked loadout so Killing reads FF Armor/Equipment (and, in
  // two-set mode, the FF Pet) instead of the hidden Killing overlay directly.
  const setup = state.profile.setups
    ? effectiveSetup(state.profile.setups, setupIdForActivity(mode))
    : null;
  const pet = setup?.slots?.pet?.displayName || setup?.slots?.pet?.skyblockId || 'Not configured';
  const base = {
    armor: dashboardGroupSummary(setup, 'Armor'),
    equipment: dashboardGroupSummary(setup, 'Equipment'),
    pet,
    setup: dashboardLinkedSetLabel(mode),
  };
  if (mode === ACTIVITY_MODE.PEST_KILL) {
    const vacuumId = state.profile.vacuumProgress?.skyblockId;
    const vacuum = GARDEN_VACUUM_ITEMS.find(item => item.id === vacuumId);
    return { ...base, tool: vacuum?.name || 'Vacuum not configured' };
  }
  if (mode === ACTIVITY_MODE.PEST_SPAWN) {
    return { ...base, tool: null };
  }
  return { ...base, tool: selectedCrop?.tool || 'Farming tool not configured' };
}
function dashboard() {
  const mode = activityModeForState(state);
  const farmingMode = mode === ACTIVITY_MODE.FARM;
  const selectedCrop = dashboardCrop();
  const context = farmingContextForState(state);
  const contextScopes = farmingContextScopes(context);
  const stats = computeStatTotals(state, farmingMode ? selectedCrop.id : null, mode, contextScopes);
  const estimate = dashboardProfitEstimate(farmingMode ? selectedCrop.id : null, mode, context, stats);
  const loadout = dashboardLoadoutSummary(mode, farmingMode ? selectedCrop : null);
  const phaseLabel = dashboardPhaseLabel(mode);
  const linkedSetLabel = dashboardLinkedSetLabel(mode);
  const marker = count => count ? ' ~' : '';
  const number = value => formatNumber(Number(value || 0), FRACTION_2);
  const effectiveIncomplete = stats.incomplete.globalFortune.length
    + (farmingMode ? stats.incomplete.cropFortune.length : 0)
    + stats.incomplete.pestFortune.length;
  const sourceNote = (values, axis) => {
    const sources = Number(values.sourceCount?.[axis] || 0);
    const unresolved = values.incomplete?.[axis]?.length || 0;
    if (!sources) return 'No configured sources in this context';
    if (unresolved) return `${sources} configured source${sources === 1 ? '' : 's'} · ${unresolved} unresolved`;
    return `${sources} configured source${sources === 1 ? '' : 's'} · fully modeled`;
  };
  const priceNote = farmingMode && estimate.normalPrice
    ? averageCropPriceNote(estimate.normalPrice)
    : farmingMode
      ? 'Crop price unavailable'
      : 'Crop market value is not used for Pest phase totals.';
  const contextHelp = context === 'normal'
    ? 'Only always-active configured sources are included.'
    : `${farmingContextLabel(context)}-only configured effects are included in the totals below.`;
  const throughputText = farmingMode && estimate.values?.breaksPerSecond && estimate.values?.uptimePercent
    ? `${number(estimate.values.breaksPerSecond)} breaks/s · ${number(estimate.values.uptimePercent)}% uptime`
    : farmingMode ? 'Not measured yet' : 'Not used for this phase';

  const cropRows = farmingMode ? CROPS.map(entry => {
    const values = computeStatTotals(state, entry.id, mode, contextScopes);
    const totalFortune = values.globalFortune + values.cropFortune;
    const totalIncomplete = values.incomplete.globalFortune.length
      + values.incomplete.cropFortune.length;
    const incomplete = totalIncomplete
      + values.incomplete.overbloom.length;
    const configured = Number(values.sourceCount?.globalFortune || 0)
      + Number(values.sourceCount?.cropFortune || 0)
      + Number(values.sourceCount?.overbloom || 0);
    return `
      <article class="stat-card dashboard-crop-result ${entry.id === selectedCrop.id ? 'selected' : ''}">
        <span>${esc(entry.name)}</span>
        <strong>${number(totalFortune)} FF${marker(totalIncomplete)}</strong>
        <small>Global FF ${number(values.globalFortune)} · Crop FF ${number(values.cropFortune)}</small>
        <small>Overbloom ${number(values.overbloom)}${marker(values.incomplete.overbloom.length)}</small>
        ${incomplete
          ? '<small>~ contains sources that are not fully modeled yet</small>'
          : configured
            ? '<small>fully calculated from configured sources</small>'
            : '<small>No configured sources in this context</small>'}
      </article>`;
  }).join('') : '';

  const phaseCard = farmingMode
    ? `<article class="stat-card dashboard-total-card">
        <span>Effective Fortune · ${esc(selectedCrop.name)}</span>
        <strong>${number(stats.effectiveFortune)} FF${marker(effectiveIncomplete)}</strong>
        <small>Global ${number(stats.globalFortune)} + Crop ${number(stats.cropFortune)}</small>
        <small>${esc(farmingContextLabel(context))} context</small>
      </article>`
    : mode === ACTIVITY_MODE.PEST_SPAWN
      ? `<article class="stat-card dashboard-total-card">
          <span>Pest Spawning</span>
          <strong>${number(stats.bonusPestChance)} BPC${marker(stats.incomplete.bonusPestChance.length)}</strong>
          <small>Pest cooldown reduction ${number(stats.pestCooldownReductionPct)}%</small>
          <small>Linked to the BPC Set. No crop-specific Fortune or tool state is included.</small>
        </article>`
      : `<article class="stat-card dashboard-total-card">
          <span>Pest Killing</span>
          <strong>${number(stats.pestFortune)} Pest Fortune${marker(stats.incomplete.pestFortune.length)}</strong>
          <small>Overbloom ${number(stats.overbloom)}${marker(stats.incomplete.overbloom.length)}</small>
          <small>No crop-specific Fortune or crop tool state is included.</small>
        </article>`;

  const modeSpecificCards = farmingMode
    ? `
      <article class="stat-card">
        <span>Global Farming Fortune</span>
        <strong>${number(stats.globalFortune)}${marker(stats.incomplete.globalFortune.length)}</strong>
        <small>Account-wide Fortune before crop-specific Fortune is added</small>
        <small>${sourceNote(stats, 'globalFortune')}</small>
      </article>
      <article class="stat-card">
        <span>${esc(selectedCrop.name)} Crop Fortune</span>
        <strong>${number(stats.cropFortune)}${marker(stats.incomplete.cropFortune.length)}</strong>
        <small>Crop-specific Fortune from the selected FF crop and matching tool sources</small>
        <small>${sourceNote(stats, 'cropFortune')}</small>
      </article>
      <article class="stat-card">
        <span>Overbloom</span>
        <strong>${number(stats.overbloom)}${marker(stats.incomplete.overbloom.length)}</strong>
        <small>Calculated drop-chance stat for applicable Farming event streams</small>
        <small>${sourceNote(stats, 'overbloom')}</small>
      </article>`
    : mode === ACTIVITY_MODE.PEST_SPAWN
      ? `
        <article class="stat-card">
          <span>Bonus Pest Chance</span>
          <strong>${number(stats.bonusPestChance)}${marker(stats.incomplete.bonusPestChance.length)}</strong>
          <small>Calculated BPC for the active BPC Set</small>
          <small>${sourceNote(stats, 'bonusPestChance')}</small>
        </article>
        <article class="stat-card">
          <span>Pest cooldown reduction</span>
          <strong>${number(stats.pestCooldownReductionPct)}%${marker(stats.incomplete.pestCooldownReductionPct.length)}</strong>
          <small>Calculated cooldown reduction for the active BPC Set</small>
          <small>${sourceNote(stats, 'pestCooldownReductionPct')}</small>
        </article>
        <article class="stat-card">
          <span>Global Farming Fortune</span>
          <strong>${number(stats.globalFortune)}${marker(stats.incomplete.globalFortune.length)}</strong>
          <small>Non-crop-specific Fortune carried by the spawning setup</small>
          <small>${sourceNote(stats, 'globalFortune')}</small>
        </article>`
      : `
        <article class="stat-card">
          <span>Pest Fortune</span>
          <strong>${number(stats.pestFortune)}${marker(stats.incomplete.pestFortune.length)}</strong>
          <small>Vacuum/Pest Fortune for the active Killing phase</small>
          <small>${sourceNote(stats, 'pestFortune')}</small>
        </article>
        <article class="stat-card">
          <span>Overbloom</span>
          <strong>${number(stats.overbloom)}${marker(stats.incomplete.overbloom.length)}</strong>
          <small>Calculated Pest drop-chance stat for the Killing phase</small>
          <small>${sourceNote(stats, 'overbloom')}</small>
        </article>
        <article class="stat-card">
          <span>Global Farming Fortune</span>
          <strong>${number(stats.globalFortune)}${marker(stats.incomplete.globalFortune.length)}</strong>
          <small>Non-crop-specific Fortune carried by the shared FF gear</small>
          <small>${sourceNote(stats, 'globalFortune')}</small>
        </article>`;

  const primaryInputCard = farmingMode
    ? `<article class="stat-card"><span>FF crop / Tool</span><strong>${esc(selectedCrop.name)}</strong><small>${esc(loadout.tool)}</small></article>`
    : mode === ACTIVITY_MODE.PEST_SPAWN
      ? '<article class="stat-card"><span>Phase</span><strong>Spawning</strong><small>Linked to BPC Set. Crop selection is not part of this phase.</small></article>'
      : `<article class="stat-card"><span>Vacuum</span><strong>${esc(loadout.tool)}</strong><small>Killing is linked to FF Set gear and is Pest-specific, not crop-specific.</small></article>`;

  return `
    ${pageHeader('Dashboard', 'Calculated Farming Stats', `Result overview · ${phaseLabel} phase · linked physical loadout: ${linkedSetLabel} · ${farmingContextLabel(context)}. Crop selection exists only for Farming.`)}
    <section class="dashboard-context-panel">
      ${farmingMode ? `<label>
        <span>FF crop</span>
        <select data-dashboard-crop>
          ${CROPS.map(entry => `<option value="${entry.id}" ${entry.id === selectedCrop.id ? 'selected' : ''}>${esc(entry.name)}</option>`).join('')}
        </select>
      </label>` : ''}
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
      <div>
        <strong>${esc(linkedSetLabel)}</strong>
        <small>${esc(`${phaseLabel} phase is linked to this physical loadout.`)}</small>
      </div>
    </section>

    <div class="card-grid dashboard-results-grid">
      ${phaseCard}
      <article class="stat-card dashboard-profit-card">
        <span>${farmingMode ? `Estimated Coins/h · ${esc(selectedCrop.name)}` : mode === ACTIVITY_MODE.PEST_SPAWN ? 'Pest spawning Coins/h' : 'Pest killing Coins/h'}</span>
        <strong>${esc(dashboardProfitDisplay(estimate))}</strong>
        <small>${esc(dashboardProfitNote(estimate))}</small>
        <small>${esc(priceNote)}</small>
      </article>
      ${modeSpecificCards}
    </div>

    <section class="dashboard-account-summary">
      <div class="section-row"><div><div class="eyebrow">Calculation inputs</div><h2>Current account state</h2><p>${farmingMode ? 'The FF Dashboard uses its own crop selection without changing Garden or Tool pages.' : 'Pest phase totals use only phase-wide and Pest-specific stats; crop-specific Fortune and crop tools are excluded.'}</p></div></div>
      <div class="card-grid">
        ${primaryInputCard}
        <article class="stat-card"><span>Armor</span><strong>${esc(loadout.armor)}</strong><small>${esc(loadout.setup)}</small></article>
        <article class="stat-card"><span>Equipment</span><strong>${esc(loadout.equipment)}</strong><small>${esc(loadout.setup)}</small></article>
        <article class="stat-card"><span>Pet</span><strong>${esc(loadout.pet)}</strong><small>Active phase pet</small></article>
        <article class="stat-card"><span>Effects / Event</span><strong>${esc(farmingContextLabel(context))}</strong><small>${esc(contextScopes.length ? contextScopes.join(' + ') : 'Always-active effects only')}</small></article>
        ${farmingMode ? `<article class="stat-card"><span>Measured throughput</span><strong>${esc(throughputText)}</strong><small>Stored in Upgrade Planner, not configured on Dashboard</small></article>` : ''}
      </div>
    </section>

    <section class="dashboard-economics-panel">
      <div class="section-row">
        <div><div class="eyebrow">Transparent estimate</div><h2>Coins/hour model</h2><p>${farmingMode ? 'Only sourced crop streams are monetized. Missing event economics stay visible as missing instead of receiving a guessed value.' : 'Pest economics stay crop-neutral and incomplete until verified Pest throughput and EV models exist.'}</p></div>
        ${farmingMode ? '<button class="ghost small" type="button" data-dashboard-open-planner>Open throughput inputs</button>' : ''}
      </div>
      <div class="card-grid dashboard-revenue-streams">${dashboardRevenueCards(estimate)}</div>
      ${farmingMode ? `<div class="setup-bar dashboard-economics-meta">
        <div><div class="eyebrow">Throughput</div><strong>${esc(throughputText)}</strong><div class="hint">${estimate.throughput?.validBreaksPerHour != null ? `${formatNumber(Math.round(estimate.throughput.validBreaksPerHour))} valid breaks/h` : 'Required for crop Coins/h'}</div></div>
        <div><div class="eyebrow">Crop market value</div><strong>${estimate.normalPrice?.coinsPerUnit ? `${formatNumber(Math.round(estimate.normalPrice.coinsPerUnit))} Coins` : 'Unavailable'}</strong><div class="hint">${esc(priceNote)}</div></div>
        ${isHarvestFeastContext(context) ? `<div><div class="eyebrow">Feast market value</div><strong>${estimate.feastPrice?.coinsPerUnit ? `${formatNumber(Math.round(estimate.feastPrice.coinsPerUnit))} Coins` : 'Unavailable'}</strong><div class="hint">${esc(estimate.feastPrice ? averageCropPriceNote(estimate.feastPrice) : '90-day Bazaar average unavailable')}</div></div>` : ''}
      </div>` : ''}
    </section>

    ${farmingMode ? `<aside class="dashboard-farm-tip">
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
        <p>Each crop total is Global Farming Fortune + that crop's own Crop Fortune in the selected farming context. The FF Dashboard crop is highlighted.</p>
      </div>
    </div>
    <div class="card-grid dashboard-crop-results">${cropRows}</div>` : ''}
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
    <div class="effects-page" data-disable-item-art="1">
      <div class="group">
        <div class="section-row"><div><h2>Permanent effects</h2><p>Account-wide consumables and permanent effect sources.</p></div></div>
        <div class="card-grid">${permanent.map(x=>card(x, false, { showArt: false })).join('') || '<div class="empty">No matches.</div>'}</div>
      </div>
      <div class="group">
        <div class="section-row"><div><h2>Temporary effects</h2><p>God Potion, mixins, cakes, event bonuses and other active effects.</p></div></div>
        <div class="card-grid">${temporary.map(x=>card(x, false, { showArt: false })).join('') || '<div class="empty">No matches.</div>'}</div>
      </div>
    </div>`;
}

function accessorySnapshotRecord(accessory) {
  const wanted = String(accessory?.itemId || '').trim().toUpperCase();
  if (!wanted) return null;
  const items = Array.isArray(state.profile?.normalizedSnapshot?.items)
    ? state.profile.normalizedSnapshot.items
    : [];
  return items.find(item => String(item?.skyblockId || '').trim().toUpperCase() === wanted) || null;
}

function accessoryItemState(accessory) {
  const wanted = String(accessory?.itemId || '').trim().toUpperCase();
  if (!wanted) return {};
  return state.profile?.accessoryItems?.[wanted] || {};
}

function accessoryProgressionUpgrade(group) {
  const linkedIds = [...new Set(group.items.map(item => item.upgradeId).filter(Boolean))];
  if (linkedIds.length !== 1) return null;
  const upgrade = UPGRADES.find(item => item.id === linkedIds[0]) || null;
  if (!upgrade || Number(upgrade.max || 1) !== group.items.length) return null;
  return upgrade;
}

function accessoryGroupSelection(group) {
  const explicit = group.items.filter(accessory =>
    Object.prototype.hasOwnProperty.call(accessoryItemState(accessory), 'selected'));
  if (explicit.length) {
    const selected = [...group.items].reverse().find(accessory => accessoryItemState(accessory).selected === true);
    return selected?.itemId || null;
  }

  const synced = [...group.items].reverse().find(accessory => accessorySnapshotRecord(accessory));
  if (synced) return synced.itemId;

  const progression = accessoryProgressionUpgrade(group);
  if (progression) {
    const level = currentLevel(progression);
    if (level > 0) return group.items[level - 1]?.itemId || null;
  }

  const configured = [...group.items].reverse().find(accessory => {
    const upgrade = accessory.upgradeId
      ? UPGRADES.find(item => item.id === accessory.upgradeId)
      : null;
    return Boolean(upgrade && currentLevel(upgrade) > 0);
  });
  return configured?.itemId || null;
}

function accessoryIsSelected(accessory, group) {
  if (group.upgradeLine) return accessoryGroupSelection(group) === accessory.itemId;

  const itemState = accessoryItemState(accessory);
  if (Object.prototype.hasOwnProperty.call(itemState, 'selected')) return itemState.selected === true;
  const upgrade = accessory.upgradeId
    ? UPGRADES.find(item => item.id === accessory.upgradeId)
    : null;
  return Boolean(accessorySnapshotRecord(accessory) || (upgrade && currentLevel(upgrade) > 0));
}

function setAccessorySelection(group, itemId, selected) {
  const accessory = group.items.find(item => item.itemId === itemId);
  if (!accessory) return;
  state.profile.accessoryItems ||= {};
  const enabled = Boolean(selected);

  if (group.upgradeLine) {
    for (const item of group.items) {
      const current = { ...(state.profile.accessoryItems[item.itemId] || {}) };
      current.selected = enabled && item.itemId === itemId;
      state.profile.accessoryItems[item.itemId] = current;
    }

    const progression = accessoryProgressionUpgrade(group);
    if (progression) {
      if (enabled) clearExclusivePeers(progression);
      const tier = group.items.findIndex(item => item.itemId === itemId) + 1;
      setEntryLevel(progression, enabled ? tier : 0);
    } else {
      for (const item of group.items) {
        if (!item.upgradeId) continue;
        const upgrade = UPGRADES.find(entry => entry.id === item.upgradeId);
        if (!upgrade) continue;
        const active = enabled && item.itemId === itemId;
        if (active) clearExclusivePeers(upgrade);
        setEntryLevel(upgrade, active ? 1 : 0);
      }
    }
  } else {
    const current = { ...(state.profile.accessoryItems[itemId] || {}) };
    current.selected = enabled;
    state.profile.accessoryItems[itemId] = current;
    if (accessory.upgradeId) {
      const upgrade = UPGRADES.find(entry => entry.id === accessory.upgradeId);
      if (upgrade) {
        if (enabled) clearExclusivePeers(upgrade);
        setEntryLevel(upgrade, enabled ? 1 : 0);
      }
    }
  }

  saveState();
  render();
}

function setAccessoryGroupSelection(group, itemId) {
  if (!group?.upgradeLine) return;
  const wanted = String(itemId || '').trim().toUpperCase();

  if (wanted) {
    if (!group.items.some(item => item.itemId === wanted)) return;
    setAccessorySelection(group, wanted, true);
    return;
  }

  state.profile.accessoryItems ||= {};
  for (const item of group.items) {
    const current = { ...(state.profile.accessoryItems[item.itemId] || {}) };
    current.selected = false;
    state.profile.accessoryItems[item.itemId] = current;
  }

  const progression = accessoryProgressionUpgrade(group);
  if (progression) {
    setEntryLevel(progression, 0);
  } else {
    for (const item of group.items) {
      if (!item.upgradeId) continue;
      const upgrade = UPGRADES.find(entry => entry.id === item.upgradeId);
      if (upgrade) setEntryLevel(upgrade, 0);
    }
  }

  saveState();
  render();
}

function accessoryCatalogCard(accessory, group) {
  const upgrade = accessory.upgradeId
    ? UPGRADES.find(item => item.id === accessory.upgradeId)
    : null;
  const status = upgrade ? statusClass(upgrade) : '';
  const synced = Boolean(accessorySnapshotRecord(accessory));
  const selected = accessoryIsSelected(accessory, group);
  const stateBadge = selected
    ? badge('selected', 'owned')
    : synced
      ? badge('profile sync', 'synced')
      : '';

  return `<article class="item-card accessory-catalog-card ${selected ? 'accessory-selected' : ''} ${status}" data-accessory-item-id="${esc(accessory.itemId)}">
    <div class="card-layer"></div>
    <div class="card-head">
      <span class="card-portrait accessory-portrait" aria-hidden="true"></span>
      <div>
        <div class="eyebrow">${esc(accessory.rarity)} · ${esc(accessory.itemId)}</div>
        <div class="item-title">${esc(accessory.name)}</div>
      </div>
      ${stateBadge}
    </div>
    <p class="accessory-effect">${esc(accessory.effect)}</p>
    <div class="chips">
      ${badge(accessory.condition, 'soft')}
      ${synced ? badge('found in profile', 'synced') : ''}
    </div>
    <div class="accessory-upgrades">
      <button class="ghost small accessory-select-btn ${selected ? 'selected' : ''}" type="button"
        data-accessory-select="${esc(accessory.itemId)}" data-accessory-group="${esc(group.id)}"
        aria-pressed="${selected ? 'true' : 'false'}">
        ${selected ? 'Selected' : 'Select accessory'}
      </button>
      ${upgrade ? `<button class="ghost small accessory-progression-btn" type="button" data-open="${esc(upgrade.id)}">Open calculator progression</button>` : ''}
    </div>
  </article>`;
}

function accessoryUpgradeLineCard(group) {
  const tierCount = group.items.length;
  const selectedItemId = accessoryGroupSelection(group);
  const selectedIndex = group.items.findIndex(item => item.itemId === selectedItemId);
  const selectedAccessory = selectedIndex >= 0 ? group.items[selectedIndex] : null;
  const displayedAccessory = selectedAccessory || group.items[0];
  const synced = Boolean(selectedAccessory && accessorySnapshotRecord(selectedAccessory));
  const manuallySelected = Boolean(
    selectedAccessory && accessoryItemState(selectedAccessory).selected === true
  );
  const progression = accessoryProgressionUpgrade(group);
  const displayedUpgrade = displayedAccessory?.upgradeId
    ? UPGRADES.find(item => item.id === displayedAccessory.upgradeId)
    : null;
  const calculatorUpgrade = progression || displayedUpgrade;
  const status = calculatorUpgrade ? statusClass(calculatorUpgrade) : '';
  const stateBadge = manuallySelected
    ? badge('selected', 'owned')
    : synced
      ? badge('profile sync', 'synced')
      : selectedAccessory
        ? badge('selected', 'owned')
        : '';
  const itemIds = group.items.map(item => item.itemId).join(',');

  return `<article class="item-card accessory-catalog-card accessory-upgrade-card ${selectedAccessory ? 'accessory-selected' : ''} ${status}"
      data-accessory-item-id="${esc(displayedAccessory.itemId)}"
      data-accessory-tier-items="${esc(itemIds)}">
    <div class="card-layer"></div>
    <div class="card-head">
      <span class="card-portrait accessory-portrait" aria-hidden="true"></span>
      <div>
        <div class="eyebrow">${selectedAccessory
          ? `${esc(selectedAccessory.rarity)} · ${esc(selectedAccessory.itemId)}`
          : 'No tier selected'}</div>
        <div class="item-title">${esc(selectedAccessory?.name || group.title)}</div>
      </div>
      ${stateBadge}
    </div>
    <p class="accessory-effect">${esc(
      selectedAccessory?.effect || 'Choose the highest tier you currently own.'
    )}</p>
    <div class="chips">
      ${selectedAccessory ? badge(selectedAccessory.condition, 'soft') : ''}
      ${badge(selectedAccessory ? `Tier ${selectedIndex + 1}/${tierCount}` : `${tierCount} tiers`, 'soft')}
      ${synced ? badge('found in profile', 'synced') : ''}
    </div>
    <div class="accessory-upgrades">
      <label class="accessory-tier-control">
        <span>Current tier</span>
        <select data-accessory-tier-select="${esc(group.id)}" aria-label="${esc(`${group.title} current tier`)}">
          <option value="">Not selected</option>
          ${group.items.map((item, index) => `<option value="${esc(item.itemId)}" ${item.itemId === selectedItemId ? 'selected' : ''}>Tier ${index + 1}/${tierCount} — ${esc(item.name)}</option>`).join('')}
        </select>
      </label>
      ${calculatorUpgrade ? `<button class="ghost small accessory-progression-btn" type="button" data-open="${esc(calculatorUpgrade.id)}">Open calculator progression</button>` : ''}
    </div>
  </article>`;
}

function accessorySections() {
  const groups = FARMING_ACCESSORY_GROUPS.filter(group => group.items.length);

  return `<div class="accessory-model-note">
      <strong>Accessory selection</strong>
      <span>Choose your current tier once per progression line. Only the selected tier counts; separate utility accessories remain independently selectable. Profile sync is used as the default until you choose a manual override.</span>
    </div>
    ${groups.length ? groups.map(group => `
      <section class="accessory-group ${group.upgradeLine ? 'accessory-upgrade-group' : ''}" data-accessory-group="${esc(group.id)}">
        <div class="section-row"><div><h2>${esc(group.title)}</h2><p>${esc(group.note)}</p></div></div>
        <div class="card-grid accessory-grid ${group.upgradeLine ? 'accessory-upgrade-line' : ''}">
          ${group.upgradeLine
            ? accessoryUpgradeLineCard(group)
            : group.items.map(accessory => accessoryCatalogCard(accessory, group)).join('')}
        </div>
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
          <p>Tool reforges, enchantments and gemstones are edited under Tools. Armor, equipment and pets are edited in Loadouts / Farming System.</p>
        </div>
        <div class="crop-related-actions-addon">
          <button class="ghost" data-page="tools">Open ${esc(crop().tool)}</button>
          <button class="ghost" data-page="setups">Open active loadout</button>
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
  const reforge = Object.entries(FARMING_TOOL_REFORGE_ENTRY_IDS).find(([, id]) => id === item.id)?.[0];
  if (reforge && (value > 0 || selectedFarmingToolReforge(store) === reforge)) {
    applyFarmingToolReforge(store, value > 0 ? reforge : null);
    return;
  }
  if (value <= 0) {
    delete store.levels[item.id];
    delete store.owned[item.id];
    return;
  }
  clearExclusivePeers(item);
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
  const reforge = selectedFarmingToolReforge(state.profile.toolProgress?.[toolKeyForCropId(state.selectedCrop)], state.profile.toolReforges?.[toolKeyForCropId(state.selectedCrop)]);

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

function synergyShardLevel(id) {
  return Math.max(0, Math.min(10, Math.floor(Number(state.profile.synergyShardLevels?.[id] || 0))));
}

function synergyShardLevelControl(id, current, label) {
  return `<span class="sb-card-chain shard-synergy-levels" role="group" aria-label="${esc(label)} level">${Array.from({ length: 11 }, (_, value) =>
    `<button type="button" class="sb-card-stage ${value === current ? 'selected' : ''}" data-synergy-shard-level="${esc(id)}" data-synergy-shard-value="${value}" aria-pressed="${value === current ? 'true' : 'false'}">${value}</button>`
  ).join('')}</span>`;
}

function synergyShardCard(entry, current, detail) {
  const max = Number(entry.maxLevel || 10);
  const status = current >= max ? 'maxed' : current > 0 ? 'owned' : 'missing';
  return `<article class="item-card shard-card shard-synergy-card ${status}" data-direct-ready="1" data-synergy-shard-art="${esc(entry.physicalItemId)}">
    <div class="card-layer"></div>
    <div class="card-head">
      <span class="card-portrait shard-portrait"></span>
      <div>
        <div class="eyebrow">Attribute Shard</div>
        <div class="item-title">${esc(entry.name)}</div>
      </div>
      ${badge(current >= max ? 'max' : current > 0 ? 'owned' : 'missing', status)}
    </div>
    <div class="card-meta">
      <span>Level ${current}/${max}</span>
      <span>Indirect synergy</span>
    </div>
    <div class="progress"><i data-progress="${Math.min(100, (current / max) * 100)}"></i></div>
    <div class="chips">${badge(entry.attribute, 'soft')}</div>
    <p class="shard-synergy-detail">${esc(detail)}</p>
    <span class="sb-card-controls">${synergyShardLevelControl(entry.id, current, entry.name)}</span>
  </article>`;
}

function cowSynergyContext() {
  const stats = computeStatTotals(state, state.selectedCrop || 'melon');
  const cow = stats.derived?.mooshroomCow || null;
  const rawStrength = state.profile?.inputs?.strength;
  return {
    cow,
    strength: rawStrength === null || rawStrength === undefined || rawStrength === '' ? null : Number(rawStrength),
  };
}

function cowDeltaText(delta) {
  if (!delta) return 'Cow impact needs active Legendary Mooshroom Cow + Strength input';
  return `+${formatNumber(delta.addedStrength)} Strength → +${formatNumber(delta.deltaFortune)} Cow FF`;
}

function indirectShardSynergyPanel() {
  const filterEffects = atmosphericFilterEffects(synergyShardLevel(FARMING_SHARD_SYNERGIES.filterUpgrade.id));
  const rows = ['filterUpgrade', 'echoOfWisdom', 'queenlyEcho', 'echoOfEchoes'].map(key => {
    const entry = FARMING_SHARD_SYNERGIES[key];
    const detail = key === 'filterUpgrade'
      ? `Current Filter Upgrade: +${formatNumber(filterEffects.boostPercent)}%. Spring ${formatNumber(filterEffects.springFarmingFortune)} FF · Summer ${formatNumber(filterEffects.summerFarmingWisdom)} Farming Wisdom · Autumn ${formatNumber(filterEffects.autumnPestSpawnChancePercent)}% extra Pest spawn chance · Winter ${formatNumber(filterEffects.winterVisitorCopperPercent)}% Visitor Copper. Autumn changes spawn chance after cooldown; it does not shorten the cooldown.`
      : entry.farmingUse;
    return synergyShardCard(entry, synergyShardLevel(entry.id), `${detail} Target: ${entry.target}.`);
  }).join('');

  return `<section class="accessory-model-note shard-synergy-panel">
    <strong>Indirect shard synergies</strong>
    <span>Non-Strength shard-to-shard effects stay separate from direct Farming Fortune.</span>
  </section>
  <div class="card-grid shard-gallery shard-synergy-gallery">${rows}</div>`;
}

function cowStrengthShardPlanner() {
  const levels = state.profile.synergyShardLevels || {};
  const starbornLevel = synergyShardLevel(FARMING_SHARD_SYNERGIES.echoOfElemental.id);
  const elemental = elementalStrengthFromShardLevels(levels, starbornLevel);
  const { cow, strength } = cowSynergyContext();
  const cowReady = cow?.active && cow?.rarity === 'LEGENDARY' && Number.isFinite(strength);
  const nextThreshold = cowReady ? strengthUntilNextCowFortune(strength, cow.level, cow.rarity) : null;
  const jormungLevel = synergyShardLevel(FARMING_SHARD_SYNERGIES.unlimitedPower.id);
  const molthornLevel = synergyShardLevel(FARMING_SHARD_SYNERGIES.almightyEcho.id);
  const currentJormungPercent = jormungStrengthPercent(jormungLevel, molthornLevel);
  const nextJormungPercent = jormungLevel < 10 ? jormungStrengthPercent(jormungLevel + 1, molthornLevel) : currentJormungPercent;
  const nextMolthornPercent = molthornLevel < 10 ? jormungStrengthPercent(jormungLevel, molthornLevel + 1) : currentJormungPercent;
  const jormungCow = cowReady && jormungLevel < 10
    ? cowFortuneDeltaForStrengthPercentChange({
        currentStrength: strength,
        currentPercent: currentJormungPercent,
        nextPercent: nextJormungPercent,
        cowLevel: cow.level,
        rarity: cow.rarity,
      })
    : null;
  const molthornCow = cowReady && molthornLevel < 10 && jormungLevel > 0
    ? cowFortuneDeltaForStrengthPercentChange({
        currentStrength: strength,
        currentPercent: currentJormungPercent,
        nextPercent: nextMolthornPercent,
        cowLevel: cow.level,
        rarity: cow.rarity,
      })
    : null;

  const elementalRows = ELEMENTAL_STRENGTH_SHARDS.map(shard => {
    const current = synergyShardLevel(shard.id);
    const nextStrength = current < shard.maxLevel ? nextElementalShardStrength(shard.id, starbornLevel) : 0;
    const cowDelta = cowReady && nextStrength > 0
      ? cowFortuneDeltaForAddedStrength({
          currentStrength: strength,
          addedStrength: nextStrength,
          cowLevel: cow.level,
          rarity: cow.rarity,
        })
      : null;
    const detail = `Planning only: +1 Strength per level; Echo of Elemental makes the next level +${formatNumber(nextStrength || (1 + elemental.boostPercent / 100))} planned Strength. ${current < shard.maxLevel ? cowDeltaText(cowDelta) : 'Max level.'}`;
    return synergyShardCard(shard, current, detail);
  }).join('');

  const starbornCurrent = synergyShardLevel(FARMING_SHARD_SYNERGIES.echoOfElemental.id);
  const starbornAddedStrength = starbornCurrent < 10 ? elemental.baseStrength * 0.02 : 0;
  const starbornCow = cowReady && starbornAddedStrength > 0
    ? cowFortuneDeltaForAddedStrength({
        currentStrength: strength,
        addedStrength: starbornAddedStrength,
        cowLevel: cow.level,
        rarity: cow.rarity,
      })
    : null;

  const planningRows = [
    {
      entry: FARMING_SHARD_SYNERGIES.echoOfElemental,
      level: starbornCurrent,
      detail: `Planned Elemental shard Strength: ${formatNumber(elemental.effectiveStrength)} (${formatNumber(elemental.baseStrength)} base, +${formatNumber(elemental.boostPercent)}%). Next level: ${starbornCurrent < 10 ? cowDeltaText(starbornCow) : 'maxed'}.`,
    },
    {
      entry: FARMING_SHARD_SYNERGIES.unlimitedPower,
      level: jormungLevel,
      detail: `Planned Strength multiplier: +${formatNumber(currentJormungPercent)}%. Next level: ${jormungLevel < 10 ? cowDeltaText(jormungCow) : 'maxed'}.`,
    },
    {
      entry: FARMING_SHARD_SYNERGIES.almightyEcho,
      level: molthornLevel,
      detail: jormungLevel > 0
        ? `Jormung is planned at +${formatNumber(currentJormungPercent)}% Strength. Next level: ${molthornLevel < 10 ? cowDeltaText(molthornCow) : 'maxed'}.`
        : 'No Cow estimate until Unlimited Power/Jormung is planned.',
    },
    {
      entry: FARMING_SHARD_SYNERGIES.tuningBox,
      level: synergyShardLevel(FARMING_SHARD_SYNERGIES.tuningBox.id),
      detail: 'Planning only. Tuning Points can be assigned to Strength in game, but this planner never adds them to your entered Strength automatically.',
    },
  ].map(row => synergyShardCard(
    row.entry,
    row.level,
    `${row.detail} Target: ${row.entry.target}.`,
  )).join('');

  const context = cowReady
    ? `Entered Strength: ${formatNumber(strength)} · next displayed Cow FF needs about ${formatNumber(nextThreshold)} more Strength.`
    : cow?.active
      ? 'Mooshroom Cow is selected, but Strength is missing. Enter it in the Cow pet menu.'
      : 'Select Mooshroom Cow and enter Strength in its pet menu to calculate Cow breakpoints.';

  return `<details class="cow-strength-shard-planner"${cowStrengthPlannerOpen ? ' open' : ''} data-cow-strength-planner>
    <summary><span>Mooshroom Cow Strength shard planner</span><small>Optional · open only when planning Cow Strength upgrades</small></summary>
    <div class="cow-strength-shard-planner-body">
      <section class="accessory-model-note shard-synergy-panel">
        <strong>Planning only</strong>
        <span>${context} Changing shard levels here never changes the Strength value you entered for the Cow.</span>
      </section>
      <div class="card-grid shard-gallery shard-synergy-gallery">${elementalRows}${planningRows}</div>
    </div>
  </details>`;
}

function shardsPage() {
  const shards = visibleUpgrades('shards');
  const chips = visibleUpgrades('chips');
  const showSynergies = !state.search.trim();
  return `${pageHeader('Progression', 'Accessories / Chips / Shards', 'Farming accessories, Garden Chips and Attribute Shards share one progression workspace. Upgrade families replace their previous tiers; Cow Strength planning stays optional and separate.')}
    <div class="group">
      <div class="section-row"><div><h2>Accessories</h2><p>Physical accessory progression and upgrade families. Higher tiers replace lower tiers.</p></div></div>
      ${accessorySections()}
    </div>
    <div class="group">
      <div class="section-row"><div><h2>Garden Chips</h2><p>Chip levels and activation conditions stay here instead of using a separate top-level page.</p></div></div>
      <div class="filter-line">${badge(`${chips.length} entries`,'soft')}</div>
      <div class="card-grid">${chips.map(x=>card(x)).join('') || '<div class="empty">No matches.</div>'}</div>
    </div>
    <div class="group">
      <div class="section-row"><div><h2>Attribute Shards</h2><p>Direct Farming effects stay separate from optional Cow Strength planning.</p></div></div>
      <div class="filter-line">${badge(`${shards.length} direct entries`,'soft')}</div>
      <div class="card-grid shard-gallery">${shards.map(x=>card(x)).join('') || '<div class="empty">No matches.</div>'}</div>
      ${showSynergies ? indirectShardSynergyPanel() : ''}
      ${showSynergies ? cowStrengthShardPlanner() : ''}
    </div>`;
}
function qolPage() {
  return `${pageHeader('QoL', 'Quality of Life', 'Convenience, farm-building and loadout tools live here. They are tracked separately from Farming Fortune and profit because their value is saved configuration time and easier operation rather than a comparable stat gain.')}
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
        <div class="planner-number"><strong>${x.cost ? formatApproxCoins(x.cost) : '—'}</strong><span>${x.efficiency!==null?`${x.efficiency.toFixed(3)} / 1M`:'Cost missing'}</span></div>
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
  const chip = gardenChipForEntry(item);
  const phillip = item.id === 'temporary-buff-pesthunter-phillip-buff';
  const activation = state.profile.temporaryEffects?.pesthunterPhillip || {};
  const effect = phillip ? phillipBuffEffect(activation) : null;
  return `<div class="drawer-backdrop" data-close-drawer><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">
    <div class="drawer-top"><div><div class="eyebrow">${esc(item.category)}</div><h2 id="drawer-title">${esc(item.name)}</h2></div><button type="button" class="close" data-close-drawer aria-label="Close details">×</button></div>
    <div class="drawer-badges">${badge(item.status,item.status==='VERIFY'?'verify':'soft')} ${isCropScopedItem(item)?badge(crop().name,'soft'):(item.cropScope!=='Any'?badge(item.cropScope,'soft'):'')} ${item.modeScope!=='Any'?badge(item.modeScope,'soft'):''}</div>
    ${isSynced(item) ? '<div class="drawer-synced">Farming420 worked this value out for you, from your profile sync and your active loadout. Editing it here overrides it until the next sync or loadout change.</div>' : ''}
    <div class="drawer-section"><h3>Ownership & Level</h3>
      ${chip ? `<label>Chip rarity<select data-chip-rarity="${chip.id}">${Object.keys(CHIP_LEVEL_CAP).map(rarity => `<option value="${rarity}" ${(state.profile.chipRarities?.[chip.id] || 'LEGENDARY') === rarity ? 'selected' : ''}>${rarity} (cap ${CHIP_LEVEL_CAP[rarity]})</option>`).join('')}</select></label>` : ''}
      ${max>1 ? `<div class="stepper"><button data-step="-1" data-id="${item.id}">−</button><strong>${level}/${max}</strong><button data-step="1" data-id="${item.id}">+</button><button class="ghost small" data-max="${item.id}">Max</button></div>` : `<label class="switch-row"><span>Owned</span><input type="checkbox" data-owned="${item.id}" ${isOwned(item)?'checked':''}></label>`}
    </div>
    ${phillip ? `<div class="drawer-section"><h3>Temporary activation</h3>
      <label>Pests handed in<input type="number" min="0" step="1" data-phillip-count value="${esc(activation.pestCount ?? '')}"></label>
      <label>Observed duration (minutes)<input type="number" min="1" step="1" data-phillip-duration placeholder="Read the active potion duration"></label>
      <button type="button" data-phillip-activate>Activate / replace timer</button><button type="button" data-phillip-deactivate>Deactivate</button>
      <p>Alpha preview: ${effect.baseFarmingFortune === null ? 'unknown' : `+${effect.baseFarmingFortune}`} FF. Live curve verification pending; excluded from complete totals.</p>
      <p>${effect.remainingSeconds === null ? 'Expiry unknown' : `${effect.remainingSeconds} seconds remaining`}. One activation; no stacking.</p></div>` : ''}
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
  state.profile.setups = prepareFfBpcSetups(state.profile.setups);
  return state.profile.setups;
}

/**
 * Re-derives the progression cards from the current loadout.
 *
 * The active loadout is what the gear rules read, so a loadout edit has to flow
 * through to the cards immediately rather than waiting for the next sync.
 */
function reapplyGear() {
  state.profile.lastApply = applySnapshotToProgress(state, state.profile.normalizedSnapshot || {});
}

function snapshot() {
  return state.profile.normalizedSnapshot || null;
}

function setupById(all, setupId) {
  return all.list.find(setup => setup.id === setupId) || null;
}

function visibleSetupId(all = setups()) {
  const visibleIds = visiblePhysicalSetupIds(all);
  return visibleIds.includes(all.activeId) ? all.activeId : FF_SETUP_ID;
}

function visibleSetupLabel(setupId, all = setups()) {
  if (setupId === FF_SETUP_ID) return 'FF (Farming Fortune) Set';
  if (setupId === BPC_SETUP_ID) return 'BPC (Bonus Pest Chance) Set';
  if (setupId === THIRD_SETUP_ID) return thirdSetupName(all);
  return setupById(all, setupId)?.name || 'Set';
}

function slotItem(slotId, setupId = null) {
  const all = setups();
  const target = effectiveSetup(all, setupId || all.activeId) || activeSetup(all);
  return target?.slots?.[slotId] || null;
}

function writeSlot(slotId, item, setupId = null) {
  const all = setups();
  writeLinkedSetupSlot(all, setupId || all.activeId, slotId, item);
  saveState();
}

function optionList(options, current) {
  const values = options.map(option => option.value);
  if (current && !values.includes(current)) options = [{ value: current, source: 'manual' }, ...options];
  return options;
}

function slotCard(slot, setupId = null, roleLabel = null) {
  const targetId = setupId || setups().activeId;
  const item = slotItem(slot.id, targetId);
  const open = state.setupSlot === slot.id && state.setupSlotTarget === targetId;
  const itemId = String(item?.skyblockId || '').trim().toUpperCase();
  const itemIdAttr = itemId ? ` data-skyblock-item-id="${esc(itemId)}"` : '';

  return `<button class="slot-card ${item ? 'filled' : ''} ${open ? 'open' : ''} ${esc(rarityClass(item?.rarity))}" data-slot="${esc(slot.id)}" data-setup-target="${esc(targetId)}"${itemIdAttr}>
      <span class="slot-portrait"${itemIdAttr}><span class="item-portrait-fallback" aria-hidden="true">${esc(slot.label.slice(0, 2).toUpperCase())}</span></span>
      <span class="slot-text">
        <span class="eyebrow">${esc(roleLabel || slot.label)}</span>
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
  const targetId = state.setupSlotTarget || visibleSetupId(setups());
  const item = slotItem(slotId, targetId) || createEmptyItem();
  const catalogItems = itemsForSlot(itemCatalog, slotId);
  const capabilities = itemCapabilities(slotId, item, itemCatalog);
  const reforges = capabilities.reforges.map(option => ({ value: option.id, source: 'official' }));
  const rows = capabilities.enchantmentRows;
  const gems = Array.isArray(item.gems) ? item.gems : [];
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
      <div class="section-row"><div><h3>Gemstones</h3><p>${capabilities.gemstoneSlots.length} official socket${capabilities.gemstoneSlots.length === 1 ? '' : 's'} on this item. Each socket only offers legal gemstone types.</p></div></div>
      <div class="gem-grid">
        ${capabilities.gemstoneSlots.map((socket, index) => {
          const current = String(gems[index] || '').trim().toUpperCase();
          const values = gemValuesForSlotType(socket.slotType);
          const preserveCurrent = current && !values.includes(current);
          return `<label class="gem-line exact-gem-line">
            <span><strong>${esc(socket.slotType)}</strong> slot ${index + 1}</span>
            <select data-gem-value="${esc(slotId)}" data-gem-index="${index}">
              <option value="">— empty —</option>
              ${values.map(value => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(value)}</option>`).join('')}
              ${preserveCurrent ? `<option value="${esc(current)}" selected>${esc(current)} (current)</option>` : ''}
            </select>
          </label>`;
        }).join('')}
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

function setupCandidateLabel(candidate, mode = activityModeForState(state)) {
  if (!candidate) return 'Unknown loadout';
  const pet = candidate.setup?.slots?.pet?.displayName || 'No pet';
  if (mode === ACTIVITY_MODE.PEST_KILL) return `FF Set · ${pet}`;
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
      <div><div class="eyebrow">Owned loadout objective</div><strong>Sync a profile to evaluate owned combinations</strong>
      <div class="hint">No loadout is guessed from missing ownership data.</div></div>
    </div>`;
  }

  const objective = activeSetupObjective();
  const mode = activityModeForState(state);
  const runtimeContext = setupRuntimeContextForState(state);
  const all = setups();
  const candidates = buildSetupCandidates(synced, {
    phase: mode,
    lockedWearableSetup: mode === ACTIVITY_MODE.PEST_KILL
      ? effectiveSetup(all, FF_SETUP_ID)
      : null,
  });
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
    headline = setupCandidateLabel(chosen, mode);
    detail = `Clear match for ${result.label} across ${result.eligibleCount} complete owned combination${result.eligibleCount === 1 ? '' : 's'}.`;
  } else if (result.recommendation.status === 'tradeoff') {
    headline = `${result.frontierCount} non-dominated loadout options`;
    detail = 'No single loadout is better on every primary objective, so Farming420 does not invent a weighted winner.';
  } else if (result.recommendation.status === 'tie') {
    headline = `${result.frontierCount} tied loadout options`;
    detail = 'The modeled objective values are identical; no arbitrary winner is selected.';
  }

  const frontier = frontierRows.length
    ? `<div class="setup-objective-frontier">${frontierRows.map(row => {
        const candidate = candidateById.get(row.candidateId);
        const metrics = Object.entries(row.metrics)
          .map(([key, value]) => setupObjectiveMetricText(key, value))
          .join(' · ');
        return `<div class="hint"><strong>${esc(setupCandidateLabel(candidate, mode))}</strong><br>${esc(metrics)}
          <button class="ghost small" type="button" data-setup-objective-apply="${esc(row.candidateId)}">Use this loadout</button>
        </div>`;
      }).join('')}</div>`
    : '';

  return `<div class="setup-bar setup-objective-panel" data-setup-objective-panel>
    <div>
      <div class="eyebrow">Owned loadout objective · ${esc(result.label)}</div>
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
  return mode === ACTIVITY_MODE.PEST_SPAWN ? 'Armor · BPC Set' : 'Armor · FF Set';
}

function petSetupSection(title, setupId, note = '') {
  const petSlots = SETUP_SLOTS.filter(slot => slot.group === 'Pet');
  return `
    <div class="section-row"><div><h2>${esc(title)}</h2>${note ? `<p>${esc(note)}</p>` : ''}</div></div>
    <div class="slot-grid">${petSlots.map(slot => slotCard(slot, setupId)).join('')}</div>`;
}

function setupsPage() {
  const all = setups();
  const selectedId = visibleSetupId(all);
  const current = setupById(all, selectedId);
  const summary = setupSummary(current);
  const synced = snapshot();
  const hasSnapshot = Boolean(synced?.items?.length || synced?.pets?.some(pet => pet?.active === true));
  const ffSelected = selectedId === FF_SETUP_ID;
  const bpcSelected = selectedId === BPC_SETUP_ID;
  const sharedPet = farmingKillingPetShared(all);
  const visibleIds = visiblePhysicalSetupIds(all);
  const objectivePanel = selectedId === THIRD_SETUP_ID
    ? `<div class="setup-bar setup-objective-panel">
        <div><div class="eyebrow">Custom physical set</div><strong>${esc(visibleSetupLabel(THIRD_SETUP_ID, all))}</strong>
        <div class="hint">Set 3 has no automatic FF, BPC or Killing role. Configure it manually; objective recommendations stay attached to the two fixed-role sets.</div></div>
      </div>`
    : setupObjectivePanel();

  const gearGroups = ['Armor', 'Equipment'].map(group => `
    <div class="section-row"><div><h2>${group}</h2></div></div>
    <div class="slot-grid">${SETUP_SLOTS.filter(slot => slot.group === group).map(slot => slotCard(slot, selectedId)).join('')}</div>
  `).join('');

  const petContent = ffSelected
    ? (sharedPet
      ? petSetupSection(
          'Farming Pet',
          FF_SETUP_ID,
          'Used for Farming and also for Killing while only FF and BPC sets exist. Add Set 3 to unlock a separate Killing Pet.',
        )
      : `${petSetupSection('Farming Pet', FF_SETUP_ID, 'Used while farming crops.')}
         ${petSetupSection('Killing Pet', KILLING_SETUP_ID, 'Unlocked by Set 3. Killing still inherits Armor and Equipment from the FF Set.')}`)
    : bpcSelected
      ? petSetupSection('BPC Pet', BPC_SETUP_ID, 'Used with the BPC Set while preparing Pest spawns.')
      : petSetupSection('Pet', THIRD_SETUP_ID, `Used with ${visibleSetupLabel(THIRD_SETUP_ID, all)}.`);

  return `${pageHeader('Loadouts', 'Farming System · FF and BPC sets', 'FF and BPC keep fixed roles and names. With two sets, Killing uses the FF Pet. Adding Set 3 unlocks a separate Killing Pet while Killing Armor and Equipment continue to inherit the FF Set.')}
    ${objectivePanel}
    <div class="setup-tabs">
      ${visibleIds.map(setupId =>
        `<button class="setup-tab ${setupId === selectedId ? 'active' : ''}" data-setup="${esc(setupId)}">${esc(visibleSetupLabel(setupId, all))}</button>`
      ).join('')}
    </div>

    <div class="setup-bar">
      <div class="setup-actions">
        <button class="ghost small" data-setup-prefill="1" ${hasSnapshot ? '' : 'disabled'}>Fill from sync</button>
      </div>
      <div class="hint">${summary.filled}/${summary.total} ${visibleSetupLabel(selectedId, all)} slots filled${summary.fromSync ? `, ${summary.fromSync} from your last sync` : ''}.${hasSnapshot ? '' : ' Sync your profile in Settings to fill these automatically.'}</div>
    </div>

    ${gearGroups}
    ${petContent}
    ${state.setupSlot ? slotEditor(state.setupSlot) : ''}`;
}

function interactionSelector(element) {
  if (!element || element === document.body) return null;
  const escape = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  if (element.id) return `[id="${escape(element.id)}"]`;
  const attributes = [...(element.attributes || [])].filter(attribute => attribute.name.startsWith('data-'));
  if (!attributes.length) return null;
  return `${String(element.tagName || '').toLowerCase()}${attributes.map(attribute => `[${attribute.name}="${escape(attribute.value)}"]`).join('')}`;
}

function currentSetupSlotViewportAnchor() {
  if (state.page !== 'setups' || !state.setupSlot) return null;
  const card = [...document.querySelectorAll('.slot-card[data-slot]')].find(candidate =>
    candidate.dataset.slot === state.setupSlot
    && (!state.setupSlotTarget || candidate.dataset.setupTarget === state.setupSlotTarget));
  if (!card) return null;
  return {
    slotId: card.dataset.slot,
    setupTarget: card.dataset.setupTarget || '',
    viewportTop: card.getBoundingClientRect().top,
  };
}

function restoreSetupSlotViewportAnchor(anchor) {
  if (!anchor || state.page !== 'setups') return false;
  const card = [...document.querySelectorAll('.slot-card[data-slot]')].find(candidate =>
    candidate.dataset.slot === anchor.slotId
    && candidate.dataset.setupTarget === anchor.setupTarget);
  if (!card) return false;

  const delta = card.getBoundingClientRect().top - anchor.viewportTop;
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

function captureInteraction() {
  return {
    generation: scrollIntentGeneration,
    page: state.page,
    x: Number(window.scrollX || 0),
    y: Number(window.scrollY || 0),
    selector: interactionSelector(document.activeElement),
    setupSlotAnchor: currentSetupSlotViewportAnchor(),
  };
}

function restoreInteraction(interaction) {
  if (!interaction) return;
  const stillCurrent = () => interaction.generation === scrollIntentGeneration && interaction.page === state.page;
  const restoreBase = () => {
    if (!stillCurrent()) return;
    window.scrollTo(interaction.x, interaction.y);
    if (interaction.selector) document.querySelector(interaction.selector)?.focus({ preventScroll: true });
  };
  const restoreAnchor = () => stillCurrent() && restoreSetupSlotViewportAnchor(interaction.setupSlotAnchor);

  restoreBase();
  restoreAnchor();

  // Setup-selection-ui docks/replaces controls in a microtask after the core
  // render. Re-apply the stable slot-card anchor after those DOM changes and on
  // two animation frames so choosing armor never moves the user's viewport.
  queueMicrotask(restoreAnchor);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      restoreAnchor();
      requestAnimationFrame(restoreAnchor);
    });
  }
}

function bindSetups() {
  const all = setups();
  const rerender = () => {
    const interaction = captureInteraction();
    reapplyGear();
    saveState();
    render();
    restoreInteraction(interaction);
  };

  document.querySelectorAll('[data-setup]').forEach(el => el.addEventListener('click', () => {
    all.activeId = el.dataset.setup;
    state.setupSlot = null;
    state.setupSlotTarget = null;
    rerender();
  }));
  document.querySelectorAll('[data-setup-objective-apply]').forEach(button => {
    button.addEventListener('click', () => {
      const synced = snapshot();
      if (!synced) return;
      const objective = activeSetupObjective();
      const mode = activityModeForState(state);
      const runtimeContext = setupRuntimeContextForState(state);
      const candidates = buildSetupCandidates(synced, {
        phase: mode,
        lockedWearableSetup: mode === ACTIVITY_MODE.PEST_KILL
          ? effectiveSetup(all, FF_SETUP_ID)
          : null,
      });
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
  document.querySelector('[data-setup-prefill]')?.addEventListener('click', () => {
    const current = setupById(all, visibleSetupId(all));
    const result = prefillSetupFromSnapshot(current, snapshot());
    Object.assign(current, result.setup);
    synchronizeFarmingKillingLoadouts(all);
    if (!result.filled.length) {
      alert('Your last sync contained no worn armor, equipment or active pet, so nothing could be filled in. Items sitting in storage are not assumed to be worn.');
    }
    rerender();
  });

  document.querySelectorAll('[data-slot]').forEach(el => el.addEventListener('click', () => {
    const targetId = el.dataset.setupTarget || visibleSetupId(all);
    const same = state.setupSlot === el.dataset.slot && state.setupSlotTarget === targetId;
    state.setupSlot = same ? null : el.dataset.slot;
    state.setupSlotTarget = same ? null : targetId;
    rerender();
  }));

  // --- slot editor ---
  const slotId = state.setupSlot;
  if (!slotId) return;
  const setupTargetId = state.setupSlotTarget || visibleSetupId(all);
  const currentItem = () => slotItem(slotId, setupTargetId) || createEmptyItem();
  const itemForValue = currentItem();
  if (itemForValue?.displayName) queuePhysicalValueRefresh(slotId, itemForValue);
  // Any hand edit makes the slot the player's own, so a later sync prefill
  // leaves it alone instead of overwriting their work.
  const patch = changes => writeSlot(slotId, { ...currentItem(), ...changes, source: ITEM_SOURCE.MANUAL }, setupTargetId);

  document.querySelector(`[data-slot-clear="${slotId}"]`)?.addEventListener('click', () => {
    writeSlot(slotId, null, setupTargetId); rerender();
  });
  document.querySelector(`[data-slot-item="${slotId}"]`)?.addEventListener('change', event => {
    const chosen = itemsForSlot(itemCatalog, slotId).find(entry => entry.id === event.target.value);
    const changingItem = Boolean(chosen?.id && chosen.id !== currentItem().skyblockId);
    patch({
      skyblockId: chosen?.id ?? null,
      displayName: chosen?.name ?? currentItem().displayName,
      enchantments: changingItem ? intrinsicEnchantmentsForCatalogItem(chosen) : currentItem().enchantments,
      reforge: changingItem ? null : currentItem().reforge,
      recombobulated: changingItem ? false : currentItem().recombobulated,
      gems: changingItem ? [] : currentItem().gems,
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

  document.querySelectorAll(`[data-gem-value="${slotId}"]`).forEach(el => el.addEventListener('change', event => {
    const capabilities = itemCapabilities(slotId, currentItem(), itemCatalog);
    const gems = Array.from(
      { length: capabilities.gemstoneSlots.length },
      (_, index) => String(currentItem().gems?.[index] || '').trim().toUpperCase(),
    );
    gems[Number(el.dataset.gemIndex)] = String(event.target.value || '').trim().toUpperCase();
    patch({ gems });
    rerender();
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
  if (!searchHasFocus && ['setups', 'shards'].includes(state.page) && (result.items.length || result.error)) render();
}

// --- Farming 0-60 reference -------------------------------------------------
// A staged walkthrough driven by the player's own synced Farming level, with
// selectable alternatives where the source names more than one good answer.

const FARMING_LEVEL_ENTRY = 'account-skill-farming-skill-level';

function farmingLevel() {
  const synced = state.profile.normalizedSnapshot?.skills?.farming?.level;
  if (Number.isFinite(synced)) return synced;
  const entered = Number(state.profile.levels?.[FARMING_LEVEL_ENTRY]);
  return Number.isFinite(entered) && entered > 0 ? entered : null;
}

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
        return `<div id="${esc(searchAnchorSlug('info-pest', pest.name))}" class="pest-row${pest.status === 'VERIFIED' ? '' : ' pest-row-unverified'}">
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

function infoSourceMarkup(entry) {
  if (!entry?.source) return '';
  const verified = entry.lastVerified ? ` · checked ${entry.lastVerified}` : '';
  return `<div class="info-entry-source">
    <a href="${esc(entry.source)}" target="_blank" rel="noreferrer">Current source</a><span>${esc(verified)}</span>
  </div>`;
}

function infoEntryCard(entry) {
  return `<article class="info-card info-reference-card" id="${esc(entry.anchor)}">
    <span>${esc(entry.label)}</span>
    <strong>${esc(entry.title)}</strong>
    <div class="info-entry-copy">
      <p><b>What:</b> ${esc(entry.what)}</p>
      <p><b>Why it matters:</b> ${esc(entry.why)}</p>
      <p><b>When it matters:</b> ${esc(entry.when)}</p>
      <p><b>Where / how:</b> ${esc(entry.where)}</p>
    </div>
    ${entry.sourceNote ? `<p class="info-source-note">${esc(entry.sourceNote)}</p>` : ''}
    ${infoSourceMarkup(entry)}
  </article>`;
}

function infoReferenceSection(section, entries) {
  return `<section class="info-section" id="info-section-${esc(section.id)}">
    <div class="section-row">
      <div>
        <div class="eyebrow">${esc(section.eyebrow)}</div>
        <h2>${esc(section.title)}</h2>
        <p>${esc(section.description)}</p>
      </div>
    </div>
    <div class="info-upgrade-grid">${entries.map(infoEntryCard).join('')}</div>
  </section>`;
}

function infoPage() {
  const earlyStages = STAGES.slice(0, 4);
  const cropEntries = cropStrategyInfo(CROPS);
  const staticBySection = sectionId => INFO_ENTRIES.filter(entry => entry.section === sectionId);

  return `${pageHeader('Info', 'Farming Info & Beginner Guide', 'Explanations, beginner strategy, current mechanics and where each system lives. Configuration and calculated values stay on their own tabs.')}
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

      ${INFO_SECTIONS.map(section => infoReferenceSection(
        section,
        section.id === 'crops' ? cropEntries : staticBySection(section.id),
      )).join('')}

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
      ${ENCHANT_LADDERS.map(ladder => `<article class="ladder" id="${esc(searchAnchorSlug('info-enchant', ladder.name))}">
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

function activeSearchFocusSnapshot() {
  const input = document.getElementById('search');
  if (!input || document.activeElement !== input) return null;
  return {
    start: input.selectionStart,
    end: input.selectionEnd,
    direction: input.selectionDirection,
  };
}

function restoreActiveSearchFocus(snapshot) {
  if (!snapshot) return;
  const input = document.getElementById('search');
  if (!input) return;
  input.focus({ preventScroll: true });
  const length = input.value.length;
  const start = Math.min(snapshot.start ?? length, length);
  const end = Math.min(snapshot.end ?? start, length);
  try {
    input.setSelectionRange(start, end, snapshot.direction || 'none');
  } catch {
    // Text inputs support setSelectionRange; keep focus even if a browser disagrees.
  }
}

function render({ preserveScroll = true } = {}) {
  pendingPriceRender = false;
  const searchFocusSnapshot = preserveScroll ? activeSearchFocusSnapshot() : null;
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
    case 'setups': content = setupsPage(); break;
    case 'crops': content = cropsPage(); break;
    case 'buffs': content = effectsPage(); break;
    // The heading says what the page is; the picker and the editor below both
    // name the selected tool, so repeating it a third time here added nothing.
    case 'tools': content = genericSectionPage('tools','Tools','Farming tools','Pick the tool, then set what is actually on it: reforge, enchantments, gemstones, counters and tier.'); break;
    case 'shards': content = shardsPage(); break;
    case 'planner': content = plannerPage(); break;
    case 'qol': content = qolPage(); break;
    case 'focus': content = focusNextPage(); break;
    case 'info': content = infoPage(); break;
    default: content = dashboard();
  }
  document.getElementById('app').innerHTML = shell(content);
  bind();
  restoreActiveSearchFocus(searchFocusSnapshot);
  // Announce the exact state that produced this DOM. The setup-art module
  // listens for this explicit render hook, so it does not have to infer the
  // phase from a later localStorage read or rely only on MutationObserver timing.
  window.dispatchEvent(new CustomEvent('farming420:rendered', {
    detail: { state },
  }));
  if (state.page === 'setups') bindSetups();
  if (['setups', 'shards'].includes(state.page)) ensureItemCatalog();
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
  scheduleTemporaryExpiry();
}

let temporaryExpiryTimer;
function scheduleTemporaryExpiry() {
  clearTimeout(temporaryExpiryTimer);
  if (readOnlyState) return;
  const expiry = state.profile.temporaryEffects?.pesthunterPhillip?.activeUntilMs;
  if (typeof expiry !== 'number' || !Number.isFinite(expiry) || expiry <= Date.now()) return;
  temporaryExpiryTimer = setTimeout(() => {
    state = loadState();
    if (!readOnlyState) { applyComputedStatsToState(state); saveState(); }
    render();
  }, Math.min(2147483647, expiry - Date.now() + 10));
}

function closeNavigation() {
  const sidebar = document.querySelector('#app .sidebar');
  const toggle = document.querySelector('#app [data-nav-toggle]');
  if (!sidebar || !toggle) return;
  sidebar.classList.remove('nav-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
}

function closeDrawer() {
  const itemId = state.drawer;
  state.drawer = null;
  saveState();
  render();
  document.querySelector(`button[data-open="${CSS.escape(itemId || '')}"]`)?.focus({ preventScroll: true });
}

document.addEventListener('keydown', event => {
  const dialog = document.querySelector('.drawer[role="dialog"]');
  if (!dialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDrawer();
  } else if (event.key === 'Tab') {
    const targets = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
      .filter(node => !node.disabled && node.getClientRects().length);
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault(); last?.focus({ preventScroll: true });
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault(); first?.focus({ preventScroll: true });
    }
  }
});

function bind() {
  document.querySelector('[data-chip-rarity]')?.addEventListener('change', event => {
    const id = event.target.dataset.chipRarity, rarity = event.target.value;
    if (!CHIP_LEVEL_CAP[rarity]) return;
    state.profile.chipRarities ||= {};
    state.profile.chipRarities[id] = rarity;
    const item = UPGRADES.find(row => row.chipId === id);
    if (item && currentLevel(item) > CHIP_LEVEL_CAP[rarity]) setEntryLevel(item, CHIP_LEVEL_CAP[rarity]);
    applyComputedStatsToState(state); saveState(); render();
  });
  document.querySelector('[data-phillip-count]')?.addEventListener('change', event => {
    const count = event.target.value === '' ? null : Number(event.target.value);
    if (count !== null && (!Number.isInteger(count) || count < 0)) { event.target.reportValidity(); return; }
    state.profile.temporaryEffects ||= {};
    state.profile.temporaryEffects.pesthunterPhillip ||= {};
    state.profile.temporaryEffects.pesthunterPhillip.pestCount = count;
    applyComputedStatsToState(state); saveState(); render();
  });
  document.querySelector('[data-phillip-activate]')?.addEventListener('click', () => {
    const input = document.querySelector('[data-phillip-duration]');
    const minutes = Number(input?.value);
    if (!Number.isFinite(minutes) || minutes <= 0) { input?.setCustomValidity('Enter the observed potion duration.'); input?.reportValidity(); return; }
    state.profile.temporaryEffects ||= {};
    const record = state.profile.temporaryEffects.pesthunterPhillip ||= {};
    record.active = true; record.activeUntilMs = Date.now() + minutes * 60000;
    record.durationSeconds = minutes * 60;
    setEntryLevel(UPGRADES.find(row => row.id === 'temporary-buff-pesthunter-phillip-buff'), 1);
    applyComputedStatsToState(state); saveState(); render();
  });
  document.querySelector('[data-phillip-deactivate]')?.addEventListener('click', () => {
    state.profile.temporaryEffects ||= {};
    state.profile.temporaryEffects.pesthunterPhillip = { ...(state.profile.temporaryEffects.pesthunterPhillip || {}), active: false };
    applyComputedStatsToState(state); saveState(); render();
  });
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
    state.page = canonicalPage(el.dataset.page);
    state.drawer=null;
    closeNavigation();
    saveState();
    render({ preserveScroll: false });
  }));
  document.querySelectorAll('[data-open-settings]').forEach(el => el.addEventListener('click', closeNavigation));
  document.querySelectorAll('button[data-open]').forEach(el => el.addEventListener('click', () => { state.drawer=el.dataset.open; saveState(); render(); document.querySelector('.drawer .close')?.focus({ preventScroll: true }); }));
  // The backdrop closes the drawer, but a click on the drawer itself must not:
  // it bubbles up to the backdrop, so the target is checked explicitly.
  document.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', event => {
    if (el.classList.contains('drawer-backdrop') && event.target !== el) return;
    closeDrawer();
  }));
  document.querySelectorAll('[data-crop]').forEach(el => el.addEventListener('click', () => { state.selectedCrop=el.dataset.crop; saveState(); render(); }));

  const cropSel = document.getElementById('cropSelect');
  if (cropSel) cropSel.addEventListener('change', e => { state.selectedCrop=e.target.value; saveState(); render(); });

  document.querySelector('[data-dashboard-crop]')?.addEventListener('change', event => {
    const next = CROPS.find(entry => entry.id === event.target.value);
    if (!next) return;
    state.dashboardCrop = next.id;
    saveState();
    render();
  });

  document.querySelector('[data-dashboard-context]')?.addEventListener('change', event => {
    const option = FARMING_CONTEXT_OPTIONS.find(entry => entry.id === event.target.value);
    state.profile.farmingContext = option?.id || 'normal';
    saveState();
    render();
  });

  document.querySelector('[data-dashboard-open-planner]')?.addEventListener('click', () => {
    state.page = 'planner';
    state.drawer = null;
    saveState();
    render({ preserveScroll: false });
  });
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
        if (searchResults && !searchResults.hidden) closeSearchResults();
        else clearGlobalSearch();
        search.focus();
      } else if (event.key === 'Enter' && activeSearchResults[0]) {
        event.preventDefault();
        navigateSearchResult(activeSearchResults[Math.max(0, activeSearchResultIndex)]);
      } else if (event.key === 'ArrowDown') {
        if (focusSearchResult(0)) event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        if (focusSearchResult(activeSearchResults.length - 1)) event.preventDefault();
      }
    });
  }
  searchResults?.addEventListener('click', event => {
    const button = event.target.closest('[data-search-result]');
    if (!button) return;
    navigateSearchResult(activeSearchResults[Number(button.dataset.searchResult)]);
  });
  searchResults?.addEventListener('keydown', event => {
    const button = event.target.closest('[data-search-result]');
    if (!button) return;
    const index = Number(button.dataset.searchResult);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusSearchResult(index + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) {
        activeSearchResultIndex = -1;
        search?.removeAttribute('aria-activedescendant');
        search?.focus();
      } else {
        focusSearchResult(index - 1);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearchResults();
      search?.focus();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigateSearchResult(activeSearchResults[index]);
  });
  const profileName = document.getElementById('profileName');
  if (profileName) profileName.addEventListener('change', e => { state.profile.name=e.target.value; saveState(); });
  const gf = document.getElementById('globalFortune');
  if (gf) gf.addEventListener('change', e => { state.profile.globalFortune=Number(e.target.value||0); saveState(); render(); });
  const cf = document.getElementById('cropFortune');
  if (cf) cf.addEventListener('change', e => { state.profile.cropFortune[state.selectedCrop]=Number(e.target.value||0); saveState(); render(); });

  document.querySelectorAll('[data-accessory-select]').forEach(button => button.addEventListener('click', event => {
    const itemId = event.currentTarget.dataset.accessorySelect;
    const groupId = event.currentTarget.dataset.accessoryGroup;
    const group = FARMING_ACCESSORY_GROUPS.find(entry => entry.id === groupId);
    if (!group || !group.items.some(item => item.itemId === itemId)) return;
    setAccessorySelection(group, itemId, event.currentTarget.getAttribute('aria-pressed') !== 'true');
  }));

  document.querySelectorAll('[data-accessory-tier-select]').forEach(select => select.addEventListener('change', event => {
    const group = FARMING_ACCESSORY_GROUPS.find(entry => entry.id === event.currentTarget.dataset.accessoryTierSelect);
    if (!group?.upgradeLine) return;
    setAccessoryGroupSelection(group, event.currentTarget.value);
  }));

  const cowStrengthPlanner = document.querySelector('[data-cow-strength-planner]');
  if (cowStrengthPlanner) cowStrengthPlanner.addEventListener('toggle', () => {
    cowStrengthPlannerOpen = cowStrengthPlanner.open;
  });

  document.querySelectorAll('[data-synergy-shard-value]').forEach(el => el.addEventListener('click', event => {
    state.profile.synergyShardLevels ||= {};
    const id = event.currentTarget.dataset.synergyShardLevel;
    const value = Math.max(0, Math.min(10, Math.floor(Number(event.currentTarget.dataset.synergyShardValue || 0))));
    if (value > 0) state.profile.synergyShardLevels[id] = value;
    else delete state.profile.synergyShardLevels[id];
    saveState();
    render();
  }));

  document.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.id); if (!item) return;
    const store = itemStore(item);
    const nextLevel = Math.max(0, Math.min(Number(item.max||1), currentLevel(item)+Number(el.dataset.step)));
    setEntryLevel(item, nextLevel);
    saveState(); render();
  }));
  document.querySelectorAll('[data-max]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.max); if (!item) return;
    setEntryLevel(item, Number(item.max||1)); saveState(); render();
  }));
  document.querySelectorAll('[data-owned]').forEach(el => el.addEventListener('change', e => {
    const item = UPGRADES.find(x=>x.id===e.target.dataset.owned); if (!item) return;
    setEntryLevel(item, e.target.checked ? 1 : 0); saveState(); render();
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
    downloadJson(backupFilename(), createBackupPayload(readStoredAppState(state)));
  });
  const importInput=document.getElementById('importInput');
  if(importInput) importInput.addEventListener('change', async e=>{
    try {
      const restored = validateBackupPayload(await readJsonFile(e.target.files?.[0]));
      writeStoredAppState(restored.state, { strict: true });
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
if (!readOnlyState) applyComputedStatsToState(state);
saveState();

render();

// Settings writes synced values straight to storage; re-read and repaint so the
// cards show them without a manual reload.
window.addEventListener('farming420:state-changed', () => {
  const storedState = JSON.stringify(readStoredAppState(null));
  if (storedState === lastObservedStoredState) return;
  lastObservedStoredState = storedState;
  const nextState = loadState();
  if (JSON.stringify(nextState) === JSON.stringify(state)) return;
  const interaction = captureInteraction();
  state = nextState;
  render();
  restoreInteraction(interaction);
});

// Background prices must not replace a picker while its keyboard/focus owner
// is active. A normal state render consumes the cache; otherwise flush after
// the user leaves/closes the interactive overlay through its normal event.
function priceRenderBlockedByInteraction() {
  return Boolean(document.querySelector('details[data-keyboard-bound="1"][open], .drawer, .sidebar.nav-open')
    || document.activeElement?.closest?.('details[data-keyboard-bound="1"]'));
}
function flushPriceRender() {
  if (!pendingPriceRender || priceRenderBlockedByInteraction()) return;
  const interaction = captureInteraction();
  render();
  restoreInteraction(interaction);
}
function requestPriceRender() {
  pendingPriceRender = true;
  flushPriceRender();
}
for (const event of ['focusin', 'toggle']) document.addEventListener(event, () => {
  if (!pendingPriceRender) return;
  clearTimeout(priceRenderTimer);
  priceRenderTimer = setTimeout(flushPriceRender, 0);
}, true);

// Market refresh changes only the price cache, not profile state. Do not
// globally repaint editors/setups when background market requests finish:
// that would replace interactive DOM under the user. The Dashboard is the one
// core-rendered surface that needs an immediate repaint for its price cards.
window.addEventListener('farming420:market-average-updated', () => {
  const safePricePages = new Set(['dashboard', 'accessories', 'crops', 'gear', 'pets', 'chips', 'shards', 'buffs', 'pests', 'qol', 'planner', 'focus']);
  if (safePricePages.has(state.page)) requestPriceRender();
});

window.addEventListener('farming420:item-value-updated', () => {
  if (state.page !== 'setups' && state.page !== 'tools') return;

  // Physical value refreshes finish after the selection that requested them.
  // On Setups that late render is followed by editor docking, so it needs the
  // same interaction/slot restore path as a direct state change. Without it,
  // item-dependent price refreshes can move the page even though the original
  // selection itself was scroll-safe.
  requestPriceRender();
});
