export const PROGRESSION_CHAINS_VERIFIED = '2026-09-16';

export const TOOL_TIER_CHAIN = Object.freeze({
  id: 'farming-tool-tier',
  label: 'Tool tier',
  source: 'https://hypixel.net/threads/farming-tools-upgrade-milestones.6032473/',
  lastVerified: PROGRESSION_CHAINS_VERIFIED,
  options: Object.freeze([
    Object.freeze({ value: 1, label: 'Mk. I', requiredEntries: Object.freeze([]) }),
    Object.freeze({ value: 2, label: 'Mk. II', requiredEntries: Object.freeze(['tool-mk-ii']) }),
    Object.freeze({ value: 3, label: 'Mk. III', requiredEntries: Object.freeze(['tool-mk-ii', 'tool-mk-iii']) }),
  ]),
});

function levelMap(bucket) {
  if (!bucket || typeof bucket !== 'object') return {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  return bucket.levels;
}

export function chainEntryIds(chain) {
  return [...new Set((chain?.options || []).flatMap(option => option.requiredEntries || []))];
}

export function highestChainTier(bucket, chain) {
  const levels = bucket?.levels || {};
  const owned = bucket?.owned || {};
  let result = chain?.options?.[0]?.value ?? 0;
  for (const option of chain?.options || []) {
    const requirements = option.requiredEntries || [];
    if (requirements.every(id => Number(levels[id] || 0) > 0 || owned[id] === true)) result = option.value;
  }
  return result;
}

/**
 * Applies a sequential upgrade as one highest/current tier.
 *
 * Selecting Mk. III necessarily records Mk. II as completed too. Selecting a
 * lower tier removes only the later steps. This prevents impossible states such
 * as owning Mk. III while Mk. II is marked missing.
 */
export function applyChainTier(bucket, chain, requestedTier) {
  levelMap(bucket);
  const options = [...(chain?.options || [])].sort((a, b) => a.value - b.value);
  if (!options.length) return bucket;
  const requested = Number(requestedTier);
  const target = options.reduce((best, option) => option.value <= requested ? option : best, options[0]);
  const active = new Set(target.requiredEntries || []);
  for (const id of chainEntryIds(chain)) {
    if (active.has(id)) {
      bucket.levels[id] = 1;
      bucket.owned[id] = true;
    } else {
      delete bucket.levels[id];
      delete bucket.owned[id];
    }
  }
  return bucket;
}

export function chainOption(chain, value) {
  return (chain?.options || []).find(option => option.value === Number(value)) || null;
}
