const SUFFIXES = Object.freeze([
  { value: 1_000_000_000, suffix: 'b' },
  { value: 1_000_000, suffix: 'm' },
  { value: 1_000, suffix: 'k' },
]);

function trimFixed(value, digits = 2) {
  return Number(value.toFixed(digits)).toString();
}

export function compactCoinNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const sign = number < 0 ? '-' : '';
  const absolute = Math.abs(number);
  for (const row of SUFFIXES) {
    if (absolute < row.value) continue;
    const scaled = absolute / row.value;
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return `${sign}${trimFixed(scaled, digits)}${row.suffix}`;
  }
  return `${sign}${Math.round(absolute)}`;
}

export function formatApproxCoins(value) {
  const compact = compactCoinNumber(value);
  return compact === null ? '—' : `~${compact} Coins`;
}
