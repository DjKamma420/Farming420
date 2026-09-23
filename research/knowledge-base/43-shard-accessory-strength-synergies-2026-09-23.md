# Shard and Accessory Strength synergies — 2026-09-23

## Why this exists

Farming420 previously treated Attribute Shards mostly as direct Farming Fortune / Pest stats and treated accessory Enrichments as irrelevant. That misses real indirect Farming Fortune when a LEGENDARY Mooshroom Cow is active.

This note records only interactions that are useful to farming and have a current source.

## Verified shard chains

Source: https://hypixelskyblock.minecraft.wiki/w/Attributes  
Verified: 2026-09-23

### Elemental Strength -> Mooshroom Cow

Five Elemental-family Attributes grant Strength:

- Flash Shard — Light Elemental — +1 Strength per level, max +10.
- Quake Shard — Stone Elemental — +1 Strength per level, max +10.
- Bolt Shard — Lightning Elemental — +1 Strength per level, max +10.
- Aero Shard — Wind Elemental — +1 Strength per level, max +10.
- Tempest Shard — Storm Elemental — +1 Strength per level, max +10.

Together they are +50 base Strength at level 10.

Starborn Shard has **Echo of Elemental**: all other Elemental Family shard effects are +2% per level, max +20%. Therefore it strengthens all five Strength Attributes above. At all five level 10 and Starborn level 10, the modeled Elemental Strength contribution is 50 * 1.20 = 60 Strength.

The Cow conversion remains discrete. Farming420 must run before/after Strength through the existing Mooshroom Cow formula rather than call +1 Strength a fixed amount of Farming Fortune.

### Unlimited Power -> Almighty Echo -> Mooshroom Cow

- Jormung Shard — Unlimited Power — Strength increased by +0.1% per level, max +1%.
- Molthorn Shard — Almighty Echo — "Unlimited" Attributes are +5% per level, max +50%.

Unlimited Power is therefore a direct target of Almighty Echo. Farming420 records the strengthened Jormung percentage and evaluates a before/after Cow transition from the player's observed Strength.

### Other farming-relevant shard boosters

- Mite Shard — Filter Upgrade — Atmospheric Filter effects +2% per level, max +20%.
- Wyvern Shard — Echo of Wisdom — Wisdom Attributes +2% per level, max +20%.
- Queen Snake Shard — Queenly Echo — "Visitor" Attributes +5% per level, max +50%.
- Hideonbox Shard — Tuning Box — +1 Tuning Point per level, max +10.
- Tiamat Shard — Echo of Echoes — "Echo" Attributes +5% per level, max +50%.

These are not flattened into Farming Fortune. Their value depends on the target effect or player allocation. Recursive Echo stacking is not numerically guessed without a verified stacking-order rule.

## Accessories

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Enrichments
- https://hypixelskyblock.minecraft.wiki/w/Accessory_Bag
- https://hypixelskyblock.minecraft.wiki/w/Power_Stones

Verified: 2026-09-23

Strength Enrichment grants **+1 Strength** and can be applied to eligible high-rarity accessories. This matters for LEGENDARY Mooshroom Cow.

Important modeling rule: the player's Strength input is an observed total. Synced Strength Enrichments must not be added on top of that total or they would be double-counted. Instead:

1. sync and display how many Strength Enrichments are actually present;
2. evaluate a hypothetical additional +1 Strength through the Cow before/after formula;
3. show the distance to the next displayed Cow Farming Fortune breakpoint.

Accessory Power and Tuning Points can also change Strength. Their marginal Cow value depends on the active Accessory Power and tuning allocation. Farming420 must not invent a conversion when those settings are unknown.

## NBT

Accessory enrichment is stored on an item as the ExtraAttributes key `talisman_enrichment`. The normalized item model preserves that raw value as `talismanEnrichment`.
