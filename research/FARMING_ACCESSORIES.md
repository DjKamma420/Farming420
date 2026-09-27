# Farming accessories — relevance, progression and exact item identity

Verified: 2026-09-27

Purpose: source-of-truth notes for the Accessories tab and planner-facing relevance metadata. Accessories are account-global physical progression. Farming420 must not store separate copies for Farming, Pest Spawning and Pest Killing.

## Recommendation rule

An accessory is shown when it is farming-related, but it only enters a profit/stat recommendation when the effect can be mapped to a supported planner objective without inventing economics.

Supported direct targets in this pass:
- Farming Fortune
- Overbloom
- Bonus Pest Chance

Greenhouse mutation, Visitor economy, Farming Wisdom and movement utility remain visible but are not auto-ranked as crop/Pest profit until those systems have their own economic model.

## Crop Fortune progression

| Item | SkyBlock ID | Effect | Planner target |
|---|---|---|---|
| Cropie Talisman | `CROPIE_TALISMAN` | +10 Crop Fortune on Wheat, Carrot and Potato | Farming Fortune |
| Squash Ring | `SQUASH_RING` | +20 Crop Fortune on six crops | Farming Fortune |
| Fermento Artifact | `FERMENTO_ARTIFACT` | +30 Farming Fortune while breaking crops | Farming Fortune |
| Helianthus Relic | `HELIANTHUS_RELIC` | +40 Farming Fortune while breaking crops | Farming Fortune |

Only the highest applicable member of the line counts.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Cropie_Talisman
- https://hypixelskyblock.minecraft.wiki/w/Squash_Ring
- https://hypixelskyblock.minecraft.wiki/w/Fermento_Artifact
- https://hypixelskyblock.minecraft.wiki/w/Helianthus_Relic

## Anita contest progression

| Item | SkyBlock ID | Contest crop bonus |
|---|---|---:|
| Anita's Talisman | `ANITA_TALISMAN` | +5 Farming Fortune |
| Anita's Ring | `ANITA_RING` | +15 Farming Fortune |
| Anita's Artifact | `ANITA_ARTIFACT` | +25 Farming Fortune |

Higher tiers replace lower tiers. The bonus is conditional on the crop selected for the Jacob's Farming Contest.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Anita%27s_Talisman
- https://hypixelskyblock.minecraft.wiki/w/Anita%27s_Ring
- https://hypixelskyblock.minecraft.wiki/w/Anita%27s_Artifact

## Pesthunter progression

| Item | SkyBlock ID | Bonus Pest Chance |
|---|---|---:|
| Pesthunter Badge | `PESTHUNTER_BADGE` | +20 |
| Pesthunter Ring | `PESTHUNTER_RING` | +40 |
| Pesthunter Artifact | `PESTHUNTER_ARTIFACT` | +60 |
| Pesthunter Relic | `PESTHUNTER_RELIC` | +80 |

This is a Pest Spawning target. Higher tiers replace lower tiers; never sum the family.

Source:
- https://hypixelskyblock.minecraft.wiki/w/Pesthunter_Relic

## Freshly Baked Overbloom progression

| Item | SkyBlock ID | Normal Overbloom | Harvest/Grand Feast |
|---|---|---:|---:|
| Freshly Baked Talisman | `FRESHLY_BAKED_TALISMAN` | +1 | +2 |
| Freshly Baked Ring | `FRESHLY_BAKED_RING` | +2 | +4 |
| Freshly Baked Artifact | `FRESHLY_BAKED_ARTIFACT` | +3 | +6 |
| Freshly Baked Relic | `FRESHLY_BAKED_RELIC` | +4 | +8 |
| Freshly Baked Heirloom | `FRESHLY_BAKED_HEIRLOOM` | +5 | +10 |

Only the highest tier counts. Feast doubles this accessory's own Overbloom; it must not double total account Overbloom.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Overbloom
- https://hypixelskyblock.minecraft.wiki/w/Freshly_Baked_Talisman
- https://hypixelskyblock.minecraft.wiki/w/Freshly_Baked_Ring
- https://hypixelskyblock.minecraft.wiki/w/Freshly_Baked_Artifact
- https://hypixelskyblock.minecraft.wiki/w/Freshly_Baked_Relic
- https://hypixelskyblock.minecraft.wiki/w/Freshly_Baked_Heirloom

## Greenhouse mutation progression

| Item | SkyBlock ID | Greenhouse mutation chance |
|---|---|---:|
| Bioanalysis Talisman | `BIOANALYSIS_TALISMAN` | +5% |
| Bioanalysis Ring | `BIOANALYSIS_RING` | +10% |
| Bioanalysis Artifact | `BIOANALYSIS_ARTIFACT` | +15% |

This line is farming-relevant but not a generic crop-profit recommendation. Only the strongest owned tier counts.

Source:
- https://hypixelskyblock.minecraft.wiki/w/Bioanalysis_Artifact

## Garden visitor progression

| Item | SkyBlock ID | RARE+ Visitor chance |
|---|---|---:|
| Copper Talisman | `COPPER_TALISMAN` | +4% |
| Copper Ring | `COPPER_RING` | +8% |
| Copper Artifact | `COPPER_ARTIFACT` | +12% |

This line is Visitor-economy relevance, not Farming Fortune. Lower tiers do not stack with higher tiers.

Source:
- https://hypixelskyblock.minecraft.wiki/w/Copper_Artifact

## Conditional and utility accessories

| Item | SkyBlock ID | Farming relevance | Planner treatment |
|---|---|---|---|
| Atmospheric Filter | `ATMOSPHERIC_FILTER` | Spring +25 FF; Summer +20 Farming Wisdom; Autumn +15% Pest spawn chance; Winter +5% Visitor Copper | Season-specific; Mite can boost the accessory effects |
| Magic 8 Ball | `MAGIC_8_BALL` | Farming roll: +25 FF and +1 Farming Wisdom | FF only when the Farming roll is active |
| Relic of Power | `POWER_RELIC` | Gemstone container; Peridot contributes Farming Fortune at the accessory's reduced gemstone effectiveness | Direct FF from the installed Peridot only |
| Agarimoo Artifact | `AGARIMOO_ARTIFACT` | +1 Farming Wisdom | XP only |
| Farming Talisman | `FARMING_TALISMAN` | +10 Speed on farming islands / Garden | Movement utility only |

Atmospheric Filter + Mite is a real shard/accessory synergy. At Filter Upgrade X (+20%), the seasonal effects become 30 Farming Fortune, 24 Farming Wisdom, 18% extra Pest spawn chance and 6% Visitor Copper. Autumn changes the chance that a Pest spawns after the spawn cooldown; it does not shorten the cooldown.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Atmospheric_Filter
- https://hypixelskyblock.minecraft.wiki/w/Magic_8_Ball
- https://hypixelskyblock.minecraft.wiki/w/Relic_of_Power

## Strength / Mooshroom Cow interaction

Eligible accessories can receive Strength Enrichment. Strength is not itself Farming Fortune, but it can cross a Legendary Mooshroom Cow Strength breakpoint. The app therefore evaluates the actual Cow floor formula instead of pretending every +1 Strength is a fixed FF amount.

Accessory Power and Tuning can also contribute Strength, but no Cow value is assigned until the selected Power and tuning allocation are known.

## Exact-item model rule

The public Hypixel item resource carries exact item IDs plus material/skin/category/rarity data. The model layer must:
1. resolve exact item IDs first;
2. use the resource skin hash when present;
3. use shipped pack art only when there is no skull texture;
4. never substitute fuzzy-name matches for a different physical item;
5. keep progression state account-global rather than copying it into phase loadouts.

Blue™ but Yellow Abicase grants farming-related Wisdom, but it remains intentionally excluded from exact accessory cards until the named variant can be identified without presenting the base `ABICASE` as the variant.
