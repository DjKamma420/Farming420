import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  THORNY_FORTUNE_BY_RARITY,
  THORNY_OVERBLOOM_BY_RARITY,
  THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER,
} from '../research/equipment-fortune.js';
import { GREENHOUSE_LIVE_LOOT_MULTIPLIERS } from '../src/greenhouse-model.js';
import { intrinsicEnchantmentsForCatalogItem } from '../src/item-catalog.js';

/**
 * The code, checked against the research layer it is supposed to implement.
 *
 * AGENTS.md makes the research files the source of truth and requires a source
 * plus a `lastVerified` date for every non-trivial mechanic. Nothing was
 * comparing the two, and an audit found a shipped value the repository's own
 * research had already corrected: Bookworm's Favorite Book was still +10
 * Vacuum Damage after 0.27 doubled it to +20, carrying a `lastVerified` of the
 * very day that correction was recorded.
 */

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const master = JSON.parse(read('research/hypixel_farming_master_ai_2026-09-16.json'));

/** Every source URL the app and the research layer cite. */
function citedSources() {
  const rows = [];
  for (const dir of ['src', 'research']) {
    for (const name of readdirSync(new URL(`${dir}/`, root))) {
      if (!/\.(js|json)$/.test(name)) continue;
      const text = read(`${dir}/${name}`);
      for (const match of text.matchAll(/["']?(?:source|url|Source)["']?\s*[:=]\s*["'](https?:\/\/[^"']+)["']/g)) {
        rows.push({ file: `${dir}/${name}`, url: match[1] });
      }
    }
  }
  return rows;
}

test('nothing cites the official wiki, which closed in July 2026', () => {
  // AGENTS.md, source hierarchy. There were per-file guards for `data.js`,
  // `help-locations.js`, core fortune and progression -- and two modules
  // outside that list still cited it. This checks every source field instead
  // of a list of filenames that has to be remembered.
  const dead = citedSources().filter(row => row.url.includes('wiki.hypixel.net'));
  assert.deepEqual(dead, [], `closed-wiki citations:\n${dead.map(r => `  ${r.file}: ${r.url}`).join('\n')}`);
});

test("Bookworm's Favorite Book carries its 0.27 value", () => {
  // research/VACUUM_RESEARCH.md: "Bookworm's Favorite Book: +20 Damage each,
  // not +10", and "old guides are unsafe for Vacuum damage".
  const patches = read('src/vacuum-data-patches.js');
  const entry = patches.slice(patches.indexOf('VACUUM_BOOKWORM_BOOK'));
  assert.match(entry, /stepGain: 20,/);
  assert.match(entry, /rawMarginal: 20,/);
  assert.match(entry, /\+20 Vacuum Damage/);
  assert.doesNotMatch(entry.slice(0, entry.indexOf('});')), /\+10 Vacuum Damage/);

  const research = read('research/VACUUM_RESEARCH.md');
  assert.match(research, /\+20 Damage each\*\*, not \+10/);
});

test('the Thorny tables are the research tables, not a copy', () => {
  const thorny = master.current_key_values.thorny;
  assert.deepEqual({ ...THORNY_FORTUNE_BY_RARITY }, thorny.farming_fortune_by_rarity);
  assert.deepEqual({ ...THORNY_OVERBLOOM_BY_RARITY }, thorny.base_overbloom_by_rarity);
  assert.equal(THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER, thorny.armor_thorns_overbloom_per_tier_per_thorny_piece);
  // And the app reads them from research/, rather than restating them.
  assert.match(read('src/equipment-fortune.js'), /from '\.\.\/research\/equipment-fortune\.js'/);
});

test('the Century Pufferfish Hat keeps its intrinsic Thorns V', () => {
  // The research records `intrinsic_thorns_level: 5` for the event variant so
  // a manual setup that only knows the id still models it, and warns that the
  // ordinary hat must not inherit it.
  const pufferfish = master.current_key_values.pufferfish_hat_celebration;
  assert.equal(
    intrinsicEnchantmentsForCatalogItem({ id: pufferfish.item_id }).thorns,
    pufferfish.intrinsic_thorns_level,
  );
  assert.deepEqual(intrinsicEnchantmentsForCatalogItem({ id: pufferfish.ordinary_item_id }), {});
});

test('the Greenhouse table is the size the knowledge base says it is', () => {
  // kb-45 does not list the values; it states that the app holds them. So the
  // checkable claim is the count, and it is worth checking, because that file
  // is where a future reader will look for the number.
  const kb = read('research/knowledge-base/45-greenhouse-live-model-2026-09-17.md');
  const stated = kb.match(/(\d+)-entry current multiplier table/);
  assert.ok(stated, 'kb-45 no longer states the table size');
  assert.equal(GREENHOUSE_LIVE_LOOT_MULTIPLIERS.length, Number(stated[1]));
});

test('the Greenhouse panel does not present its sort as a ranking', () => {
  // kb-45: "Do not rank a mutation as universally best from its loot
  // multiplier alone." A sorted table implies a ranking whatever the heading
  // says, so the offsetting factors sit next to it.
  const panel = read('src/planner-mode-ui.js');
  assert.match(panel, /This is one axis, not a ranking/);
  for (const factor of ['growth duration', 'spread chance', 'opportunity cost', 'decay risk']) {
    assert.ok(panel.includes(factor), `the caveat drops "${factor}", which kb-45 lists`);
  }
  // And no copy claims one plant beats another. The caveat itself says "not
  // the best plant", so the check is for the *claim*, not for the word: an
  // assertion that forbids its own disclaimer is worse than none.
  assert.doesNotMatch(panel, /leads at|trails at|\bis the best\b|\u00d7 the best base crop/);
});

test('every verification date is newer than the last game change it covers', () => {
  // AGENTS.md rule 2. The newest change recorded in docs/FARMING_HISTORY.md is
  // the August 2026 Greenhouse rebalance.
  const history = read('docs/FARMING_HISTORY.md');
  assert.match(history, /2026-08/, 'the history no longer records the August 2026 rebalance');
  const cutoff = '2026-08-01';

  const stale = [];
  for (const dir of ['src', 'research']) {
    for (const name of readdirSync(new URL(`${dir}/`, root))) {
      if (!/\.(js|json)$/.test(name)) continue;
      const text = read(`${dir}/${name}`);
      for (const match of text.matchAll(/["']?(?:lastVerified|last_verified|asOf|as_of|verifiedAt)["']?\s*[:=]\s*["'](\d{4}-\d{2}-\d{2})["']/g)) {
        if (match[1] < cutoff) stale.push(`${dir}/${name}: ${match[1]}`);
      }
    }
  }
  assert.deepEqual([...new Set(stale)], [], `values verified before the newest game change:\n${stale.join('\n')}`);
});

test('the misplaced Pest Fortune declaration stays where it is used', () => {
  // `const totalPestFortune = ... killStats ...` had been written into
  // `writeVacuumEntry`, which has no `killStats`. Two things broke: the render
  // threw "totalPestFortune is not defined" so the Vacuum loadout panel never
  // appeared, and every save of a Vacuum entry threw "killStats is not
  // defined". Neither showed up in a unit test, because both are runtime
  // scope errors in a DOM enhancer.
  const source = read('src/loadout-capabilities-ui.js');
  const writer = source.match(/function writeVacuumEntry[\s\S]*?\n}/)[0];
  assert.doesNotMatch(writer, /killStats|totalPestFortune/,
    'the writer must not reach for render-scope stats');
  // And it is declared next to the stats it reads.
  assert.match(source, /const killStats = statsForMode\(raw, cropId, ACTIVITY_MODE\.PEST_KILL\);[\s\S]{0,400}?const totalPestFortune =/);
});

test('the Vacuum damage model reads the research, not a copy', () => {
  assert.match(read('src/vacuum-damage.js'), /from '\.\.\/research\/vacuum-damage\.js'/);
  // No base damage restated in src/.
  const source = read('src/vacuum-damage.js');
  for (const value of ['100', '150', '200', '300', '400']) {
    assert.doesNotMatch(source, new RegExp(`damage:\\s*${value}`), `src restates a base damage (${value})`);
  }
});
