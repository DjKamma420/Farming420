# Chips, temporary buffs, and farming shards — 2026-09-17

Machine-readable implementation: `src/farming-modifiers-data.js`.

## Status rules

- `ACTIVE`: current effect is sufficiently sourced for direct calculator use.
- `ACTIVE_REPORTED_0_27`: current 0.27 behavior is consistently reported but was not fully documented in official patch notes. Preserve provenance and prefer live profile/item decoding when possible.
- `VERIFY` / `VERIFY_0_27`: do not fabricate missing values or stacking rules.

## Garden Chips

The Greenhouse update introduced Sowdust and Garden Chips as permanent account upgrades. Chip rarity controls both level cap and effect scaling: Rare 10, Epic 15, Legendary 20.

Current modeled chip families:

- Vermin Vaporizer: Bonus Pest Chance.
- Synthesis: base Copper from Crop Analyzer.
- Sowledge: Farming Wisdom.
- Mechamind: Farming Tool XP gain.
- Hypercharge: strength of eligible temporary Farming Fortune buffs.
- Evergreen: Greenhouse base crop yield.
- Overdrive: active-crop Fortune during Jacob's Contest.
- Cropshot: Farming Fortune.
- Quickdraw: Visitor arrival-time reduction.
- Rarefinder: Overbloom.

### 0.27 Cropshot boundary

Pre-0.27 sources describe +3/+4/+5 Farming Fortune per level and +100 at Legendary level 20. Current 0.27 reports show the maxed result changed to +60 Farming Fortune. The exact post-change Epic/Legendary per-level curve is not directly documented in the sources used here, so the runtime table deliberately leaves those rates unresolved instead of inferring them. Rare +3 per level remains directly represented.

## Temporary modifiers

Modeled explicitly:

- Crop Fever: 0.001% proc chance per enchant level, max V, 60 seconds, +100 Farming Fortune and +15 Overbloom during the fever.
- Chocolate Century Cake: +5 Farming Fortune.
- Pesthunter Phillip: current reported requirement 80 Pests for the full +200 Farming Fortune / 30 minute buff.
- Atmospheric Filter: +25 Farming Fortune in Spring.
- Magic 8 Ball: +25 Farming Fortune in its selected season, but its Hypercharge interaction remains `VERIFY` because the community reference still marks it for confirmation.
- Refined Dark Cacao Truffle: in the 0.27 line it is crop-specific rather than global; the runtime model stores the refined +30 as Cocoa Beans Fortune and does not add it to global Farming Fortune.

Hypercharge is applied only to rows explicitly marked `hyperchargeEligible`. The calculator must never multiply all temporary/crop-specific stats indiscriminately.

## Farming-relevant 0.27 shards

The current data table includes Field Mouse, Cricket, Fly, Keeled Slug, Moth, Rat, Mosquito, Mudworm, Locust, Timestalk Clone and Mite. Their effects are kept on separate axes: Pest Overbloom, Pest-only Farming Fortune, global Farming Fortune, Bonus Pest Chance, Pest cooldown, spray-material chance, enchanted-crop chance, Visitor arrival time, Crop Growth, Greenhouse growth speed and Atmospheric Filter strength.

Mudworm and Timestalk Clone stacking behavior remains unresolved and is tagged `VERIFY_STACKING`.

## Source hierarchy used

1. Official Hypixel update/patch notes for system existence and dated behavior.
2. Current item/profile data when directly available.
3. Current community wiki/Elite Farmers for exact item/stat descriptions not present in patch notes.
4. Current forum observations for 0.27 changes that were explicitly under-documented by patch notes; these remain marked as reported rather than silently upgraded to official certainty.

Primary references:

- https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/
- https://hypixel-skyblock.fandom.com/wiki/Garden_Chips
- https://hypixel-skyblock.fandom.com/wiki/Farming_Fortune
- https://hypixel-skyblock.fandom.com/wiki/Crop_Fever
- https://hypixel-skyblock.fandom.com/wiki/Overbloom
- https://hypixel.net/threads/random-farming-nerfs-not-mentioned-in-patch-notes.6128320/
- https://hypixel.net/threads/outdated-more-farming-nerfs-on-alpha-including-math.6132043/

## Calculator contract

- Never use pre-0.27 Cropshot +100 as a current value.
- If a chip rarity rate is unresolved, return unknown rather than zero or an inferred value.
- Temporary Farming Fortune, Crop Fortune, Pest-only Fortune and Overbloom are distinct axes.
- Shard effects that alter Visitor/Pest/Greenhouse timing must flow into their respective strategy model rather than being converted to generic Farming Fortune.
