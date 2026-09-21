/**
 * What a Vacuum actually hits for, and whether that is enough.
 *
 * The app knows a pest has 600 HP and knows which Vacuums exist, but nothing
 * joined the two -- so the question the Pest Killing phase is entirely about,
 * "does my Vacuum take a pest down in one pull", had no answer. The numbers
 * were in `research/VACUUM_RESEARCH.md` the whole time.
 *
 * Order of operations matters and is not a guess: the flat additions come
 * first, then Buzzing doubles. The research's own worked example is the check
 * -- Hooverius 400, five books +100, Buzzing x2 = 1,000 -- and it warns that
 * the 900 from older Hooverius trivia is stale after 0.27.
 */
import {
  BOOKWORM_DAMAGE_PER_BOOK,
  BOOKWORM_MAX_BOOKS,
  DUMMIES_FORTUNE_PER_BOOK,
  DUMMIES_MAX_BOOKS,
  VACUUM_BASE_STATS,
  VACUUM_REFORGES,
} from '../research/vacuum-damage.js';
import { PEST_HEALTH } from './pest-model.js';

function clampCount(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(max, Math.floor(number));
}

/** The base stats for a Vacuum id, or null when the id is not one. */
export function vacuumBaseStats(vacuumId) {
  const key = String(vacuumId || '').trim().toUpperCase();
  return VACUUM_BASE_STATS[key] || null;
}

export function vacuumReforge(reforgeId) {
  const key = String(reforgeId || '').trim().toLowerCase();
  return VACUUM_REFORGES[key] || null;
}

/**
 * Total Vacuum damage for a build, or null when the Vacuum is unknown.
 *
 * Null rather than zero: a Vacuum this model does not know is not a Vacuum that
 * deals no damage, and the difference decides whether the page shows a number
 * or says it cannot.
 */
export function vacuumDamage({
  vacuumId,
  bookwormBooks = 0,
  reforge = null,
  rarity = null,
} = {}) {
  const base = vacuumBaseStats(vacuumId);
  if (!base) return null;

  const books = clampCount(bookwormBooks, BOOKWORM_MAX_BOOKS);
  const chosen = vacuumReforge(reforge);
  const hostRarity = String(rarity || base.rarity || '').trim().toUpperCase();

  const flatFromReforge = chosen?.flatDamageByRarity?.[hostRarity] ?? 0;
  const beforeMultiplier = base.damage + books * BOOKWORM_DAMAGE_PER_BOOK + flatFromReforge;
  const multiplier = chosen?.damageMultiplier ?? 1;

  return {
    baseDamage: base.damage,
    bookwormDamage: books * BOOKWORM_DAMAGE_PER_BOOK,
    reforgeFlatDamage: flatFromReforge,
    beforeMultiplier,
    multiplier,
    totalDamage: beforeMultiplier * multiplier,
    hostRarity,
    reforge: chosen?.id ?? null,
  };
}

/**
 * Farming Fortune the Vacuum itself carries, split by where it applies.
 *
 * `pestOnly` is kept separate on purpose. The research is explicit that Pest
 * Farming Fortune is not rare-drop chance -- since the May 14, 2026 Pest
 * changes, non-guaranteed pest drops scale with Overbloom -- so Beady's +100
 * must never be summed into a general Fortune figure or a rare-drop roll.
 */
export function vacuumFarmingFortune({
  vacuumId,
  dummiesBooks = 0,
  reforge = null,
  rarity = null,
} = {}) {
  const base = vacuumBaseStats(vacuumId);
  if (!base) return null;

  const books = clampCount(dummiesBooks, DUMMIES_MAX_BOOKS);
  const chosen = vacuumReforge(reforge);
  const hostRarity = String(rarity || base.rarity || '').trim().toUpperCase();

  return {
    base: base.farmingFortune,
    fromDummies: books * DUMMIES_FORTUNE_PER_BOOK,
    fromReforge: chosen?.farmingFortuneByRarity?.[hostRarity] ?? 0,
    general: base.farmingFortune + books * DUMMIES_FORTUNE_PER_BOOK + (chosen?.farmingFortuneByRarity?.[hostRarity] ?? 0),
    pestOnly: chosen?.pestOnlyFarmingFortune ?? 0,
  };
}

export const PEST_KILL_CONTEXT = Object.freeze({
  normal: Object.freeze({ id: 'normal', label: 'Normal', health: PEST_HEALTH.normal }),
  derpy: Object.freeze({ id: 'derpy', label: 'Derpy', health: PEST_HEALTH.derpy }),
});

/**
 * How many pulls a pest takes, in both health contexts.
 *
 * This counts pulls against health. It is deliberately not a time estimate:
 * pull rate, range, travel and pest spawn position are not in the research, and
 * inventing a seconds-per-kill figure would turn a verified threshold into a
 * made-up one.
 */
export function pullsToKill(build) {
  const damage = vacuumDamage(build);
  if (!damage || !(damage.totalDamage > 0)) return null;
  const rows = Object.values(PEST_KILL_CONTEXT).map(context => ({
    context: context.id,
    label: context.label,
    health: context.health,
    pulls: Math.ceil(context.health / damage.totalDamage),
    oneShot: damage.totalDamage >= context.health,
  }));
  return { damage, contexts: rows };
}

/**
 * The cheapest change that would reach a one-pull kill, or null when it already
 * does, and `{ reachable: false }` when nothing in this model gets there.
 *
 * Only the two levers this model actually has are considered: more Bookworm
 * books, and the Buzzing reforge. Nothing here claims Buzzing is the better
 * reforge -- the research forbids a universal winner between Buzzing and Beady,
 * because Beady's +100 Pest Fortune is the reason to give the threshold up.
 */
export function oneShotAdvice(build) {
  const current = pullsToKill(build);
  if (!current) return null;
  const normal = current.contexts.find(row => row.context === 'normal');
  if (normal?.oneShot) return { alreadyOneShot: true, reachable: true, steps: [] };

  const steps = [];
  const withMaxBooks = { ...build, bookwormBooks: BOOKWORM_MAX_BOOKS };
  if (clampCount(build.bookwormBooks, BOOKWORM_MAX_BOOKS) < BOOKWORM_MAX_BOOKS
    && vacuumDamage(withMaxBooks)?.totalDamage >= PEST_HEALTH.normal) {
    steps.push(`Apply Bookworm's Favorite Book up to ${BOOKWORM_MAX_BOOKS}.`);
  }
  const withBuzzing = { ...build, reforge: 'buzzing' };
  if (build.reforge !== 'buzzing' && vacuumDamage(withBuzzing)?.totalDamage >= PEST_HEALTH.normal) {
    steps.push('Reforge to Buzzing, which doubles Vacuum Damage.');
  }
  const withBoth = { ...withMaxBooks, reforge: 'buzzing' };
  const reachable = vacuumDamage(withBoth)?.totalDamage >= PEST_HEALTH.normal;
  if (!steps.length && reachable) {
    steps.push(`Both: ${BOOKWORM_MAX_BOOKS} books and the Buzzing reforge.`);
  }

  return { alreadyOneShot: false, reachable, steps };
}
