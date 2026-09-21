/**
 * What to wear in each of the three Pest-farming phases, by progression tier.
 *
 * Mirrored from `pest_loadout_progression` in
 * `research/hypixel_farming_master_ai_2026-09-16.json` so the runtime can read
 * it -- the master file is research input and is not loaded by the app.
 * `tests/research-agreement.test.js` fails if the two drift apart.
 *
 * The central rule, and the reason this exists: three logical phases do not
 * mean three physical wardrobes. The normal baseline is **two** armor sets,
 * with Farming and Killing wearing the same one. The third set is a luxury.
 */

export const PEST_LOADOUT_SOURCE = 'https://eliteskyblock.com/guides/eAb9M5';
export const PEST_LOADOUT_CORROBORATION = 'https://hypixel.net/threads/why-do-you-need-2-sets-for-pest-farming.6148221/';
export const PEST_LOADOUT_LAST_VERIFIED = '2026-09-21';

export const PEST_LOADOUT_CORE_RULE =
  'Keep Farming, Pest Spawning and Pest Killing as three logical phases even when phases reuse the same physical gear.';

export const PEST_LOADOUT_DATA_MODEL_RULE =
  'Phase loadouts may reference the same physical armor/equipment object; do not infer duplicates from phase separation.';

/**
 * The tiers, in progression order.
 *
 * `physicalArmorSets` is the number the research actually states for that tier,
 * and it is two for both real tiers. Only the optional layer reaches three, and
 * it carries `status: 'luxury'` so nothing can present it as a prerequisite.
 */
export const PEST_LOADOUT_TIERS = Object.freeze([
  Object.freeze({
    id: 'midgame',
    label: 'Mid-game, before Rose Dragon',
    status: 'baseline',
    physicalArmorSets: 2,
    phases: Object.freeze({
      farm: Object.freeze({
        armor: '3/4 Mossy + 1/4 Mantid Helianthus, or the current progression equivalent',
        equipment: 'Rooted/Blossom-style Fortune equipment',
        pet: 'Fortune farming pet',
      }),
      'pest-spawn': Object.freeze({
        armor: 'Full Mantid Helianthus',
        equipment: 'Squeaky Pesthunter equipment + Pest Vest',
        pet: 'Mosquito or Slug with Brown Bandana',
        timing: 'Swap in only shortly before the effective Pest cooldown expires.',
      }),
      'pest-kill': Object.freeze({
        armor: 'Reuse the Farming armor',
        equipment: 'Whatever Fortune/kill equipment is available at this stage',
        pet: 'Pest-killing pet such as Hedgehog; Poignant Clover when appropriate',
        reusesArmorFrom: 'farm',
      }),
    }),
  }),
  Object.freeze({
    id: 'endgame',
    label: 'End-game baseline',
    status: 'baseline',
    physicalArmorSets: 2,
    phases: Object.freeze({
      farm: Object.freeze({
        armor: '3/4 Mossy + 1/4 Mantid Helianthus',
        pet: 'Rose Dragon with Green Bandana',
      }),
      'pest-spawn': Object.freeze({
        armor: 'Full Mantid Helianthus',
        pet: 'Mosquito with Brown Bandana',
      }),
      'pest-kill': Object.freeze({
        armor: '3/4 Mossy + 1/4 Mantid Helianthus, the same set as Farming',
        pet: 'Rose Dragon',
        reusesArmorFrom: 'farm',
        note: 'A second Rose Dragon carrying Poignant Lucky Clover can be dedicated to Killing while the Green Bandana one stays on Farming. Pet items are fixed to the pet, so this is two pets, not a mid-phase item swap.',
      }),
    }),
  }),
  Object.freeze({
    id: 'ultra-minmax',
    label: 'Ultra min-max, optional',
    // Never a prerequisite: "This layer is optional and must not be treated as
    // the prerequisite for Pest farming or for the end-game two-set baseline."
    status: 'luxury',
    physicalArmorSets: 3,
    phases: Object.freeze({
      farm: Object.freeze({
        armor: 'Full Mossy Helianthus',
        equipment: 'Rooted Farming equipment',
        pet: 'Rose Dragon with Green Bandana',
      }),
      'pest-spawn': Object.freeze({
        armor: 'Full Mantid Helianthus',
        equipment: 'Squeaky Pesthunter / Pest Vest',
        pet: 'Mosquito with Brown Bandana',
      }),
      'pest-kill': Object.freeze({
        armor: '3/4 Mossy + 1/4 Mantid Helianthus',
        equipment: 'Thorny equipment',
        pet: 'Rose Dragon with Poignant Lucky Clover',
      }),
    }),
  }),
]);

/**
 * The spawn phase is short, and that is a calculation rule rather than advice.
 *
 * Applying the lower-Fortune spawn gear for the whole cooldown would materially
 * understate crop output, so nothing may assume it is worn while waiting.
 */
export const SPAWN_PHASE_IS_SHORT =
  'The spawn loadout is worn only briefly, from shortly before the cooldown expires until the pest appears. It is not the gear worn for the whole wait.';

export function pestLoadoutTier(id) {
  return PEST_LOADOUT_TIERS.find(tier => tier.id === String(id || '').trim()) || null;
}

/** The tiers that are a real baseline rather than an optional luxury layer. */
export function baselineTiers() {
  return PEST_LOADOUT_TIERS.filter(tier => tier.status === 'baseline');
}
