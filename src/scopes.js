export function scopeIncludesCrop(scope, cropName) {
  if (scope === 'Any') return true;
  if (Array.isArray(scope)) return scope.includes(cropName);
  return scope === cropName;
}

export function scopeLabel(scope) {
  if (Array.isArray(scope)) return scope.join(', ');
  return String(scope ?? 'Unknown');
}
