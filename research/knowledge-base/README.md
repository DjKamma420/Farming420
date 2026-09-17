# Farming420 Offline Knowledge Base

Status: ACTIVE research corpus
As of: 2026-09-17
Primary reader: AI agents with no Internet access and no prior Hypixel SkyBlock knowledge

This directory is the long-form companion to `research/hypixel_farming_master_ai_2026-09-16.json`. Read this file first, then the chapters below, then the machine-oriented JSON. The goal is not brevity. The goal is to preserve enough definitions, rules, context, caveats, and source provenance that an offline AI can reason about current Farming without silently filling gaps from memory.

## Non-negotiable modeling rules

1. A physical item is the atomic object. Base stats, rarity, recombobulation, reforge, gemstones, enchantments, attributes, counters, UUID, and item-specific progress belong to that item.
2. Armor is not automatically a set. One helmet is one helmet. Two pieces are two independent items. Combine pieces only for an explicitly documented set, tiered, or piece-count bonus.
3. Equipment follows the same rule. Necklace, cloak, belt, and bracelet/gloves are four independent items. A reforge or enchant on one does not imply the other three have it.
4. A physical item has at most one active reforge. Never add Blessed and Bountiful to the same tool, or Rooted and Thorny to the same equipment piece.
5. Enchantments are item-local unless their text explicitly refers to global/player state. Sum actual levels from actual equipped pieces when the mechanic is additive per piece.
6. Only ACTIVE, verified live mechanics may influence a live recommendation. VERIFY facts can be displayed as unresolved research but must score as zero until confirmed. LEGACY and COMING_SOON/ALPHA never score in live calculations.
7. Crop Fortune is crop-specific. Do not globalize it. +1 matching Crop Fortune behaves like +1 Farming Fortune only for the matching crop and only for mechanics that consume those stats equivalently.
8. Farming Fortune, Crop Fortune, Overbloom, Pest Overbloom, Bonus Pest Chance, Farming Wisdom, Speed, Tool XP, visitor cooldown, Greenhouse yield, and rare-drop mechanics are separate dimensions. Do not collapse them into a single synthetic stat without an explicit context-dependent economic conversion.
9. Prices are time-sensitive. Static research may describe acquisition routes and cost categories, but live coins/hour ranking must use fresh market/NPC values or explicitly user-supplied prices.
10. Never invent a value, drop chance, formula, API field, hidden cap, or interaction. Unknown means unknown.

## Source hierarchy

Use this order when facts disagree:

1. Current live in-game behavior reproduced on the live network.
2. Current Hypixel patch notes / staff forum posts describing the live change.
3. Maintained community wiki at `https://hypixelskyblock.minecraft.wiki`.
4. High-quality specialist sources such as Elite Farmers / Elite SkyBlock for testing, strategy, and measured behavior.
5. Community forum/Reddit reports only as leads or corroboration unless the behavior can be independently verified.

The closed former official wiki must not be used as a current mechanics source. The Fandom mirror is stale and should not be trusted for current values without re-verification.

## Corpus map

- `00-ontology-and-model-rules.md`: vocabulary, stat separation, physical-item model, state/context model, uncertainty rules.
- `10-core-farming-and-garden.md`: Farming, Fortune, Crop Fortune, Garden, plots, milestones, visitors, contests, and basic progression.
- `20-items-armor-equipment-tools.md`: item-local mechanics, Helianthus, Blossom, reforges, gemstones, tool progression, enchant rules.
- `30-strategy-and-economics.md`: progression logic, marginal upgrade ranking, coins/hour, time costs, contest/pest preparation, common traps.
- `40-calculator-model-strategy-gap-audit.md`: implementation-vs-research audit, generic profit/Pest EV model, strategy contexts, item-model coverage, and the exact remaining calculator inputs.
- `41-active-farming-drop-models.md`: current crop-output boundaries, Harvest Feast RARE CROP formulas, Pest spawn/drop semantics, and Vacuum tiers.
- `42-chips-temporary-buffs-shards-2026-09-17.md`: current Chips, temporary Farming buffs, Crop Fever, and shard boundaries.
- `43-profile-farming-autodetection-2026-09-17.md`: API/profile auto-detection rules, source provenance, active-vs-owned separation, and hidden-state handling.
- `44-jacob-contest-model-2026-09-17.md`: Jacob Contest scoring model, percentile/medal boundaries, Personal Best Crop Fortune, and no-fake-threshold rules.
- `45-greenhouse-live-model-2026-09-17.md`: current Greenhouse passive-economics boundary, complete Aug-20 multiplier table, 72h base-crop decay, and planned-vs-live separation.
- `SOURCES.md`: source index and verification notes.

Existing specialized research files remain authoritative for their narrow verified slices when newer than a chapter here, including `core-fortune.js`, `gear-fortune.js`, `equipment-fortune.js`, `pet-switching.js`, and the runtime verification tests.

## Fact schema used in prose

Important statements should be mentally parsed as if they were records with:

```text
id: stable mechanic identifier
status: ACTIVE | VERIFY | LEGACY | COMING_SOON
scope: account | crop | tool | armor-item | equipment-item | pet | garden | contest | pest | market
value/formula: exact when verified, otherwise null
source: URL
lastVerified: YYYY-MM-DD
notes: edge cases, exclusions, conflicts, or source warnings
```

## Current source warning

The maintained community-wiki `Farming Fortune` page was edited on 2026-09-14 but explicitly warns that much of the page is outdated since the Greenhouse update. Therefore this corpus uses that page as an index, not as blanket proof. Values that materially affect the optimizer should be confirmed against their dedicated item/system pages or current patch/forum evidence before being promoted to ACTIVE.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16

The implementation audit in `40-calculator-model-strategy-gap-audit.md` was refreshed on 2026-09-17 against the Greenhouse, Harvest Feast, May 5, and May 14 Hypixel staff posts. It is the first place to check whether a researched mechanic is actually represented in the calculator runtime.

`41-active-farming-drop-models.md` is the runtime-facing source for normal crop, Harvest Feast, Pest, and Vacuum drop semantics. It deliberately preserves unresolved base quantities and new-Pest divisors as `VERIFY` rather than importing assumptions.

## Definition of completeness

"Complete" does not mean pretending uncertain mechanics are known. A complete offline answer must be able to say which layer a mechanic belongs to, what is verified, what is unknown, how to test it, and whether the uncertainty can change a recommendation. Research gaps are first-class data.
