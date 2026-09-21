import { CROPS, UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { ACTIVITY_MODE, activityLabel, activityModeForState } from './activity-mode.js';
import { evaluateUpgrade, rankEvaluatedUpgrades, statDeltas } from './revenue-ranking.js';
import { CROP_PRICE_STATUS, liveCropPriceNote, liveCropUnitPrice } from './live-crop-price.js';
import { MEASURED_FEAST_KEY, MEASURED_FIELDS, describeMissing, measuredBaseline } from './measured-baseline.js';
import { setTextIfChanged } from './set-text.js';
import { costOriginNote, resolveUpgradeCost } from './upgrade-cost-resolution.js';
import { INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR } from './upgrade-economics.js';
import {
  plannerActivityContext,
  plannerEconomicsBucket,
  plannerItemApplies,
  plannerProgressBucket,
  setPlannerEconomicsValue,
} from './planner-activity-context.js';

const PLANNER_BENCHMARK_COINS_PER_HOUR = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR;
const FOCUS_AVERAGE_STEP_HOURS = 1;

const USEFUL_ITEMS = Object.freeze([
  {
    id: 'squeaky-mousemat',
    name: 'Squeaky Mousemat',
    group: 'Farming QoL',
    purpose: 'Save and snap exact yaw/pitch so a farm stays aligned without manual camera correction.',
  },
  {
    id: 'sundial',
    name: 'Sundial',
    group: 'Farming QoL',
    purpose: 'Unlock per-crop Speed settings at the Garden Desk so speed control is no longer tied to Rancher\'s Boots.',
  },
  {
    id: 'builders-wand',
    name: "Builder's Wand",
    group: 'Farm building',
    purpose: 'Place large connected surfaces faster when building or rebuilding custom farms.',
  },
  {
    id: 'builders-ruler',
    name: "Builder's Ruler",
    group: 'Farm building',
    purpose: 'Place or remove long lines of blocks for fast lanes, borders and farm structure work.',
  },
  {
    id: 'infinidirt-wand',
    name: 'InfiniDirt™ Wand',
    group: 'Farm building',
    purpose: 'Supply dirt on demand and feed building tools without repeatedly restocking blocks.',
  },
  {
    id: 'basket-of-seeds',
    name: 'Basket of Seeds',
    group: 'Farm building',
    purpose: 'Plant long crop rows quickly after the farm structure is finished.',
  },
  {
    id: 'block-zapper',
    name: 'Block Zapper',
    group: 'Farm building',
    purpose: 'Remove connected player-placed blocks quickly when correcting or redesigning a farm.',
  },
  {
    id: 'prismapump',
    name: 'Prismapump',
    group: 'Farm building',
    purpose: 'Lay out water channels faster for crop farms that need irrigation.',
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

  return `<section class="revenue-panel useful-items-panel">
    <div class="revenue-panel-head">
      <div><div class="eyebrow">Quality of life</div><h2>Useful items</h2></div>
      <span class="revenue-note">${ownedCount}/${USEFUL_ITEMS.length} marked owned</span>
    </div>
    <p class="revenue-help useful-items-help">These are convenience and farm-building upgrades. They stay outside the Farming Fortune / profit ranking because their value is time saved and easier farm operation rather than a clean FF number.</p>
    <div class="useful-item-groups">
      ${groups.map(group => `<section class="useful-item-group">
        <h3>${esc(group)}</h3>
        <div class="useful-item-list">
          ${USEFUL_ITEMS.filter(item => item.group === group).map(item => {
            const checked = owned[item.id] === true;
            return `<label class="useful-item-row ${checked ? 'owned' : ''}">
              <input type="checkbox" data-useful-item="${esc(item.id)}" ${checked ? 'checked' : ''}>
              <span><strong>${esc(item.name)}</strong><small>${esc(item.purpose)}</small></span>
            </label>`;
          }).join('')}
        </div>
      </section>`).join('')}
    </div>
  </section>`;
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

function economics(raw) {
  const cropId = selectedCropId(raw);
  return plannerEconomicsBucket(raw, cropId, activityModeForState(raw));
}

function timeValueFor(raw) {
  const econ = economics(raw);
  const measured = Math.max(0, Number(econ.normalCropCoinsPerHour || 0))
    + Math.max(0, Number(econ.rareCropCoinsPerHour || 0));
  if (measured > 0) return { coinsPerHour: measured, source: 'player_baseline' };
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
  const econ = economics(raw);
  const timeValue = timeValueFor(raw);
  const context = plannerActivityContext(raw, cropId);

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
          normalCropCoinsPerHour: Number(econ.normalCropCoinsPerHour || 0),
          rareCropCoinsPerHour: Number(econ.rareCropCoinsPerHour || 0),
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

function benchmarkEvaluatedRows(raw) {
  const cropId = selectedCropId(raw);
  const context = plannerActivityContext(raw, cropId);

  return rankEvaluatedUpgrades(UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => plannerItemApplies(raw, item, cropId))
    .filter(item => !maxed(raw, item))
    .map(item => {
      const itemGain = gain(raw, item);
      const store = progressBucket(raw, item);
      const costSource = resolveUpgradeCost(store, item.id);
      const benchmark = benchmarkStreams(item, itemGain);
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
        costSource,
      };
    })
    .filter(row => row.modeled && row.gain > 0));
}

function compactCoins(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toLocaleString('en-US');
}

function formatPayback(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 100) return `${hours.toFixed(1)} h`;
  return `${Math.round(hours).toLocaleString('en-US')} h`;
}

function formatHours(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 10) return `${hours.toFixed(1)} h`;
  return `${Math.round(hours).toLocaleString('en-US')} h`;
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
  return `Multiplied by the ${(farming + crop).toLocaleString('en-US')} Fortune your profile works out (${farming.toLocaleString('en-US')} Farming + ${crop.toLocaleString('en-US')} Crop).`;
}

/**
 * The crop price the player does not have to look up.
 *
 * The research's own runtime rule is that fresh Bazaar data overrides a
 * snapshot wherever a Bazaar product exists, and `live-prices.js` could do that
 * all along with nothing calling it. A live quote fills the field's placeholder
 * and is used when the player has typed nothing; anything they type wins,
 * because they may be selling somewhere else or at a different order depth.
 */
function livePriceFor(raw) {
  return liveCropUnitPrice(selectedCropId(raw));
}

/** The measurements, with a live crop price standing in for an empty field. */
function measuredWithLivePrice(values, live) {
  if (values.coinsPerUnit !== undefined && values.coinsPerUnit !== '') return values;
  if (live?.status !== CROP_PRICE_STATUS.LIVE) return values;
  return { ...values, coinsPerUnit: live.coinsPerUnit };
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
  const live = livePriceFor(raw);
  const result = measuredBaseline(measuredWithLivePrice(values, live), measuredStats(context), selectedCropId(raw));
  const caveats = fortuneCaveats(context);
  return `<details class="revenue-measured">
    <summary>
      <div class="revenue-measured-head">
        <strong>Don\u2019t know your Coins/h? Measure it.</strong>
        <span>${esc(fortuneUsedText(context))}</span>
      </div>
    </summary>
    <div class="revenue-measured-grid">
      ${MEASURED_FIELDS.map(field => {
        const isPrice = field.key === 'coinsPerUnit';
        const priced = isPrice && live.status === CROP_PRICE_STATUS.LIVE;
        return `<label class="${field.optional ? 'revenue-measured-optional' : ''}">
        <span>${esc(field.label)}</span>
        <input data-measured="${esc(field.key)}" type="number" min="0" step="${field.step}"${field.max ? ` max="${field.max}"` : ''}
          value="${values[field.key] === undefined ? '' : esc(values[field.key])}"${priced ? ` placeholder="${esc(live.coinsPerUnit)}"` : ''}>
        <small>${isPrice ? esc(liveCropPriceNote(live)) : esc(field.hint)}</small>
      </label>`;
      }).join('')}
      <label class="revenue-measured-optional revenue-measured-toggle">
        <span>Harvest Feast running</span>
        <input data-measured-feast type="checkbox"${values[MEASURED_FEAST_KEY] ? ' checked' : ''}>
        <small>The Feast rare-crop model comes from the research, not from you.</small>
      </label>
    </div>
    <div class="revenue-measured-out">
      <div>
        <strong data-measured-out>${esc(measuredResultText(result))}</strong>
        <span data-measured-note>${esc(measuredMissingText(result, caveats))}</span>
      </div>
      <button class="ghost small" data-measured-apply${result.normalCropCoinsPerHour == null ? ' disabled' : ''}>Use as baseline</button>
    </div>
  </details>`;
}

function economicsPanel(raw) {
  const crop = cropFor(raw);
  const cropId = selectedCropId(raw);
  const mode = activityModeForState(raw);
  const context = plannerActivityContext(raw, cropId);
  const econ = economics(raw);
  const fortuneStreamLabel = mode === ACTIVITY_MODE.PEST_KILL ? 'Pest/Vacuum Coins/h' : 'Crop-farming Coins/h';
  return `<details class="revenue-panel revenue-economics">
    <summary class="revenue-summary">
      <div class="revenue-panel-head">
        <div><div class="eyebrow">${esc(crop?.name || 'Crop')} · ${esc(activityLabel(mode))}</div><h2>Profit baseline</h2></div>
        <span class="revenue-note">Optional. Sharpens profit, payback and earned-time value.</span>
      </div>
    </summary>
    <div class="revenue-inputs">
      <label><span>${fortuneStreamLabel}</span><input data-revenue-input="normalCropCoinsPerHour" type="number" min="0" step="1000" value="${Number(econ.normalCropCoinsPerHour || 0)}"></label>
      <label><span>RARE CROP Coins/h</span><input data-revenue-input="rareCropCoinsPerHour" type="number" min="0" step="1000" value="${Number(econ.rareCropCoinsPerHour || 0)}"></label>
      <label><span>Computed Overbloom</span><input type="number" readonly value="${Number(context.currentOverbloom || 0)}"></label>
    </div>
    <p class="revenue-help">Farming, Spawning and Killing keep separate Coins/h baselines. Fortune and Overbloom are read from the active ${esc(activityLabel(mode))}; switching sets no longer reuses the other set's economics.</p>
    ${measuredPanel(raw, context)}
  </details>`;
}

function earnedAssumptionsPanel(raw) {
  const rows = earnedRouteRows(raw);
  if (!rows.length) return '';
  const timeValue = timeValueFor(raw);
  const mode = activityModeForState(raw);
  const sourceLabel = timeValue.source === 'player_baseline' ? 'your measured activity baseline' : 'Internet fallback';
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
  if (!rows.length) return '<div class="empty">No modeled Fortune/Overbloom upgrades for the current set.</div>';
  return rows.slice(0, 30).map((row, index) => {
    const costKnown = row.costKnown === true;
    const marginalKnown = Number.isFinite(row.marginalCoinsHour);
    const valueLabel = row.modeled === 'overbloom'
      ? `+${row.gain.toLocaleString('en-US')} Overbloom`
      : `+${row.gain.toLocaleString('en-US')} FF`;
    const equivalent = row.modeled === 'overbloom' && row.fortuneEquivalent > 0
      ? `≈ ${row.fortuneEquivalent.toFixed(2)} FF eq.`
      : row.modeled === 'fortune' ? `${row.fortuneEquivalent.toFixed(2)} FF eq.` : '—';
    const costLabel = costKnown
      ? `${compactCoins(row.cost)} ${row.acquisitionMode === 'EARNED' ? 'Coins eq.' : 'Coins'}`
      : '—';
    const costNote = row.acquisitionMode === 'EARNED' && costKnown
      ? `EARNED — time converted to coins · ${formatHours(row.activeGrindHours)} @ ${compactCoins(row.timeValueCoinsPerHour)}/h${row.directCoinCost > 0 ? ` + ${compactCoins(row.directCoinCost)} direct` : ''}`
      : costKnown && row.coinsPerEffectiveFortune
        ? `${compactCoins(row.coinsPerEffectiveFortune)} / FF eq. · ${costOriginNote(row.costSource)}`
        : costOriginNote(row.costSource);
    return `<button class="planner-row revenue-row" data-revenue-open="${esc(row.item.id)}">
      <div class="rank">${index + 1}</div>
      <div class="planner-main"><strong>${esc(row.item.name)}</strong><span>${esc(row.item.category)} · ${esc(row.modeled === 'overbloom' ? 'Overbloom' : 'Farming Fortune')}</span></div>
      <div class="planner-number"><strong>${valueLabel}</strong><span>${equivalent}</span></div>
      <div class="planner-number"><strong>${marginalKnown ? `+${compactCoins(row.marginalCoinsHour)}/h` : '—'}</strong><span>${ready ? 'benchmark Coins/h' : 'value unavailable'}</span></div>
      <div class="planner-number"><strong>${costLabel}</strong><span>${esc(costNote)}</span></div>
      <div class="planner-number"><strong>${costKnown && row.payback !== null ? formatPayback(row.payback) : '—'}</strong><span>benchmark payback</span></div>
    </button>`;
  }).join('');
}

function benchmarkPanel(raw) {
  const context = plannerActivityContext(raw, selectedCropId(raw));
  return `<section class="revenue-panel revenue-benchmark">
    <div class="revenue-panel-head">
      <div><div class="eyebrow">${esc(activityLabel(context.mode))} calculated value</div><h2>Fortune → Coins</h2></div>
      <span class="revenue-note">${compactCoins(PLANNER_BENCHMARK_COINS_PER_HOUR)} Coins/h standard stream</span>
    </div>
    <div class="benchmark-stat-grid">
      <div><span>Effective Fortune</span><strong>${Number(context.currentFortune || 0).toLocaleString('en-US')}</strong></div>
      <div><span>Overbloom</span><strong>${Number(context.currentOverbloom || 0).toLocaleString('en-US')}</strong></div>
      <div><span>Fortune base</span><strong>${Number(context.fortuneBase || 100).toLocaleString('en-US')}</strong></div>
    </div>
    <p class="revenue-help">Marginal Coins/h is calculated from the active set's Fortune or Overbloom against the same ${compactCoins(PLANNER_BENCHMARK_COINS_PER_HOUR)}/h affected-income benchmark. No manual Coins/h baseline is required. This is a comparison value, not a claim about your farm's actual profit.</p>
  </section>`;
}

function focusNextRows(raw) {
  return benchmarkEvaluatedRows(raw)
    .filter(row => row.acquisitionMode === 'EARNED')
    .sort((a, b) => {
      const aValue = Number.isFinite(a.marginalCoinsHour) ? a.marginalCoinsHour : -1;
      const bValue = Number.isFinite(b.marginalCoinsHour) ? b.marginalCoinsHour : -1;
      if (aValue !== bValue) return bValue - aValue;
      const aRank = Number.isFinite(Number(a.item.workbookRank)) ? Number(a.item.workbookRank) : Number.MAX_SAFE_INTEGER;
      const bRank = Number.isFinite(Number(b.item.workbookRank)) ? Number(b.item.workbookRank) : Number.MAX_SAFE_INTEGER;
      return aRank - bRank || String(a.item.name || '').localeCompare(String(b.item.name || ''));
    });
}

function focusNextMarkup(raw, rows) {
  if (!rows.length) return '<div class="empty">No modeled earned next steps for the current crop and set.</div>';
  return rows.slice(0, 30).map((row, index) => {
    const max = Math.max(1, Number(row.item.max || 1));
    const current = level(raw, row.item);
    const remaining = Math.max(1, max - current);
    const remainingHours = remaining * FOCUS_AVERAGE_STEP_HOURS;
    const valueLabel = row.modeled === 'overbloom'
      ? `+${row.gain.toLocaleString('en-US')} Overbloom`
      : `+${row.gain.toLocaleString('en-US')} FF`;
    const marginal = Number.isFinite(row.marginalCoinsHour)
      ? `+${compactCoins(row.marginalCoinsHour)}/h`
      : '—';
    return `<button class="planner-row focus-next-row" data-focus-open="${esc(row.item.id)}">
      <div class="rank">${index + 1}</div>
      <div class="planner-main"><strong>${esc(row.item.name)}</strong><span>${esc(row.item.category)} · earned progression</span></div>
      <div class="planner-number"><strong>${valueLabel}</strong><span>next step</span></div>
      <div class="planner-number"><strong>${marginal}</strong><span>benchmark value</span></div>
      <div class="planner-number"><strong>~${FOCUS_AVERAGE_STEP_HOURS.toFixed(1)} h</strong><span>next step · ~${remainingHours.toFixed(1)} h remaining</span></div>
      <div class="planner-number"><strong>${current}/${max}</strong><span>current progress</span></div>
    </button>`;
  }).join('');
}

function enhanceFocusNext() {
  const host = document.querySelector('.focus-next-list');
  if (!host || host.dataset.focusNextReady === '1') return;
  host.dataset.focusNextReady = '1';

  const raw = load();
  const mode = activityModeForState(raw);
  const rows = focusNextRows(raw);
  host.innerHTML = `
    <section class="focus-next-assumption">
      <div><div class="eyebrow">${esc(activityLabel(mode))} earned progression</div><h2>Next things worth focusing on</h2></div>
      <p>Time is separate from upgrades: every next earned step uses a fixed ~${FOCUS_AVERAGE_STEP_HOURS.toFixed(1)} h planning average. It is a scheduling assumption, not an asserted in-game completion time.</p>
      <p>Value is calculated from the active Fortune/Overbloom against the same ${compactCoins(PLANNER_BENCHMARK_COINS_PER_HOUR)}/h standard stream used by Upgrade Planner.</p>
    </section>
    <div class="focus-next-results">${focusNextMarkup(raw, rows)}</div>`;

  host.querySelectorAll('[data-focus-open]').forEach(button => button.addEventListener('click', () => openItem(button.dataset.focusOpen)));
}

function enhancePlanner() {
  const content = document.querySelector('.content');
  const original = content?.querySelector('.planner-list');
  if (!content || !original || content.dataset.revenuePlannerReady === '1') return;
  content.dataset.revenuePlannerReady = '1';

  const raw = load();
  const mode = activityModeForState(raw);
  const ready = true;
  const rows = benchmarkEvaluatedRows(raw).filter(row => row.acquisitionMode !== 'EARNED');

  original.classList.add('planner-v1-source');
  const panel = document.createElement('div');
  panel.className = 'revenue-planner-v2';
  panel.innerHTML = `${benchmarkPanel(raw)}
    ${usefulItemsPanel(raw)}
    <div class="section-row revenue-ranking-head"><div><h2>Best upgrade value · ${esc(activityLabel(mode))}</h2><p>Coin-cost and unpriced upgrades stay here. Earned progression is excluded and appears under Focus on next. Marginal value and payback use the common ${compactCoins(PLANNER_BENCHMARK_COINS_PER_HOUR)}/h affected-income benchmark.</p></div></div>
    <div class="planner-list revenue-list">${rankingMarkup(rows, ready)}</div>`;
  original.before(panel);

  panel.querySelectorAll('[data-revenue-input]').forEach(input => input.addEventListener('change', event => {
    const next = load();
    const cropId = selectedCropId(next);
    const nextMode = activityModeForState(next);
    setPlannerEconomicsValue(next, cropId, nextMode, event.target.dataset.revenueInput, event.target.value);
    save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));

  panel.querySelectorAll('[data-useful-item]').forEach(input => input.addEventListener('change', event => {
    const next = load();
    const usefulItems = usefulItemState(next);
    usefulItems[event.target.dataset.usefulItem] = event.target.checked;
    save(next);
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
    const result = measuredBaseline(
      measuredWithLivePrice(values, livePriceFor(next)),
      measuredStats(liveContext),
      selectedCropId(next),
    );
    setTextIfChanged(panel.querySelector('[data-measured-out]'), measuredResultText(result));
    setTextIfChanged(
      panel.querySelector('[data-measured-note]'),
      measuredMissingText(result, fortuneCaveats(liveContext)),
    );
    const apply = panel.querySelector('[data-measured-apply]');
    if (apply) apply.disabled = result.normalCropCoinsPerHour == null;
    return result;
  };
  measuredInputs.forEach(input => input.addEventListener('input', refreshMeasured));
  feastToggle?.addEventListener('change', refreshMeasured);

  // Applying is the user action, so this is where storage and a render belong.
  // A rare-crop stream that was never measured leaves that baseline alone
  // rather than overwriting it with a zero.
  panel.querySelector('[data-measured-apply]')?.addEventListener('click', () => {
    // The same `refreshMeasured` the panel displays, so a live-filled price is
    // applied exactly as it was shown rather than recomputed differently here.
    const result = refreshMeasured();
    if (result.normalCropCoinsPerHour == null) return;
    const next = load();
    const cropId = selectedCropId(next);
    const nextMode = activityModeForState(next);
    // Rounded: coins are whole, and a float artifact like 3060000.0000000005
    // would be stored and then shown back in the baseline input.
    setPlannerEconomicsValue(next, cropId, nextMode, 'normalCropCoinsPerHour', Math.round(result.normalCropCoinsPerHour));
    if (result.rareCropCoinsPerHour != null) {
      setPlannerEconomicsValue(next, cropId, nextMode, 'rareCropCoinsPerHour', Math.round(result.rareCropCoinsPerHour));
    }
    save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  });

  panel.querySelectorAll('[data-revenue-open]').forEach(button => button.addEventListener('click', () => openItem(button.dataset.revenueOpen)));
}

function apply() {
  enhancePlanner();
  enhanceFocusNext();
}

function boot() {
  apply();
  const root = document.querySelector('#app');
  if (!root) return;
  new MutationObserver(() => queueMicrotask(apply)).observe(root, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
