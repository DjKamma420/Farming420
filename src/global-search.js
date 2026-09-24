/**
 * Small, dependency-free fuzzy matcher for the global command/search box.
 *
 * The UI owns the search index because it knows where each result should
 * navigate. This module only normalizes text and ranks likely matches.
 */

export function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      const substitution = previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1);
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        substitution,
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function isSubsequence(needle, haystack) {
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function tokenScore(token, word) {
  if (word === token) return 900;
  if (word.startsWith(token)) return 720;
  if (word.includes(token)) return 560;
  if (token.startsWith(word) && word.length >= 3) return 420;

  if (token.length >= 4 && word.length >= 4) {
    const distance = levenshtein(token, word);
    const allowance = Math.max(1, Math.floor(Math.max(token.length, word.length) * 0.34));
    if (distance <= allowance) return Math.max(120, 420 - (distance * 90));
    if (isSubsequence(token, word)) return 100;
  }
  return 0;
}

export function scoreSearchEntry(entry, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const title = normalizeSearchText(entry?.title);
  const searchable = normalizeSearchText([
    entry?.title,
    entry?.subtitle,
    ...(Array.isArray(entry?.keywords) ? entry.keywords : [entry?.keywords]),
  ].filter(Boolean).join(' '));
  if (!searchable) return Number.NEGATIVE_INFINITY;

  let score = Number(entry?.priority || 0);
  if (title === normalizedQuery) score += 8000;
  else if (title.startsWith(normalizedQuery)) score += 5200;
  else if (title.includes(normalizedQuery)) score += 3900;

  if (searchable.includes(normalizedQuery)) score += 2200;

  const words = searchable.split(' ').filter(Boolean);
  for (const token of normalizedQuery.split(' ').filter(Boolean)) {
    let best = 0;
    for (const word of words) best = Math.max(best, tokenScore(token, word));
    if (!best) return Number.NEGATIVE_INFINITY;
    score += best;
  }
  return score;
}

export function searchEntries(entries, query, limit = 10) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => ({ entry, index, score: scoreSearchEntry(entry, normalizedQuery) }))
    .filter(row => Number.isFinite(row.score))
    .sort((a, b) => (
      b.score - a.score
      || Number(b.entry?.priority || 0) - Number(a.entry?.priority || 0)
      || String(a.entry?.title || '').localeCompare(String(b.entry?.title || ''))
      || a.index - b.index
    ))
    .slice(0, Math.max(1, Number(limit) || 10))
    .map(row => ({ ...row.entry, score: row.score }));
}
