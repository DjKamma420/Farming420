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

## Greenhouse mutation progression

| Item | SkyBlock ID | Greenhouse mutation chance |
|---|---|---:|
| Bioanalysis Talisman | `BIOANALYSIS_TALISMAN` | +5% |
| Bioanalysis Ring | `BIOANALYSIS_RING` | +10% |
| Bioanalysis Artifact | `BIOANALYSIS_ARTIFACT` | +15% |

This is one accessory line; only the strongest owned tier should count.

Exact current head textures from the Hypixel item resource:
- `BIOANALYSIS_TALISMAN`: `19ca2fedab02df448906b25f25f2df2c9b9c532ce48276447113dca6825e9e05`
- `BIOANALYSIS_RING`: `80b774ffeb5878d6e34e9f244642e4ee489fd1dc9a2da52b87e2ecc0449c22f9`
- `BIOANALYSIS_ARTIFACT`: `e5f2e8e4f040d1dbef5a5369bd09db86a79b81a249547e458b3cc5997e24c0eb`

Sources:
- https://hypixel-skyblock.fandom.com/wiki/Bioanalysis_Talisman
- https://hypixel-skyblock.fandom.com/wiki/Bioanalysis_Ring
- https://hypixel-skyblock.fandom.com/wiki/Bioanalysis_Artifact
- https://hypixel-skyblock.fandom.com/wiki/Module:Item/ApiData

## Garden visitor progression

| Item | SkyBlock ID | RARE+ visitor chance |
|---|---|---:|
| Copper Talisman | `COPPER_TALISMAN` | +4% |
| Copper Ring | `COPPER_RING` | +8% |
| Copper Artifact | `COPPER_ARTIFACT` | +12% |

This is one accessory line; lower tiers do not stack with higher tiers.

Exact current head textures from the Hypixel item resource:
- `COPPER_TALISMAN`: `856cba11ca1258258e903f2586fe19ecf20f4a99ef5870347cf32c2ba76e59cf`
- `COPPER_RING`: `f83a812525faf3499c3294634398b5e0e967489f2ee63e14490c1440553af065`
- `COPPER_ARTIFACT`: `2933e519fc6b29c930bf74d426a2f4888a9994fe2892c6d5585fd6a3a8e52689`

Sources:
- https://hypixel-skyblock.fandom.com/wiki/Copper_Talisman
- https://hypixel-skyblock.fandom.com/wiki/Copper_Ring
- https://hypixel-skyblock.fandom.com/wiki/Copper_Artifact
- https://hypixel-skyblock.fandom.com/wiki/Module:Item/ApiData

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

## Market-routing verification

Verified: 2026-09-23

For automatic coin acquisition prices, only direct market routes with current trade evidence are used:

| Item | SkyBlock ID | Automatic market route |
|---|---|---|
| Anita's Artifact | `ANITA_ARTIFACT` | Auction House |
| Atmospheric Filter | `ATMOSPHERIC_FILTER` | Auction House |
| Magic 8 Ball | `MAGIC_8_BALL` | Auction House |
| Relic of Power | `POWER_RELIC` | none — not directly Auction House/Bazaar tradeable |

Relic of Power must not be priced as though the physical `POWER_RELIC` item can be bought from AH/Bazaar. Its acquisition is a forge/progression path from Artifact of Power. The Perfect Peridot used for the farming effect is Bazaar-tradeable, but pricing only that gemstone without also knowing that the player already owns the Relic would understate the acquisition cost.

Market evidence:
- https://sky.coflnet.com/item/ANITA_ARTIFACT
- https://sky.coflnet.com/item/ATMOSPHERIC_FILTER
- https://sky.coflnet.com/item/MAGIC_8_BALL
- https://skyblock.finance/items/POWER_RELIC
- https://hypixel-skyblock.fandom.com/wiki/Relic_of_Power

## Model rule

The public Hypixel item resource carries `material`, `skin`, category and rarity. For skull-based accessories, `skin` is the exact Minecraft texture hash. The app converts that hash to `https://textures.minecraft.net/texture/<hash>`.

The model layer must:
1. resolve exact item IDs first;
2. use the Hypixel item resource's skin hash when present;
3. use shipped pack art only when there is no skull texture;
4. never substitute fuzzy-name matches for a different physical item.

Blue™ but Yellow Abicase grants +1.5 Farming Wisdom and is farming-relevant, but it is intentionally not rendered as a normal exact-ID card yet. Hypixel's public item resource exposes the base `ABICASE` item, while current live-auction metadata identifies the named variant with model key `BLUE_YELLOW`. Rendering the base `ABICASE` skull as if it were guaranteed to be the Yellow variant would violate the exact-model rule.
