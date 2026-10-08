/** Accept finite numbers/numeric strings; missing or nonnumeric types stay unknown. */
export function finiteNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function finiteNonNegative(value) {
  const number = finiteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

/** Whole decimal counts must remain exact before and after Number conversion. */
export function finiteNonNegativeInteger(value) {
  const number = finiteNonNegative(value);
  if (!Number.isSafeInteger(number)) return null;
  if (typeof value === 'number') return number;
  const match = value.trim().match(/^[+-]?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
  if (!match) return null;
  const fraction = match[2] ?? match[3] ?? '';
  const digits = (match[1] ?? '') + fraction;
  if (/^0+$/.test(digits)) return 0;
  const fractionalPlaces = fraction.length - Number(match[4] ?? 0);
  // Nonzero underflow and fractions rounded to integers must not become counts.
  if (fractionalPlaces > 0 && fractionalPlaces > digits.match(/0*$/)[0].length) return null;
  return number;
}
