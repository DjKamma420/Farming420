# Chips, temporary buffs, and farming shards — verified 2026-09-27

Machine-readable Garden Chip implementation: `src/garden-chips.js`.
Other modifier data remains in `src/farming-modifiers-data.js`.

## Status rules

- `ACTIVE`: current effect is sufficiently sourced for direct calculator use.
- `VERIFY`: do not fabricate missing values or stacking rules.
- Unknown profile state is not zero. Keep it unknown/manual until an authoritative field is identified.

## Garden Chips

Garden Chips were released with the Greenhouse update. Sowdust raises chip level; consuming duplicate chips raises rarity. Current rarity caps and total chip-copy requirements are:

| Rarity | Level cap | Total copies consumed/required |
| --- | ---: | ---: |
| Rare | 10 | 1 |
| Epic | 15 | 5 |
| Legendary | 20 | 21 |

Current effects per level are:

| Chip | Rare | Epic | Legendary | Scope |
| --- | ---: | ---: | ---: | --- |
| Vermin Vaporizer | +3 BPC | +4 BPC | +5 BPC | Pest spawning |
| Synthesis | +1% Copper | +1.5% Copper | +2% Copper | Mutation Analysis |
| Sowledge | +1 Farming Wisdom | +1.25 | +1.5 | Farming XP |
| Mechamind | +1.5% Tool XP | +2% | +2.5% | Farming Tool XP |
| Hypercharge | +3% | +4% | +5% | Eligible temporary Farming Fortune buffs only |
| Evergreen | +2% base crops | +2.5% | +3% | Greenhouse |
| Overdrive | +5 Crop Fortune | +6 | +7 | Active Jacob Contest crop |
| Cropshot | +3 Farming Fortune | +4 | +5 | Global Farming Fortune |
| Quickdraw | -1.5% Visitor appearance time | -2% | -2.5% | While harvesting |
| Rarefinder | +1.5 Overbloom | +2 | +2.5 | Rare Crop rolls |

Legendary level-20 maxima therefore include Cropshot +100 Farming Fortune, Overdrive +140 Crop Fortune, Rarefinder +50 Overbloom, Vermin Vaporizer +100 Bonus Pest Chance and Hypercharge +100% strength on eligible temporary buffs.

The July 22, 2026 live 0.26.1 update reduced Rarefinder from +2/+2.5/+3 to +1.5/+2/+2.5 per level and its max from +60 to +50 Overbloom. During 0.27 Alpha, Cropshot was temporarily reduced, but the official August 3 Alpha change restored +3/+4/+5 per level. Current community data matches the restored values. Do not retain the temporary +60 max as live Cropshot behavior.

## Sowdust level costs

The cost shown is the Sowdust required to reach the target level from the previous level.

| Target level | Sowdust | Target level | Sowdust |
| ---: | ---: | ---: | ---: |
| 2 | 100,000 | 11 | 1,300,000 |
| 3 | 200,000 | 12 | 1,450,000 |
| 4 | 300,000 | 13 | 1,600,000 |
| 5 | 400,000 | 14 | 1,750,000 |
| 6 | 550,000 | 15 | 1,900,000 |
| 7 | 700,000 | 16 | 2,050,000 |
| 8 | 850,000 | 17 | 2,200,000 |
| 9 | 1,000,000 | 18 | 2,350,000 |
| 10 | 1,150,000 | 19 | 2,500,000 |
|  |  | 20 | 2,650,000 |

Cumulative Sowdust:
- level 10: 5,250,000
- level 15: 13,250,000
- level 20: 25,000,000

Duplicate-chip acquisition and Sowdust are separate costs. A Legendary level-20 chip requires both the Legendary copy requirement and 25,000,000 Sowdust.

## Profile/API boundary

As of 2026-09-27, the documented Hypixel `/v2/skyblock/garden` schema does not document a Garden Chip progression field. Farming420 therefore stores chip rarity and level as manual profile state. Legacy chip levels are preserved during migration, but their rarity remains unknown rather than being guessed.

This is deliberately different from treating a missing field as level 0.

## Hypercharge boundary

The current Garden Chips reference lists Hypercharge as affecting a whitelist of temporary Farming Fortune sources rather than total Farming Fortune. Overdrive is explicitly excluded.

The exact runtime application of every Hypercharge-eligible source is tracked as a separate TODO. The chip-level model may calculate Hypercharge's percentage, but it must not multiply global Farming Fortune until the eligible temporary source is known.

## Temporary modifiers

Modeled explicitly elsewhere:

- Crop Fever.
- Chocolate Century Cake.
- Pesthunter Phillip.
- Atmospheric Filter.
- Magic 8 Ball.
- Refined Dark Cacao Truffle.

Temporary Farming Fortune, Crop Fortune, Pest-only Fortune and Overbloom are distinct axes.

## Farming-relevant shards

Shard effects stay on their native axes. Effects that alter Visitor, Pest, Greenhouse or spray timing must feed their respective strategy model rather than being converted to generic Farming Fortune.

## Sources

Primary:
- https://hypixel.net/threads/hypixel-skyblock-0-24-greenhouse.6073818/
- https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/
- https://hypixel.net/threads/aug-3-0-27-alpha-changes-2.6134812/
- https://hypixelskyblock.minecraft.wiki/w/Garden_Chips
- https://api.hypixel.net/

Last verified: 2026-09-27.
