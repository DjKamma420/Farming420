# 20 — Items, Armor, Equipment, Tools, Enchants, and Pets

As of: 2026-09-16
Status: ACTIVE where stated; VERIFY where the upstream index page is known stale

This chapter describes the item layer. The central rule is repeated because it is the most important anti-bug invariant in Farming420: **base stats, rarity, reforge, gemstones, enchantments, and counters are item-local. A set bonus is a separate mechanic.**

## 1. Specialized Farming Tools

The current Farming Fortune page lists the modern specialized tool family for the Garden crops:

- Euclid's Wheat Sickle — Wheat
- Gauss Carrot Shovel — Carrot
- Pythagorean Potato Shovel — Potato
- Pumpkin Dicer — Pumpkin
- Turing Sugar Cane Cutter — Sugar Cane
- Melon Dicer — Melon
- Cactus Knife — Cactus
- Cocoa Chopper — Cocoa Beans
- Fungi Cutter — Red/Brown Mushroom
- Newton Nether Wart Cutter — Nether Wart
- Eclipse Sickle — Sunflower and Moonflower
- Wild Rose Cutter — Wild Rose

The current page describes specialized tools as progressing from +4 to +200 matching Crop Fortune through their level/progression range, with SkyMart purchase/upgrade paths and Overclocker 3000 for the modern top progression. Farming420 must treat the tool as a physical object shared only where the game actually shares the item; Sunflower and Moonflower share Eclipse Sickle state.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE for tool mapping; dedicated tool pages should be used for exact upgrade recipes and tool-XP breakpoints.

## 2. Tool-local enchantments

### Harvesting

Current value: +12.5 Farming Fortune per level, up to Harvesting VI = +75 FF.

Source: Farming Fortune page.
Status: ACTIVE.

### Cultivating

Current value: +2 Farming Fortune per level, up to Cultivating X = +20 FF. Cultivating also has progression/counter implications and should remain item-local to the tool.

Source: Farming Fortune page.
Status: ACTIVE.

### Dedication

Current crop-specific scaling listed by level is 0.5 / 0.75 / 1 / 2 matching Crop Fortune per Crop Milestone tier for Dedication I/II/III/IV. At Crop Milestone XLVI, Dedication IV therefore reaches +92 matching Crop Fortune.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE.

### Turbo-Crop

Current modern maximum: Turbo-Crop VII, +5 matching Crop Fortune per level, max +35. Turbo enchant IDs are crop-specific in item data even though their level rules are shared.

Do not apply Turbo-Wheat to Melon, or any unrelated Turbo enchant to a tool/crop.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
- https://hypixelskyblock.minecraft.wiki/w/Jacob%27s_Farming_Contest
Status: ACTIVE for +5/level and VII maximum; exact modern VI/VII contest/gourd gate behavior remains a dedicated verification target.

### Crop Fever

Current index behavior:

- Levels I-V.
- Proc chance is described as level-dependent.
- Active Crop Fever lasts 60 seconds.
- Active effect includes +100 Farming Fortune according to the Farming Fortune page.
- The Overbloom page lists active Crop Fever as +15 Overbloom.

Because the central Farming Fortune page is flagged outdated and the Overbloom page has newer post-Harvest-Feast material, model Crop Fever as a temporary proc state rather than permanent +100 FF. Uptime requires a proc-rate model and real eligible breaks.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
- https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16
Status: ACTIVE as a temporary proc; VERIFY exact proc probability formatting against the dedicated enchant page before precise EV ranking.

### Feast

Current Overbloom page: Feast I-V grants +2 Overbloom per level, up to +10 Overbloom on the enchanted Farming Tool.

Source: https://hypixelskyblock.minecraft.wiki/w/Overbloom
Status: ACTIVE.

### Replenish and Delicate

These are operational enchants, not direct Fortune in the current model. Their value is throughput/farm-integrity dependent. Replenish can prevent replanting downtime for supported crops; Delicate protects farm structures/blocks where its behavior applies.

Do not assign fake FF to them. Their value should enter coins/hour through changed valid-break uptime and rebuild/replant avoidance.

## 3. Farming tool reforges

Only one reforge can exist on one physical tool.

Current Farming Fortune index values by rarity:

### Blessed

Common/Uncommon/Rare/Epic/Legendary/Mythic: +5/+7/+9/+13/+16/+20 Farming Fortune. The page also lists a 0.22% chance to drop enchanted items when breaking crops.

### Bountiful

+1/+2/+3/+5/+7/+10 Farming Fortune and 0.2 Coins per crop broken according to the current index.

### Deep Fried

+3/+6/+10/+15/+20 Farming Fortune across Common→Legendary/Mythic range listed by the page and a Seasoning-finding bonus. Use for Harvest Feast/Seasoning context only after dedicated page verification.

### Earthy

+5/+10/+15/+20/+25/+30 Farming Fortune by rarity and a Sowdust bonus listed by the current index. This is a progression-context reforge, not automatically the best profit reforge.

### Overpriced

+5/+10/+15/+20/+25 Farming Fortune over the listed rarities and Overbloom on the Overbloom page (+1 to +7 by rarity). This is rare-crop/Feast context, not a universal best tool reforge.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
- https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16
Status: ACTIVE for displayed current values with the Farming Fortune page's general staleness warning propagated.

## 4. Armor progression and piece logic

The Farming Fortune index currently lists the historical/main armor chain totals:

- Farmhand Armor: +20 FF total
- Haymaker Armor: +40
- Sprout Armor: +60
- Tater Armor: +100
- Cropie Armor: +135
- Squash Armor: +170
- Fermento Armor: +205
- Helianthus Armor: the page's summary row shows +225 including its full 4-piece tiered bonus; the physical base stats themselves total +150.

A total-row value is not permission to model the item as one boolean. Store physical pieces and an explicit collective bonus separately.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Status: VERIFY older armor totals individually when they affect a recommendation; Helianthus is independently verified below.

## 5. Helianthus Armor: exact item-local model

Helianthus requires Farming 50. Current dedicated item page:

- Helmet: +35 Farming Fortune, +20 Bonus Pest Chance, +6 Speed.
- Chestplate: +40 Farming Fortune, +20 Bonus Pest Chance, +7 Speed.
- Leggings: +40 Farming Fortune, +20 Bonus Pest Chance, +7 Speed.
- Boots: +35 Farming Fortune, +20 Bonus Pest Chance, +6 Speed.

Base full-armor sum: +150 Farming Fortune, +80 Bonus Pest Chance, +26 Speed.

Separate Tiered Bonus: Feast:

```text
1 Helianthus piece -> +0 FF
2 pieces -> +25 FF
3 pieces -> +50 FF
4 pieces -> +75 FF
```

Thus four base pieces (+150) plus the documented 4-piece Feast tier (+75) explain the +225 total shown by the Fortune index. The +75 is not a base stat on any one piece.

The dedicated page also documents different rare crop drops by crop family while wearing Helianthus. Rare-crop EV belongs in a separate loot model, not in base FF.

Source: https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor
Last verified: 2026-09-16
Status: ACTIVE.

## 6. Armor reforges and enchants are per piece

### Mossy

Current rarity scaling: +5/+10/+15/+20/+25/+30 Farming Fortune for Common through Mythic.

A four-piece Mythic Mossy armor loadout is four independent +30 contributions, not one magic +120 flag.

### Pesterminator

Current index: +2 Farming Fortune per enchant level on each enchanted armor item. Pesterminator VI therefore gives +12 on one piece. Four actual VI pieces produce +48.

If one piece is V and three are VI, sum `10 + 12 + 12 + 12`, not the minimum and not a binary full-set state.

### Sunset

Current Overbloom page: Sunset grants +1 Overbloom per enchant level during the day. A four-piece set with Sunset V gives +20 Overbloom during the day because it is four item-local +5 effects. It is not Farming Fortune.

Source: https://hypixelskyblock.minecraft.wiki/w/Overbloom
Status: ACTIVE.

## 7. Equipment progression and Blossom

Blossom consists of four physical equipment items:

- Blossom Necklace
- Blossom Cloak
- Blossom Belt
- Blossom Bracelet

Each item has +7 base Farming Fortune and its own Florist Piece Bonus. Four base pieces total +28 FF.

Florist is granted independently by each worn Blossom item and scales from total Garden Visitors served. At 2,500 visitors, each piece grants +22.5 additional FF, so four equipped pieces grant +90 Florist FF plus +28 base FF before reforges, enchants, or gemstones.

The dedicated page explicitly warns that the piece bonus does not show in the visible item stats and uses the player's total Visitor milestone, not time worn.

Source: https://hypixelskyblock.minecraft.wiki/w/Blossom_Set
Last verified: 2026-09-16
Status: ACTIVE.

## 8. Equipment reforges

### Rooted

Current Farming Fortune index by host rarity:

```text
Common +6
Uncommon +9
Rare +12
Epic +15
Legendary +18
Mythic +21
```

Calculate each equipment piece separately from its real rarity.

### Thorny

The Farming Fortune index lists +2/+4/+6/+8/+10/+12 FF by rarity. The Overbloom page additionally lists +0.25 to +1.5 base Overbloom depending on rarity and +0.1 Overbloom per Thorns tier.

Therefore Thorny evaluation requires the worn armor's actual Thorns tiers. It is not just a static equipment reforge.

### Squeaky

The Fortune index lists +2/+4/+6/+8/+10/+12 FF by rarity. Its Pest-specific utility must be evaluated in pest context, not as pure FF.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
- https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16
Status: ACTIVE for current displayed values; dedicated reforge pages remain preferred if later changed.

## 9. Green Thumb enchant

Current index formula:

```text
Farming Fortune on one equipment piece
= 0.05 * GreenThumbLevel * uniqueVisitorsServed
```

Green Thumb I-V. Four Green Thumb V pieces with 137 unique visitors are listed as +137 total FF:

```text
0.05 * 5 * 137 = 34.25 per piece
34.25 * 4 = 137 total
```

This proves the enchant is item-local and summed across actual enchanted pieces. Different piece levels must be summed individually.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE.

## 10. Peridot gemstones

Current Farming Fortune values for Peridot on a compatible slot depend on both gem quality and host item rarity.

Perfect Peridot table, Common→Mythic host rarity:

```text
+3 / +4 / +5 / +6 / +8 / +10 Farming Fortune
```

Full current table from the index:

```text
Rough:    0.5 / 1 / 1.5 / 2 / 2.5 / 3
Flawed:   1 / 1.5 / 2 / 2.5 / 3 / 4
Fine:     1.5 / 2 / 3 / 4 / 5 / 6
Flawless: 2 / 3 / 4 / 5 / 6 / 8
Perfect:  3 / 4 / 5 / 6 / 8 / 10
```

Count actual compatible gemstone slots on actual items. Do not assume a "full set" automatically has all slots unlocked or all gems Perfect.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE with central-page staleness warning.

## 11. Overbloom item layer

Current Overbloom formula:

```text
rareCropChance = baseChance * (1 + Overbloom / 100)
```

Important current sources include:

- Feast V on tool: +10 Overbloom.
- Crop Fever active: +15 Overbloom.
- Sunset V on four armor pieces during day: +20 total.
- Overpriced tool reforge: rarity-scaled +1 to +7 Overbloom.
- Thorny equipment reforge: rarity-scaled base Overbloom plus +0.1 per Thorns tier.
- Lucky Clover: +7 Overbloom.
- Poignant Lucky Clover: +13.
- Rose Dragon: up to +40.
- Orchid Mantis: up to +15.
- Hedgehog: pest-scoped Overbloom up to +35.

The current page describes extremely high theoretical maxima, including Sun's Grasp doubling while farming with a fist. Treat such maxima as specialized configurations, not a normal farming loadout. Swapping from a specialized crop tool can reduce crop throughput/fortune and must be evaluated by measured EV.

Source: https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16
Status: ACTIVE for formula/source values shown by the page.

## 12. Pets: only one active pet

A loadout has one active pet. Never sum multiple pets at the same instant. Pet switching creates time-separated phases, not simultaneous stats.

### Mooshroom Cow

Dedicated page currently shows a base +100 Farming Fortune at level 100. Rare and higher rarities have Farming Strength. At level 100, the current page states +0.7 Farming Fortune per every 20 Strength.

Conceptually:

```text
mooshroom_ff = 100 + 0.7 * floor_or_game_scaling(Strength / 20)
```

Do not implement a flooring rule unless confirmed by exact game behavior. Farming420 should use the verified game formula implementation rather than guessing rounding from tooltip wording.

The current Farming Fortune index states a level-100 Legendary Mooshroom Cow reaches the same Farming Fortune as a level-100 Mythic Elephant at about 2,857.14 Strength.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Mooshroom_Cow_Pet
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE for displayed scaling; exact rounding remains VERIFY if not tested.

### Elephant

Current Farming Fortune index lists:

- Legendary level-100 Elephant: +150 Farming Fortune.
- Mythic Elephant: +200 Farming Fortune.

The dedicated Elephant page confirms acquisition via Oringo/Traveling Zoo and rarity-dependent purchase paths. Compare Elephant against other pets by total context value, not only raw FF.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Elephant_Pet
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE for current FF values from the Fortune index; dedicated Mythic perk details should be referenced for any non-FF comparison.

### Other modern farming pets

The current Fortune index additionally exposes modern context pets such as Slug, Hedgehog, Rose Dragon, Orchid Mantis, Bee, Chicken, Mosquito, and Pig. These should be modeled as separate strategy candidates rather than collapsed into a simple Elephant-vs-Mooshroom choice.

Examples from the current index:

- Slug: +100 FF when farming on a sprayed plot; Hypercharge can increase the documented effect to +200.
- Hedgehog: pest-specialized FF from Fearsome Farmer plus bestiary-scaling Hunter's Insight; page lists up to +257.5 pest FF at the stated max state.
- Rose Dragon: page lists a high multi-source Farming Fortune ceiling based on level, Farming level, crop milestones, and other maxed Farming pets.
- Mosquito: Sugar Cane Fortune tied to unique visitor progression.

Each of these has dependencies that must be individually represented in the optimizer.

## 13. Pet items

A pet holds at most one pet item. Compare the current held item against the candidate item and subtract the lost old effect. Examples in the current index include Green Bandana (+4 FF per Garden level, up to +60 at Garden 15) and crop-specific items such as Flying Pig for Pig/Potato contexts.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Status: ACTIVE for displayed index values; dedicated pet-item page preferred for application restrictions.

## 14. Scanner/API implications

When importing a player's item, preserve raw facts:

```text
skyblockId
itemUuid
rarity
reforge
enchantments map
gems map
attributes map
recombobulated state
item tier/tool level/counters
```

Do not convert the raw item into a full-set aggregate during normalization. Derived stats belong in a separate calculation layer so a later mechanics correction does not corrupt source data.
