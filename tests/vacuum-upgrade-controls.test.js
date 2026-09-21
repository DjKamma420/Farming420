import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/loadout-capabilities-ui.js', import.meta.url), 'utf8');

test('Vacuum upgrades use the same progression rows and steppers as farming tools', () => {
  assert.match(source, /<div class="workspace-level-list">/);
  assert.match(source, /<div class="workspace-level-row">/);
  assert.match(source, /<div class="workspace-stepper">/);
  assert.match(source, /data-vacuum-number=/);
  assert.match(source, /data-vacuum-step="-1"/);
  assert.match(source, /data-vacuum-step="1"/);
  assert.doesNotMatch(source, /data-vacuum-level=/);
  assert.doesNotMatch(source, /class="enchant-level"[^>]*data-vacuum/);
});

test('Vacuum progression includes zero as the explicit not-applied state', () => {
  assert.match(source, /Array\.from\(\{ length: max \+ 1 \}/);
  assert.match(source, /if \(level === 0\) writeVacuumEntry\(item, \{ clear: true \}\)/);
  assert.match(source, /if \(next === 0\) writeVacuumEntry\(item, \{ clear: true \}\)/);
});

test('single-step Vacuum upgrades keep the tool-style toggle row', () => {
  assert.match(source, /workspace-level-row workspace-toggle-row/);
  assert.match(source, /if \(max === 1\)/);
});
