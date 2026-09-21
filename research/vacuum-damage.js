/**
 * Vacuum damage and its item-local modifiers.
 *
 * Source: research/VACUUM_RESEARCH.md, sections 2, 4, 6 and 7, verified
 * 2026-09-17 against the maintained community wiki and the official 0.27 patch
 * notes.
 *
 * These live here rather than in `src/` for the reason AGENTS.md gives: the
 * research layer owns the numbers, and the app reads them. The same file also
 * records why: "Old guides are unsafe for Vacuum damage. Hypixel SkyBlock 0.27
 * changed several base damage values and doubled Bookworm's Favorite Book from
 * +10 to +20 Damage per application."
 */

export const VACUUM_DAMAGE_SOURCE = 'research/VACUUM_RESEARCH.md';
export const VACUUM_DAMAGE_LAST_VERIFIED = '2026-09-17';

/** Base damage, base Farming Fortune and range, per Vacuum tier. */
export const VACUUM_BASE_STATS = Object.freeze({
  SKYMART_VACUUM: Object.freeze({ tier: 1, rarity: 'COMMON', damage: 100, farmingFortune: 5, range: 5 }),
  SKYMART_TURBO_VACUUM: Object.freeze({ tier: 2, rarity: 'UNCOMMON', damage: 150, farmingFortune: 10, range: 7.5 }),
  SKYMART_HYPER_VACUUM: Object.freeze({ tier: 3, rarity: 'RARE', damage: 200, farmingFortune: 15, range: 10 }),
  INFINI_VACUUM: Object.freeze({ tier: 4, rarity: 'EPIC', damage: 300, farmingFortune: 20, range: 12.5 }),
  INFINI_VACUUM_HOOVERIUS: Object.freeze({ tier: 5, rarity: 'LEGENDARY', damage: 400, farmingFortune: 25, range: 15 }),
});

/** Bookworm's Favorite Book: +20 Damage each, at most five. */
export const BOOKWORM_DAMAGE_PER_BOOK = 20;
export const BOOKWORM_MAX_BOOKS = 5;

/** Farming for Dummies: +1 Farming Fortune each, at most five. */
export const DUMMIES_FORTUNE_PER_BOOK = 1;
export const DUMMIES_MAX_BOOKS = 5;

/**
 * The two Vacuum reforges. A physical Vacuum has exactly one active reforge, so
 * these are alternatives and never both.
 *
 * `damageMultiplier` applies *after* the flat additions. The research's own
 * worked example is the check: Hooverius 400 + five books 100 = 500, times
 * Buzzing 2 = 1,000. It also warns that the 900 figure from older Hooverius
 * trivia is stale after 0.27 and must not be encoded.
 */
export const VACUUM_REFORGES = Object.freeze({
  buzzing: Object.freeze({
    id: 'buzzing',
    label: 'Buzzing',
    stone: 'CLIPPED_WINGS',
    damageMultiplier: 2,
    flatDamageByRarity: null,
    farmingFortuneByRarity: Object.freeze({ COMMON: 2, UNCOMMON: 3, RARE: 5, EPIC: 7, LEGENDARY: 9, MYTHIC: 11 }),
    pestOnlyFarmingFortune: 0,
    purpose: 'Reaches or preserves a damage threshold, with a smaller Fortune gain.',
  }),
  beady: Object.freeze({
    id: 'beady',
    label: 'Beady',
    stone: 'BEADY_EYES',
    damageMultiplier: 1,
    flatDamageByRarity: Object.freeze({ COMMON: 5, UNCOMMON: 10, RARE: 15, EPIC: 20, LEGENDARY: 25, MYTHIC: 30 }),
    farmingFortuneByRarity: null,
    pestOnlyFarmingFortune: 100,
    purpose: 'Strong Pest Fortune once the rest of the setup already holds the threshold.',
  }),
});

/** Reforge application fee, by host rarity. Identical for both reforges. */
export const REFORGE_FEE_BY_RARITY = Object.freeze({
  COMMON: 10_000, UNCOMMON: 20_000, RARE: 50_000, EPIC: 75_000, LEGENDARY: 100_000, MYTHIC: 150_000,
});

/**
 * The rule the research states in bold, kept next to the numbers it constrains.
 *
 * Pest Farming Fortune is not rare-drop chance. Since the May 14, 2026 Pest
 * changes, non-guaranteed Pest drops use Overbloom, so Beady's +100 must never
 * be fed into rare-drop expected value.
 */
export const VACUUM_FORTUNE_IS_NOT_RARE_DROP_CHANCE = true;

/** Never encode a universal winner between the two reforges. */
export const NO_UNIVERSAL_REFORGE_WINNER = true;
