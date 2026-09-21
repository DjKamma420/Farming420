export const FARMING_CONTEXT = Object.freeze({
  NORMAL: 'normal',
  HARVEST_FEAST: 'harvest-feast',
  GRAND_FEAST: 'grand-feast',
  JACOB_CONTEST: 'jacob-contest',
});

export const FARMING_CONTEXT_OPTIONS = Object.freeze([
  Object.freeze({ id: FARMING_CONTEXT.NORMAL, label: 'Normal farming', modeScopes: Object.freeze([]) }),
  Object.freeze({ id: FARMING_CONTEXT.HARVEST_FEAST, label: 'Harvest Feast', modeScopes: Object.freeze(['Harvest Feast']) }),
  Object.freeze({ id: FARMING_CONTEXT.GRAND_FEAST, label: 'Grand Feast', modeScopes: Object.freeze(['Harvest Feast', 'Grand Feast']) }),
  Object.freeze({ id: FARMING_CONTEXT.JACOB_CONTEST, label: "Jacob's Contest", modeScopes: Object.freeze(['Jacob Contest']) }),
]);

export function normalizeFarmingContext(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return FARMING_CONTEXT_OPTIONS.some(option => option.id === normalized)
    ? normalized
    : FARMING_CONTEXT.NORMAL;
}

export function farmingContextForState(state) {
  return normalizeFarmingContext(state?.profile?.farmingContext);
}

export function farmingContextOption(context) {
  const normalized = normalizeFarmingContext(context);
  return FARMING_CONTEXT_OPTIONS.find(option => option.id === normalized) || FARMING_CONTEXT_OPTIONS[0];
}

export function farmingContextScopes(context) {
  return farmingContextOption(context).modeScopes;
}

export function farmingContextLabel(context) {
  return farmingContextOption(context).label;
}

export function isHarvestFeastContext(context) {
  const normalized = normalizeFarmingContext(context);
  return normalized === FARMING_CONTEXT.HARVEST_FEAST || normalized === FARMING_CONTEXT.GRAND_FEAST;
}

export function isGrandFeastContext(context) {
  return normalizeFarmingContext(context) === FARMING_CONTEXT.GRAND_FEAST;
}
