export const AUTO_FILL_PROFILE_STATUSES = Object.freeze(new Set(['AUTO', 'DERIVED']));

/**
 * A normalized collection may drive Auto-Fill only when its provenance is
 * current and authoritative. Legacy snapshots without provenance are accepted
 * so old local backups keep working; current normalized snapshots always carry
 * an explicit status.
 */
export function snapshotSectionCanAutoFill(snapshot, section) {
  const provenance = snapshot?.provenance?.[section];
  if (!provenance || provenance.status == null) return true;
  return AUTO_FILL_PROFILE_STATUSES.has(String(provenance.status).toUpperCase());
}
