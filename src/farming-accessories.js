/**
 * Farming-relevant accessories with exact SkyBlock item ids.
 *
 * This catalog is presentation/progression data, not additive calculator data.
 * Upgrade families contain mutually replacing items, so lower tiers must never
 * be summed with their successors. Entries that already have a calculator
 * effect point at that UPGRADES id through `upgradeId`.
 */
export const FARMING_ACCESSORY_GROUPS = Object.freeze([
  Object.freeze({
    id: 'crop-fortune',
    title: 'Crop Fortune progression',
    note: 'One upgrade line. Cropie upgrades into Squash, Fermento and finally Helianthus; treat the highest owned tier as the active member.',
    items: Object.freeze([
      Object.freeze({
        itemId: 'CROPIE_TALISMAN',
        name: 'Cropie Talisman',
        rarity: 'COMMON',
        effect: '+10 Crop Fortune for Wheat, Carrot and Potato.',
        condition: 'Wheat · Carrot · Potato',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Cropie_Talisman',
      }),
      Object.freeze({
        itemId: 'SQUASH_RING',
        name: 'Squash Ring',
        rarity: 'UNCOMMON',
        effect: '+20 Crop Fortune for Wheat, Potato, Carrot, Melon, Pumpkin and Cocoa Beans.',
        condition: '6 crops',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Squash_Ring',
      }),
      Object.freeze({
        itemId: 'FERMENTO_ARTIFACT',
        name: 'Fermento Artifact',
        rarity: 'RARE',
        effect: '+30 Farming Fortune while breaking crops.',
        condition: 'All crops',
        upgradeId: 'accessory-fermento-artifact',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Fermento_Artifact',
      }),
      Object.freeze({
        itemId: 'HELIANTHUS_RELIC',
        name: 'Helianthus Relic',
        rarity: 'EPIC',
        effect: '+40 Farming Fortune while breaking crops.',
        condition: 'All crops',
        upgradeId: 'accessory-helianthus-relic',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Helianthus_Relic',
      }),
    ]),
  }),
  Object.freeze({
    id: 'jacob',
    title: "Anita's contest progression",
    note: "The accessory grants its bonus only to the crop selected for that Jacob's Farming Contest. Higher tiers replace lower tiers.",
    items: Object.freeze([
      Object.freeze({
        itemId: 'ANITA_TALISMAN',
        name: "Anita's Talisman",
        rarity: 'COMMON',
        effect: '+5 Farming Fortune for the contest-selected crop.',
        condition: "Jacob's Contest",
        source: "https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Talisman",
      }),
      Object.freeze({
        itemId: 'ANITA_RING',
        name: "Anita's Ring",
        rarity: 'UNCOMMON',
        effect: '+15 Farming Fortune for the contest-selected crop.',
        condition: "Jacob's Contest",
        source: "https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Ring",
      }),
      Object.freeze({
        itemId: 'ANITA_ARTIFACT',
        name: "Anita's Artifact",
        rarity: 'RARE',
        effect: '+25 Farming Fortune for the contest-selected crop.',
        condition: "Jacob's Contest",
        upgradeId: 'jacob-accessory-anita-accessory-crop-bonus',
        source: "https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Artifact",
      }),
    ]),
  }),
  Object.freeze({
    id: 'pesthunter',
    title: 'Pesthunter progression',
    note: 'Bonus Pest Chance progression. The highest owned tier replaces the lower member of the line.',
    items: Object.freeze([
      Object.freeze({
        itemId: 'PESTHUNTER_BADGE',
        name: 'Pesthunter Badge',
        rarity: 'UNCOMMON',
        effect: '+20 Bonus Pest Chance.',
        condition: 'Pest farming',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Badge',
      }),
      Object.freeze({
        itemId: 'PESTHUNTER_RING',
        name: 'Pesthunter Ring',
        rarity: 'RARE',
        effect: '+40 Bonus Pest Chance.',
        condition: 'Pest farming',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Ring',
      }),
      Object.freeze({
        itemId: 'PESTHUNTER_ARTIFACT',
        name: 'Pesthunter Artifact',
        rarity: 'EPIC',
        effect: '+60 Bonus Pest Chance.',
        condition: 'Pest farming',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Artifact',
      }),
      Object.freeze({
        itemId: 'PESTHUNTER_RELIC',
        name: 'Pesthunter Relic',
        rarity: 'LEGENDARY',
        effect: '+80 Bonus Pest Chance.',
        condition: 'Pest farming',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Relic',
      }),
    ]),
  }),
  Object.freeze({
    id: 'greenhouse',
    title: 'Greenhouse mutation progression',
    note: 'Bioanalysis is one accessory line. The highest owned tier replaces the lower tier and increases crop mutation chance inside the Greenhouse.',
    items: Object.freeze([
      Object.freeze({
        itemId: 'BIOANALYSIS_TALISMAN',
        name: 'Bioanalysis Talisman',
        rarity: 'COMMON',
        effect: '+5% chance for crops to mutate in the Greenhouse.',
        condition: 'Greenhouse',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Bioanalysis_Talisman',
      }),
      Object.freeze({
        itemId: 'BIOANALYSIS_RING',
        name: 'Bioanalysis Ring',
        rarity: 'UNCOMMON',
        effect: '+10% chance for crops to mutate in the Greenhouse.',
        condition: 'Greenhouse',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Bioanalysis_Ring',
      }),
      Object.freeze({
        itemId: 'BIOANALYSIS_ARTIFACT',
        name: 'Bioanalysis Artifact',
        rarity: 'RARE',
        effect: '+15% chance for crops to mutate in the Greenhouse.',
        condition: 'Greenhouse',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Bioanalysis_Artifact',
      }),
    ]),
  }),
  Object.freeze({
    id: 'visitors',
    title: 'Garden visitor progression',
    note: 'Copper accessories increase the chance that an incoming Garden Visitor is RARE or higher. The highest owned tier replaces the lower tier.',
    items: Object.freeze([
      Object.freeze({
        itemId: 'COPPER_TALISMAN',
        name: 'Copper Talisman',
        rarity: 'COMMON',
        effect: '+4% chance for a RARE or higher Garden Visitor to appear.',
        condition: 'Garden Visitors',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Copper_Talisman',
      }),
      Object.freeze({
        itemId: 'COPPER_RING',
        name: 'Copper Ring',
        rarity: 'UNCOMMON',
        effect: '+8% chance for a RARE or higher Garden Visitor to appear.',
        condition: 'Garden Visitors',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Copper_Ring',
      }),
      Object.freeze({
        itemId: 'COPPER_ARTIFACT',
        name: 'Copper Artifact',
        rarity: 'RARE',
        effect: '+12% chance for a RARE or higher Garden Visitor to appear.',
        condition: 'Garden Visitors',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Copper_Artifact',
      }),
    ]),
  }),
  Object.freeze({
    id: 'conditional',
    title: 'Conditional & utility accessories',
    note: 'These are separate physical accessories. Their effects depend on season, roll, gemstones or the farming objective.',
    items: Object.freeze([
      Object.freeze({
        itemId: 'ATMOSPHERIC_FILTER',
        name: 'Atmospheric Filter',
        rarity: 'RARE',
        effect: 'Spring: +25 Farming Fortune · Summer: +20 Farming Wisdom · Autumn: pests spawn 15% more often · Winter: +5% visitor Copper.',
        condition: 'Garden season',
        upgradeId: 'temporary-atmospheric-filter-spring',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Atmospheric_Filter',
      }),
      Object.freeze({
        itemId: 'MAGIC_8_BALL',
        name: 'Magic 8 Ball',
        rarity: 'EPIC',
        effect: 'The Farming roll grants +25 Farming Fortune and +1 Farming Wisdom.',
        condition: 'Random active roll',
        upgradeId: 'temporary-magic-8-ball-ff-roll',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Magic_8_Ball',
      }),
      Object.freeze({
        itemId: 'POWER_RELIC',
        name: 'Relic of Power',
        rarity: 'EPIC',
        effect: 'Accepts gemstones at half effect; a Perfect Peridot contributes Farming Fortune through the accessory.',
        condition: 'Gemstone-dependent',
        upgradeId: 'accessory-relic-of-power-perfect-peridot-effect',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Relic_of_Power',
      }),
      Object.freeze({
        itemId: 'AGARIMOO_ARTIFACT',
        name: 'Agarimoo Artifact',
        rarity: 'RARE',
        effect: '+1 Farming Wisdom in addition to its fishing stats.',
        condition: 'Farming XP',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Agarimoo_Artifact',
      }),
      Object.freeze({
        itemId: 'FARMING_TALISMAN',
        name: 'Farming Talisman',
        rarity: 'COMMON',
        effect: '+10 Speed on public farming islands and in The Garden.',
        condition: 'Movement utility',
        source: 'https://hypixel-skyblock.fandom.com/wiki/Farming_Talisman',
      }),
    ]),
  }),
]);

export const FARMING_ACCESSORIES = Object.freeze(
  FARMING_ACCESSORY_GROUPS.flatMap(group => group.items),
);

export function farmingAccessoryByItemId(itemId) {
  const id = String(itemId || '').trim().toUpperCase();
  return FARMING_ACCESSORIES.find(item => item.itemId === id) || null;
}
