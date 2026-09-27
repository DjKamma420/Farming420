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
- Magic 8 Ball: +25 Farming Fortune on the Farming Fortune roll; current Garden Chips documentation explicitly includes this roll in Hypercharge.
- Celestial Mason Jar: +15 Farming Fortune for the God Potion/direct-Mixin duration; Hypercharge-eligible.
- Slug Pet — Repugnant Aroma: Legendary Slug grants +1 Farming Fortune per pet level, up to +100 at level 100, while farming in a Sprayonator-affected plot; Hypercharge-eligible.
- Harvest Harbinger V: +50 Farming Fortune for 25 minutes; explicitly excluded from Hypercharge.
- Melon Juice Mixin: +15 Farming Fortune for the God Potion/direct-Mixin duration; explicitly excluded from Hypercharge.
- Refined Dark Cacao Truffle: the temporary bonus is +30 Cocoa Beans Fortune, not global Farming Fortune; it is explicitly excluded from Hypercharge.

### Hypercharge verification — 2026-09-27

Hypercharge scales eligible temporary Farming Fortune by +3%/+4%/+5% per chip level at Rare/Epic/Legendary rarity, for maxima of +30%/+60%/+100%.

Explicit allowlist: Atmospheric Filter (Spring), Celestial Mason Jar, Chocolate Century Cake, Crop Fever, Magic 8 Ball (Farming Fortune roll), Pesthunter Phillip's pest turn-in buff, and Slug Pet's Repugnant Aroma.

Explicit denylist: Anita's Talisman/Ring/Artifact, Refined Dark Cacao Truffle, Harvest Harbinger Potion, Melon Juice Mixin, and Overdrive Chip. Runtime code uses the allowlist instead of treating every temporary Farming Fortune source as eligible.

Redeemed Hypercharge rarity/level is not auto-detected. No verified current Garden API mapping is present in the profile adapter, and physical chip ownership is not treated as evidence of redemption. Missing state remains unknown/manual.

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
- https://hypixelskyblock.minecraft.wiki/w/Garden_Chips
- https://hypixelskyblock.minecraft.wiki/w/Celestial_Mason_Jar
- https://hypixelskyblock.minecraft.wiki/w/Slug_Pet
- https://hypixelskyblock.minecraft.wiki/w/Harvest_Harbinger_Potion
- https://hypixelskyblock.minecraft.wiki/w/Melon_Juice_Mixin
- https://hypixelskyblock.minecraft.wiki/w/Refined_Dark_Cacao_Truffle
- https://hypixel.net/threads/random-farming-nerfs-not-mentioned-in-patch-notes.6128320/
- https://hypixel.net/threads/outdated-more-farming-nerfs-on-alpha-including-math.6132043/

## Calculator contract

- Never use pre-0.27 Cropshot +100 as a current value.
- If a chip rarity rate is unresolved, return unknown rather than zero or an inferred value.
- Temporary Farming Fortune, Crop Fortune, Pest-only Fortune and Overbloom are distinct axes.
- Shard effects that alter Visitor/Pest/Greenhouse timing must flow into their respective strategy model rather than being converted to generic Farming Fortune.
