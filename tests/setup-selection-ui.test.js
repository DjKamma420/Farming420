import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { effectiveItemRarity } from '../src/setup-selection-ui.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('setup editor is moved directly after the selected slot and spans the full grid row', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /selected\.insertAdjacentElement\('afterend', editor\)/);
  assert.match(source, /selected\.nextElementSibling !== editor/);
  assert.match(source, /selected\?\.closest\('\.slot-grid'\)/);
  assert.match(css, /\.slot-grid > \.sb-docked-setup-editor\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});

test('pet editor uses closed pet, rarity and level controls instead of the generic free-text item editor', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /dataSet|dataset/);
  assert.match(source, /farmingPetSelect/);
  assert.match(source, /farmingPetRarity/);
  assert.match(source, /farmingPetLevel/);
  assert.match(source, /FARMING_PETS/);
  assert.match(css, /\.sb-pet-editor > \.item-editor-grid:not\(\.sb-pet-picker\)/);
  assert.match(css, /display:\s*none/);
});

test('recombobulation changes displayed effective rarity without overwriting the base rarity', () => {
  const item = { rarity: 'LEGENDARY', recombobulated: true };
  assert.equal(effectiveItemRarity(item), 'MYTHIC');
  assert.equal(item.rarity, 'LEGENDARY');
  assert.equal(effectiveItemRarity({ rarity: 'EPIC', recombobulated: false }), 'EPIC');
  assert.equal(effectiveItemRarity({ rarity: 'MYTHIC', recombobulated: true }), 'DIVINE');
  assert.equal(effectiveItemRarity({ rarity: null, recombobulated: true }), null);
});

test('index loads the setup selection module and stylesheet', () => {
  const html = read('index.html');
  assert.match(html, /src\/setup-selection-ui\.css/);
  assert.match(html, /src\/setup-selection-ui\.js/);
});
