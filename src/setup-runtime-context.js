export const MANTID_RECENT_KILL_CAP = 20;

export function normalizeRecentPestKills(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.min(MANTID_RECENT_KILL_CAP, Math.floor(number));
}

export function normalizeSprayonatorActive(value) {
  if (value === true || value === 'true' || value === 'yes' || value === '1') return true;
  if (value === false || value === 'false' || value === 'no' || value === '0') return false;
  return null;
}

export function setupRuntimeContextForState(state) {
  const source = state?.profile?.setupRuntimeContext || {};
  return Object.freeze({
    recentPestKills: normalizeRecentPestKills(source.recentPestKills),
    sprayonatorActive: normalizeSprayonatorActive(source.sprayonatorActive),
  });
}
