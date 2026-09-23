export const SETUP_PET_ITEM_VERIFIED = '2026-09-23';

export const SETUP_PET_ITEM_SOURCE = Object.freeze({
  GREEN_BANDANA: 'https://hypixelskyblock.minecraft.wiki/w/Green_Bandana',
  POIGNANT_LUCKY_CLOVER: 'https://hypixelskyblock.minecraft.wiki/w/Poignant_Lucky_Clover',
  BROWN_BANDANA: 'https://hypixelskyblock.minecraft.wiki/w/Brown_Bandana',
});

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
} = {}) {
  return Object.freeze({
    id,
    globalFortune,
    overbloom,
    bonusPestChance,
    complete,
    reasons: Object.freeze([...reasons]),
    source,
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
      });
    }
    return result({
      id,
      bonusPestChance: Math.min(45, Math.round(eligibleTiers * 0.2 * 1e10) / 1e10),
      source: SETUP_PET_ITEM_SOURCE.BROWN_BANDANA,
    });
  }

  return result({
    id,
    complete: false,
    reasons: [`${item.displayName || id || 'Pet item'} contribution is not modeled in setup evaluation`],
  });
}
