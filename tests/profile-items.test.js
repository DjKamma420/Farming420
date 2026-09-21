import assert from 'node:assert/strict';
import test from 'node:test';

import { extractProfileItems } from '../src/profile-items.js';
import { farmingInventoryBase64 } from './nbt-fixture.js';

function encoded(data = farmingInventoryBase64()) {
  return { type: 0, data };
}

test('profile item extraction decodes inventory and loadout containers and de-duplicates item UUIDs', async () => {
  const payload = {
    profiles: [{
      profile_id: 'profile-1',
      selected: true,
      members: {
        '1111aaaa': {
          inventory: {
            inv_contents: encoded(),
            inv_armor: encoded(),
          },
          loadout: {
            armor: {
              equipped_set: 1,
              1: { HELMET: encoded() },
            },
          },
        },
      },
    }],
  };

  const result = await extractProfileItems(payload);
  assert.equal(result.profileId, 'profile-1');
  assert.equal(result.inventoryApiAvailable, true);
  assert.equal(result.encodedContainersFound, 3);
  assert.equal(result.containersDecoded, 3);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].skyblockId, 'THEORETICAL_HOE_WHEAT_3');
  assert.equal(result.items[0].locations.length, 3);
  assert.deepEqual(result.items[0].enchantments, {
    cultivating: 10,
    harvesting: 6,
    turbo_wheat: 5,
  });
});

test('one corrupt container does not discard correctly decoded containers', async () => {
  const payload = {
    profiles: [{
      profile_id: 'profile-1',
      members: {
        '1111aaaa': {
          inventory: {
            inv_contents: encoded(),
            inv_armor: encoded('broken base64'),
          },
        },
      },
    }],
  };

  const result = await extractProfileItems(payload);
  assert.equal(result.items.length, 1);
  assert.equal(result.encodedContainersFound, 2);
  assert.equal(result.containersDecoded, 1);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /armor:/);
});

test('missing inventory API data is reported as unavailable instead of an empty owned setup', async () => {
  const result = await extractProfileItems({
    profiles: [{ profile_id: 'profile-1', members: { '1111aaaa': {} } }],
  });
  assert.equal(result.inventoryApiAvailable, false);
  assert.equal(result.encodedContainersFound, 0);
  assert.deepEqual(result.items, []);
});

test('co-op member ambiguity is refused instead of mixing inventories', async () => {
  await assert.rejects(() => extractProfileItems({
    profiles: [{
      profile_id: 'profile-1',
      members: { first: {}, second: {} },
    }],
  }), /could not be resolved/);
});


test('equipped equipment loadouts are exposed as worn equipment for setup autofill', async () => {
  const payload = {
    profiles: [{
      profile_id: 'profile-1',
      members: {
        '1111aaaa': {
          loadout: {
            equipment: {
              equipped_set: 2,
              1: { EQUIPMENT_SLOT_1: encoded() },
              2: { EQUIPMENT_SLOT_3: encoded() },
            },
          },
        },
      },
    }],
  };

  const result = await extractProfileItems(payload);
  assert.equal(result.items.length, 1, 'the same physical UUID is deduplicated across saved and equipped loadouts');
  assert.equal(result.items[0].container, 'equipment', 'the equipped location wins over a saved loadout location');
  assert.equal(result.items[0].slot, 2, 'equipment slot 3 maps to logical setup slot index 2');
  assert.ok(result.items[0].locations.some(location => location.container === 'loadout.equipment.1.equipment_slot_1'));
  assert.ok(result.items[0].locations.some(location => location.container === 'equipment' && location.slot === 2));
});

test('equipped armor loadout slots keep armor ordering even without inv_armor', async () => {
  const payload = {
    profiles: [{
      profile_id: 'profile-1',
      members: {
        '1111aaaa': {
          loadout: {
            armor: {
              equipped_set: 4,
              4: { HELMET: encoded() },
            },
          },
        },
      },
    }],
  };

  const result = await extractProfileItems(payload);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].container, 'armor');
  assert.equal(result.items[0].slot, 3, 'helmet is the highest armor slot, matching setup prefill ordering');
});
