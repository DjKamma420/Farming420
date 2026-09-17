import { toolGemstoneFortune } from './gemstone-slots.js';
import {
  vacuumEffectiveRarity,
  vacuumFallbackGemstoneSlotCount,
  vacuumRecordById,
} from './exact-farming-items.js';

export const VACUUM_RECOMB_FIELD = 'recombobulated';
export const VACUUM_PERIDOT_ENTRY_ID = 'vacuum-peridot-gemstone-fortune';

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

export function syncVacuumPeridotProgress(bucket) {
  if (!bucket || typeof bucket !== 'object') return false;
  bucket.levels ||= {};
  bucket.owned ||= {};
  const next = vacuumPeridotFortune(bucket);
  const previous = Number(bucket.levels[VACUUM_PERIDOT_ENTRY_ID] || 0);
  const wasOwned = bucket.owned[VACUUM_PERIDOT_ENTRY_ID] === true;
  if (next > 0) {
    bucket.levels[VACUUM_PERIDOT_ENTRY_ID] = next;
    bucket.owned[VACUUM_PERIDOT_ENTRY_ID] = true;
  } else {
    delete bucket.levels[VACUUM_PERIDOT_ENTRY_ID];
    delete bucket.owned[VACUUM_PERIDOT_ENTRY_ID];
  }
  return previous !== next || wasOwned !== (next > 0);
}

export function normalizeVacuumPhysicalState(bucket) {
  if (!bucket || typeof bucket !== 'object') return bucket;
  if (!selectedVacuumRecord(bucket)) bucket.skyblockId = null;
  bucket[VACUUM_RECOMB_FIELD] = bucket[VACUUM_RECOMB_FIELD] === true;
  bucket.gemSlots = Array.isArray(bucket.gemSlots) ? bucket.gemSlots : [];
  bucket.levels ||= {};
  bucket.owned ||= {};
  syncVacuumPeridotProgress(bucket);
  return bucket;
}
