import { CROPS, UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { ACTIVITY_MODE, activityLabel, activityModeForState, setActivityModeOnState } from './activity-mode.js';
import { evaluateUpgrade, rankEvaluatedUpgrades, statDeltas } from './revenue-ranking.js';
import {
  AVERAGE_CROP_PRICE_STATUS,
  averageCropPriceNote,
  averageCropUnitPrice,
  averageHarvestFeastMaterialPrice,
} from './average-crop-price.js';
import { MEASURED_FEAST_KEY, MEASURED_FIELDS, describeMissing, measuredBaseline } from './measured-baseline.js';
import { setTextIfChanged } from './set-text.js';
import { costOriginNote, resolveUpgradeCost } from './upgrade-cost-resolution.js';
import { INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR } from './upgrade-economics.js';
import {
  PLANNER_UPGRADE_TARGET,
  plannerUpgradeTarget,
  plannerUpgradeTargetEligible,
  plannerUpgradeTargetRole,
  plannerUpgradeValueText,
} from './planner-upgrade-objective.js';
import {
  plannerActivityContext,
  plannerItemApplies,
  plannerProgressBucket,
} from './planner-activity-context.js';
import { formatNumber } from './format-number.js';
import { applySnapshotToProgress } from './snapshot-apply.js';
import {
  UPGRADE_FILTER,
  UPGRADE_FILTERS,
  aggregateUpgradeRows,
  matchesUpgradeFilter,
  upgradeFilterTags,
} from './planner-upgrade-filters.js';

const PLANNER_BENCHMARK_COINS_PER_HOUR = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR;
const FOCUS_AVERAGE_STEP_HOURS = 1;
const FOCUS_SCOPE_KEY = 'farming420-focus-scope-v1';
const UPGRADE_FILTER_KEY = 'farming420-upgrade-filter-v1';
const PLANNER_ACTIVITY_MODES = Object.freeze([
  ACTIVITY_MODE.FARM,
  ACTIVITY_MODE.PEST_SPAWN,
  ACTIVITY_MODE.PEST_KILL,
]);

// Focus on next is progression, not a catch-all for anything whose price table
// happens to use a time acquisition mode. Purchases and equipment choices stay
// in Upgrade Planner even when their market price has not been researched yet.
const FOCUS_PROGRESSION_IDS = new Set([
  'account-skill-farming-skill-level',
  'tool-tool-base-counter-fortune',
]);

const USEFUL_ITEMS = Object.freeze([
  {
    id: 'squeaky-mousemat',
    name: 'Squeaky Mousemat',
    group: 'Farm control',
    role: 'Camera alignment',
    purpose: 'Save and snap exact yaw/pitch so a farm stays aligned without manual camera correction.',
    benefit: 'Makes a repeatable farming angle part of the setup instead of something you have to reconstruct after moving, warping or correcting the camera.',
    workflow: 'Save the farm\'s intended yaw/pitch once, then snap back to it before starting a farming session.',
  },
  {
    id: 'sundial',
    name: 'Sundial',
    group: 'Farm control',
    role: 'Speed presets',
    purpose: 'Unlock per-crop Speed settings at the Garden Desk so speed control is no longer tied to Rancher\'s Boots.',
    benefit: 'Keeps movement speed as a crop/farm setting, which makes switching between farming layouts less dependent on manually adjusting your boots.',
    workflow: 'Store the speed required by each crop layout at the Garden Desk and use the matching preset when changing farms.',
  },
  {
    id: 'builders-wand',
    name: "Builder's Wand",
    group: 'Farm building',
    role: 'Bulk construction',
    purpose: 'Place large connected surfaces faster when building or rebuilding custom farms.',
    benefit: 'Cuts down repetitive block placement on broad floors, walls and other large connected sections.',
    workflow: 'Use it for the bulk geometry first, then finish edges and small corrections with more precise building tools.',
  },
  {
    id: 'builders-ruler',
    name: "Builder's Ruler",
    group: 'Farm building',
    role: 'Long straight edits',
    purpose: 'Place or remove long lines of blocks for fast lanes, borders and farm structure work.',
    benefit: 'Handles straight repetitive structure work more efficiently than placing or breaking the same line block by block.',
    workflow: 'Use it for lanes, borders, dividers and other long straight sections where the line itself is the repeated task.',
  },
  {
    id: 'infinidirt-wand',
    name: 'InfiniDirt™ Wand',
    group: 'Farm building',
    role: 'Dirt supply',
    purpose: 'Supply dirt on demand and feed building tools without repeatedly restocking blocks.',
    benefit: 'Removes repeated inventory restocking from dirt-heavy farm construction.',
    workflow: 'Keep it available while laying large dirt platforms so construction tools can keep drawing dirt without manual refill trips.',
  },
  {
    id: 'basket-of-seeds',
    name: 'Basket of Seeds',
    group: 'Farm building',
    role: 'Crop planting',
    purpose: 'Plant long crop rows quickly after the farm structure is finished.',
    benefit: 'Separates planting from structure work and avoids placing every crop individually once the geometry is complete.',
    workflow: 'Finish the farm shape and irrigation first, then use it to populate the prepared crop rows.',
  },
  {
    id: 'block-zapper',
    name: 'Block Zapper',
    group: 'Farm building',
    role: 'Cleanup and redesign',
    purpose: 'Remove connected player-placed blocks quickly when correcting or redesigning a farm.',
    benefit: 'Speeds up teardown when a connected section of a custom build needs to be removed or rebuilt.',
    workflow: 'Use it for deliberate connected cleanup; isolate the section you want to remove before using it near finished structure.',
  },
  {
    id: 'prismapump',
    name: 'Prismapump',
    group: 'Farm building',
    role: 'Irrigation',
    purpose: 'Lay out water channels faster for crop farms that need irrigation.',
    benefit: 'Reduces repeated water placement while constructing long irrigation runs.',
    workflow: 'Use it while building the water channels, before final planting, so irrigation is part of the farm structure rather than a later correction.',
  },
]);

function usefulItemState(raw) {
  raw.profile ||= {};
  raw.profile.usefulItems ||= {};
  return raw.profile.usefulItems;
}

function usefulItemsPanel(raw) {
  const owned = usefulItemState(raw);
  const ownedCount = USEFUL_ITEMS.filter(item => owned[item.id] === true).length;
  const groups = [...new Set(USEFUL_ITEMS.map(item => item.group))];
  const missingCount = USEFUL_ITEMS.length - ownedCount;

  return `<section class="revenue-panel useful-items-panel qol-detail-panel">
    <div class="revenue-panel-head">
      <div><div class="eyebrow">Quality of life</div><h2>Useful items</h2></div>
      <span class="revenue-note">${ownedCount}/${USEFUL_ITEMS.length} marked owned</span>
    </div>
    <p class="revenue-help useful-items-help">These are convenience, control and farm-building upgrades. They stay outside the Farming Fortune / profit ranking because their value is time saved and easier farm operation rather than a clean FF number.</p>
    <div class="qol-summary-grid">
      <div><span>Owned</span><strong>${ownedCount}</strong></div>
      <div><span>Still missing</span><strong>${missingCount}</strong></div>
      <div><span>Tracked separately</span><strong>No FF ranking</strong></div>
    </div>
    <div class="useful-item-groups">
      ${groups.map(group => `<section class="useful-item-group">
        <h3>${esc(group)}</h3>
        <div class="useful-item-list">
          ${USEFUL_ITEMS.filter(item => item.group === group).map(item => {
            const checked = owned[item.id] === true;
            return `<label class="useful-item-row ${checked ? 'owned' : ''}">
              <input type="checkbox" data-useful-item="${esc(item.id)}" ${checked ? 'checked' : ''}>
              <span class="useful-item-copy">
                <span class="useful-item-heading"><strong>${esc(item.name)}</strong><em>${esc(item.role)}</em></span>
                <small>${esc(item.purpose)}</small>
                <span class="useful-item-detail-grid">
                  <span><b>Why it helps</b><span>${esc(item.benefit)}</span></span>
                  <span><b>How to use it</b><span>${esc(item.workflow)}</span></span>
                </span>
              </span>
            </label>`;
          }).join('')}
        </div>
      </section>`).join('')}
    </div>
  </section>`;
}

function bindUsefulItemToggles(host) {
  host.querySelectorAll('[data-useful-item]').forEach(input => input.addEventListener('change', event => {
    const next = load();
    const usefulItems = usefulItemState(next);
    usefulItems[event.target.dataset.usefulItem] = event.target.checked;
    save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function save(raw) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

function selectedCropId(raw) {
  return document.querySelector('#cropSelect')?.value || raw.selectedCrop || 'melon';
}

function cropFor(raw) {
  const id = selectedCropId(raw);
  return CROPS.find(crop => crop.id === id) || CROPS[0];
}

function progressBucket(raw, item) {
  return plannerProgressBucket(raw, item, selectedCropId(raw));
}

function level(raw, item) {
  const max = Math.max(1, Number(item.max || 1));
  return Math.max(0, Math.min(max, Number(progressBucket(raw, item).levels?.[item.id] || 0)));
}

function maxed(raw, item) {
  return level(raw, item) >= Math.max(1, Number(item.max || 1));
}

function gain(raw, item) {
  const manual = progressBucket(raw, item).manualGain?.[item.id];
  if (manual !== undefined && manual !== '' && Number.isFinite(Number(manual))) return Number(manual);
  return Number(item.stepGain || item.rawMarginal || 0);
}

function automaticProfitStreams(raw, context = plannerActivityContext(raw, selectedCropId(raw))) {
  const cropId = selectedCropId(raw);
  const priced = measuredWithMarketAverage(measured(raw), cropId);
  const result = measuredBaseline(priced.values, measuredStats(context), cropId);
  return {
    normalCropCoinsPerHour: result.normalCropCoinsPerHour,
    rareCropCoinsPerHour: result.rareCropCoinsPerHour,
  };
}

function timeValueFor(raw) {
  const streams = automaticProfitStreams(raw);
  const measuredCoins = Math.max(0, Number(streams.normalCropCoinsPerHour || 0))
    + Math.max(0, Number(streams.rareCropCoinsPerHour || 0));
  if (measuredCoins > 0) return { coinsPerHour: measuredCoins, source: 'automatic_90d_market_baseline' };
  return {
    coinsPerHour: INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
    source: 'internet_benchmark',
  };
}

function earnedRouteRows(raw) {
  const cropId = selectedCropId(raw);
  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => plannerItemApplies(raw, item, cropId))
    .filter(item => !maxed(raw, item))
    .map(item => {
      const store = progressBucket(raw, item);
      const costSource = resolveUpgradeCost(store, item.id);
      return { item, store, costSource, itemGain: gain(raw, item) };
    })
    .filter(row => row.costSource.acquisitionMode === 'EARNED' && row.itemGain > 0);
}

function evaluatedRows(raw) {
  const cropId = selectedCropId(raw);
  const timeValue = timeValueFor(raw);
  const context = plannerActivityContext(raw, cropId);
  const streams = automaticProfitStreams(raw, context);

  return rankEvaluatedUpgrades(UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => plannerItemApplies(raw, item, cropId))
    .filter(item => !maxed(raw, item))
    .map(item => {
      const itemGain = gain(raw, item);
      const store = progressBucket(raw, item);
      const costSource = resolveUpgradeCost(store, item.id);
      const storedHours = store.grindHours?.[item.id];
      const activeGrindHours = storedHours === undefined || storedHours === '' ? null : Number(storedHours);
      return {
        item,
        ...evaluateUpgrade({
          item,
          gain: itemGain,
          costCoins: costSource.coins,
          acquisitionMode: costSource.acquisitionMode,
          directCoinCost: costSource.directCoinCost,
          activeGrindHours,
          timeValueCoinsPerHour: timeValue.coinsPerHour,
          timeValueSource: timeValue.source,
          currentFortune: context.currentFortune,
          currentOverbloom: context.currentOverbloom,
          fortuneBase: context.fortuneBase,
          normalCropCoinsPerHour: Number(streams.normalCropCoinsPerHour || 0),
          rareCropCoinsPerHour: Number(streams.rareCropCoinsPerHour || 0),
        }),
        activityMode: context.mode,
        costSource,
      };
    })
    .filter(row => row.modeled && row.gain > 0));
}

/**
 * A common income stream translates Fortune and Overbloom into comparable
 * Coins/h without requiring a manual profit baseline.
 *
 * This is a planning benchmark, not a claim about the player's actual farm.
 * Fortune gets a 20m/h normal-income stream and Overbloom gets a 20m/h
 * rare-income stream; the active set's real stats still control the marginal
 * percentage.
 */
function benchmarkStreams(item, itemGain) {
  const deltas = statDeltas(item, itemGain);
  if (deltas.modeled === 'overbloom') {
    return { normalCropCoinsPerHour: 0, rareCropCoinsPerHour: PLANNER_BENCHMARK_COINS_PER_HOUR };
  }
  return { normalCropCoinsPerHour: PLANNER_BENCHMARK_COINS_PER_HOUR, rareCropCoinsPerHour: 0 };
}

function isSpawningPrimary(row) {
  return row?.activityMode === ACTIVITY_MODE.PEST_SPAWN
    && row?.targetRole?.tier === 'primary';
}

function targetUnitCost(row) {
  if (!row?.costKnown || !Number.isFinite(row?.cost) || !(row?.gain > 0)) return null;
  if (row.target === PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE
    || row.target === PLANNER_UPGRADE_TARGET.PEST_COOLDOWN) {
    return row.cost / row.gain;
  }
  return null;
}

function rankPlannerRows(rows, mode) {
  const ranked = rankEvaluatedUpgrades(rows);
  if (mode !== ACTIVITY_MODE.PEST_SPAWN) return ranked;

  return ranked.sort((a, b) => {
    const aPriority = Number(a.targetRole?.priority ?? 99);
    const bPriority = Number(b.targetRole?.priority ?? 99);
    if (aPriority !== bPriority) return aPriority - bPriority;

    if (a.targetRole?.tier === 'primary' && b.targetRole?.tier === 'primary') {
      const aVerified = a.item?.status === 'ACTIVE' ? 0 : 1;
      const bVerified = b.item?.status === 'ACTIVE' ? 0 : 1;
      if (aVerified !== bVerified) return aVerified - bVerified;

      const aUnitCost = targetUnitCost(a);
      const bUnitCost = targetUnitCost(b);
      if (aUnitCost !== null && bUnitCost !== null && aUnitCost !== bUnitCost) return aUnitCost - bUnitCost;
      if (aUnitCost !== null && bUnitCost === null) return -1;
      if (bUnitCost !== null && aUnitCost === null) return 1;
    }

    return 0;
  });
}

function recommendationGoalItem(item) {
  const tags = upgradeFilterTags(item);
  return tags.has(UPGRADE_FILTER.GREENHOUSE) || tags.has(UPGRADE_FILTER.VISITOR);
}

function recommendationCropApplies(item, cropId) {
  const selected = CROPS.find(entry => entry.id === cropId);
  return item?.cropScope === 'Any' || item?.cropScope === selected?.name;
}

function benchmarkEvaluatedRows(raw, { includeGoalFilters = false } = {}) {
  const cropId = selectedCropId(raw);
  const context = plannerActivityContext(raw, cropId);

  const rows = UPGRADES
    .filter(item => plannerItemApplies(raw, item, cropId)
      || (includeGoalFilters && recommendationGoalItem(item) && recommendationCropApplies(item, cropId)))
    .filter(item => plannerUpgradeTargetEligible(item, context.mode)
      || (includeGoalFilters && recommendationGoalItem(item)))
    .filter(item => {
      if (item.status === 'ACTIVE') return true;
      const role = plannerUpgradeTargetRole(item, context.mode);
      return item.status === 'VERIFY' && (
        (context.mode === ACTIVITY_MODE.PEST_SPAWN && role.tier === 'primary')
        || (includeGoalFilters && recommendationGoalItem(item))
      );
    })
    .filter(item => !maxed(raw, item))
    .map(item => {
      const itemGain = gain(raw, item);
      const store = progressBucket(raw, item);
      const costSource = resolveUpgradeCost(store, item.id);
      const benchmark = benchmarkStreams(item, itemGain);
      const target = plannerUpgradeTarget(item);
      const targetRole = plannerUpgradeTargetRole(item, context.mode);
      return {
        item,
        ...evaluateUpgrade({
          item,
          gain: itemGain,
          costCoins: costSource.coins,
          acquisitionMode: costSource.acquisitionMode,
          directCoinCost: costSource.directCoinCost,
          activeGrindHours: null,
          timeValueCoinsPerHour: PLANNER_BENCHMARK_COINS_PER_HOUR,
          timeValueSource: 'planner_benchmark',
          currentFortune: context.currentFortune,
          currentOverbloom: context.currentOverbloom,
          fortuneBase: context.fortuneBase,
          normalCropCoinsPerHour: benchmark.normalCropCoinsPerHour,
          rareCropCoinsPerHour: benchmark.rareCropCoinsPerHour,
        }),
        activityMode: context.mode,
        target,
        targetRole,
        costSource,
      };
    })
    .filter(row => {
      if (row.modeled && row.gain > 0) return true;
      if (isSpawningPrimary(row) && (row.gain > 0 || row.item.status === 'VERIFY')) return true;
      return includeGoalFilters
        && recommendationGoalItem(row.item)
        && (row.gain > 0 || row.item.status === 'VERIFY');
    });

  return rankPlannerRows(rows, context.mode);
}

function plannerStateForActivity(raw, mode) {
  const next = JSON.parse(JSON.stringify(raw || {}));
  next.profile ||= {};
  setActivityModeOnState(next, mode);

  // A currently worn item proves the active live loadout, not an empty saved
  // phase. When a target setup has no armor/equipment entered, remove only that
  // live-container fallback before deriving its stats. Tools and other snapshot
  // data remain available.
  const snapshot = JSON.parse(JSON.stringify(next.profile.normalizedSnapshot || {}));
  const setup = next.profile.setups?.list?.find(entry => entry?.id === next.profile.setups?.activeId) || null;
  const hasArmor = ['helmet', 'chestplate', 'leggings', 'boots'].some(slot => setup?.slots?.[slot]);
  const hasEquipment = ['equipment1', 'equipment2', 'equipment3', 'equipment4'].some(slot => setup?.slots?.[slot]);
  if (Array.isArray(snapshot.items) && (!hasArmor || !hasEquipment)) {
    snapshot.items = snapshot.items.filter(item => {
      const container = String(item?.container || '');
      if (!hasArmor && container === 'armor') return false;
      if (!hasEquipment && container === 'equipment') return false;
      return true;
    });
  }

  applySnapshotToProgress(next, snapshot);
  return next;
}

function allSetBenchmarkRows(raw) {
  const cropId = selectedCropId(raw);
  const rows = PLANNER_ACTIVITY_MODES.flatMap(mode => {
    const scoped = plannerStateForActivity(raw, mode);
    return benchmarkEvaluatedRows(scoped, { includeGoalFilters: true });
  });
  return rankEvaluatedUpgrades(aggregateUpgradeRows(rows, raw, cropId));
}

function selectedUpgradeFilter() {
  const stored = localStorage.getItem(UPGRADE_FILTER_KEY) || UPGRADE_FILTER.ALL;
  return UPGRADE_FILTERS.some(entry => entry.id === stored) ? stored : UPGRADE_FILTER.ALL;
}

function upgradeFilterMarkup(rows, activeFilter) {
  return `<div class="upgrade-filter-bar" role="group" aria-label="Recommended upgrade filter">
    ${UPGRADE_FILTERS.map(filter => {
      const count = rows.filter(row => matchesUpgradeFilter(row.item, filter.id)).length;
      return `<button type="button" class="upgrade-filter-chip ${filter.id === activeFilter ? 'active' : ''}" data-upgrade-filter="${esc(filter.id)}">${esc(filter.label)}<span>${count}</span></button>`;
    }).join('')}
  </div>`;
}

function compactCoins(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(Math.round(value));
}

function formatPayback(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 100) return `${hours.toFixed(1)} h`;
  return `${formatNumber(Math.round(hours))} h`;
}

function formatHours(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 10) return `${hours.toFixed(1)} h`;
  return `${formatNumber(Math.round(hours))} h`;
}

function openItem(itemId) {
  const raw = load();
  raw.drawer = itemId;
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

/**
 * The measurements for the selected crop and activity, as last left.
 *
 * Keyed by crop *and* activity for the same reason the baselines are: a Farm
 * measurement does not describe a Pest loadout, and inheriting one for the
 * other is the bug the activity-aware economics already fixed once.
 */
function measuredKey(raw) {
  return `${selectedCropId(raw)}:${activityModeForState(raw)}`;
}

function measured(raw) {
  raw.profile ||= {};
  raw.profile.plannerMeasured ||= {};
  raw.profile.plannerMeasured[measuredKey(raw)] ||= {};
  return raw.profile.plannerMeasured[measuredKey(raw)];
}

/**
 * The Fortune the app already computed, so the player does not retype it.
 *
 * Passed through as-is, absent included. The engine's job is to say "I need
 * your Farming Fortune"; substituting a zero here would have it answer with a
 * confident wrong number instead.
 */
function measuredStats(context) {
  return {
    farmingFortune: context?.stats?.globalFortune,
    cropFortune: context?.stats?.cropFortune,
    overbloom: context?.stats?.overbloom,
  };
}

/**
 * What is worth saying about the Fortune this measurement was multiplied by.
 *
 * A computed Fortune of zero is a real value, not an absent one -- a player who
 * has entered nothing has no *known* Fortune -- so the engine accepts it and
 * calls the measurement complete. The result is then arithmetically right and
 * practically misleading: it reads as a finished number while quietly assuming
 * no Fortune at all. Two separate things can be wrong, and they are reported
 * separately:
 *
 * - `unmodelled` are axes `computeStatTotals` could not work out, because a
 *   formula is not modeled or a setup value was unavailable. It already tracks
 *   these; they are not the same as an empty profile.
 * - `zeroFortune` is an empty profile. Farming skill alone reaches +240, so a
 *   real farm does not have none.
 */
function fortuneCaveats(context) {
  const stats = context?.stats || {};
  const incomplete = stats.incomplete && typeof stats.incomplete === 'object' ? stats.incomplete : {};
  const labels = {
    globalFortune: 'Farming Fortune',
    cropFortune: 'Crop Fortune',
    overbloom: 'Overbloom',
  };
  const unmodelled = Object.entries(labels)
    .filter(([axis]) => Array.isArray(incomplete[axis]) && incomplete[axis].length > 0)
    .map(([, label]) => label);
  const total = Number(stats.globalFortune || 0) + Number(stats.cropFortune || 0);
  return { unmodelled, zeroFortune: total <= 0 };
}

/** The Fortune the measurement is multiplied by, shown rather than implied. */
function fortuneUsedText(context) {
  const stats = context?.stats || {};
  const farming = Number(stats.globalFortune || 0);
  const crop = Number(stats.cropFortune || 0);
  if (farming + crop <= 0) return 'No Fortune is known yet, so this counts plain drops only.';
  return `Multiplied by the ${formatNumber((farming + crop))} Fortune your profile works out (${formatNumber(farming)} Farming + ${formatNumber(crop)} Crop).`;
}

/**
 * Add non-editable rolling market values to measured throughput.
 *
 * Legacy manual coin fields may still exist in stored backups. They are
 * intentionally deleted from the calculation copy before automatic prices are
 * injected, so old user-entered prices cannot override the 90-day model.
 */
function measuredWithMarketAverage(values, cropId) {
  const priced = { ...(values || {}) };
  delete priced.coinsPerUnit;
  delete priced.feastMaterialCoins;

  const normalPrice = averageCropUnitPrice(cropId);
  const feastPrice = averageHarvestFeastMaterialPrice(cropId);
  if (normalPrice.status === AVERAGE_CROP_PRICE_STATUS.AVERAGE) {
    priced.coinsPerUnit = normalPrice.coinsPerUnit;
  }
  if (priced[MEASURED_FEAST_KEY] && feastPrice.status === AVERAGE_CROP_PRICE_STATUS.AVERAGE) {
    priced.feastMaterialCoins = feastPrice.coinsPerUnit;
  }
  return { values: priced, normalPrice, feastPrice };
}

function measuredResultText(result) {
  if (result.normalCropCoinsPerHour == null) return '\u2014';
  const normal = `${compactCoins(result.normalCropCoinsPerHour)}/h`;
  return result.rareCropCoinsPerHour == null
    ? normal
    : `${normal} + ${compactCoins(result.rareCropCoinsPerHour)}/h Feast`;
}

/**
 * What the measurement still needs, in the player's own words.
 *
 * The engine reports paths like `normalDrops[normal].unitValueCoins`, which is
 * right for a diagnostic and wrong on screen. An unknown that names what is
 * missing is useful; a dash that says nothing is not.
 */
function measuredMissingText(result, caveats = { unmodelled: [], zeroFortune: false }) {
  // An unknown crop produces no missing entry at all, because the engine was
  // never given a drop model to find a gap in. A dash with no reason is worse
  // than any reason, so this case is named before the generic paths.
  if (!result.cropKnown) {
    return 'This crop has no verified drop model yet, so its Coins/h cannot be worked out here.';
  }
  if (result.normalCropCoinsPerHour != null) {
    const parts = [result.rareCropCoinsPerHour == null
      ? 'Normal crops only \u2014 Feast rare crops need the Feast switched on and a price'
      : 'Measured from your own farm, with the Harvest Feast model applied'];
    if (result.cropDataStatus !== 'VERIFIED') {
      parts.push(`this crop\u2019s drops per break are ${String(result.cropDataStatus).toLowerCase()}${result.cropDataReason ? ` (${result.cropDataReason})` : ''}`);
    }
    if (caveats.zeroFortune) {
      parts.push('Your profile works out no Fortune yet, so this is plain drops only \u2014 fill in your entries and measure again');
    }
    if (caveats.unmodelled.length) {
      parts.push(`${caveats.unmodelled.join(' and ')} could not be fully worked out, so this assumes what is known`);
    }
    return `${parts.join('. ')}.`;
  }
  const words = [...new Set(result.missing.map(describeMissing))];
  if (!words.length) return 'Enter your measurements';
  const shown = words.slice(0, 3).join(', ');
  return `Still needs ${shown}${words.length > 3 ? `, and ${words.length - 3} more` : ''}`;
}

/**
 * Measurements in, planner baseline out.
 *
 * `src/profit-engine.js` shipped complete, tested and imported by nothing,
 * because a full farm model needs constants the research marks unverified.
 * Section 9 of that audit says what to do instead -- "accept measured/manual
 * inputs and expose incompleteness rather than synthesize values" -- so this
 * asks for the four numbers a player can read off their own farm in ten
 * seconds, borrows the Fortune the app already computed, and either produces
 * Coins/h or names exactly what it is still missing.
 */
function measuredPanel(raw, context) {
  const values = measured(raw);
  const cropId = selectedCropId(raw);
  const priced = measuredWithMarketAverage(values, cropId);
  const result = measuredBaseline(priced.values, measuredStats(context), cropId);
  const caveats = fortuneCaveats(context);
  const priceText = price => price?.coinsPerUnit
    ? `${compactCoins(price.coinsPerUnit)} Coins`
    : '—';
  return `<details class="revenue-measured">
    <summary>
      <div class="revenue-measured-head">
        <strong>Don’t know your Coins/h? Measure throughput.</strong>
        <span>${esc(fortuneUsedText(context))}</span>
      </div>
    </summary>
    <div class="revenue-measured-grid">
      ${MEASURED_FIELDS.map(field => `<label>
        <span>${esc(field.label)}</span>
        <input data-measured="${esc(field.key)}" type="number" min="0" step="${field.step}"${field.max ? ` max="${field.max}"` : ''}
          value="${values[field.key] === undefined ? '' : esc(values[field.key])}">
        <small>${esc(field.hint)}</small>
      </label>`).join('')}
      <div class="revenue-measured-market">
        <span>Crop sell value</span>
        <strong>${esc(priceText(priced.normalPrice))}</strong>
        <small>${esc(averageCropPriceNote(priced.normalPrice))}</small>
      </div>
      <div class="revenue-measured-market revenue-measured-optional">
        <span>Feast crop value</span>
        <strong>${esc(priceText(priced.feastPrice))}</strong>
        <small>${esc(averageCropPriceNote(priced.feastPrice))}</small>
      </div>
      <label class="revenue-measured-optional revenue-measured-toggle">
        <span>Harvest Feast running</span>
        <input data-measured-feast type="checkbox"${values[MEASURED_FEAST_KEY] ? ' checked' : ''}>
        <small>The Feast rare-crop model comes from research; the coin value is the rolling 90-day Bazaar average.</small>
      </label>
    </div>
    <div class="revenue-measured-out">
      <div>
        <strong data-measured-out>${esc(measuredResultText(result))}</strong>
        <span data-measured-note>${esc(measuredMissingText(result, caveats))}</span>
      </div>
    </div>
    <p class="revenue-help">Market history: <a href="https://sky.coflnet.com/data" target="_blank" rel="noreferrer">SkyCofl</a>. Coin values are automatic and cannot be entered manually.</p>
  </details>`;
}
function economicsPanel(raw) {
  const crop = cropFor(raw);
  const cropId = selectedCropId(raw);
  const mode = activityModeForState(raw);
  const context = plannerActivityContext(raw, cropId);
  return `<details class="revenue-panel revenue-economics">
    <summary class="revenue-summary">
      <div class="revenue-panel-head">
        <div><div class="eyebrow">${esc(crop?.name || 'Crop')} · ${esc(activityLabel(mode))}</div><h2>Profit estimate</h2></div>
        <span class="revenue-note">Throughput measured by you · coin values from rolling 90-day market averages.</span>
      </div>
    </summary>
    <div class="revenue-inputs">
      <label><span>Computed Overbloom</span><input type="number" readonly value="${Number(context.currentOverbloom || 0)}"></label>
    </div>
    ${measuredPanel(raw, context)}
  </details>`;
}
function earnedAssumptionsPanel(raw) {
  const rows = earnedRouteRows(raw);
  if (!rows.length) return '';
  const timeValue = timeValueFor(raw);
  const mode = activityModeForState(raw);
  const sourceLabel = timeValue.source === 'automatic_90d_market_baseline' ? 'measured throughput + 90-day market average' : 'Internet fallback';
  return `<details class="revenue-panel revenue-economics earned-routes">
    <summary class="revenue-summary">
      <div class="revenue-panel-head">
        <div><div class="eyebrow">${esc(activityLabel(mode))} acquisition routes</div><h2>Earned upgrade time</h2></div>
        <span class="revenue-note">${compactCoins(timeValue.coinsPerHour)} Coins/h · ${esc(sourceLabel)}</span>
      </div>
    </summary>
    <div class="earned-route-list">
      ${rows.map(({ item, store }) => {
        const stored = store.grindHours?.[item.id];
        const value = stored === undefined || stored === '' ? '' : Math.max(0, Number(stored) || 0);
        return `<label class="earned-route-row">
          <span><strong>${esc(item.name)}</strong><small>${esc(item.category)} · active grind time</small></span>
          <input data-earned-hours="${esc(item.id)}" type="number" min="0" step="0.1" placeholder="hours" value="${value}">
        </label>`;
      }).join('')}
    </div>
    <p class="revenue-help">Only active grind time belongs here. Empty stays unknown. Farming420 converts entered time to opportunity cost and labels it EARNED — time converted to coins.</p>
  </details>`;
}

function rankingMarkup(rows, ready) {
  if (!rows.length) return '<div class="empty">No upgrades match the current activity objective.</div>';
  return rows.slice(0, 30).map((row, index) => {
    const costKnown = row.costKnown === true;
    const marginalKnown = Number.isFinite(row.marginalCoinsHour);
    const spawnPrimary = isSpawningPrimary(row);
    const valueLabel = plannerUpgradeValueText(row.item, row.gain);
    const equivalent = row.modeled === 'overbloom' && row.fortuneEquivalent > 0
      ? `≈ ${row.fortuneEquivalent.toFixed(2)} FF eq.`
      : row.modeled === 'fortune'
        ? `${row.fortuneEquivalent.toFixed(2)} FF eq.`
        : row.item.status === 'VERIFY' ? 'manual value required' : 'activity-specific stat';
    const costLabel = costKnown
      ? `${compactCoins(row.cost)} ${row.acquisitionMode === 'EARNED' ? 'Coins eq.' : 'Coins'}`
      : '—';
    const targetCost = targetUnitCost(row);
    const costNote = row.acquisitionMode === 'EARNED' && costKnown
      ? `EARNED — time converted to coins · ${formatHours(row.activeGrindHours)} @ ${compactCoins(row.timeValueCoinsPerHour)}/h${row.directCoinCost > 0 ? ` + ${compactCoins(row.directCoinCost)} direct` : ''}`
      : spawnPrimary && row.target === PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE && targetCost !== null
        ? `${compactCoins(targetCost)} / BPC · ${costOriginNote(row.costSource)}`
        : costKnown && row.coinsPerEffectiveFortune
          ? `${compactCoins(row.coinsPerEffectiveFortune)} / FF eq. · ${costOriginNote(row.costSource)}`
          : costOriginNote(row.costSource);
    const valueDisplay = spawnPrimary
      ? 'Primary'
      : marginalKnown ? `+${compactCoins(row.marginalCoinsHour)}/h` : '—';
    const valueNote = spawnPrimary
      ? 'spawning focus'
      : ready ? 'benchmark Coins/h' : 'value unavailable';
    const paybackDisplay = spawnPrimary
      ? '—'
      : costKnown && row.payback !== null ? formatPayback(row.payback) : '—';
    const paybackNote = spawnPrimary ? 'no FF conversion' : 'benchmark payback';
    const statusNote = row.item.status === 'VERIFY' ? ' · manual/verify' : '';
    const setupNote = row.setupLabel ? ` · ${row.setupLabel}` : '';

    return `<button class="planner-row revenue-row" data-revenue-open="${esc(row.item.id)}">
      <div class="rank">${index + 1}</div>
      <div class="planner-main"><strong>${esc(row.item.name)}</strong><span>${esc(row.item.category)} · ${esc(row.targetRole?.label || row.modeled || 'upgrade')}${esc(statusNote)}${esc(setupNote)}</span></div>
      <div class="planner-number"><strong>${esc(valueLabel)}</strong><span>${esc(equivalent)}</span></div>
      <div class="planner-number"><strong>${esc(valueDisplay)}</strong><span>${esc(valueNote)}</span></div>
      <div class="planner-number"><strong>${esc(costLabel)}</strong><span>${esc(costNote)}</span></div>
      <div class="planner-number"><strong>${esc(paybackDisplay)}</strong><span>${esc(paybackNote)}</span></div>
    </button>`;
  }).join('');
}

function benchmarkPanel(raw) {
  const context = plannerActivityContext(raw, selectedCropId(raw));

  if (context.mode === ACTIVITY_MODE.PEST_SPAWN) {
    return `<section class="revenue-panel revenue-benchmark">
      <div class="revenue-panel-head">
        <div><div class="eyebrow">${esc(activityLabel(context.mode))} objective model</div><h2>Spawning priorities</h2></div>
        <span class="revenue-note">Purpose-ranked</span>
      </div>
      <div class="benchmark-stat-grid">
        <div><span>Primary target</span><strong>Bonus Pest Chance</strong></div>
        <div><span>Primary target</span><strong>Pest cooldown ↓</strong></div>
        <div><span>Secondary Farming Fortune</span><strong>${formatNumber(Number(context.currentFortune || 0))}</strong></div>
      </div>
      <p class="revenue-help">The Spawning set is a short crop-breaking phase near the effective Pest cooldown. Bonus Pest Chance and cooldown reduction are primary; Farming Fortune only values crop output during those breaks. BPC and cooldown are not converted into FF-equivalent or benchmark Coins/h without a verified spawn-value formula.</p>
    </section>`;
  }

  return '';
}

function focusScope() {
  return localStorage.getItem(FOCUS_SCOPE_KEY) === 'crop' ? 'crop' : 'global';
}

function focusItemIsCropScoped(item) {
  return item?.section === 'crops'
    || item?.section === 'tools'
    || (item?.cropScope && item.cropScope !== 'Any');
}

function focusNextRows(raw, scope = focusScope()) {
  const mode = activityModeForState(raw);
  const cropScoped = scope === 'crop';
  const rows = benchmarkEvaluatedRows(raw)
    .filter(row => FOCUS_PROGRESSION_IDS.has(row.item?.id))
    .filter(row => focusItemIsCropScoped(row.item) === cropScoped);

  if (mode === ACTIVITY_MODE.PEST_SPAWN) return rows;

  return rows.sort((a, b) => {
    const aValue = Number.isFinite(a.marginalCoinsHour) ? a.marginalCoinsHour : -1;
    const bValue = Number.isFinite(b.marginalCoinsHour) ? b.marginalCoinsHour : -1;
    if (aValue !== bValue) return bValue - aValue;
    const aRank = Number.isFinite(Number(a.item.workbookRank)) ? Number(a.item.workbookRank) : Number.MAX_SAFE_INTEGER;
    const bRank = Number.isFinite(Number(b.item.workbookRank)) ? Number(b.item.workbookRank) : Number.MAX_SAFE_INTEGER;
    return aRank - bRank || String(a.item.name || '').localeCompare(String(b.item.name || ''));
  });
}

function focusScopePanel(raw, scope) {
  const cropId = selectedCropId(raw);
  const cropName = CROPS.find(entry => entry.id === cropId)?.name || 'Crop';
  const scopeHelp = scope === 'crop'
    ? `Shows progression that belongs to ${cropName}: crop milestones, the crop's physical tool and other crop-bound goals.`
    : 'Shows account-wide progression such as Farming Skill, Garden progression and other goals that are not tied to one crop.';

  return `<section class="revenue-panel focus-next-scope">
    <div>
      <div class="eyebrow">Focus scope</div>
      <h2>${scope === 'crop' ? cropName : 'Global'}</h2>
      <p class="revenue-help">${esc(scopeHelp)}</p>
    </div>
    <div class="focus-next-scope-controls">
      <label>
        <span>Scope</span>
        <select data-focus-scope aria-label="Focus scope">
          <option value="global" ${scope === 'global' ? 'selected' : ''}>Global</option>
          <option value="crop" ${scope === 'crop' ? 'selected' : ''}>Crop</option>
        </select>
      </label>
      ${scope === 'crop' ? `<label>
        <span>Crop</span>
        <select data-focus-crop aria-label="Focus crop">
          ${CROPS.map(entry => `<option value="${esc(entry.id)}" ${entry.id === cropId ? 'selected' : ''}>${esc(entry.name)}</option>`).join('')}
        </select>
      </label>` : ''}
    </div>
  </section>`;
}

function focusNextMarkup(raw, rows, scope = focusScope()) {
  if (!rows.length) {
    const empty = scope === 'crop'
      ? 'No tracked crop-specific progression goals remain for the selected crop.'
      : 'No tracked global progression goals remain.';
    return `<div class="empty">${esc(empty)}</div>`;
  }
  return rows.slice(0, 30).map((row, index) => {
    const max = Math.max(1, Number(row.item.max || 1));
    const current = level(raw, row.item);
    const target = Math.min(max, current + 1);
    const focusName = row.item.id === 'account-skill-farming-skill-level'
      ? `Farming Level ${target}`
      : row.item.id === 'tool-tool-base-counter-fortune'
        ? `Tool Level ${target}`
        : row.item.name;
    const remaining = Math.max(1, max - current);
    const remainingHours = remaining * FOCUS_AVERAGE_STEP_HOURS;
    const spawnPrimary = isSpawningPrimary(row);
    const valueLabel = plannerUpgradeValueText(row.item, row.gain);
    const marginal = spawnPrimary
      ? 'Primary'
      : Number.isFinite(row.marginalCoinsHour)
        ? `+${compactCoins(row.marginalCoinsHour)}/h`
        : '—';
    const marginalNote = spawnPrimary ? 'spawning focus' : 'benchmark value';
    const statusNote = row.item.status === 'VERIFY' ? ' · manual/verify' : '';

    return `<button class="planner-row focus-next-row" data-focus-open="${esc(row.item.id)}">
      <div class="rank">${index + 1}</div>
      <div class="planner-main"><strong>${esc(focusName)}</strong><span>${esc(row.item.category)} · progression goal${esc(statusNote)}</span></div>
      <div class="planner-number"><strong>${esc(valueLabel)}</strong><span>next step</span></div>
      <div class="planner-number"><strong>${esc(marginal)}</strong><span>${esc(marginalNote)}</span></div>
      <div class="planner-number"><strong>~${FOCUS_AVERAGE_STEP_HOURS.toFixed(1)} h</strong><span>next step · ~${remainingHours.toFixed(1)} h remaining</span></div>
      <div class="planner-number"><strong>${current}/${max}</strong><span>current progress</span></div>
    </button>`;
  }).join('');
}

function renderFocusNext(host, raw) {
  const mode = activityModeForState(raw);
  const scope = focusScope();
  const rows = focusNextRows(raw, scope);
  const objectiveHelp = mode === ACTIVITY_MODE.PEST_SPAWN
    ? '<p>Spawning is purpose-ranked: Bonus Pest Chance and Pest cooldown reduction are primary. Farming Fortune is secondary because it only affects crop output during the short spawning window.</p>'
    : `<p>Value is calculated from the active Fortune/Overbloom against the same ${compactCoins(PLANNER_BENCHMARK_COINS_PER_HOUR)}/h standard stream used by Upgrade Planner.</p>`;

  host.innerHTML = `
    ${focusScopePanel(raw, scope)}
    <section class="focus-next-assumption">
      <div><div class="eyebrow">${esc(activityLabel(mode))} earned progression</div><h2>Next things worth focusing on</h2></div>
      <p>Focus on next only tracks progression goals. Pets, gear, reforges and other purchase/equipment choices stay in Upgrade Planner, even when their price is currently unknown.</p>
      <p>Time is separate from upgrades: every tracked progression step uses a fixed ~${FOCUS_AVERAGE_STEP_HOURS.toFixed(1)} h planning average. It is a scheduling assumption, not an asserted in-game completion time.</p>
      ${objectiveHelp}
    </section>
    <div class="focus-next-results">${focusNextMarkup(raw, rows, scope)}</div>`;

  host.querySelector('[data-focus-scope]')?.addEventListener('change', event => {
    localStorage.setItem(FOCUS_SCOPE_KEY, event.target.value === 'crop' ? 'crop' : 'global');
    renderFocusNext(host, load());
  });

  host.querySelector('[data-focus-crop]')?.addEventListener('change', event => {
    const cropSelect = document.querySelector('#cropSelect');
    if (!cropSelect || cropSelect.value === event.target.value) return;
    cropSelect.value = event.target.value;
    cropSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });

  host.querySelectorAll('[data-focus-open]').forEach(button => button.addEventListener('click', () => openItem(button.dataset.focusOpen)));
}

function enhanceFocusNext() {
  const host = document.querySelector('.focus-next-list');
  if (!host || host.dataset.focusNextReady === '1') return;
  host.dataset.focusNextReady = '1';
  renderFocusNext(host, load());
}

function enhanceQol() {
  const host = document.querySelector('.qol-list');
  if (!host || host.dataset.qolReady === '1') return;
  host.dataset.qolReady = '1';

  const raw = load();
  host.innerHTML = usefulItemsPanel(raw);
  bindUsefulItemToggles(host);
}

function enhancePlanner() {
  const content = document.querySelector('.content');
  const original = content?.querySelector('.planner-list');
  if (!content || !original || content.dataset.revenuePlannerReady === '1') return;
  content.dataset.revenuePlannerReady = '1';

  const raw = load();
  const ready = true;
  const allRows = allSetBenchmarkRows(raw).filter(row => row.acquisitionMode !== 'EARNED');
  const activeFilter = selectedUpgradeFilter();
  const rows = allRows.filter(row => matchesUpgradeFilter(row.item, activeFilter));
  const rankingTitle = 'Recommended upgrades · all sets';
  const rankingHelp = `Farming, Pest Spawning and Pest Killing are evaluated together. Global upgrades appear once. Crop-tool upgrades are shared between Farming and Spawning. Gear is merged only when the setup slots reference the same physical items; separate physical sets stay separate. Marginal value and payback use the common ${compactCoins(PLANNER_BENCHMARK_COINS_PER_HOUR)}/h affected-income benchmark.`;

  original.classList.add('planner-v1-source');
  const panel = document.createElement('div');
  panel.className = 'revenue-planner-v2';
  panel.innerHTML = `${benchmarkPanel(raw)}
    <div class="section-row revenue-ranking-head"><div><h2>${esc(rankingTitle)}</h2><p>${esc(rankingHelp)}</p></div><span class="revenue-note">${rows.length}/${allRows.length} shown</span></div>
    ${upgradeFilterMarkup(allRows, activeFilter)}
    <div class="planner-list revenue-list">${rankingMarkup(rows, ready)}</div>`;
  original.before(panel);

  panel.querySelectorAll('[data-upgrade-filter]').forEach(button => button.addEventListener('click', () => {
    localStorage.setItem(UPGRADE_FILTER_KEY, button.dataset.upgradeFilter || UPGRADE_FILTER.ALL);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));

  panel.querySelectorAll('[data-earned-hours]').forEach(input => input.addEventListener('change', event => {
    const next = load();
    const item = UPGRADES.find(entry => entry.id === event.target.dataset.earnedHours);
    if (!item) return;
    const store = plannerProgressBucket(next, item, selectedCropId(next));
    const rawValue = String(event.target.value || '').trim();
    if (!rawValue) delete store.grindHours[item.id];
    else store.grindHours[item.id] = Math.max(0, Number(rawValue) || 0);
    save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));

  // Typing recomputes in place and writes nothing but the stored measurement.
  // Dispatching a render on every keystroke would rebuild the panel under the
  // cursor, which is both a lost caret and the loop shape
  // docs/RENDER_FREEZE_SAFETY.md rule 5 exists to prevent.
  const measuredInputs = [...panel.querySelectorAll('[data-measured]')];
  const feastToggle = panel.querySelector('[data-measured-feast]');
  const refreshMeasured = () => {
    const next = load();
    const values = measured(next);
    for (const input of measuredInputs) {
      const raw = String(input.value || '').trim();
      if (raw === '') delete values[input.dataset.measured];
      else values[input.dataset.measured] = Number(raw);
    }
    if (feastToggle?.checked) values[MEASURED_FEAST_KEY] = true;
    else delete values[MEASURED_FEAST_KEY];
    save(next);

    const liveContext = plannerActivityContext(next, selectedCropId(next));
    const priced = measuredWithMarketAverage(values, selectedCropId(next));
    const result = measuredBaseline(
      priced.values,
      measuredStats(liveContext),
      selectedCropId(next),
    );
    setTextIfChanged(panel.querySelector('[data-measured-out]'), measuredResultText(result));
    setTextIfChanged(
      panel.querySelector('[data-measured-note]'),
      measuredMissingText(result, fortuneCaveats(liveContext)),
    );
    return result;
  };
  measuredInputs.forEach(input => input.addEventListener('input', refreshMeasured));
  feastToggle?.addEventListener('change', refreshMeasured);

  panel.querySelectorAll('[data-revenue-open]').forEach(button => button.addEventListener('click', () => openItem(button.dataset.revenueOpen)));
}

function apply() {
  enhancePlanner();
  enhanceFocusNext();
  enhanceQol();
}

function boot() {
  apply();
  const root = document.querySelector('#app');
  if (!root) return;
  new MutationObserver(() => queueMicrotask(apply)).observe(root, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
