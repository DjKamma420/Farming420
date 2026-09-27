# Farming shards — relevance and synergy model

Verified: 2026-09-27

Purpose: define which Attribute Shards are relevant to farming/Pest farming, which are safe to auto-rank, and which must remain visible but unscored until an economics model exists.

Primary source:
- https://hypixelskyblock.minecraft.wiki/w/Attributes

Additional sources:
- https://hypixelskyblock.minecraft.wiki/w/Atmospheric_Filter
- https://hypixelskyblock.minecraft.wiki/w/Overbloom
- https://hypixel.net/threads/hypixel-skyblock-0-27-torrhus-canyon-critter-safari.6132090/

## Direct planner targets

| Shard | Attribute | Effect at level 10 | Scope | Planner target |
|---|---|---:|---|---|
| Fly | Fortunate Farmer | +25 Farming Fortune | Farming | Farming Fortune |
| Firefly | Solar Power | +50 Farming Fortune | Day | Farming Fortune |
| Lunar Moth | Lunar Power | +50 Farming Fortune | Night | Farming Fortune |
| Galaxy Fish | Ultimate DNA | +10 Farming Fortune share | Global | Farming Fortune |
| Earthworm | Infiltration | +30 Farming Fortune | Current Garden plot has a Pest | Farming Fortune |
| Beetle | Crop Bug | +10 Overbloom | Farming | Overbloom |
| Field Mouse | Pest Luck | +5 Pest Overbloom | Pest loot | Overbloom |
| Cricket | Pest Fortune | +50 Farming Fortune on Pests | Pest loot | Farming Fortune |
| Keeled Slug | Bonus Pest Chance | +10 BPC | Pest spawning | Bonus Pest Chance |
| Moth | Pest Cooldown | published as 0.5s with no level range | Pest spawning | VERIFY / cooldown |

Moth stays VERIFY. The source does not publish a level 1→10 range, so Farming420 must not assume 0.5 seconds per level.

Firefly and Lunar Moth are separate global shard possessions and separate market items. Their mutually exclusive day/night conditions do not make them one item.

## Relevant but not auto-ranked

| Shard | Attribute | Relevance | Why no generic profit rank |
|---|---|---|---|
| Praying Mantis | Pest Ruler | Pest kill speed | Needs Pest throughput / time-to-kill model |
| Rat | Sprayonator Serendipity | Extra Sprayonator Material | Needs material EV and Pest rate |
| Cocoaleech | Groovy Radar | Chance for a second Vinyl | Needs current Vinyl EV and Pest rate |
| Mosquito | Enchanted Farmer | Enchanted Crop chance | Needs crop-specific EV |
| Locust | Crop Speed | Garden crop regeneration | Depends on farm layout and breaks/second |
| Bayou Sludge | Compost Speed | Composter economy | Separate economy stream |
| Mudworm | Visitor Bait | Visitor arrival speed | Visitor economy |
| Invisibug | Fancy Visit | RARE+ Visitor chance | Visitor economy |
| Ladybug | Pretty Clothes | Visitor Copper | Visitor economy |
| Honeybug | Visitor Honey | Visitor material chance | Visitor economy |
| Parched | Visitor Compost | Visitor material chance | Visitor economy |
| Woodlouse | Visitor Cheese | Visitor material chance | Visitor economy |
| Red Panda | Visitor Plant | Visitor material chance | Visitor economy |
| Dung Beetle | Visitor Dung | Visitor material chance | Visitor economy |
| Dragonfly | Garden Wisdom | Farming XP | XP only |

These entries remain relevant/searchable. An explicit empty `plannerTargets` list means "do not turn this positive number into generic profit."

## Indirect Strength chain

The following shards can affect Legendary Mooshroom Cow Farming Fortune without granting Farming Fortune directly:

- Flash / Quake / Bolt / Aero / Tempest: +1 Strength per level from their Elemental attributes.
- Starborn / Echo of Elemental: +2% per level to the other Elemental Family shard effects, boosting the five Strength shards.
- Jormung / Unlimited Power: percentage Strength.
- Molthorn / Almighty Echo: boosts "Unlimited" Attributes and therefore Jormung.
- Hideonbox / Tuning Box: extra Tuning Points; only a Strength path when those points are actually assigned to Strength.

Farming420 evaluates this through the real Cow breakpoint formula. It does not label Strength as direct FF.

## Other shard-to-shard synergies

- Mite / Filter Upgrade: +2% per level to Atmospheric Filter effects, max +20%.
- Wyvern / Echo of Wisdom: can strengthen Wisdom Attributes. Relevant to XP, not generic crop profit.
- Queen Snake / Queenly Echo: can strengthen Visitor Attributes. Relevant to Visitor economy.
- Tiamat / Echo of Echoes: affects Echo Attributes. Do not recursively calculate an ordering with Starborn/Wyvern/etc. until the stacking order is explicitly sourced.

## Storage and planner invariants

Shard levels are account-global. They are not Farming-set, Pest-Spawning-set or Pest-Killing-set properties.

Planner rules:
1. keep one stored shard level per shard;
2. evaluate that one global upgrade in every mechanically applicable activity;
3. collapse duplicate recommendation rows back to the same global purchase/progression;
4. auto-rank only explicit supported targets;
5. keep conditional effects conditional;
6. do not invent coins/hour for unpriced mechanics.

## Source policy

Current community-wiki pages are used because the old official wiki domain is no longer a valid current reference. Official Hypixel patch notes are preferred for patch-specific changes. Values in this document are live-game values verified on 2026-09-27.
