import assert from 'node:assert/strict';
import test from 'node:test';

import { HYPIXEL_PACKS_ENDPOINT, selectSkyBlockResourcePack } from '../src/resource-pack.js';

test('Hypixel pack metadata comes from the public packs endpoint', () => {
  assert.equal(HYPIXEL_PACKS_ENDPOINT, 'https://api.hypixel.net/v2/resources/packs');
});

test('the newest valid SkyBlock pack format is selected without hard-coding a deploy id', () => {
  const selected = selectSkyBlockResourcePack({
    packs: [{
      id: 'SkyBlock',
      deployId: 'deploy-123',
      lastUpdated: 123456,
      versions: [
        { packFormat: 75, hash: 'old', url: 'https://resourcepacks.hypixel.net/SkyBlock/deploy-123/75.zip' },
        { packFormat: 88, hash: 'new', url: 'https://resourcepacks.hypixel.net/SkyBlock/deploy-123/88.zip' },
      ],
    }],
  });
  assert.deepEqual(selected, {
    id: 'SkyBlock',
    deployId: 'deploy-123',
    lastUpdated: 123456,
    packFormat: 88,
    hash: 'new',
    url: 'https://resourcepacks.hypixel.net/SkyBlock/deploy-123/88.zip',
  });
});

test('non-Hypixel pack URLs are rejected', () => {
  assert.equal(selectSkyBlockResourcePack({
    packs: [{ id: 'SkyBlock', versions: [{ packFormat: 88, url: 'https://example.com/fake.zip' }] }],
  }), null);
});
