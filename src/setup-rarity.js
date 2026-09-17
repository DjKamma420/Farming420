export const RARITY_UPGRADE = Object.freeze({
  COMMON: 'UNCOMMON',
  UNCOMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: 'MYTHIC',
  MYTHIC: 'DIVINE',
  SPECIAL: 'VERY SPECIAL',
});

export const RARITY_DOWNGRADE = Object.freeze(
  Object.fromEntries(Object.entries(RARITY_UPGRADE).map(([base, upgraded]) => [upgraded, base])),
);

export function normalizeRarity(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/_/g, ' ');
  return normalized || null;
}

export function upgradeRarity(value) {
  const rarity = normalizeRarity(value);
  if (!rarity) return null;
  return RARITY_UPGRADE[rarity] || rarity;
}

export function downgradeRarity(value) {
  const rarity = normalizeRarity(value);
  if (!rarity) return null;
  return RARITY_DOWNGRADE[rarity] || rarity;
}

/**
 * Hypixel item lore contains the currently displayed rarity. When rarity_upgrades
 * is present that displayed rarity is already one Recombobulator step above the
 * item's base rarity. Convert it back once before storing setup state so the
 * rest of the app can always keep `item.rarity` as the base rarity.
 */
export function baseRarityFromDisplayed(value, recombobulated = false) {
  const rarity = normalizeRarity(value);
  if (!rarity) return null;
  return recombobulated ? downgradeRarity(rarity) : rarity;
}

/**
 * Canonical rarity used by display and rarity-scaled farming calculations.
 * `catalogTier` is the strongest base-rarity source when available; setup state
 * is the fallback. Recombobulation is applied exactly once here.
 */
export function effectiveSetupItemRarity(item, catalogTier = null) {
  const base = normalizeRarity(catalogTier) || normalizeRarity(item?.rarity);
  if (!base) return null;
  return item?.recombobulated ? upgradeRarity(base) : base;
}
