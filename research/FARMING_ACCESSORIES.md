# Farming accessories — current structure and exact item identity

Verified: 2026-09-18

Purpose: source-of-truth notes for the Accessories tab. The UI must resolve art by exact SkyBlock item ID against Hypixel's `/v2/resources/skyblock/items` resource. Do not use fuzzy name matching or invented icons when an exact item ID exists.

## Crop Fortune progression

| Item | SkyBlock ID | Effect | Relationship |
|---|---|---|---|
| Cropie Talisman | `CROPIE_TALISMAN` | +10 Crop Fortune on Wheat, Carrot, Potato | upgrades to Squash Ring |
| Squash Ring | `SQUASH_RING` | +20 Crop Fortune on Wheat, Potato, Carrot, Melon, Pumpkin, Cocoa Beans | upgrades from Cropie, to Fermento |
| Fermento Artifact | `FERMENTO_ARTIFACT` | +30 Farming Fortune while breaking crops | upgrades from Squash, to Helianthus |
| Helianthus Relic | `HELIANTHUS_RELIC` | +40 Farming Fortune while breaking crops | final tier |

Only the highest applicable member of this upgrade line is intended to count. Lower tiers are shown for progression and model identity, not as additive bonuses.

Sources:
- https://hypixel-skyblock.fandom.com/wiki/Cropie_Talisman
- https://hypixel-skyblock.fandom.com/wiki/Squash_Ring
- https://hypixel-skyblock.fandom.com/wiki/Fermento_Artifact
- https://hypixel-skyblock.fandom.com/wiki/Helianthus_Relic

## Anita contest progression

| Item | SkyBlock ID | Contest crop bonus |
|---|---|---:|
| Anita's Talisman | `ANITA_TALISMAN` | +5 Farming Fortune |
| Anita's Ring | `ANITA_RING` | +15 Farming Fortune |
| Anita's Artifact | `ANITA_ARTIFACT` | +25 Farming Fortune |

The bonus is for the crop selected by the accessory for that Jacob's Farming Contest. Higher tiers replace lower tiers.

Sources:
- https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Talisman
- https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Ring
- https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Artifact

## Pesthunter progression

| Item | SkyBlock ID | Bonus Pest Chance |
|---|---|---:|
| Pesthunter Badge | `PESTHUNTER_BADGE` | +20 |
| Pesthunter Ring | `PESTHUNTER_RING` | +40 |
| Pesthunter Artifact | `PESTHUNTER_ARTIFACT` | +60 |
| Pesthunter Relic | `PESTHUNTER_RELIC` | +80 |

Higher tiers replace lower tiers. Pesthunter Relic was added to the live game in 0.23.6 (2025-11-04).

Sources:
- https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Badge
- https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Ring
- https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Artifact
- https://hypixel-skyblock.fandom.com/wiki/Pesthunter_Relic

## Conditional / utility

| Item | SkyBlock ID | Farming relevance |
|---|---|---|
| Atmospheric Filter | `ATMOSPHERIC_FILTER` | Spring +25 FF; Summer +20 Farming Wisdom; Autumn +15% pest spawn chance; Winter +5% visitor Copper |
| Magic 8 Ball | `MAGIC_8_BALL` | Farming roll: +25 FF and +1 Farming Wisdom |
| Relic of Power | `POWER_RELIC` | gemstone container; Perfect Peridot contributes at half gemstone effect |
| Agarimoo Artifact | `AGARIMOO_ARTIFACT` | +1 Farming Wisdom |
| Farming Talisman | `FARMING_TALISMAN` | +10 Speed on farming islands / Garden |

Important correction: the current item ID for Relic of Power is `POWER_RELIC`, not `RELIC_OF_POWER`.

Sources:
- https://hypixel-skyblock.fandom.com/wiki/Atmospheric_Filter
- https://hypixel-skyblock.fandom.com/wiki/Magic_8_Ball
- https://hypixel-skyblock.fandom.com/wiki/Relic_of_Power
- https://hypixel-skyblock.fandom.com/wiki/Agarimoo_Artifact
- https://hypixel-skyblock.fandom.com/wiki/Farming_Talisman
- https://wiki.eliteskyblock.com/Farming_Fortune
- https://wiki.eliteskyblock.com/Farming_XP

## Model rule

The public Hypixel item resource carries `material`, `skin`, category and rarity. For skull-based accessories, `skin` is the exact Minecraft texture hash. The app converts that hash to `https://textures.minecraft.net/texture/<hash>`.

The model layer must:
1. resolve exact item IDs first;
2. use the Hypixel item resource's skin hash when present;
3. use shipped pack art only when there is no skull texture;
4. never substitute fuzzy-name matches for a different physical item.

Blue™ but Yellow Abicase is intentionally not a dedicated visual card here. Hypixel's public item resource exposes the base `ABICASE` item while the named case is a variant; presenting the base texture as a guaranteed exact Yellow variant would violate the exact-model rule.
