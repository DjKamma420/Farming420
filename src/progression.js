/**
 * The Farming 0 -> 60 progression guide.
 *
 * Every entry is sourced and dated, as `AGENTS.md` correctness rule 2 requires,
 * and the date is checked against `docs/FARMING_HISTORY.md` so a value cannot
 * silently predate a game change.
 *
 * Two things this file deliberately does NOT do:
 *
 * - It does not rank options by a computed score. That needs the profit engine,
 *   which does not exist yet, and inventing numbers to fill it would break
 *   rule 1. Options carry a *sourced qualitative* tier and the reason instead.
 * - It does not claim coins per hour. The one quantitative comparison here
 *   (Elephant vs Mooshroom Cow) is quoted from the source, with its breakpoint.
 */

const GUIDE = 'https://hypixelskyblock.minecraft.wiki/w/Tutorial:Farming_Guide';
const VERIFIED = '2026-09-16';

/** How good an alternative is relative to the best option for that slot. */
export const OPTION_TIER = Object.freeze({
  BEST: 'best',
  EQUAL: 'equal',
  SLIGHTLY_WORSE: 'slightly-worse',
  BUDGET: 'budget',
});

export const TIER_LABEL = Object.freeze({
  best: 'Best',
  equal: 'Equal',
  'slightly-worse': 'Slightly worse',
  budget: 'Budget',
});

/**
 * The armour chain. Fortune figures are the guide's "base full-set" numbers;
 * `docs/VERIFIED_MECHANICS.md` records that the Farming Fortune page disagrees
 * for Tater and above, so these are shown as sourced-but-disputed.
 */
export const ARMOR_CHAIN = Object.freeze([
  { level: 3, set: 'Farmhand Armor', fortune: 20, disputed: false },
  { level: 10, set: 'Haymaker Armor', fortune: 40, disputed: false },
  { level: 15, set: 'Sprout Armor', fortune: 60, disputed: false },
  { level: 20, set: 'Tater Armor', fortune: 70, disputed: true },
  { level: 30, set: 'Cropie Armor', fortune: 90, disputed: true },
  { level: 35, set: 'Squash Armor', fortune: 110, disputed: true },
  { level: 40, set: 'Fermento Armor', fortune: 130, disputed: true },
  { level: 50, set: 'Helianthus Armor', fortune: 150, disputed: true },
]);

/**
 * Enchantments by level, with where each level comes from. This is the
 * "enchantments at different stages" view: which level is reachable now, and
 * what it takes to reach the next one.
 */
export const ENCHANT_LADDERS = Object.freeze([
  {
    id: 'harvesting',
    name: 'Harvesting',
    scope: 'Farming tool',
    perLevel: '+12.5 Farming Fortune',
    max: 'VI, +75 Farming Fortune',
    steps: [
      { levels: 'I-V', from: 'Enchantment Table' },
      { levels: 'VI', from: 'Drops from the Shiny Pig' },
    ],
  },
  {
    id: 'cultivating',
    name: 'Cultivating',
    scope: 'Farming tool',
    perLevel: '+2 Farming Fortune',
    max: 'X, +20 Farming Fortune',
    steps: [
      { levels: 'I', from: 'Elizabeth, 4,000 Bits. Levels itself while the tool is used, so buy it early.' },
    ],
  },
  {
    id: 'turbo-crop',
    name: 'Turbo-Crop',
    scope: 'Farming tool, per crop',
    perLevel: '+5 Crop Fortune',
    max: 'VII, +35 Crop Fortune',
    steps: [
      { levels: 'I', from: "Jacob's Farming Contests, or serving the Librarian" },
      { levels: 'II-V', from: 'Combining books' },
      { levels: 'VI', from: 'Turbo Gourd' },
      { levels: 'VII', from: 'Enchanted Turbo Gourd' },
    ],
    gate: 'A Bronze contest result in a crop is required for IV to work for that crop, and Silver for V. Owning the book is not the same as it applying.',
  },
  {
    id: 'dedication',
    name: 'Dedication',
    scope: 'Farming tool, per crop',
    perLevel: '+0.5 / 0.75 / 1 / 2 Crop Fortune per crop milestone, by level',
    max: 'IV, up to +92 Crop Fortune per crop',
    steps: [
      { levels: 'I', from: 'SkyMart' },
      { levels: 'II-III', from: 'Combining books' },
      { levels: 'IV', from: 'Serving the Librarian or Ravenous Rhino' },
    ],
  },
  {
    id: 'pesterminator',
    name: 'Pesterminator',
    scope: 'Armour',
    perLevel: '+2 Farming Fortune, and Bonus Pest Chance',
    max: 'VI, +48 Farming Fortune on a full set',
    steps: [
      { levels: 'I', from: 'Drops from a Beetle' },
      { levels: 'II-V', from: 'Combining books' },
      { levels: 'VI', from: "A Beginner's Guide to Pesthunting" },
    ],
  },
  {
    id: 'green-thumb',
    name: 'Green Thumb',
    scope: 'Equipment',
    perLevel: '+0.05 Farming Fortune per unique Visitor served, per piece',
    max: 'V, +137 on a full set at 137 unique Visitors',
    steps: [
      { levels: 'I', from: 'SkyMart' },
      { levels: 'II-V', from: 'Combining books' },
    ],
  },
  {
    id: 'crop-fever',
    name: 'Crop Fever',
    scope: 'Farming tool',
    perLevel: '0.001% chance per level to trigger a 60s +100 Farming Fortune burst',
    max: 'V',
    steps: [
      { levels: 'I', from: 'Moonflower VII' },
      { levels: 'II-V', from: 'Combining books' },
    ],
  },
  {
    id: 'bug-blender',
    name: 'Bug Blender',
    scope: 'Farming tool',
    perLevel: '+20 Farming Fortune on Pests per level',
    max: 'V, +100 Farming Fortune on Pests',
    steps: [
      { levels: 'I', from: 'Crafting' },
      { levels: 'II-V', from: 'Combining books' },
    ],
  },
]);

/** Pet options per activity phase, each with a tier and the reason. */
export const PET_OPTIONS = Object.freeze([
  {
    phase: 'levelling',
    label: 'While pushing Farming levels',
    options: [
      { name: 'Rabbit Pet', tier: OPTION_TIER.BEST, note: 'Its Farming Wisdom matters more than a little extra Fortune while levels are the goal. Recommended until Farming 40.' },
      { name: 'Elephant Pet (Legendary)', tier: OPTION_TIER.SLIGHTLY_WORSE, note: 'More Fortune but less Farming XP, so it reaches the next level requirement more slowly.' },
    ],
  },
  {
    phase: 'crops',
    label: 'Farming crops',
    options: [
      { name: 'Rose Dragon Pet (Lv 200) + Green Bandana', tier: OPTION_TIER.BEST, note: 'The late-game and hypermax choice for normal crop farming.' },
      { name: 'Elephant Pet (Mythic)', tier: OPTION_TIER.SLIGHTLY_WORSE, note: 'Better than Mooshroom Cow for Collections and for Sowdust: its breakpoint is around 2,858 Strength, which is not realistically reachable without giving up Fortune elsewhere. Mooshroom Cow still generally makes more coins, but by less.' },
      { name: 'Mooshroom Cow Pet', tier: OPTION_TIER.EQUAL, note: 'Above about 1,429 Strength it beats a Legendary Elephant, and makes roughly 700,000 more coins per hour from the extra Mushrooms. Gains +1 Farming Fortune per 28.57 Strength.' },
      { name: 'Elephant Pet (Legendary)', tier: OPTION_TIER.BUDGET, note: 'The better option below about 1,429 Strength when Collection is the goal.' },
      { name: 'Slug Pet (Lv 100 Legendary)', tier: OPTION_TIER.SLIGHTLY_WORSE, note: '+100 Farming Fortune, but only while standing in a sprayed Plot. With a maxed Hypercharge Chip that doubles to +200, matching a Lv 100 Mythic Elephant while the condition holds.' },
    ],
  },
  {
    phase: 'spawning',
    label: 'Spawning Pests',
    options: [
      { name: 'Mosquito Pet (Epic) + Brown Bandana', tier: OPTION_TIER.BEST, note: 'Epic and Legendary both reach 50 Bonus Pest Chance at level 100 and both get the full Smooth Jazz bonus, so Epic is enough for active Pest Farming.' },
      { name: 'Mosquito Pet (Legendary) + Brown Bandana', tier: OPTION_TIER.EQUAL, note: 'Same Bonus Pest Chance as Epic; it only adds the Pest Trap perk.' },
      { name: 'Slug Pet + Brown Bandana', tier: OPTION_TIER.BUDGET, note: 'The budget spawning pet until a Mosquito is affordable.' },
    ],
  },
  {
    phase: 'killing',
    label: 'Killing Pests',
    options: [
      { name: 'Second Rose Dragon Pet (Lv 200) + Poignant Lucky Clover', tier: OPTION_TIER.BEST, note: 'Hypermax only, and one of the very last upgrades in the whole setup. The Poignant clover is the hypermax item, not the regular one.' },
      { name: 'The same Rose Dragon Pet + Green Bandana', tier: OPTION_TIER.SLIGHTLY_WORSE, note: 'Reusing the farming pet to kill is the correct late-game choice until a second Lv 200 Rose Dragon is genuinely affordable.' },
      { name: 'Rose Dragon Pet + regular Lucky Clover', tier: OPTION_TIER.SLIGHTLY_WORSE, note: 'A cheaper step toward the hypermax kill pet.' },
      { name: 'Hedgehog Pet', tier: OPTION_TIER.BUDGET, note: 'Pest-specific Fortune and Overbloom make it very good for killing, and it is commonly far cheaper than a Legendary Elephant. It stays excellent until a Rose Dragon is realistic.' },
    ],
  },
]);

/** The three-phase loadout split, from budget to hypermax. */
export const PHASE_LOADOUTS = Object.freeze([
  {
    id: 'budget',
    label: 'Budget (from Farming 40)',
    rows: [
      { phase: 'Farming crops', armor: 'Fermento Armor, moving Bustling -> Mossy', equipment: 'Rooted Blossom Set', pet: 'Mooshroom Cow or Elephant' },
      { phase: 'Spawning Pests', armor: 'the same set', equipment: '3/4 Pesthunter’s Set + Pest Vest, all Squeaky', pet: 'Slug, later Mosquito' },
      { phase: 'Killing Pests', armor: 'the same set', equipment: 'the farming set', pet: 'Hedgehog' },
    ],
  },
  {
    id: 'late',
    label: 'Late game (one Helianthus set)',
    rows: [
      { phase: 'Farming crops', armor: '3/4 Mossy + 1/4 Mantid Helianthus', equipment: 'Rooted Blossom Set', pet: 'Rose Dragon Lv 200 + Green Bandana' },
      { phase: 'Spawning Pests', armor: 'full Mantid Helianthus', equipment: '3/4 Pesthunter’s Set + Pest Vest, Squeaky', pet: 'Mosquito + Brown Bandana' },
      { phase: 'Killing Pests', armor: 'back to the main set', equipment: 'the farming set', pet: 'the same Rose Dragon' },
    ],
  },
  {
    id: 'hypermax',
    label: 'Hypermax (three separate sets)',
    rows: [
      { phase: 'Farming crops', armor: 'full Mossy Helianthus', equipment: 'full Rooted Blossom Set', pet: 'Rose Dragon Lv 200 + Green Bandana' },
      { phase: 'Spawning Pests', armor: 'full Mantid Helianthus', equipment: '3/4 Pesthunter’s Set + Pest Vest, all Squeaky', pet: 'Mosquito (Epic/Legendary) + Brown Bandana' },
      { phase: 'Killing Pests', armor: '3/4 Mossy + 1/4 Mantid Helianthus', equipment: 'full Thorny Blossom Set, Thorns IV on all four armour pieces', pet: 'second Rose Dragon Lv 200 + Poignant Lucky Clover' },
    ],
  },
]);

/** The five stages of the guide. */
export const STAGES = Object.freeze([
  {
    id: 'stage-1',
    name: 'Unlocking the Garden',
    levelFrom: 0,
    levelTo: 19,
    summary: 'Public-island crops are fine for the first levels. Unlock the Garden and make it the main place you farm.',
    steps: [
      'Rookie Hoe and Rookie Farming Axe from the Farm Merchant, +5 Farming Fortune each. Apply Harvesting as soon as it is available.',
      'At SkyBlock Level 5, speak to Sam to unlock The Garden.',
      'SkyMart: Basic Gardening Hoe/Axe for 5 Copper each (+10 Fortune); upgrade to Advanced for the tool plus 20 Copper (+15). These are temporary.',
      'Save 250 Copper for the Specialized Farming Tool of the crop you actually plan to farm.',
      'Apply Harvesting V early, then Cultivating I as soon as it is affordable because it levels itself while you farm.',
      'Use Replenish on crops that need replanting. Bountiful is the default tool reforge.',
      'Farm several crops for Crop Milestones, and serve affordable Visitors for Garden XP, Copper and unique-Visitor progress.',
      'Speak to Beth in the Desert Settlement early and serve her when she visits. Her quest spans several Garden visits and gates the Crop Analyzer later.',
      'Mushroom unlocks at Garden IX and gives 6 base Farming XP per block, so it is the crop to use when levels are the goal.',
      'At Farming 10, Jacob’s Contests open. Each lasts 20 minutes and picks three crops.',
    ],
    armorTargets: [3, 10, 15],
  },
  {
    id: 'stage-2',
    name: 'Building the setup',
    levelFrom: 20,
    levelTo: 29,
    summary: 'Pick a main crop and stop spreading upgrades across every tool.',
    steps: [
      'Tater Armor at Farming 20. Put Bustling on it: a cheap Fortune reforge, enough until the later switch to Mossy.',
      'Blooming is a good early Equipment reforge.',
      'Choose a main crop. Wheat is a good default for NPC value and compact farms, using Euclid’s Wheat Sickle.',
      'The main tool should have Harvesting V, the best usable Turbo-Crop, Cultivating, Dedication III when affordable, Replenish where needed, and Bountiful.',
      'Get a Sprayonator, then upgrade to the Juicy Sprayonator once the Juicy Nozzle and 1,000 Copper are reasonable. Salty can wait.',
      'Keep serving Visitors and bank Copper: it feeds the Blossom Set, Green Thumb and much else later.',
      'The Greenhouse unlocks at Garden VII after the Carpenter’s offer and the Greenhouse Blueprint. Start it when convenient.',
      'After Sunflower VII, craft a Sundial and give it to Sam for per-crop Speed at the Desk. That frees the boot slot from Rancher’s Boots.',
      'Do not buy both Firefly and Lunar Moth shards: Garden time can later be frozen, making one of them redundant.',
    ],
    armorTargets: [20],
  },
  {
    id: 'stage-3',
    name: 'Preparing for Pests',
    levelFrom: 30,
    levelTo: 39,
    summary: 'Cropie then Squash, and get the pieces in place that make Pest Farming worth starting.',
    steps: [
      'Cropie Armor at Farming 30, Squash Armor at Farming 35.',
      'Keep levelling the main Specialized Farming Tool: Mk. II crafts at tool level 15 and Mk. III at tool level 30.',
      'Raise Crop Milestones and unique Visitors served, since several later upgrades scale with them.',
      'Once Garden XII unlocks Wild Rose, the last crop by Garden level, prioritise the Greenhouse much more heavily.',
      'Continue Beth’s quest so the Crop Analyzer is ready when Mutations start to matter.',
      'Work Turbo-Crop toward the contest requirements: Bronze in a crop for IV, Silver for V.',
    ],
    armorTargets: [30, 35],
  },
  {
    id: 'stage-4',
    name: 'Starting Pest Farming',
    levelFrom: 40,
    levelTo: 49,
    summary: 'Fermento, Bustling -> Mossy, and the three-phase Pest loop begins.',
    steps: [
      'Fermento Armor at Farming 40, and start moving the main set from Bustling to Mossy.',
      'The loop: farm normally while the Pest cooldown runs, swap into the spawning setup shortly before it ends, keep farming until Pests spawn, swap to the killing setup, clear them, swap back.',
      'Spawning Equipment: three pieces of Pesthunter’s Set with a Pest Vest as the cloak, all Squeaky. The Pest Vest also shortens the spawn cooldown.',
      'Turn Pests in to Pesthunter Phillip before a long session: +5 Farming Fortune per Pest for 30 minutes, up to +200 from 40 Pests. Hypercharge Chip improves it.',
      'Avoid Pest Repellent and Pest Repellent MAX for dedicated Pest Farming: they increase the spawn cooldown.',
      'Continue the Pesthunter Badge line, improve the Vacuum, and add Pesterminator to the Farming armour.',
      'Dedication IV, higher Crop Fever, a Recombobulator 3000 and Flawless Peridot gemstones make sense from here.',
      'Earn Gold in more unique contest crops: each one lets Anita raise the Farming cap by one, up to Farming 60.',
    ],
    armorTargets: [40],
  },
  {
    id: 'stage-5',
    name: 'Maxing out',
    levelFrom: 50,
    levelTo: 60,
    summary: 'Helianthus, then finish the systems that scale with the profile.',
    steps: [
      'Helianthus Armor at Farming 50. Keep buying Anita’s cap upgrades with Gold crops until Farming 60.',
      'Do not rush duplicate sets at 50. Start with one strong Helianthus set plus a Rooted Blossom Set and a Squeaky Pesthunter’s Set.',
      'With two Helianthus sets: 3/4 Mossy and 1/4 Mantid as the main set, and a second full Mantid set for spawning.',
      'Raise the important Specialized Farming Tools toward level 50; Overclocker 3000 carries levels 40 to 50.',
      'Move gear from Flawless to Perfect Peridot gemstones when the cost is reasonable.',
      'Finish Crop Upgrades, Anita upgrades, Personal Bests, Crop Milestones, Visitor progression and Pest Bestiary.',
      'Max the Garden Chips that match the activity; continue the Greenhouse for extra slots and Greenhouses.',
      'A hypermax kill set uses a full Thorny Blossom Set and Thorns IV on all four armour pieces, because the Overbloom scales with combined Thorns tiers.',
      'The second Lv 200 Rose Dragon is one of the very last upgrades in the entire setup.',
    ],
    armorTargets: [50],
  },
]);

export const PROGRESSION_SOURCE = GUIDE;
export const PROGRESSION_VERIFIED = VERIFIED;

/**
 * A Farming level, or null when it is genuinely unknown.
 *
 * `Number(null)` is 0 and `Number('')` is 0, so a plain Number() cast would
 * turn "not synced yet" into a confident "you are level 0", and the guide would
 * claim a stage for someone who has told it nothing.
 */
function levelOrNull(level) {
  if (level === null || level === undefined || level === '') return null;
  const value = Number(level);
  return Number.isFinite(value) ? value : null;
}

/** The stage a Farming level falls in; null when the level is unknown. */
export function stageForLevel(level) {
  const value = levelOrNull(level);
  if (value === null) return null;
  return STAGES.find(stage => value >= stage.levelFrom && value <= stage.levelTo)
    || (value > 60 ? STAGES.at(-1) : STAGES[0]);
}

/** The next armour set to aim for, and whether the level requirement is met. */
export function armorProgress(level) {
  const value = levelOrNull(level);
  return ARMOR_CHAIN.map(entry => ({
    ...entry,
    reached: value === null ? null : value >= entry.level,
  }));
}

export function nextArmorSet(level) {
  const value = levelOrNull(level);
  if (value === null) return null;
  return ARMOR_CHAIN.find(entry => value < entry.level) || null;
}
