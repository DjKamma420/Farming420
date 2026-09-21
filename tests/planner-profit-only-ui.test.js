import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('upgrade planner exposes profit only and no goal mode selector assets', () => {
  assert.match(index, /src\/revenue-planner\.js/);
  assert.match(index, /src\/revenue-planner\.css/);
  assert.doesNotMatch(index, /src\/planner-mode-ui\.js/);
  assert.doesNotMatch(index, /src\/planner-mode-ui\.css/);
});
