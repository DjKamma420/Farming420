import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { finiteNonNegativeInteger } from '../src/finite-number.js';
import { philipFortuneFor } from '../src/pest-model.js';
import { phillipActivationTiming, phillipBuffEffect } from '../src/farming-modifiers-data.js';

const invalidCounts = ['1.0000000000000001', '1e-324', '9007199254740993', '9007199254740990.5', '-1e-324', '0x10', 2 ** 53, 1.5, null, undefined, false, [], {}, ''];
const invalidDurations = ['1e308', '1e100', '1e-308', '1e-324', '0', '-1', '', 'abc', null, undefined, false];

test('Phillip count consumers reject rounded fractions, underflow and unsafe integers', () => {
  for (const input of invalidCounts) {
    assert.equal(finiteNonNegativeInteger(input), null, String(input));
    assert.equal(philipFortuneFor(input), null, String(input));
    assert.equal(phillipBuffEffect({pestCount:input, activeUntilMs:110000}, 100000).baseFarmingFortune, null, String(input));
  }
});

test('exact whole decimal and exponent counts preserve zero, partial and capped previews', () => {
  for (const [input, count] of [['0e-999999',0], ['.0',0], ['10.',10], ['1.5e1',15], ['17.000',17], ['1e2',100], ['9007199254740991',Number.MAX_SAFE_INTEGER]]) {
    assert.equal(finiteNonNegativeInteger(input), count, input);
    assert.equal(philipFortuneFor(input).requested, count);
    assert.equal(philipFortuneFor(input).fortune, Math.min(count * 5, 200));
    const effect = phillipBuffEffect({pestCount:input, activeUntilMs:110000},100000);
    assert.equal(effect.baseFarmingFortune, Math.min(count * 5, 200));
    assert.equal(effect.farmingFortune, null);
    assert.equal(effect.complete, false);
  }
});

test('observed timing rejects derived overflow, lost expiry precision and invalid Date range', () => {
  for (const input of invalidDurations) assert.equal(phillipActivationTiming(input, 1700000000000), null, String(input));
  assert.equal(phillipActivationTiming(1, 8640000000000000), null);
  assert.equal(phillipActivationTiming(1, Number.MAX_SAFE_INTEGER), null);
  for (const now of [null, false, '', -1, Infinity, 1.5]) assert.equal(phillipActivationTiming(30, now), null, String(now));
});

test('observed timing is independent of the unknown game default and expires exactly once', () => {
  const now = 1700000000000;
  for (const minutes of [0.5, 1, 30, 60]) {
    const timing = phillipActivationTiming(String(minutes), now);
    assert.deepEqual(timing, {durationSeconds:minutes * 60, activeUntilMs:now + minutes * 60000});
    assert.deepEqual(JSON.parse(JSON.stringify(timing)), timing);
    assert.equal(phillipBuffEffect({pestCount:17,...timing},now).remainingSeconds, minutes * 60);
    assert.equal(phillipBuffEffect({pestCount:17,...timing},timing.activeUntilMs).farmingFortune, 0);
  }
});

// Execute the actual owning handlers; browser CI covers native input/persistence.
const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const start = source.indexOf("  document.querySelector('[data-phillip-count]')?.addEventListener");
const end = source.indexOf("  document.querySelector('[data-phillip-deactivate]')", start);
assert.ok(start >= 0 && end > start, 'Phillip handlers must be present');
function harness(profile = {temporaryEffects:{pesthunterPhillip:{pestCount:17, active:true, durationSeconds:1800, activeUntilMs:1700001800000, observedSource:'preserved'}}}) {
  const handlers = {}, calls = [];
  const input = {value:'', message:'', reports:0, setCustomValidity(message) { this.message=message; }, reportValidity() { this.reports++; }};
  const state = {profile};
  const document = {querySelector(selector) {
    if (selector === '[data-phillip-duration]') return input;
    return {addEventListener(event, handler) { handlers[selector] = handler; }};
  }};
  runInNewContext(source.slice(start,end), {document, state, finiteNonNegativeInteger,
    phillipActivationTiming:value=>phillipActivationTiming(value,1700000000000),
    Date:{now:()=>1700000000000}, UPGRADES:[{id:'temporary-buff-pesthunter-phillip-buff'}],
    setEntryLevel:()=>calls.push('owned'), applyComputedStatsToState:()=>calls.push('compute'),
    saveState:()=>calls.push('save'), render:()=>calls.push('render')});
  return {state, input, calls, count:()=>handlers['[data-phillip-count]']({target:input}), activate:handlers['[data-phillip-activate]']};
}

test('invalid count changes preserve the exact saved activation and perform no owner writes', () => {
  const h = harness(), before = JSON.stringify(h.state);
  for (const input of invalidCounts.filter(value=>typeof value === 'string' && value !== '')) {
    h.input.value=input; h.count();
    assert.equal(JSON.stringify(h.state), before, input);
    assert.deepEqual(h.calls, [], input);
    assert.match(h.input.message, /whole/);
  }
  h.input.value='40'; h.count();
  assert.equal(h.state.profile.temporaryEffects.pesthunterPhillip.pestCount,40);
  assert.equal(h.input.message,'');
  assert.deepEqual(h.calls,['compute','save','render']);
});

test('invalid durations preserve the exact saved activation; valid recovery replaces one timer', () => {
  const h=harness(), before=JSON.stringify(h.state);
  for (const input of invalidDurations.filter(value=>typeof value==='string')) {
    h.input.value=input; h.activate();
    assert.equal(JSON.stringify(h.state),before,input);
    assert.deepEqual(h.calls,[],input);
    assert.match(h.input.message,/observed potion duration/);
  }
  h.input.value='60'; h.activate();
  assert.equal(h.input.message,'');
  assert.deepEqual(h.calls,['owned','compute','save','render']);
  const record=h.state.profile.temporaryEffects.pesthunterPhillip;
  assert.deepEqual(record,{pestCount:17,active:true,durationSeconds:3600,activeUntilMs:1700003600000,observedSource:'preserved'});
  assert.equal(Object.keys(h.state.profile.temporaryEffects).length,1);
});

test('blank count clears only the count and invalid timing cannot create an activation', () => {
  const h=harness(); h.count();
  assert.equal(h.state.profile.temporaryEffects.pesthunterPhillip.pestCount,null);
  assert.equal(h.state.profile.temporaryEffects.pesthunterPhillip.durationSeconds,1800);
  const empty=harness({}); empty.input.value='1e308'; empty.activate();
  assert.deepEqual(empty.state,{profile:{}});
  assert.deepEqual(empty.calls,[]);
});
