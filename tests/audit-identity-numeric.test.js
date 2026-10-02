import assert from 'node:assert/strict';
import test from 'node:test';
import { UPGRADES } from '../src/data.js';
import { computeTotalsFromEntries } from '../src/computed-stats.js';
import { applyFarmingToolReforge, selectedFarmingToolReforge } from '../src/item-capabilities.js';
import { syncedPetForSetup } from '../src/pet-identity.js';
import { createDefaultSetups } from '../src/setups.js';
import { mooshroomCowContribution } from '../src/mooshroom-cow.js';
import { activeRoseDragon } from '../src/rose-dragon.js';
import { activePestSpawnPet } from '../src/pest-spawn-pets.js';
import { activePestSpawnInput, expectedPestsPerSpawnFromBonusPestChance, expectedGuaranteedPestCropQuantity } from '../src/pest-mechanics-data.js';
import { gardenChipEffect, hyperchargedFarmingFortune, temporaryModifierEffect } from '../src/farming-modifiers-data.js';
import { contestEstimate } from '../src/contest-estimate.js';

const blessed = 'tool-reforge-blessed-reforge';
const bountiful = 'tool-reforge-bountiful-reforge';
const entries = UPGRADES.filter(row => [blessed, bountiful].includes(row.id));

test('one explicit physical reforge suppresses stale flags in either order and both Eclipse crops', () => {
  for (const ids of [[blessed,bountiful],[bountiful,blessed]]) for (const rarity of ['RARE','EPIC','LEGENDARY','MYTHIC']) {
    const bucket = { reforge: 'bountiful', toolRarity: rarity, levels: Object.fromEntries(ids.map(id => [id,1])), owned: {}, costs: { old: 7 }, physicalSource: 'manual', itemUuid: 'physical', acquiredAt: 'before' };
    const state = { profile: { toolProgress: { 'eclipse-sickle': bucket } } };
    for (const crop of ['sunflower','moonflower']) {
      const totals = computeTotalsFromEntries(state, entries, crop);
      assert.equal(totals.sourceCount.cropFortune, 1);
      assert.equal(totals.cropFortune, 10);
    }
    applyFarmingToolReforge(bucket, 'blessed');
    assert.equal(selectedFarmingToolReforge(bucket), 'blessed');
    assert.equal(bucket.levels[bountiful], undefined);
    assert.deepEqual([bucket.toolRarity,bucket.physicalSource,bucket.itemUuid,bucket.acquiredAt,bucket.costs], [rarity,'manual','physical','before',{old:7}]);
    applyFarmingToolReforge(bucket, null);
    bucket.levels[blessed] = 1;
    assert.equal(selectedFarmingToolReforge(bucket), null);
    assert.equal(computeTotalsFromEntries(state, entries, 'sunflower').sourceCount.cropFortune, 0);
  }
});

test('one legacy flag remains supported; conflicting legacy flags remain incomplete', () => {
  const bucket = { levels: { [blessed]: 1 }, owned: {} };
  assert.equal(selectedFarmingToolReforge(bucket), 'blessed');
  bucket.levels[bountiful] = 1;
  assert.equal(selectedFarmingToolReforge(bucket), null);
  const totals = computeTotalsFromEntries({ profile: { toolProgress: { 'melon-dicer': bucket } } }, entries, 'melon');
  assert.equal(totals.cropFortune, 0);
  assert.equal(totals.sourceCount.cropFortune, 1);
  assert.equal(totals.incomplete.cropFortune.length, 1);
});

function petState(type, copies, selected) {
  const setups = createDefaultSetups();
  setups.list[0].slots.pet = { skyblockId: type, rarity: 'LEGENDARY', ...selected };
  return { profile: { setups, inputs: { strength: 0 }, normalizedSnapshot: { pets: copies } } };
}

test('pet UUID resolves the actual second physical copy independently of snapshot order', () => {
  for (const type of ['MOOSHROOM_COW','ROSE_DRAGON','MOSQUITO','SLUG']) {
    const copies = [{ type, uuid:'first', experience:0, rarity:'LEGENDARY' },{ type, uuid:'second', experience:30_000_000, rarity:'LEGENDARY' }];
    for (const ordered of [copies,[...copies].reverse()]) {
      const state = petState(type, ordered, { physicalItemId:'pet:second' });
      assert.equal(syncedPetForSetup(state, state.profile.setups.list[0].slots.pet).uuid, 'second');
      const result = type === 'MOOSHROOM_COW' ? mooshroomCowContribution(state) : type === 'ROSE_DRAGON' ? activeRoseDragon(state) : activePestSpawnPet(state);
      assert.ok(result.level >= 100);
      state.profile.setups.list[0].slots.pet.petLevel = 57;
      const manual = type === 'MOOSHROOM_COW' ? mooshroomCowContribution(state) : type === 'ROSE_DRAGON' ? activeRoseDragon(state) : activePestSpawnPet(state);
      assert.equal(manual.level, 57);
    }
    for (const physicalItemId of [null,'pet:missing']) {
      const state = petState(type,copies,{ physicalItemId });
      assert.equal(syncedPetForSetup(state,state.profile.setups.list[0].slots.pet),null);
      if (type === 'MOOSHROOM_COW') assert.equal(mooshroomCowContribution(state).incomplete,true);
    }
  }
});

test('numeric absence and nonnumeric types never become known Pest/Chip/Hypercharge values', () => {
  for (const value of [null,undefined,'',' ',false,true,[],[0],{},NaN,Infinity]) {
    assert.equal(expectedPestsPerSpawnFromBonusPestChance(value),null);
    assert.equal(expectedGuaranteedPestCropQuantity('fly',{ farmingFortune:value,cropFortune:0 }),null);
    assert.equal(expectedGuaranteedPestCropQuantity('fly',{ farmingFortune:0,cropFortune:value }),null);
    assert.equal(activePestSpawnInput({ bonusPestChance:value }).pestsPerSpawnExpected,null);
    assert.equal(gardenChipEffect('hypercharge',{ level:value,rarity:'LEGENDARY' }),null);
    assert.equal(hyperchargedFarmingFortune(100,value),null);
    assert.equal(hyperchargedFarmingFortune(value,0),null);
    assert.equal(temporaryModifierEffect('crop-fever',{ hyperchargePercent:value }).farmingFortune,null);
  }
  assert.equal(expectedPestsPerSpawnFromBonusPestChance(0),1);
  assert.equal(expectedGuaranteedPestCropQuantity('fly',{ farmingFortune:0,cropFortune:0 }),1);
  assert.equal(gardenChipEffect('hypercharge',{ level:0,rarity:'LEGENDARY' }),0);
  assert.equal(hyperchargedFarmingFortune(100,0),100);
  assert.equal(temporaryModifierEffect('crop-fever').farmingFortune,100);
});

test('contest Fortune absence blocks scoring while explicit zero and omitted contest bonus remain valid', () => {
  const input = { cropId:'melon',measured:{ breaksPerSecond:20,uptimePercent:100 } };
  for (const value of [null,undefined,'',' ',false,[]]) for (const key of ['farmingFortune','cropFortune']) {
    const stats = { farmingFortune:0,cropFortune:0,[key]:value };
    const result = contestEstimate({ ...input,stats });
    assert.equal(result.complete,false);
    assert.equal(result.expectedCollection,null);
  }
  assert.equal(contestEstimate({ ...input,stats:{ farmingFortune:0,cropFortune:0 } }).complete,true);
  assert.equal(contestEstimate({ ...input,stats:{ farmingFortune:0,cropFortune:0 } }).contestCropFortune,0);
});
