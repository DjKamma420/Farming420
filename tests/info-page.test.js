import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const enhancements = readFileSync(new URL('../src/enhancements.js', import.meta.url), 'utf8');
const art = readFileSync(new URL('../src/skyblock-redesign.js', import.meta.url), 'utf8');

test('Info replaces the standalone Guide navigation entry', () => {
  assert.match(app, /\['info', 'Info'\]/);
  assert.doesNotMatch(app, /\['guide', 'Guide 0-60'\]/);
  assert.match(app, /loaded\.page === 'guide'\) loaded\.page = 'info'/);
  assert.match(enhancements, /\['Guides', \['info', 'qol'\]\]/);
  assert.match(art, /info: \['plant_diagnostics_tool'\]/);
});

test('Info is explicitly a beginner strategy and location hub', () => {
  assert.match(app, /Farming Info & Beginner Guide/);
  assert.match(app, /Early-game strategy/);
  assert.match(app, /Important places and NPCs/);
  for (const place of ['Farm Merchant', 'Sam', 'SkyMart', 'Garden Desk', 'Beth', 'Jacob & Anita', 'Pesthunter Phillip']) {
    assert.ok(app.includes(place), place);
  }
});

test('the detailed 0-60 guide is embedded in Info instead of deleted', () => {
  assert.match(app, /guidePage\(true\)/);
  assert.match(app, /function guidePage\(embedded = false\)/);
  assert.match(app, /Progression reference/);
  assert.match(app, /if \(state\.page === 'info'\) bindGuide\(\)/);
});
