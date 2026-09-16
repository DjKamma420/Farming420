import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

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

test('the service-worker check survives a synced resource pack', () => {
  // scripts/sync-hypixel-pack.py writes assets/hypixel-pack/. A directory
  // listing that does not distinguish files from directories reports that tree
  // as an uncached shipped file, which fails the check the first time anyone
  // runs the sync -- including the workflow that runs it in CI.
  const checker = readFileSync(new URL('../scripts/check-sw-manifest.js', import.meta.url), 'utf8');
  assert.match(checker, /withFileTypes: true/);
  assert.match(checker, /entry\.isFile\(\)/);
  assert.match(checker, /NOT_PRECACHED/);
  assert.match(checker, /'hypixel-pack'/);
});

test('the pack sync workflow opens a reviewable pull request instead of pushing', () => {
  // The pack is a third party's asset tree. It reaches the repository through a
  // pull request so its contents and size are seen before they land.
  const workflow = readFileSync(new URL('../.github/workflows/sync-pack.yml', import.meta.url), 'utf8');
  assert.match(workflow, /gh pr create/);
  assert.match(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /git push .*origin (main|HEAD:main)/);
  // A run that finds the same pack must do nothing at all.
  assert.match(workflow, /git status --porcelain assets\/hypixel-pack/);
  // Nothing lands without the repository's own checks having run against it.
  assert.match(workflow, /npm test/);
  assert.match(workflow, /check-sw-manifest\.js/);
});
