import { toolGemstoneFortune } from './gemstone-slots.js';
import { selectedVacuumReforge } from './item-capabilities.js';
import {
  VACUUM_BOOKWORM_BOOK,
  VACUUM_BUG_BLENDER,
  VACUUM_FARMING_FOR_DUMMIES,
} from './vacuum-data-patches.js';
import {
  vacuumEffectiveRarity,
  vacuumFallbackGemstoneSlotCount,
  vacuumRecordById,
} from './exact-farming-items.js';

export const VACUUM_RECOMB_FIELD = 'recombobulated';

const BUZZING_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 2,
  UNCOMMON: 3,
  RARE: 5,
  EPIC: 7,
  LEGENDARY: 9,
  MYTHIC: 11,
});

const BEADY_DAMAGE_BY_RARITY = Object.freeze({
  COMMON: 5,
  UNCOMMON: 10,
  RARE: 15,
  EPIC: 20,
  LEGENDARY: 25,
  MYTHIC: 30,
});

export function selectedVacuumRecord(bucket) {
  return vacuumRecordById(bucket?.skyblockId);
}

export function vacuumGemstoneSlotCount(bucket) {
  return vacuumFallbackGemstoneSlotCount(bucket?.skyblockId);
}

export function vacuumRarity(bucket) {
  return vacuumEffectiveRarity(bucket?.skyblockId, bucket?.[VACUUM_RECOMB_FIELD] === true);
}

export function vacuumPeridotFortune(bucket) {
  const count = vacuumGemstoneSlotCount(bucket);
  if (!count) return 0;
  const rarity = vacuumRarity(bucket);
  if (!rarity) return 0;
  return toolGemstoneFortune(bucket?.gemSlots, rarity, count) ?? 0;
}

export function vacuumBaseFarmingFortune(bucket) {
  return Number(selectedVacuumRecord(bucket)?.baseFarmingFortune || 0);
}

export function vacuumBuzzingFarmingFortune(bucket) {
  if (selectedVacuumReforge(bucket) !== 'buzzing') return 0;
  return BUZZING_FORTUNE_BY_RARITY[vacuumRarity(bucket)] || 0;
}

export function vacuumReforgeFarmingFortune(bucket) {
  const reforge = selectedVacuumReforge(bucket);
  if (reforge === 'beady') return 100;
  if (reforge === 'buzzing') return vacuumBuzzingFarmingFortune(bucket);
  return 0;
}

function configuredLevel(bucket, entry) {
  const max = Math.max(1, Number(entry?.max || 1));
  const explicit = Number(bucket?.levels?.[entry.id] || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(max, explicit);
  return bucket?.owned?.[entry.id] === true ? 1 : 0;
}

export function isVacuumDirectUpgrade(item) {
  return String(item?.category || '').trim() === 'Vacuum Upgrade';
}

export function vacuumPhysicalStats(bucket) {
  const record = selectedVacuumRecord(bucket);
  if (!record) {
    return Object.freeze({
      selected: false,
      rarity: null,
      baseDamage: 0,
      damage: 0,
      range: 0,
      baseFarmingFortune: 0,
      farmingFortune: 0,
      reforgeFarmingFortune: 0,
      gemstoneFarmingFortune: 0,
    });
  }

  const rarity = vacuumRarity(bucket);
  const reforge = selectedVacuumReforge(bucket);
  const bookwormDamage = configuredLevel(bucket, VACUUM_BOOKWORM_BOOK) * Number(VACUUM_BOOKWORM_BOOK.stepGain || 0);
  const bugBlenderFortune = configuredLevel(bucket, VACUUM_BUG_BLENDER) * Number(VACUUM_BUG_BLENDER.stepGain || 0);
  const farmingForDummiesFortune = configuredLevel(bucket, VACUUM_FARMING_FOR_DUMMIES)
    * Number(VACUUM_FARMING_FOR_DUMMIES.stepGain || 0);
  const gemstoneFarmingFortune = vacuumPeridotFortune(bucket);
  const reforgeFarmingFortune = vacuumReforgeFarmingFortune(bucket);

  let damage = Number(record.baseDamage || 0) + bookwormDamage;
  if (reforge === 'beady') damage += BEADY_DAMAGE_BY_RARITY[rarity] || 0;
  if (reforge === 'buzzing') damage *= 2;

  return Object.freeze({
    selected: true,
    id: record.id,
    name: record.name,
    tier: record.tier,
    rarity,
    baseDamage: Number(record.baseDamage || 0),
    damage,
    range: Number(record.range || 0),
    baseFarmingFortune: Number(record.baseFarmingFortune || 0),
    farmingFortune: Number(record.baseFarmingFortune || 0)
      + farmingForDummiesFortune
      + bugBlenderFortune
      + reforgeFarmingFortune
      + gemstoneFarmingFortune,
    reforgeFarmingFortune,
    gemstoneFarmingFortune,
  });
}

export function normalizeVacuumPhysicalState(bucket) {
  if (!bucket || typeof bucket !== 'object') return bucket;
  if (!selectedVacuumRecord(bucket)) bucket.skyblockId = null;
  bucket[VACUUM_RECOMB_FIELD] = bucket[VACUUM_RECOMB_FIELD] === true;
  bucket.gemSlots = Array.isArray(bucket.gemSlots) ? bucket.gemSlots : [];
  bucket.enchantments = bucket.enchantments && typeof bucket.enchantments === 'object'
    ? { ...bucket.enchantments }
    : {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  return bucket;
}
