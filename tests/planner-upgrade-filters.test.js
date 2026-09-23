import test from 'node:test';
import assert from 'node:assert/strict';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import {
  UPGRADE_FILTER,
  UPGRADE_FILTERS,
  aggregateUpgradeRows,
  matchesUpgradeFilter,
  upgradeUsageScope,
  visitorSystemUpgrade,
} from '../src/planner-upgrade-filters.js';
import { createDefaultSetups } from '../src/setups.js';

function stateWithSetups() {
  const setups = createDefaultSetups();
  const byId = Object.fromEntries(setups.list.map(setup => [setup.id, setup]));
  const armor = ['helmet', 'chestplate', 'leggings', 'boots'];
  for (const slot of armor) {
    const shared = { skyblockId: `HELIANTHUS_${slot.toUpperCase()}`, physicalItemId: `shared:${slot}` };
    byId.normal.slots[slot] = { ...shared };
    byId['pest-kill'].slots[slot] = { ...shared };
    byId.pest.slots[slot] = {
      skyblockId: `HELIANTHUS_${slot.toUpperCase()}`,
      physicalItemId: `spawn:${slot}`,
    };
  }
  return { selectedCrop: 'melon', profile: { setups } };
}

function row(item, activityMode, marginalCoinsHour = 100) {
  return {
    item,
    activityMode,
    marginalCoinsHour,
    gain: 1,
    targetRole: { label: 'test' },
    costKnown: false,
    cost: null,
    modeled: 'fortune',
  };
}

test('recommended-upgrade filter set is the requested seven filters', () => {
  assert.deepEqual(
    UPGRADE_FILTERS.map(entry => entry.id),
    ['all', 'overbloom', 'bpc', 'ff', 'cf-crop', 'greenhouse', 'visitor'],
  );
});

test('filter classification separates global FF from crop-specific CF and keeps goal overlaps', () => {
  const globalFf = { id: 'account-ff', section: 'account', metric: 'Crop Yield', cropScope: 'Any', name: 'Farming Fortune' };
  const cropFf = { id: 'tool-enchant-turbo-crop', section: 'tools', metric: 'Crop Yield', cropScope: 'Any', name: 'Turbo-Crop' };
  const greenhouseFf = { id: 'greenhouse-reward', section: 'account', category: 'Greenhouse', metric: 'Crop Yield', cropScope: 'Any', name: 'Mutation Analysis rewards' };
  const visitor = { id: 'visitor-speed', section: 'chips', metric: 'Visitor Speed', cropScope: 'Any', name: 'Quickdraw Chip' };
  const bpc = { id: 'bpc', section: 'shards', metric: 'Pest Spawn', name: 'Bonus Pest Chance shard', notes: '+5 BPC' };
  const overbloom = { id: 'overbloom', section: 'gear', metric: 'Rare Crops', name: 'Sunset Overbloom' };

  assert.equal(matchesUpgradeFilter(globalFf, UPGRADE_FILTER.FARMING_FORTUNE), true);
  assert.equal(matchesUpgradeFilter(globalFf, UPGRADE_FILTER.CROP_FORTUNE), false);
  assert.equal(matchesUpgradeFilter(cropFf, UPGRADE_FILTER.CROP_FORTUNE), true);
  assert.equal(matchesUpgradeFilter(cropFf, UPGRADE_FILTER.FARMING_FORTUNE), false);
  assert.equal(matchesUpgradeFilter(greenhouseFf, UPGRADE_FILTER.GREENHOUSE), true);
  assert.equal(matchesUpgradeFilter(greenhouseFf, UPGRADE_FILTER.FARMING_FORTUNE), true);
  assert.equal(matchesUpgradeFilter(visitor, UPGRADE_FILTER.VISITOR), true);
  assert.equal(matchesUpgradeFilter(bpc, UPGRADE_FILTER.BPC), true);
  assert.equal(matchesUpgradeFilter(overbloom, UPGRADE_FILTER.OVERBLOOM), true);
});

test('Visitor filter contains Visitor-system upgrades, not gear that merely scales from Visitor progress', () => {
  const quickdraw = {
    id: 'garden-chip-quickdraw-chip',
    section: 'chips',
    metric: 'Visitor Speed',
    name: 'Quickdraw Chip',
    notes: '-2.5% Visitor cooldown per level',
  };
  const mudworm = {
    id: 'attribute-shard-mudworm-visitor-bait',
    section: 'shards',
    metric: 'Visitor Speed',
    attribute: 'Visitor Bait',
    name: 'Mudworm Shard',
    notes: 'Garden Visitors arrive faster',
  };
  const invisibug = {
    id: 'attribute-shard-invisibug-fancy-visit',
    section: 'shards',
    metric: 'Visitor Rarity',
    attribute: 'Fancy Visit',
    name: 'Invisibug Shard',
  };
  const visitorCopper = {
    id: 'attribute-shard-ladybug-pretty-clothes',
    section: 'shards',
    metric: 'Copper Rewards',
    attribute: 'Pretty Clothes',
    name: 'Ladybug Shard',
    notes: '+1% Copper from Garden Visitors',
  };
  const cheaperOffers = {
    id: 'visitor-offer-discount',
    metric: 'Visitor Economy',
    name: 'Visitor offer discount',
    notes: 'Makes Visitor offers cheaper',
  };
  const sunset = {
    id: 'armor-enchant-sunset-v-day-overbloom',
    metric: 'Rare Crops',
    name: 'Sunset V',
    notes: 'Its separate night effect reduces Garden Visitor cooldown while breaking crops.',
  };
  const blossom = {
    id: 'equipment-blossom-set-visitor-bonus',
    metric: 'Crop Yield',
    name: 'Blossom set visitor bonus',
    notes: 'At 2,500 visitors, Florist grants Farming Fortune.',
  };
  const greenThumb = {
    id: 'equipment-enchant-green-thumb-v-on-equipment',
    metric: 'Crop Yield',
    name: 'Green Thumb V',
    notes: 'Scales with unique visitors served.',
  };
  const synthesis = {
    id: 'garden-chip-synthesis-chip',
    metric: 'Copper Rewards',
    name: 'Synthesis Chip',
    notes: 'Base Copper rewards from the Crop Analyzer.',
  };

  for (const item of [quickdraw, mudworm, invisibug, visitorCopper, cheaperOffers, sunset]) {
    assert.equal(visitorSystemUpgrade(item), true, item.id);
    assert.equal(matchesUpgradeFilter(item, UPGRADE_FILTER.VISITOR), true, item.id);
  }
  for (const item of [blossom, greenThumb, synthesis]) {
    assert.equal(visitorSystemUpgrade(item), false, item.id);
    assert.equal(matchesUpgradeFilter(item, UPGRADE_FILTER.VISITOR), false, item.id);
  }
});

test('shared physical armor is one recommendation while a separate spawning set stays separate', () => {
  const state = stateWithSetups();
  const item = {
    id: 'armor-reforge-mossy-on-full-armor',
    section: 'gear',
    metric: 'Crop Yield',
    name: 'Mossy',
  };
  const rows = [
    row(item, ACTIVITY_MODE.FARM, 100),
    row(item, ACTIVITY_MODE.PEST_SPAWN, 80),
    row(item, ACTIVITY_MODE.PEST_KILL, 120),
  ];

  const merged = aggregateUpgradeRows(rows, state, 'melon');
  assert.equal(merged.length, 2);

  const shared = merged.find(entry => entry.activityModes.includes(ACTIVITY_MODE.FARM));
  assert.deepEqual(
    [...shared.activityModes].sort(),
    [ACTIVITY_MODE.FARM, ACTIVITY_MODE.PEST_KILL].sort(),
  );
  assert.match(shared.setupLabel, /Farming \+ Pest Killing/);
  assert.match(shared.setupLabel, /shared item/);

  const spawning = merged.find(entry => entry.activityModes.length === 1);
  assert.deepEqual(spawning.activityModes, [ACTIVITY_MODE.PEST_SPAWN]);
});

test('crop tool upgrades merge Farming and Spawning without pretending Killing uses that tool', () => {
  const state = stateWithSetups();
  const item = {
    id: 'tool-enchant-turbo-crop',
    section: 'tools',
    metric: 'Crop Yield',
    name: 'Turbo-Crop',
  };
  const farmScope = upgradeUsageScope(state, item, ACTIVITY_MODE.FARM, 'melon');
  const spawnScope = upgradeUsageScope(state, item, ACTIVITY_MODE.PEST_SPAWN, 'melon');
  assert.equal(farmScope.key, spawnScope.key);

  const merged = aggregateUpgradeRows([
    row(item, ACTIVITY_MODE.FARM),
    row(item, ACTIVITY_MODE.PEST_SPAWN),
  ], state, 'melon');

  assert.equal(merged.length, 1);
  assert.deepEqual(
    [...merged[0].activityModes].sort(),
    [ACTIVITY_MODE.FARM, ACTIVITY_MODE.PEST_SPAWN].sort(),
  );
  assert.match(merged[0].setupLabel, /shared item/);
});

test('set-independent upgrades collapse across every loadout', () => {
  const state = stateWithSetups();
  const item = {
    id: 'account-skill-farming-skill-level',
    section: 'account',
    metric: 'Crop Yield',
    name: 'Farming Skill level',
  };
  const merged = aggregateUpgradeRows([
    row(item, ACTIVITY_MODE.FARM, 100),
    row(item, ACTIVITY_MODE.PEST_SPAWN, 90),
    row(item, ACTIVITY_MODE.PEST_KILL, 110),
  ], state, 'melon');

  assert.equal(merged.length, 1);
  assert.equal(merged[0].setupLabel, 'Global / set-independent');
  assert.equal(merged[0].marginalCoinsHour, 110);
});
