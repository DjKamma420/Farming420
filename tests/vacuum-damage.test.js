import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BOOKWORM_DAMAGE_PER_BOOK,
  BOOKWORM_MAX_BOOKS,
  VACUUM_BASE_STATS,
  VACUUM_REFORGES,
} from '../research/vacuum-damage.js';
import { GARDEN_VACUUM_ITEMS } from '../src/exact-farming-items.js';
import { PEST_HEALTH } from '../src/pest-model.js';
import {
  oneShotAdvice,
  pullsToKill,
  vacuumBaseStats,
  vacuumDamage,
  vacuumFarmingFortune,
} from '../src/vacuum-damage.js';

/**
 * The app knew a pest has 600 HP and knew which Vacuums exist, and never joined
 * the two -- so the question the Pest Killing phase is entirely about had no
 * answer, while the numbers sat in research/VACUUM_RESEARCH.md.
 */

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const research = read('research/VACUUM_RESEARCH.md');

test("the research's own worked example comes out at 1,000", () => {
  // "Hooverius base damage = 400 / 5 Bookworm books = +100 / pre-Buzzing = 500
  // / Buzzing = x2 / current result = 1,000 Damage", and: "Do not encode 900."
  const built = vacuumDamage({
    vacuumId: 'INFINI_VACUUM_HOOVERIUS',
    bookwormBooks: 5,
    reforge: 'buzzing',
  });
  assert.equal(built.beforeMultiplier, 500);
  assert.equal(built.totalDamage, 1000);
  assert.match(research, /current result\s+= 1,000 Damage/);
  assert.match(research, /Do \*\*not\*\* encode 900/);
});

test('the flat additions come first and Buzzing doubles afterwards', () => {
  // Order is the whole reason the stale 900 figure exists. Doubling the base
  // before adding the books would give 400*2 + 100 = 900.
  const built = vacuumDamage({ vacuumId: 'INFINI_VACUUM_HOOVERIUS', bookwormBooks: 5, reforge: 'buzzing' });
  assert.notEqual(built.totalDamage, 900);
});

test('every Vacuum in the app has researched base stats', () => {
  for (const vacuum of GARDEN_VACUUM_ITEMS) {
    const stats = vacuumBaseStats(vacuum.id);
    assert.ok(stats, `${vacuum.id} has no base stats`);
    assert.ok(stats.damage > 0 && stats.farmingFortune > 0 && stats.range > 0, vacuum.id);
    assert.equal(stats.rarity, vacuum.rarity, `${vacuum.id} rarity disagrees with exact-farming-items`);
  }
  assert.equal(Object.keys(VACUUM_BASE_STATS).length, GARDEN_VACUUM_ITEMS.length);
});

test('the base damages are the 0.27 values, not the older ones', () => {
  // "Turbo: 150, not 120. Hyper: 200, not 150. Infini: 300, not 200."
  assert.equal(VACUUM_BASE_STATS.SKYMART_TURBO_VACUUM.damage, 150);
  assert.equal(VACUUM_BASE_STATS.SKYMART_HYPER_VACUUM.damage, 200);
  assert.equal(VACUUM_BASE_STATS.INFINI_VACUUM.damage, 300);
  assert.equal(VACUUM_BASE_STATS.INFINI_VACUUM_HOOVERIUS.damage, 400);
  assert.equal(BOOKWORM_DAMAGE_PER_BOOK, 20);
});

test('an unknown Vacuum is null, not zero damage', () => {
  // A Vacuum this model does not know is not one that deals no damage, and the
  // difference decides whether the page shows a number or says it cannot.
  for (const id of ['NOPE', '', null, undefined]) {
    assert.equal(vacuumDamage({ vacuumId: id }), null, String(id));
    assert.equal(pullsToKill({ vacuumId: id }), null, String(id));
    assert.equal(oneShotAdvice({ vacuumId: id }), null, String(id));
  }
});

test('book counts are clamped rather than trusted', () => {
  const base = VACUUM_BASE_STATS.INFINI_VACUUM.damage;
  assert.equal(vacuumDamage({ vacuumId: 'INFINI_VACUUM', bookwormBooks: 99 }).totalDamage,
    base + BOOKWORM_MAX_BOOKS * BOOKWORM_DAMAGE_PER_BOOK);
  assert.equal(vacuumDamage({ vacuumId: 'INFINI_VACUUM', bookwormBooks: -3 }).totalDamage, base);
  assert.equal(vacuumDamage({ vacuumId: 'INFINI_VACUUM', bookwormBooks: 'x' }).totalDamage, base);
});

test('pulls are counted against both pest health contexts', () => {
  const result = pullsToKill({ vacuumId: 'INFINI_VACUUM', reforge: 'buzzing' });
  const normal = result.contexts.find(row => row.context === 'normal');
  const derpy = result.contexts.find(row => row.context === 'derpy');
  assert.equal(normal.health, PEST_HEALTH.normal);
  assert.equal(derpy.health, PEST_HEALTH.derpy);
  // 300 x2 = 600, exactly the normal threshold and exactly half of Derpy's.
  assert.equal(normal.pulls, 1);
  assert.equal(normal.oneShot, true);
  assert.equal(derpy.pulls, 2);
  assert.equal(derpy.oneShot, false);
});

test('Pest-only Fortune is kept apart from general Fortune', () => {
  // The research is explicit: Pest Farming Fortune is not rare-drop chance,
  // because non-guaranteed pest drops use Overbloom since 2026-05-14. Summing
  // Beady's +100 into a general figure would be exactly that mistake.
  const beady = vacuumFarmingFortune({ vacuumId: 'INFINI_VACUUM_HOOVERIUS', dummiesBooks: 5, reforge: 'beady' });
  assert.equal(beady.pestOnly, 100);
  assert.equal(beady.general, 25 + 5);
  assert.ok(!String(beady.general).includes('130'));

  const buzzing = vacuumFarmingFortune({ vacuumId: 'INFINI_VACUUM_HOOVERIUS', reforge: 'buzzing' });
  assert.equal(buzzing.pestOnly, 0);
  assert.equal(buzzing.general, 25 + VACUUM_REFORGES.buzzing.farmingFortuneByRarity.LEGENDARY);
});

test('the two reforges stay alternatives, with no universal winner', () => {
  // "A Vacuum has exactly one active reforge" and "Never encode a universal
  // Beady > Buzzing or Buzzing > Beady rule."
  const built = vacuumDamage({ vacuumId: 'INFINI_VACUUM', reforge: 'beady' });
  assert.equal(built.multiplier, 1, 'Beady must not also double damage');
  assert.ok(built.reforgeFlatDamage > 0);
  const source = read('src/vacuum-damage.js');
  assert.doesNotMatch(source, /better reforge|always pick|Buzzing is best|Beady is best/i);
  assert.match(research, /Never encode a universal `Beady > Buzzing`/);
});

test('advice names only the levers this model has, and admits when there are none', () => {
  const hopeless = oneShotAdvice({ vacuumId: 'SKYMART_VACUUM' });
  assert.equal(hopeless.alreadyOneShot, false);
  assert.equal(hopeless.reachable, false, 'SkyMart maxes at (100+100)x2 = 400, under 600');

  const alreadyThere = oneShotAdvice({ vacuumId: 'INFINI_VACUUM_HOOVERIUS', bookwormBooks: 5, reforge: 'buzzing' });
  assert.equal(alreadyThere.alreadyOneShot, true);
  assert.deepEqual(alreadyThere.steps, []);

  const fixable = oneShotAdvice({ vacuumId: 'INFINI_VACUUM' });
  assert.equal(fixable.reachable, true);
  assert.ok(fixable.steps.length > 0);
});

test('no seconds-per-kill figure is invented', () => {
  // Pull rate, range and travel are not in the research, so counting pulls is
  // the honest stopping point.
  const source = read('src/vacuum-damage.js');
  assert.doesNotMatch(source, /secondsPerKill|killsPerHour|pullsPerSecond/);
  assert.match(source, /It is deliberately not a time estimate/);
  assert.match(read('src/pests-page.js'), /Pulls, not seconds/);
});
