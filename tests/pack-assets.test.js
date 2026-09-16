import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { UPGRADES } from '../src/data.js';
import { assetKeyForSkyblockId, itemAssetForSkyblockId } from '../src/item-assets.js';

const syncScript = readFileSync(new URL('../scripts/sync-hypixel-pack.py', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/sync-pack.yml', import.meta.url), 'utf8');

test('every Garden chip names the picture it should show', () => {
  // All ten chips the app scores exist in the official pack, so any chip without
  // a picture is an oversight rather than a gap in the pack.
  const chips = UPGRADES.filter(item => item.section === 'chips');
  assert.equal(chips.length, 10);
  for (const chip of chips) {
    assert.ok(chip.packAsset, `${chip.id} shows no picture`);
  }
});

test('a named picture is a key the lookup can actually use', () => {
  // The app asks for an id, lower-cases it and looks the key up. A name with a
  // slash or a capital in it would never resolve.
  for (const item of UPGRADES.filter(entry => entry.packAsset)) {
    assert.equal(assetKeyForSkyblockId(item.packAsset), item.packAsset,
      `${item.id} names "${item.packAsset}", which is not a usable key`);
  }
});

test('the manifest is keyed by that same id, not by where the pack files it', () => {
  // The pack files definitions in folders ("jacob/melon_dicer"), but the app has
  // MELON_DICER. Keying by the folder path meant every lookup missed.
  assert.match(syncScript, /PurePosixPath\(relative\)\.name\.lower\(\)/);
  const manifest = {
    schemaVersion: 1,
    pack: { id: 'SkyBlock', hash: 'abc' },
    items: { cropshot_chip: { texture: 'textures/item/island_relevant/garden/chips/cropshot_chip.png' } },
  };
  const asset = itemAssetForSkyblockId(manifest, 'CROPSHOT_CHIP');
  assert.ok(asset, 'a SkyBlock id must resolve against a basename-keyed manifest');
  assert.equal(asset.textureUrl, './assets/hypixel-pack/textures/item/island_relevant/garden/chips/cropshot_chip.png');
});

test('an id two items share is dropped rather than guessed at', () => {
  // Five ids collide in the real pack, all opal gems. Picking one would show a
  // picture that might belong to the other item.
  assert.match(syncScript, /collisions\[key\] = \[existing\["source"\], relative\]/);
  assert.match(syncScript, /"ambiguous":/);
});

test('only the pictures are shipped, not the definitions that resolve them', () => {
  // The definitions and models are read out of the archive during the sync and
  // deliberately left behind: they were two thirds of the tree and nothing reads
  // them afterwards.
  assert.match(syncScript, /COPY_PREFIXES = \(f"\{NAMESPACE\}textures\/item\/",\)/);
  assert.doesNotMatch(syncScript, /COPY_PREFIXES[\s\S]{0,200}models\/item/);
  // And nothing may hand out a path to a file that is no longer there.
  const assets = readFileSync(new URL('../src/item-assets.js', import.meta.url), 'utf8');
  assert.doesNotMatch(assets, /record\.definition/);
});

test('the sync refuses to finish if the app names a picture the pack lacks', () => {
  // Otherwise a renamed item quietly falls back to a placeholder and nobody
  // notices until they open the page.
  assert.match(workflow, /packAsset/);
  assert.match(workflow, /src\/data\.js names pictures this pack does not have/);
});

test('progression cards can carry a picture at all', () => {
  // A chip is an entry in the upgrade list, not something worn in a setup slot.
  // Before this the art layer never reached the Garden Chips page.
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-pack-asset=/);
  const art = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(art, /querySelectorAll\('\[data-pack-asset\]'\)/);
  // The same guard as everywhere else: an observer must not see its own work.
  const guards = art.match(/classList\.contains\('has-official-item-art'\)/g) || [];
  assert.ok(guards.length >= 2, 'each insertion point needs its own container guard');
});
