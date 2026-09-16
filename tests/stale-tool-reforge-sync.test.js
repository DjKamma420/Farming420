import assert from 'node:assert/strict';
import test from 'node:test';

import { applySnapshotToProgress, isAutoApplied } from '../src/snapshot-apply.js';
import { createEmptyProfileSnapshot } from '../src/profile-normalizer.js';

function state() {
  return { schemaVersion: 5, profile: { levels: {}, owned: {}, cropProgress: {}, toolProgress: {} } };
}

function snapshot(reforge, displayName = 'Melon Dicer 3.0') {
  const base = createEmptyProfileSnapshot();
  return {
    ...base,
    items: [{
      container: 'inventory',
      displayName,
      reforge,
      enchantments: {},
      gems: {},
    }],
  };
}

const BLESSED = 'tool-reforge-blessed-reforge';
const BOUNTIFUL = 'tool-reforge-bountiful-reforge';

test('sync replaces auto-applied Blessed with Bountiful on the same physical tool', () => {
  const current = state();
  applySnapshotToProgress(current, snapshot('blessed'));
  assert.equal(current.profile.toolProgress['melon-dicer'].levels[BLESSED], 1);
  assert.ok(isAutoApplied(current, 'tool:melon-dicer', BLESSED));

  applySnapshotToProgress(current, snapshot('bountiful'));
  const tool = current.profile.toolProgress['melon-dicer'];
  assert.equal(tool.levels[BLESSED], undefined);
  assert.equal(tool.owned[BLESSED], undefined);
  assert.equal(tool.levels[BOUNTIFUL], 1);
  assert.ok(!isAutoApplied(current, 'tool:melon-dicer', BLESSED));
  assert.ok(isAutoApplied(current, 'tool:melon-dicer', BOUNTIFUL));
});

test('sync removes an old auto-applied reforge when the tool has no reforge now', () => {
  const current = state();
  applySnapshotToProgress(current, snapshot('bountiful'));
  applySnapshotToProgress(current, snapshot(null));

  const tool = current.profile.toolProgress['melon-dicer'];
  assert.equal(tool.levels[BLESSED], undefined);
  assert.equal(tool.levels[BOUNTIFUL], undefined);
  assert.equal(tool.owned[BLESSED], undefined);
  assert.equal(tool.owned[BOUNTIFUL], undefined);
  assert.ok(!isAutoApplied(current, 'tool:melon-dicer', BOUNTIFUL));
});

test('manual reforge progress without an auto marker survives recomputation', () => {
  const current = state();
  current.profile.toolProgress['melon-dicer'] = {
    levels: { [BLESSED]: 1 },
    owned: { [BLESSED]: true },
    costs: {},
    manualGain: {},
  };

  applySnapshotToProgress(current, snapshot(null));
  assert.equal(current.profile.toolProgress['melon-dicer'].levels[BLESSED], 1);
  assert.equal(current.profile.toolProgress['melon-dicer'].owned[BLESSED], true);
});

test('reforge cleanup is scoped to one physical tool', () => {
  const current = state();
  applySnapshotToProgress(current, snapshot('blessed', 'Melon Dicer 3.0'));
  applySnapshotToProgress(current, snapshot('bountiful', "Euclid's Wheat Sickle"));

  assert.equal(current.profile.toolProgress['melon-dicer'].levels[BLESSED], 1);
  assert.equal(current.profile.toolProgress['euclid-s-wheat-sickle'].levels[BOUNTIFUL], 1);
});

test('shared Eclipse Sickle uses one shared bucket while replacing reforges', () => {
  const current = state();
  applySnapshotToProgress(current, snapshot('blessed', 'Eclipse Sickle'));
  applySnapshotToProgress(current, snapshot('bountiful', 'Eclipse Sickle'));

  const tool = current.profile.toolProgress['eclipse-sickle'];
  assert.equal(tool.levels[BLESSED], undefined);
  assert.equal(tool.levels[BOUNTIFUL], 1);
});
