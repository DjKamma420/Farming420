import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { effectiveItemRarity, setTextIfChanged } from '../src/setup-selection-ui.js';

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

test('observed rarity text is idempotent so the MutationObserver cannot trigger itself forever', () => {
  let writes = 0;
  let value = 'MYTHIC';
  const node = {};
  Object.defineProperty(node, 'textContent', {
    get: () => value,
    set: next => { writes += 1; value = next; },
  });

  assert.equal(setTextIfChanged(node, 'MYTHIC'), false);
  assert.equal(writes, 0, 'same text must not write into the observed subtree');
  assert.equal(setTextIfChanged(node, 'DIVINE'), true);
  assert.equal(writes, 1);
  assert.equal(setTextIfChanged(node, 'DIVINE'), false);
  assert.equal(writes, 1, 're-applying the same UI state must stay mutation-free');

  const source = read('src/setup-selection-ui.js');
  assert.match(source, /setTextIfChanged\(rarity, rarityText\)/);
  assert.doesNotMatch(source, /rarity\.textContent\s*=/);
});

test('index loads the setup selection module and stylesheet', () => {
  const html = read('index.html');
  assert.match(html, /src\/setup-selection-ui\.css/);
  assert.match(html, /src\/setup-selection-ui\.js/);
});
