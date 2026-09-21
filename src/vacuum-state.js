import { toolGemstoneFortune } from './gemstone-slots.js';
import {
  vacuumEffectiveRarity,
  vacuumFallbackGemstoneSlotCount,
  vacuumRecordById,
} from './exact-farming-items.js';

export const VACUUM_RECOMB_FIELD = 'recombobulated';

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
