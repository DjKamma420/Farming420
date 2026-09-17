export const GREENHOUSE_MODEL_VERSION = 1;

export const GREENHOUSE_SOURCES = Object.freeze({
  release: 'https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/',
  august20: 'https://hypixel.net/threads/august-20-skyblock-patch-notes.6141710/',
  planned0271: 'https://hypixel.net/threads/hypixel-skyblock-0-27-1-chocolate-factory-improvements-qol-changes-and-more.6147732/',
});

export const GREENHOUSE_UNLOCK_GARDEN_LEVEL = 7;
export const GREENHOUSE_GRID_SIDE = 10;
export const GREENHOUSE_GRID_PLOTS = GREENHOUSE_GRID_SIDE * GREENHOUSE_GRID_SIDE;
export const GREENHOUSE_BASE_CROP_DECAY_HOURS = 72;

function row(name, multiplier, kind) {
  return Object.freeze({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    kind,
    lootMultiplier: multiplier,
    status: 'ACTIVE',
    effectiveSince: '2026-08-20',
    source: GREENHOUSE_SOURCES.august20,
  });
}

/**
 * Current live Greenhouse loot multipliers from the August 20, 2026 balance
 * patch. These are balance coefficients only; they are NOT sufficient to infer
 * a plant's base harvest amount, growth duration, water requirement, mutation
 * spread chance, or minigame outcome.
 */
export const GREENHOUSE_LIVE_LOOT_MULTIPLIERS = Object.freeze([
  row('Wheat', 0.18, 'base-crop'),
  row('Carrot', 0.125, 'base-crop'),
  row('Potato', 0.125, 'base-crop'),
  row('Cocoa Beans', 0.15, 'base-crop'),
  row('Melon', 0.2, 'base-crop'),
  row('Pumpkin', 0.2, 'base-crop'),
  row('Sugar Cane', 0.17, 'base-crop'),
  row('Cactus', 0.22, 'base-crop'),
  row('Nether Wart', 0.09, 'base-crop'),
  row('Mushroom', 0.08, 'base-crop'),
  row('Sunflower', 0.29, 'base-crop'),
  row('Moonflower', 0.29, 'base-crop'),
  row('Wild Rose', 0.25, 'base-crop'),
  row('Dustgrain', 0.25, 'mutation'),
  row('Scourroot', 0.17, 'mutation'),
  row('Gloomgourd', 0.2, 'mutation'),
  row('Shadevine', 0.26, 'mutation'),
  row('Choconut', 0.25, 'mutation'),
  row('Veilshroom', 0.15, 'mutation'),
  row('Ashwreath', 0.15, 'mutation'),
  row('Witherbloom', 0.23, 'mutation'),
  row('Lonelily', 1.75, 'mutation'),
  row('Coalroot', 1.7, 'mutation'),
  row('Chocoberry', 2.2, 'mutation'),
  row('Creambloom', 2.8, 'mutation'),
  row('Duskbloom', 2.7, 'mutation'),
  row('Thornshade', 2, 'mutation'),
  row('Cindershade', 1.7, 'mutation'),
  row('Chloronite', 2.7, 'mutation'),
  row('Cheesebite', 4, 'mutation'),
  row('Soggybud', 1.2, 'mutation'),
  row('Blastberry', 2, 'mutation'),
  row('Magic Jellybean', 3, 'mutation'),
  row('Noctilume', 5.3, 'mutation'),
  row('Donoeatshroom', 2.1, 'mutation'),
  row('Snoozling', 21, 'mutation'),
  row('Fleshtrap', 1.7, 'mutation'),
  row('Chorus Fruit', 3.5, 'mutation'),
  row('Thunderling', 11, 'mutation'),
  row('Turtlellini', 0.5, 'mutation'),
  row('Shellfruit', 0.5, 'mutation'),
  row('PlantBoy Advance', 23, 'mutation'),
  row('Startlevine', 7.5, 'mutation'),
  row('Puffercloud', 6, 'mutation'),
  row('Zombud', 4.5, 'mutation'),
  row('Phantomleaf', 5, 'mutation'),
  row('Stoplight Petal', 25, 'mutation'),
  row('All-in Aloe', 0.7, 'mutation'),
  row('Godseed', 8, 'mutation'),
  row('Glasscorn', 16, 'mutation'),
  row('Jerryflower', 2, 'mutation'),
  row('Devourer', 19, 'mutation'),
  row('Timestalk', 9, 'mutation'),
]);

const LIVE_MULTIPLIER_BY_ID = new Map(GREENHOUSE_LIVE_LOOT_MULTIPLIERS.map(entry => [entry.id, entry]));

export const GREENHOUSE_PLANNED_FOLLOWUPS = Object.freeze([
  Object.freeze({
    id: 'freeze-instead-of-kill',
    status: 'PLANNED',
    scoreInLiveCalculator: false,
    description: 'Watering and decay are planned to freeze plants instead of killing them.',
    source: GREENHOUSE_SOURCES.planned0271,
  }),
  Object.freeze({
    id: 'mutation-spread-minimum',
    status: 'PLANNED',
    scoreInLiveCalculator: false,
    description: 'A guaranteed minimum amount of mutation spreading before crop decay is planned; exact values were not announced.',
    source: GREENHOUSE_SOURCES.planned0271,
  }),
  Object.freeze({
    id: 'unique-crop-bonus-shard',
    status: 'PLANNED',
    scoreInLiveCalculator: false,
    description: 'A new Attribute Shard is planned to cover the Unique Crop Bonus; the bonus is planned to move from 12 to 10 with adjusted values.',
    source: GREENHOUSE_SOURCES.planned0271,
  }),
]);

function finiteNonNegative(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function positive(value) {
  const number = finiteNonNegative(value);
  return number != null && number > 0 ? number : null;
}

function normalizePlantId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function greenhousePlantRecord(value) {
  return LIVE_MULTIPLIER_BY_ID.get(normalizePlantId(value)) || null;
}

export function greenhouseLootMultiplier(value) {
  return greenhousePlantRecord(value)?.lootMultiplier ?? null;
}

/**
 * Current-live 72 hour base-crop decay boundary.
 * Exactly 72h is intentionally returned as `boundary` instead of guessing
 * server tick/order behavior at the instant the timer expires.
 */
export function greenhouseBaseCropDecayState(hoursSinceMature) {
  const hours = finiteNonNegative(hoursSinceMature);
  if (hours == null) return 'unknown';
  if (hours < GREENHOUSE_BASE_CROP_DECAY_HOURS) return 'safe';
  if (hours > GREENHOUSE_BASE_CROP_DECAY_HOURS) return 'decayed';
  return 'boundary';
}

/**
 * Evaluate one bounded Greenhouse schedule without inventing growth mechanics.
 *
 * `harvestsPerPlantInWindow` must already reflect the caller's verified or
 * measured growth timing, water availability, mutation spread/minigame outcome,
 * and collection schedule. This model only applies the current live Greenhouse
 * loot coefficient and explicit crop-effect yield multiplier.
 *
 * `baseUnitsPerHarvest` is the plant's expected pre-Greenhouse-multiplier units
 * for one completed harvest. `unitValueCoins` may be NPC or market value, but
 * the caller must identify/refresh that price externally.
 */
export function evaluateGreenhouseWindow(input = {}) {
  const missing = [];
  const warnings = [];
  const wallClockHours = positive(input.wallClockHours);
  if (wallClockHours == null) missing.push('wallClockHours');

  const rows = [];
  const plants = Array.isArray(input.plants) ? input.plants : [];
  for (let index = 0; index < plants.length; index += 1) {
    const plant = plants[index] || {};
    const path = `plants[${index}]`;
    const record = greenhousePlantRecord(plant.id || plant.name);
    const count = positive(plant.count);
    const harvests = finiteNonNegative(plant.harvestsPerPlantInWindow);
    const baseUnits = finiteNonNegative(plant.baseUnitsPerHarvest);
    const effectMultiplier = positive(plant.cropEffectYieldMultiplier);
    const unitValueCoins = finiteNonNegative(plant.unitValueCoins);

    if (!record) missing.push(`${path}.id`);
    if (count == null) missing.push(`${path}.count`);
    if (harvests == null) missing.push(`${path}.harvestsPerPlantInWindow`);
    if (baseUnits == null) missing.push(`${path}.baseUnitsPerHarvest`);
    if (effectMultiplier == null) missing.push(`${path}.cropEffectYieldMultiplier`);
    if (unitValueCoins == null) missing.push(`${path}.unitValueCoins`);

    if (record?.kind === 'base-crop' && plant.hoursSinceMature !== undefined) {
      const decayState = greenhouseBaseCropDecayState(plant.hoursSinceMature);
      if (decayState === 'decayed') {
        warnings.push({ path, reason: 'base crop is beyond the current 72h decay window' });
      } else if (decayState === 'boundary') {
        missing.push(`${path}.hoursSinceMatureBoundary`);
      } else if (decayState === 'unknown') {
        missing.push(`${path}.hoursSinceMature`);
      }
    }

    if (!record || count == null || harvests == null || baseUnits == null || effectMultiplier == null || unitValueCoins == null) continue;

    const expectedUnits = count * harvests * baseUnits * record.lootMultiplier * effectMultiplier;
    const expectedValueCoins = expectedUnits * unitValueCoins;
    rows.push(Object.freeze({
      id: record.id,
      name: record.name,
      kind: record.kind,
      count,
      harvestsPerPlantInWindow: harvests,
      baseUnitsPerHarvest: baseUnits,
      lootMultiplier: record.lootMultiplier,
      cropEffectYieldMultiplier: effectMultiplier,
      expectedUnits,
      unitValueCoins,
      expectedValueCoins,
    }));
  }

  const grossValueCoins = rows.reduce((sum, entry) => sum + entry.expectedValueCoins, 0);
  const recurringInputCostCoins = finiteNonNegative(input.recurringInputCostCoins);
  if (input.recurringInputCostCoins !== undefined && recurringInputCostCoins == null) missing.push('recurringInputCostCoins');
  const costs = recurringInputCostCoins ?? 0;
  const complete = missing.length === 0 && wallClockHours != null;
  const netValueCoins = complete ? grossValueCoins - costs : null;

  return Object.freeze({
    version: GREENHOUSE_MODEL_VERSION,
    complete,
    wallClockHours,
    rows: Object.freeze(rows),
    grossValueCoins,
    recurringInputCostCoins: costs,
    netValueCoins,
    netCoinsPerRealHour: complete ? netValueCoins / wallClockHours : null,
    expectedUnits: complete ? rows.reduce((sum, entry) => sum + entry.expectedUnits, 0) : null,
    missing: Object.freeze([...new Set(missing)]),
    warnings: Object.freeze(warnings),
    plannedFollowupsApplied: false,
  });
}
