export const SETUP_PET_ITEM_VERIFIED = '2026-09-28';

const NEU_COMMIT = '392fd5db2afc4f5020eb9bd379d140a1f6df2011';
const NEU_ITEM_URL = id =>
  `https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/blob/${NEU_COMMIT}/items/${id}.json`;

export const SETUP_PET_ITEM_SOURCE = Object.freeze({
  YELLOW_BANDANA: NEU_ITEM_URL('YELLOW_BANDANA'),
  GREEN_BANDANA: NEU_ITEM_URL('GREEN_BANDANA'),
  POIGNANT_LUCKY_CLOVER: NEU_ITEM_URL('POIGNANT_LUCKY_CLOVER'),
  BROWN_BANDANA: NEU_ITEM_URL('BROWN_BANDANA'),
});

export const FARMING_RELEVANT_PET_ITEMS = Object.freeze([
  Object.freeze({
    id: 'YELLOW_BANDANA',
    name: 'Yellow Bandana',
    tier: 'RARE',
    effectSummary: '+30 Farming Fortune',
    plannerRole: 'farming-fortune',
  }),
  Object.freeze({
    id: 'GREEN_BANDANA',
    name: 'Green Bandana',
    tier: 'EPIC',
    effectSummary: '+4 Farming Fortune per Garden level (max +60)',
    plannerRole: 'farming-fortune',
  }),
  Object.freeze({
    id: 'BROWN_BANDANA',
    name: 'Brown Bandana',
    tier: 'EPIC',
    effectSummary: '+0.2 Bonus Pest Chance per eligible Pest Bestiary tier',
    plannerRole: 'pest-spawn',
  }),
  Object.freeze({
    id: 'POIGNANT_LUCKY_CLOVER',
    name: 'Poignant Lucky Clover',
    tier: 'LEGENDARY',
    effectSummary: '+13 Overbloom',
    plannerRole: 'pest-kill',
  }),
]);

const FARMING_RELEVANT_PET_ITEM_BY_ID = new Map(
  FARMING_RELEVANT_PET_ITEMS.map(item => [item.id, item]),
);

export function farmingRelevantPetItemById(value) {
  const id = String(value?.skyblockId || value?.id || value || '').trim().toUpperCase();
  return FARMING_RELEVANT_PET_ITEM_BY_ID.get(id) || null;
}

export function isFarmingRelevantPetItem(value) {
  return Boolean(farmingRelevantPetItemById(value));
}

export function recommendedFarmingPetItem({ setupId = 'normal', gardenLevel = null } = {}) {
  const target = String(setupId || '').trim().toLowerCase();
  if (target === 'pest') {
    return Object.freeze({
      item: farmingRelevantPetItemById('BROWN_BANDANA'),
      conditional: false,
      reason: 'Best direct Pet Item for the BPC set.',
    });
  }
  if (target === 'pest-kill') {
    return Object.freeze({
      item: farmingRelevantPetItemById('POIGNANT_LUCKY_CLOVER'),
      conditional: false,
      reason: 'Adds Overbloom for the Pest Killing objective.',
    });
  }

  const level = knownNonNegative(gardenLevel);
  if (level === null) {
    return Object.freeze({
      item: null,
      conditional: true,
      reason: 'Green Bandana is better from Garden 8; Yellow Bandana is better below Garden 8.',
    });
  }
  const useGreen = Math.floor(level) >= 8;
  return Object.freeze({
    item: farmingRelevantPetItemById(useGreen ? 'GREEN_BANDANA' : 'YELLOW_BANDANA'),
    conditional: false,
    reason: useGreen
      ? 'Garden 8+ makes Green Bandana exceed Yellow Bandana\'s +30 Farming Fortune.'
      : 'Below Garden 8, Yellow Bandana gives more Farming Fortune than Green Bandana.',
  });
}

function normalizedId(item) {
  return String(item?.skyblockId || item?.id || '').trim().toUpperCase();
}

function knownNonNegative(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function result({
  id,
  globalFortune = 0,
  overbloom = 0,
  bonusPestChance = 0,
  complete = true,
  reasons = [],
  source = null,
  activityScope = 'any',
} = {}) {
  return Object.freeze({
    id,
    globalFortune,
    overbloom,
    bonusPestChance,
    complete,
    reasons: Object.freeze([...reasons]),
    source,
    activityScope,
    lastVerified: SETUP_PET_ITEM_VERIFIED,
  });
}

/**
 * Pet-item contribution for one active pet setup.
 *
 * Unknown context is never converted to zero. Brown Bandana intentionally
 * requires the eligible Pest Bestiary tier sum rather than the broader bestiary
 * total, because Timestalk Clone and Zombuddy do not count for this item.
 */
export function setupPetItemContribution(item, context = {}) {
  if (!item) return result({ id: null });
  const id = normalizedId(item);

  if (id === 'YELLOW_BANDANA') {
    return result({
      id,
      globalFortune: 30,
      source: SETUP_PET_ITEM_SOURCE.YELLOW_BANDANA,
    });
  }

  if (id === 'GREEN_BANDANA') {
    const gardenLevel = knownNonNegative(context.gardenLevel);
    if (gardenLevel === null) {
      return result({
        id,
        complete: false,
        reasons: ['Garden level is unavailable for Green Bandana'],
        source: SETUP_PET_ITEM_SOURCE.GREEN_BANDANA,
      });
    }
    const level = Math.max(1, Math.min(15, Math.floor(gardenLevel)));
    return result({
      id,
      globalFortune: level * 4,
      source: SETUP_PET_ITEM_SOURCE.GREEN_BANDANA,
    });
  }

  if (id === 'POIGNANT_LUCKY_CLOVER') {
    return result({
      id,
      overbloom: 13,
      source: SETUP_PET_ITEM_SOURCE.POIGNANT_LUCKY_CLOVER,
    });
  }

  if (id === 'BROWN_BANDANA') {
    const eligibleTiers = knownNonNegative(context.eligiblePestBestiaryTiers);
    if (eligibleTiers === null) {
      return result({
        id,
        complete: false,
        reasons: ['Eligible Pest Bestiary tier total is unavailable for Brown Bandana'],
        source: SETUP_PET_ITEM_SOURCE.BROWN_BANDANA,
        activityScope: 'pest-spawn',
      });
    }
    return result({
      id,
      bonusPestChance: Math.min(45, Math.round(eligibleTiers * 0.2 * 1e10) / 1e10),
      source: SETUP_PET_ITEM_SOURCE.BROWN_BANDANA,
      activityScope: 'pest-spawn',
    });
  }

  return result({
    id,
    complete: false,
    reasons: [`${item.displayName || id || 'Pet item'} contribution is not modeled in setup evaluation`],
  });
}
