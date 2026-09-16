import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANNER_MODES, plannerModeById, relevanceScore } from '../src/planner-modes.js';

test('planner exposes all required goal modes', () => {
  assert.deepEqual(PLANNER_MODES.map(mode => mode.id), [
    'profit', 'collection', 'xp', 'rare-crops', 'seasoning', 'sowdust', 'pests',
  ]);
});

test('profit stays revenue-aware while other goals stay relevance-based', () => {
  assert.equal(plannerModeById('profit').kind, 'revenue');
  for (const id of ['collection', 'xp', 'rare-crops', 'seasoning', 'sowdust', 'pests']) {
    assert.equal(plannerModeById(id).kind, 'relevance');
  }
});

test('specialist mode matchers recognize their intended mechanics', () => {
  const base = { metric: '', modeScope: 'Any', category: '', name: '', notes: '' };
  assert.equal(plannerModeById('xp').match({ ...base, metric: 'Tool XP' }), true);
  assert.equal(plannerModeById('rare-crops').match({ ...base, metric: 'Overbloom / Visitor Cooldown' }), true);
  assert.equal(plannerModeById('seasoning').match({ ...base, notes: 'Harvest Feast Seasoning gain' }), true);
  assert.equal(plannerModeById('sowdust').match({ ...base, category: 'Greenhouse', notes: 'Sowdust bonus' }), true);
  assert.equal(plannerModeById('pests').match({ ...base, modeScope: 'Pest Spawning' }), true);
});

test('relevance score prefers active contextual upgrades without inventing coin value', () => {
  const generic = { status: 'ACTIVE', cropScope: 'Any', modeScope: 'Any', metric: 'Tool XP', category: 'Pet', name: 'A', notes: '' };
  const contextual = { ...generic, cropScope: 'Wheat', modeScope: 'Jacob Contest' };
  assert.ok(relevanceScore(contextual, 5) > relevanceScore(generic, 5));
});
