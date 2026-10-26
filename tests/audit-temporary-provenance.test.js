import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES } from '../src/data.js';
import { computeTotalsFromEntries } from '../src/computed-stats.js';
import { GARDEN_CHIPS, CHIP_LEVEL_CAP, gardenChipEffect, phillipBuffEffect, temporaryModifierEffect, FARMING_SHARDS_027 } from '../src/farming-modifiers-data.js';
import { PESTS, VACUUMS, idealVacuumPullCount, idealVacuumKillSeconds, guaranteedPestCropDropInput } from '../src/pest-mechanics-data.js';
import { GARDEN_VACUUM_ITEMS } from '../src/exact-farming-items.js';
import { petLevelFromExperience, mooshroomStrengthFortune, mooshroomStrengthRequirement, mooshroomCowContribution } from '../src/mooshroom-cow.js';
import { VACUUM_BOOKWORM_BOOK } from '../src/vacuum-data-patches.js';

test('Phillip count is partial/capped, one activation expires, and Alpha preview cannot become complete', () => {
  const now = 100000;
  for (const [pestCount, expected] of [[0,0],[1,5],[17,85],[40,200],[200,200]]) {
    const effect = phillipBuffEffect({ pestCount, activeUntilMs:now+10000 },now);
    assert.equal(effect.baseFarmingFortune,expected);
    assert.equal(effect.farmingFortune,null);
    assert.equal(effect.complete,false);
    assert.equal(effect.remainingSeconds,10);
  }
  for (const count of [null,undefined,'',' ',false,[],{},-1,1.5]) assert.equal(phillipBuffEffect({ pestCount:count, activeUntilMs:now+10000 },now).baseFarmingFortune,null);
  assert.equal(phillipBuffEffect({ pestCount:40 },now).complete,false);
  for (const activation of [{ active:false },{ pestCount:40,activeUntilMs:now },{ pestCount:40,activeUntilMs:now-1 }]) {
    assert.equal(phillipBuffEffect(activation,now).farmingFortune,0);
    assert.equal(phillipBuffEffect(activation,now).complete,true);
    assert.equal(temporaryModifierEffect('pesthunter-phillip',{ activation, nowMs:now,hyperchargePercent:100 }).farmingFortune,0);
  }
  const item = UPGRADES.find(row=>row.id==='temporary-buff-pesthunter-phillip-buff');
  const state = { profile:{ levels:{[item.id]:1}, temporaryEffects:{pesthunterPhillip:{pestCount:40,activeUntilMs:Date.now()+60000}} } };
  assert.equal(computeTotalsFromEntries(state,[item],'melon').globalFortune,0);
  assert.equal(computeTotalsFromEntries(state,[item],'melon').incomplete.globalFortune.length,1);
  state.profile.temporaryEffects.pesthunterPhillip.active=false;
  assert.equal(computeTotalsFromEntries(state,[item],'melon').incomplete.globalFortune.length,0);
});

test('all five Vacuum tiers reuse physical damage and legal modifiers without guessed elapsed time', () => {
  for (const record of GARDEN_VACUUM_ITEMS) {
    assert.equal(VACUUMS[record.id].damagePerPull,record.baseDamage);
    assert.equal(idealVacuumPullCount(record.id,600),Math.ceil(600/record.baseDamage));
    assert.equal(idealVacuumPullCount({skyblockId:record.id,levels:{[VACUUM_BOOKWORM_BOOK.id]:1}},600),Math.ceil(600/(record.baseDamage+20)));
    assert.equal(idealVacuumPullCount({skyblockId:record.id,reforge:'buzzing'},600),Math.ceil(600/(record.baseDamage*2)));
    assert.equal(idealVacuumKillSeconds(record.id,600),null);
  }
  assert.equal(idealVacuumPullCount('unknown',600),null);
  assert.equal(idealVacuumPullCount('SKYMART_VACUUM',null),null);
  assert.equal(idealVacuumPullCount('SKYMART_VACUUM',0),0);
});

test('Rarefinder has one live rarity table; visible max +50 stays correct', () => {
  const item=UPGRADES.find(row=>row.chipId==='rarefinder');
  for (const [rarity,max] of [['RARE',15],['EPIC',30],['LEGENDARY',50]]) {
    const cap=CHIP_LEVEL_CAP[rarity];
    assert.equal(gardenChipEffect('rarefinder',{rarity,level:cap}),max);
    assert.equal(gardenChipEffect('rarefinder',{rarity,level:2}),max/cap*2);
    const state={profile:{levels:{[item.id]:cap},chipRarities:{rarefinder:rarity}}};
    assert.equal(computeTotalsFromEntries(state,[item],'melon').overbloom,max);
  }
  assert.equal(item.stepGain*item.max,50);
  assert.equal(item.source,GARDEN_CHIPS.rarefinder.source);
  const cropshot=UPGRADES.find(row=>row.chipId==='cropshot');
  assert.equal(cropshot.status,'VERIFY');
  assert.equal(cropshot.stepGain,null);
  for (const rarity of Object.keys(CHIP_LEVEL_CAP)) assert.equal(gardenChipEffect('cropshot',{rarity,level:CHIP_LEVEL_CAP[rarity]}),null);
});

test('historical Pest and Alpha/community shard evidence stays incomplete in runtime consumers', () => {
  const drop=guaranteedPestCropDropInput('fly',{farmingFortune:2000,cropFortune:0},100);
  assert.equal(drop.expectedQuantity,null);
  assert.equal(PESTS.fly.historicalFortunePerExtraUnit,35);
  assert.equal(PESTS.fly.confidence,'HISTORICAL_ALPHA');
  for(const shard of Object.values(FARMING_SHARDS_027).filter(row=>row.status.includes('VERIFY'))) {
    const item=UPGRADES.find(row=>row.section==='shards'&&row.name.startsWith(shard.name));
    if(item) assert.equal(item.status,'VERIFY',item.id);
  }
});

test('Cow unknown numeric inputs and unverified rarity/level curves stay unknown', () => {
  for (const input of [null,undefined,'',' ',false,true,[],[1000],{}]) {
    assert.equal(petLevelFromExperience(input,'LEGENDARY'),null);
    assert.equal(mooshroomStrengthFortune(input,100,'LEGENDARY'),null);
    assert.equal(mooshroomStrengthRequirement(input),null);
  }
  assert.equal(petLevelFromExperience(0,'LEGENDARY'),1);
  assert.equal(mooshroomStrengthFortune(0,100,'LEGENDARY'),0);
  assert.equal(mooshroomStrengthFortune(1000,100,'LEGENDARY'),35);
  for (const rarity of ['RARE','EPIC','MYTHIC','UNKNOWN',null]) assert.equal(mooshroomStrengthFortune(1000,100,rarity),null);
  assert.equal(mooshroomStrengthFortune(1000,50,'LEGENDARY'),null);
  const state={profile:{inputs:{strength:1000},setups:{activeId:'normal',list:[{id:'normal',slots:{pet:{skyblockId:'MOOSHROOM_COW',rarity:'MYTHIC',petLevel:100}}}]}}};
  assert.equal(mooshroomCowContribution(state).incomplete,true);
});
