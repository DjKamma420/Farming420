// Verified Hypixel SkyBlock resource-pack keys for farming tools.
// Keys are only added after they are confirmed in assets/hypixel-pack/manifest.json.
// Missing tools deliberately fall back to the generic pixel placeholder instead of
// guessing a key from a display name.

export const FARMING_TOOL_PACK_KEYS = Object.freeze({
  'Pumpkin Dicer': Object.freeze({ 1: 'pumpkin_dicer', 2: 'pumpkin_dicer_2', 3: 'pumpkin_dicer_3' }),
  'Melon Dicer': Object.freeze({ 1: 'melon_dicer', 2: 'melon_dicer_2', 3: 'melon_dicer_3' }),
  'Fungi Cutter': Object.freeze({ 1: 'fungi_cutter', 2: 'fungi_cutter_2', 3: 'fungi_cutter_3' }),
  'Cactus Knife': Object.freeze({ 1: 'cactus_knife', 2: 'cactus_knife_2', 3: 'cactus_knife_3' }),
});

export function farmingToolPackKey(toolName, tier = 1) {
  const tiers = FARMING_TOOL_PACK_KEYS[toolName];
  if (!tiers) return null;
  const requested = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
  return tiers[requested] || tiers[1] || null;
}

export function hasVerifiedFarmingToolArt(toolName) {
  return Boolean(FARMING_TOOL_PACK_KEYS[toolName]);
}
