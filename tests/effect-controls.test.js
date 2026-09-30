import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { UPGRADES } from '../src/data.js';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('Celestial Mason Jar uses one progression state for all of its effects', () => {
  const rows = UPGRADES.filter(item => item.id.startsWith('mixin-celestial-mason-jar'));
  assert.equal(rows.length, 1);

  const masonJar = rows[0];
  assert.equal(masonJar.id, 'mixin-celestial-mason-jar');
  assert.equal(masonJar.max, 1);
  assert.equal(masonJar.stepGain, 15);
  assert.deepEqual(masonJar.additionalEffects, [
    {
      label: 'Farming Wisdom',
      metric: 'Farming XP',
      stepGain: 3,
    },
  ]);
});

test('direct card controls use a switch only for binary state and level buttons for every larger max', () => {
  const source = read('direct-controls.js');

  assert.match(source, /max === 1\s*\? binaryControl\(item, current\)\s*:\s*chainControl\(item, current, max\)/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-checked=/);
  assert.doesNotMatch(source, /SMALL_CHAIN_MAX/);
  assert.doesNotMatch(source, /stepperControl/);
  assert.doesNotMatch(source, /data-direct-step/);
});

test('level button rows remain horizontally usable at large max levels', () => {
  const css = read('direct-controls.css');

  assert.match(css, /\.sb-card-switch-track/);
  assert.match(css, /\.sb-card-switch-knob/);
  assert.match(css, /\.sb-card-chain[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.sb-card-stage\.selected/);
});

test('cards present linked effects together instead of needing duplicate cards', () => {
  const source = read('app.js');

  assert.match(source, /Array\.isArray\(item\.additionalEffects\)/);
  assert.match(source, /const gainText = \[primaryGainText, \.\.\.additionalGainText\]/);
  assert.match(source, /<span>\$\{esc\(gainText\)\}<\/span>/);
});
