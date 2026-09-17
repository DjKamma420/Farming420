/**
 * The Garden's pests, and which side of the pest loop each stat acts on.
 *
 * Two pipelines run one after the other and take different stats. Treating
 * them as one number is the single most expensive mistake available here, and
 * the research says so outright: since 2026-05-14 the listed non-guaranteed
 * pest drops scale with Overbloom, *not* with Farming Fortune. So a +100 Pest
 * Farming Fortune reforge buys nothing at all on the rare-drop side, however
 * large the number looks.
 *
 * Sources: research/VACUUM_RESEARCH.md (pest/crop/vinyl mapping, pest HP,
 * Pesthunter Phillip conversion, guaranteed vs rare drops) and
 * research/hypixel_farming_master_ai_2026-09-16.json (`pests`, `stat_model`,
 * `current_key_values`).
 */

/**
 * The standard pest/crop/vinyl mapping, verbatim from the research table.
 *
 * The research closes that table with "do not invent Stereo mappings for
 * special Pest types that are not part of this standard mapping", so this list
 * is exactly thirteen rows and gains none by guesswork. `cropId` matches the
 * app's own crop ids, which is what lets each row borrow its crop's art.
 */
export const GARDEN_PESTS = Object.freeze([
  Object.freeze({ id: 'fly', name: 'Fly', cropId: 'wheat', crop: 'Wheat', vinyl: 'Pretty Fly' }),
  Object.freeze({ id: 'cricket', name: 'Cricket', cropId: 'carrot', crop: 'Carrot', vinyl: 'Cricket Choir' }),
  Object.freeze({ id: 'locust', name: 'Locust', cropId: 'potato', crop: 'Potato', vinyl: 'Cicada Symphony' }),
  Object.freeze({ id: 'rat', name: 'Rat', cropId: 'pumpkin', crop: 'Pumpkin', vinyl: 'Rodent Revolution' }),
  Object.freeze({ id: 'mosquito', name: 'Mosquito', cropId: 'sugar-cane', crop: 'Sugar Cane', vinyl: "Buzzin' Beats" }),
  Object.freeze({ id: 'earthworm', name: 'Earthworm', cropId: 'melon', crop: 'Melon', vinyl: 'Earthworm Ensemble' }),
  Object.freeze({ id: 'mite', name: 'Mite', cropId: 'cactus', crop: 'Cactus', vinyl: 'DynaMITES' }),
  Object.freeze({ id: 'moth', name: 'Moth', cropId: 'cocoa-beans', crop: 'Cocoa Beans', vinyl: 'Wings of Harmony' }),
  Object.freeze({ id: 'slug', name: 'Slug', cropId: 'mushroom', crop: 'Mushroom', vinyl: 'Slow and Groovy' }),
  Object.freeze({ id: 'beetle', name: 'Beetle', cropId: 'nether-wart', crop: 'Nether Wart', vinyl: 'Not Just a Pest' }),
  Object.freeze({ id: 'dragonfly', name: 'Dragonfly', cropId: 'sunflower', crop: 'Sunflower', vinyl: 'Imagine Dragonflies' }),
  Object.freeze({ id: 'firefly', name: 'Firefly', cropId: 'moonflower', crop: 'Moonflower', vinyl: 'Firefly in the Hole' }),
  Object.freeze({ id: 'praying-mantis', name: 'Praying Mantis', cropId: 'wild-rose', crop: 'Wild Rose', vinyl: 'Pray For Me' }),
]);

/** Pest health, and the one documented case that changes it. */
export const PEST_HEALTH = Object.freeze({
  normal: 600,
  derpy: 1200,
  derpyNote: 'Derpy doubles pest HP, so a vacuum that one-shots normally may not under Derpy.',
});

/** Spawn side: what decides whether a pest appears at all. */
export const SPAWN_PIPELINE = Object.freeze([
  Object.freeze({ step: 'Crop break', detail: 'Every eligible break is a chance for a pest. No breaks, no pests.' }),
  Object.freeze({ step: 'Cooldown eligibility', detail: 'A spawn on cooldown cannot happen however high the chance is.' }),
  Object.freeze({ step: 'Bonus Pest Chance', detail: 'The spawn-rate stat. It is not loot quality and not Farming Fortune.' }),
  Object.freeze({ step: 'Spray, vinyl, pet, armor, chip and shard modifiers', detail: 'Each applies on the spawn side only.' }),
  Object.freeze({ step: 'Pest type', detail: 'Decided by the plot’s crop, per the mapping below.' }),
]);

/** Loot side: what decides what a killed pest gives. */
export const LOOT_PIPELINE = Object.freeze([
  Object.freeze({ step: 'Kill or vacuum', detail: `A pest has ${PEST_HEALTH.normal} HP normally. Damage is judged against that, not in the abstract.` }),
  Object.freeze({ step: 'Guaranteed drops', detail: 'Crop-style guaranteed drops do take applicable Farming Fortune and matching Crop Fortune.' }),
  Object.freeze({ step: 'Non-guaranteed roll', detail: 'The rare-drop roll. Farming Fortune does nothing here.' }),
  Object.freeze({ step: 'Overbloom and Pest Overbloom', detail: 'This is the stat that raises the rare-drop chance. Pest Overbloom applies to pest RNG only.' }),
  Object.freeze({ step: 'Feast in-season roll', detail: 'Applies on top when a Harvest Feast is running.' }),
]);

/**
 * Pesthunter Phillip's pest-to-Fortune conversion.
 *
 * Two sources give different caps. `current_key_values` in the master research
 * file is tagged `_0_27` and gives 200 pests for +1,000 Farming Fortune;
 * `VACUUM_RESEARCH.md` records an earlier +200 ceiling at 40 pests. Both agree
 * on 5 Farming Fortune per pest. The newer, version-tagged figure is the one
 * used, and the older one is kept visible rather than quietly dropped -- a
 * player on an older snapshot should be able to see which number they have.
 */
export const PESTHUNTER_PHILIP = Object.freeze({
  fortunePerPest: 5,
  pestCap: 200,
  maxFortune: 1000,
  durationMinutes: 30,
  version: '0.27',
  supersededSnapshot: Object.freeze({ pestCap: 40, maxFortune: 200, source: 'research/VACUUM_RESEARCH.md' }),
  alternativeUseNote: 'Pest currency has other uses, so this is only worth its Fortune if you were going to spend it here.',
});

/**
 * The Farming Fortune a pest spend buys, and whether the cap swallowed it.
 *
 * Returns null for anything that is not a usable pest count, rather than
 * folding a bad input into a confident zero.
 */
export function philipFortuneFor(pests, table = PESTHUNTER_PHILIP) {
  // An empty input field is a real answer -- spend nothing, get nothing -- but
  // `null` is an absent value, and `Number(null)` is 0, which would quietly
  // turn "no data" into "I checked, it is zero".
  if (pests === null) return null;
  const requested = Number(pests);
  if (!Number.isFinite(requested) || requested < 0) return null;
  const spent = Math.min(Math.floor(requested), table.pestCap);
  const fortune = Math.min(spent * table.fortunePerPest, table.maxFortune);
  return {
    requested: Math.floor(requested),
    spent,
    fortune,
    capped: Math.floor(requested) > table.pestCap,
    durationMinutes: table.durationMinutes,
  };
}

/**
 * Which side of the loop a stat acts on: 'spawn', 'loot-rng',
 * 'loot-guaranteed', 'kill', or null when the text does not say.
 *
 * Null is the honest answer for a stat this cannot place. Guessing 'loot-rng'
 * would tell a player that a Farming Fortune reforge raises their rare-drop
 * chance, which is exactly the claim the research forbids.
 */
export function pestStatSide(text) {
  const haystack = String(text || '').toLowerCase();
  if (!haystack.trim()) return null;
  if (/bonus pest chance|\bbpc\b|pest spawn|spawn rate|cooldown/.test(haystack)) return 'spawn';
  if (/overbloom/.test(haystack)) return 'loot-rng';
  if (/pest fortune|pest farming fortune|pest-only farming fortune/.test(haystack)) return 'loot-guaranteed';
  if (/damage|\bhp\b|vacuum|one-shot|kill/.test(haystack)) return 'kill';
  return null;
}

export const PEST_STAT_SIDES = Object.freeze({
  spawn: Object.freeze({ label: 'Spawn side', note: 'Changes how often a pest appears.' }),
  kill: Object.freeze({ label: 'Kill side', note: `Changes whether you can take ${PEST_HEALTH.normal} HP down fast enough.` }),
  'loot-guaranteed': Object.freeze({ label: 'Guaranteed drops', note: 'Farming Fortune works here, and only here.' }),
  'loot-rng': Object.freeze({ label: 'Rare-drop roll', note: 'Overbloom works here. Farming Fortune does not.' }),
});

/** The pest that spawns on a given crop's plot, or null. */
export function pestForCrop(cropId) {
  const key = String(cropId || '').trim().toLowerCase();
  return GARDEN_PESTS.find(pest => pest.cropId === key) || null;
}
