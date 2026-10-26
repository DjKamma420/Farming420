import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEMPORARY_FARMING_MODIFIERS } from '../src/farming-modifiers-data.js';
import { PESTHUNTER_PHILIP } from '../src/pest-model.js';

const research = JSON.parse(readFileSync(new URL('../research/hypixel_farming_master_ai_2026-09-16.json', import.meta.url), 'utf8'));

test('the master research cannot advertise an unverified Phillip rate or +1000 live cap', () => {
  for (const key of ['philip_fortune_per_pest_0_27', 'philip_pest_cap_0_27', 'philip_max_farming_fortune_0_27']) {
    assert.equal(research.current_key_values[key], null, key);
  }
  const buff = research.temporary_and_consumable.pesthunter_philip;
  assert.equal(buff.current_0_27, null);
  assert.equal(buff.status, 'VERIFY_LIVE');
  assert.equal(buff.live_verified, false);
  assert.equal(buff.last_live_verified, null);
  assert.equal(buff.live_pest_cost_for_full_buff, null);
  assert.equal(buff.live_duration_seconds, null);
  assert.deepEqual([buff.alpha_preview.fortune_per_pest, buff.alpha_preview.pest_count_for_cap, buff.alpha_preview.max_farming_fortune], [5, 40, 200]);
  assert.equal(buff.alpha_preview.confidence, 'ALPHA_ONLY');
  assert.match(buff.alpha_preview.source, /aug-3-0-27-alpha-changes-2/);
});

test('Phillip research and Info preview retain the canonical modifier authority and provenance', () => {
  const row = TEMPORARY_FARMING_MODIFIERS.pesthunterPhillip;
  const preview = research.temporary_and_consumable.pesthunter_philip.alpha_preview;
  assert.equal(preview.fortune_per_pest, row.farmingFortunePerPest);
  assert.equal(preview.pest_count_for_cap, row.previewPestCountForCap);
  assert.equal(preview.pest_count_for_cap, preview.max_farming_fortune / preview.fortune_per_pest);
  assert.equal(row.currentPestCostForFullBuff, null);
  assert.equal(preview.max_farming_fortune, row.farmingFortuneCap);
  assert.equal(preview.source, row.source);
  assert.equal(preview.source_date, row.sourceDate);
  assert.equal(PESTHUNTER_PHILIP.confidence, row.confidence);
  assert.equal(PESTHUNTER_PHILIP.status, row.status);
  assert.equal(PESTHUNTER_PHILIP.source, row.source);
  assert.equal(PESTHUNTER_PHILIP.sourceDate, row.sourceDate);
  assert.equal(row.durationSeconds, null);
  assert.equal(PESTHUNTER_PHILIP.durationMinutes, null, 'unknown seconds must not be coerced to zero minutes');
});
