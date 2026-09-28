import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATALOG_STORAGE_KEY,
  OPTION_SOURCE,
  catalogIsStale,
  enchantmentOptions,
  gemOptions,
  intrinsicEnchantmentsForCatalogItem,
  itemsForSlot,
  loadItemCatalog,
  mergeFarmingSetupCatalog,
  reduceItemResource,
  reforgeOptions,
  slotHasOfficialCategory,
} from '../src/item-catalog.js';
import { installLocalStorage, uninstallLocalStorage } from './local-storage-stub.js';

const RESOURCE = {
  success: true,
  items: [
    {
      id: 'HELIANTHUS_HELMET', name: 'Helianthus Helmet', category: 'HELMET', tier: 'MYTHIC', material: 'SKULL_ITEM',
      skin: 'ABCDEF'.repeat(10) + 'ABCD', gemstone_slots: [
        { slot_type: 'PERIDOT' },
        {
          slot_type: 'PERIDOT',
          requirements: [{ type: 'ITEM_DATA', data_key: 'levelable_lvl', operator: 'GREATER_THAN_OR_EQUALS', value: 15 }],
          costs: [{ type: 'COINS', coins: 250000 }, { type: 'ITEM', item_id: 'FINE_PERIDOT_GEM', amount: 2 }],
        },
      ],
      can_recombobulate: true,
    },
    {
      id: 'FERMENTO_HELMET', name: 'Fermento Helmet', category: 'HELMET', tier: 'LEGENDARY', material: 'SKULL_ITEM',
      gemstone_slots: [{ slot_type: 'PERIDOT' }, { slot_type: 'PERIDOT' }],
    },
    { id: 'HELIANTHUS_BOOTS', name: 'Helianthus Boots', category: 'BOOTS', material: 'LEATHER_BOOTS', color: '120,200,40' },
    { id: 'LOTUS_BRACELET', name: 'Lotus Bracelet', category: 'BRACELET', material: 'SKULL_ITEM', cannot_reforge: true, can_recombobulate: false },
    { id: 'NO_NAME', category: 'HELMET' },
    { name: 'No id', category: 'HELMET' },
    'not an object',
  ],
};

test.afterEach(() => uninstallLocalStorage());

test('the official resource keeps art and exact upgrade capability metadata', () => {
  const items = reduceItemResource(RESOURCE);
  assert.equal(items.length, 4, 'entries without a usable id or name are skipped, not guessed at');
  assert.deepEqual(items[0], {
    id: 'HELIANTHUS_HELMET',
    name: 'Helianthus Helmet',
    category: 'HELMET',
    tier: 'MYTHIC',
    material: 'SKULL_ITEM',
    skin: ('ABCDEF'.repeat(10) + 'ABCD').toLowerCase(),
    color: null,
    gemstoneSlots: [
      { index: 0, slotType: 'PERIDOT', requirements: [], costs: [] },
      {
        index: 1,
        slotType: 'PERIDOT',
        requirements: [{ type: 'ITEM_DATA', dataKey: 'levelable_lvl', operator: 'GREATER_THAN_OR_EQUALS', value: '15' }],
        costs: [{ type: 'COINS', coins: 250000 }, { type: 'ITEM', itemId: 'FINE_PERIDOT_GEM', amount: 2 }],
      },
    ],
    cannotReforge: false,
    canRecombobulate: true,
  });
  assert.equal(items[2].tier, null, 'a missing tier stays null');
  assert.deepEqual(items[2].gemstoneSlots, [], 'absence of gemstone_slots is zero sockets, not an unknown wildcard');
  assert.equal(items[3].cannotReforge, true);
  assert.equal(items[3].canRecombobulate, false);
});

test('an unrecognised payload yields an empty catalogue rather than nonsense', () => {
  for (const payload of [null, {}, { items: 'nope' }, { data: [] }]) assert.deepEqual(reduceItemResource(payload), []);
});

test('a slot offers only the items in its own categories', () => {
  const items = reduceItemResource(RESOURCE);
  assert.deepEqual(itemsForSlot(items, 'helmet').map(item => item.name), ['Fermento Helmet', 'Helianthus Helmet']);
  assert.deepEqual(itemsForSlot(items, 'boots').map(item => item.id), ['HELIANTHUS_BOOTS']);
  assert.deepEqual(itemsForSlot(items, 'equipment4').map(item => item.id), ['LOTUS_BRACELET']);
});


test('the local setup fallback keeps farming armor and equipment selectable without fetched catalog data', () => {
  const catalog = mergeFarmingSetupCatalog([]);
  const helmetIds = new Set(itemsForSlot(catalog, 'helmet').map(item => item.id));
  const bootsIds = new Set(itemsForSlot(catalog, 'boots').map(item => item.id));
  const cloakIds = new Set(itemsForSlot(catalog, 'equipment2').map(item => item.id));
  const petItemIds = new Set(itemsForSlot(catalog, 'petItem').map(item => item.id));

  for (const id of ['FARM_SUIT_HELMET', 'CROPIE_HELMET', 'SQUASH_HELMET', 'FERMENTO_HELMET', 'HELIANTHUS_HELMET']) {
    assert.equal(helmetIds.has(id), true, `${id} should remain selectable offline`);
  }
  assert.equal(bootsIds.has('RANCHERS_BOOTS'), true);
  assert.equal(bootsIds.has('FARMER_BOOTS'), true);
  assert.equal(cloakIds.has('LOTUS_CLOAK'), true);
  assert.equal(cloakIds.has('BLOSSOM_CLOAK'), true);
  assert.equal(cloakIds.has('PESTHUNTERS_CLOAK'), true);
  assert.equal(cloakIds.has('PEST_VEST'), true);
  assert.equal(cloakIds.has('ZORROS_CAPE'), true);
  for (const id of ['YELLOW_BANDANA', 'GREEN_BANDANA', 'POIGNANT_LUCKY_CLOVER', 'BROWN_BANDANA']) {
    assert.equal(petItemIds.has(id), true, `${id} should remain selectable offline`);
  }

  const helianthus = itemsForSlot(catalog, 'helmet').find(item => item.id === 'HELIANTHUS_HELMET');
  assert.equal(helianthus.name, 'Helianthus Helmet');
  assert.equal(helianthus.tier, 'LEGENDARY');
  const peony = itemsForSlot(catalog, 'equipment1').find(item => item.id === 'LOTUS_NECKLACE');
  assert.equal(peony.name, 'Peony Necklace');
  assert.equal(peony.tier, 'RARE');
});

test('official catalog metadata overrides fallback metadata while fallback coverage stays available', () => {
  const catalog = mergeFarmingSetupCatalog([
    {
      id: 'HELIANTHUS_HELMET',
      name: 'Helianthus Helmet',
      category: 'HELMET',
      tier: 'MYTHIC',
      skin: 'live-skin',
      gemstoneSlots: [{ index: 0, slotType: 'PERIDOT', requirements: [], costs: [] }],
    },
  ]);

  const helianthus = catalog.find(item => item.id === 'HELIANTHUS_HELMET');
  assert.equal(helianthus.tier, 'MYTHIC');
  assert.equal(helianthus.skin, 'live-skin');
  assert.equal(helianthus.gemstoneSlots.length, 1);
  assert.equal(catalog.some(item => item.id === 'FERMENTO_HELMET'), true);
});

test('Pet Item slot rejects non-farming Pet Items from the live catalog', () => {
  const catalog = mergeFarmingSetupCatalog([
    { id: 'GREEN_BANDANA', name: 'Green Bandana', category: 'PET_ITEM', tier: 'EPIC' },
    { id: 'PET_ITEM_COMBAT_SKILL_BOOST_EPIC', name: 'Combat Exp Boost', category: 'PET_ITEM', tier: 'EPIC' },
    { id: 'PET_ITEM_FISHING_SKILL_BOOST_EPIC', name: 'Fishing Exp Boost', category: 'PET_ITEM', tier: 'EPIC' },
    { id: 'PET_ITEM_QUICK_CLAW', name: 'Quick Claw', category: 'PET_ITEM', tier: 'EPIC' },
  ]);
  assert.deepEqual(
    itemsForSlot(catalog, 'petItem').map(item => item.id).sort(),
    ['BROWN_BANDANA', 'GREEN_BANDANA', 'POIGNANT_LUCKY_CLOVER', 'YELLOW_BANDANA'],
  );
});

test('current Pesthunter and Zorro ids stay selectable in their equipment slots', () => {
  const catalog = [
    { id: 'PESTHUNTERS_NECKLACE', name: "Pesthunter's Necklace", category: 'NECKLACE' },
    { id: 'PESTHUNTERS_CLOAK', name: "Pesthunter's Cloak", category: 'CLOAK' },
    { id: 'PESTHUNTERS_BELT', name: "Pesthunter's Belt", category: 'BELT' },
    { id: 'PESTHUNTERS_GLOVES', name: "Pesthunter's Gloves", category: 'GLOVES' },
    { id: 'PEST_VEST', name: 'Pest Vest', category: 'CLOAK' },
    { id: 'ZORROS_CAPE', name: "Zorro's Cape", category: 'CLOAK' },
  ];
  assert.deepEqual(itemsForSlot(catalog, 'equipment1').map(item => item.id), ['PESTHUNTERS_NECKLACE']);
  assert.deepEqual(itemsForSlot(catalog, 'equipment2').map(item => item.id).sort(), ['PESTHUNTERS_CLOAK', 'PEST_VEST', 'ZORROS_CAPE']);
  assert.deepEqual(itemsForSlot(catalog, 'equipment3').map(item => item.id), ['PESTHUNTERS_BELT']);
  assert.deepEqual(itemsForSlot(catalog, 'equipment4').map(item => item.id), ['PESTHUNTERS_GLOVES']);
});

test('only the celebration Pufferfish Hat seeds intrinsic Thorns V', () => {
  assert.deepEqual(intrinsicEnchantmentsForCatalogItem({ id: 'PUFFERFISH_HAT_CELEBRATION' }), { thorns: 5 });
  assert.deepEqual(intrinsicEnchantmentsForCatalogItem({ id: 'PUFFERFISH_HAT' }), {});
  assert.deepEqual(intrinsicEnchantmentsForCatalogItem(null), {});
});

test('a slot with no official category falls back to free text', () => {
  assert.equal(slotHasOfficialCategory('helmet'), true);
  assert.equal(slotHasOfficialCategory('pet'), false);
  assert.deepEqual(itemsForSlot(reduceItemResource(RESOURCE), 'pet'), []);
});

test("legacy generic reforge options still include app/profile values", () => {
  const fromData = reforgeOptions(null);
  assert.ok(fromData.some(option => option.value === 'mossy' && option.source === OPTION_SOURCE.APP_DATA));
  assert.ok(fromData.some(option => option.value === 'beady'));
  const withProfile = reforgeOptions({ items: [{ reforge: 'Blooming' }] });
  assert.equal(withProfile.find(option => option.value === 'blooming').source, OPTION_SOURCE.PROFILE);
});

test('a value present in both sources is listed once, attributed to the profile', () => {
  const mossy = reforgeOptions({ items: [{ reforge: 'mossy' }] }).filter(option => option.value === 'mossy');
  assert.equal(mossy.length, 1);
  assert.equal(mossy[0].source, OPTION_SOURCE.PROFILE);
});

test('enchantment and gem options come from decoded items', () => {
  const snapshot = { items: [{ enchantments: { pesterminator: 6, SUNSET: 5 }, gems: { PERIDOT_0: 'PERFECT', JASPER_1: { quality: 'FINE' } } }] };
  assert.deepEqual(enchantmentOptions(snapshot).map(option => option.value).sort(), ['pesterminator', 'sunset']);
  assert.deepEqual(gemOptions(snapshot).map(option => option.value).sort(), ['FINE JASPER', 'PERFECT PERIDOT']);
});

test('no options are invented when there is nothing to read', () => {
  assert.deepEqual(enchantmentOptions(null), []);
  assert.deepEqual(gemOptions(null), []);
});

test('a fresh cache is reused instead of refetched', async () => {
  const storage = installLocalStorage();
  storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ fetchedAt: new Date().toISOString(), items: [{ id: 'A', name: 'A' }] }));
  let called = false;
  const result = await loadItemCatalog({ fetchImpl: async () => { called = true; } });
  assert.equal(called, false);
  assert.equal(result.fromCache, true);
  assert.equal(result.items.length, 1);
});

test('a stale cache is refreshed and rewritten', async () => {
  const storage = installLocalStorage();
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ fetchedAt: old, items: [{ id: 'OLD', name: 'Old' }] }));
  assert.equal(catalogIsStale({ fetchedAt: old }), true);
  const result = await loadItemCatalog({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => RESOURCE }) });
  assert.equal(result.fromCache, false);
  assert.equal(result.items.length, 4);
  assert.equal(JSON.parse(storage.getItem(CATALOG_STORAGE_KEY)).items.length, 4);
});

test('the resource is requested keylessly from the official endpoint', async () => {
  installLocalStorage();
  const seen = [];
  await loadItemCatalog({ fetchImpl: async (url, init) => { seen.push({ url, init }); return { ok: true, status: 200, json: async () => RESOURCE }; } });
  assert.equal(seen[0].url, 'https://api.hypixel.net/v2/resources/skyblock/items');
  assert.equal(seen[0].init.headers['API-Key'], undefined);
});

test('a failed fetch keeps a stale cache and reports the reason', async () => {
  const storage = installLocalStorage();
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ fetchedAt: old, items: [{ id: 'OLD', name: 'Old' }] }));
  const result = await loadItemCatalog({ fetchImpl: async () => { throw new TypeError('offline'); } });
  assert.equal(result.items.length, 1);
  assert.equal(result.fromCache, true);
  assert.match(result.error, /could not be loaded/);
});

test('a failed fetch with no cache degrades to an empty catalogue, not a throw', async () => {
  installLocalStorage();
  const result = await loadItemCatalog({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
  assert.deepEqual(result.items, []);
  assert.match(result.error, /HTTP 500/);
});

test('a resource that parses to nothing is treated as a failure', async () => {
  installLocalStorage();
  const result = await loadItemCatalog({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) }) });
  assert.deepEqual(result.items, []);
  assert.match(result.error, /no recognisable entries/);
});

test('a full storage quota does not break loading', async () => {
  const storage = installLocalStorage();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const result = await loadItemCatalog({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => RESOURCE }) });
  assert.equal(result.items.length, 4);
  assert.equal(result.error, null);
});


test('catalog cache generation is refreshed for current Attribute Shard metadata', () => {
  assert.equal(CATALOG_STORAGE_KEY, 'farming420-item-catalog-v5');
});


test('renamed early farming armor keeps current picker names while using legacy physical ids', () => {
  const catalog = mergeFarmingSetupCatalog([
    { id: 'FARM_SUIT_HELMET', name: 'Farm Suit Helmet', category: 'HELMET', tier: 'COMMON', color: '253,232,98' },
    { id: 'FARM_ARMOR_HELMET', name: 'Farm Armor Helmet', category: 'HELMET', tier: 'COMMON', material: 'HAY_BLOCK' },
    { id: 'PUMPKIN_HELMET', name: 'Pumpkin Helmet', category: 'HELMET', tier: 'UNCOMMON', skin: 'pumpkin-live-skin' },
    { id: 'MELON_HELMET', name: 'Melon Helmet', category: 'HELMET', tier: 'UNCOMMON', skin: 'melon-live-skin' },
  ]);

  const helmets = itemsForSlot(catalog, 'helmet');
  assert.equal(helmets.find(item => item.id === 'FARM_SUIT_HELMET')?.name, 'Farmhand Helmet');
  assert.equal(helmets.find(item => item.id === 'FARM_ARMOR_HELMET')?.name, 'Haymaker Helmet');
  assert.equal(helmets.find(item => item.id === 'PUMPKIN_HELMET')?.name, 'Sprout Helmet');
  assert.equal(helmets.find(item => item.id === 'MELON_HELMET')?.name, 'Tater Helmet');
  assert.equal(helmets.find(item => item.id === 'MELON_HELMET')?.skin, 'melon-live-skin');
  assert.equal(helmets.some(item => item.name === 'Tater Helmet'), true);
});
