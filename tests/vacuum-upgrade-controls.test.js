import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/loadout-capabilities-ui.js', import.meta.url), 'utf8');
const exact = readFileSync(new URL('../src/vacuum-exact-ui.js', import.meta.url), 'utf8');

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


test('Vacuum editor follows the same progression-first order as crop tools', () => {
  assert.match(exact, /<h3>Vacuum progression<\/h3>/);
  assert.match(exact, /<strong>Vacuum model<\/strong>/);
  assert.match(exact, /data-vacuum-model/);
  assert.match(exact, /This replaces the Mk\. tier choice used by crop tools/);
  assert.match(source, /data-vacuum-section="reforge"/);
  assert.match(source, /data-vacuum-section="upgrades"/);
  assert.match(exact, /data-vacuum-gemstones="1"/);
});

test('Vacuum does not render a second identity header below its accordion card', () => {
  const start = source.indexOf('function renderVacuumSurface(raw)');
  const end = source.indexOf('\nfunction apply()', start);
  const render = source.slice(start, end);
  assert.doesNotMatch(render, /item-editor-head/);
  assert.doesNotMatch(render, /item-identity/);
  assert.match(render, /sb-docked-editor sb-tool-editor-collapsed/);
});

test('exact Vacuum sections anchor around reforge and upgrades without observer churn', () => {
  assert.match(exact, /querySelector\('\[data-vacuum-section="reforge"\]'\)/);
  assert.match(exact, /insertAdjacentElement\('beforebegin', progression\)/);
  assert.match(exact, /querySelector\('\[data-vacuum-section="upgrades"\]'\)/);
  assert.match(exact, /insertAdjacentElement\('afterend', gemstones\)/);
  assert.match(exact, /oldProgression\?\.dataset\.signature === signature && oldGemstones\?\.dataset\.signature === signature/);
});
