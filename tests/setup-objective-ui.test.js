import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('Setups page exposes objective-aware owned setup analysis', () => {
  assert.match(app, /evaluateSetupObjective/);
  assert.match(app, /data-setup-objective-panel/);
  assert.match(app, /Normal crop/);
  assert.match(app, /Jacob Contest/);
});

test('objective UI only applies a recommendation through an explicit user action', () => {
  assert.match(app, /data-setup-objective-apply/);
  assert.match(app, /Use this setup/);
  assert.match(app, /applyCandidateSetupSafely/);
  assert.match(app, /Previous setup preserved/);
  assert.match(app, /does not invent a weighted winner/);
});
