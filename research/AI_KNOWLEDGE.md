# AI Farming Knowledge Entry Point

This repository contains a machine-oriented Farming research knowledge base intended for ChatGPT, Codex and other AI agents working on Farming420.

## Required reading order

Before changing Farming mechanics, progression, upgrade ranking, profit calculations, Pest/Overbloom logic, Greenhouse logic, Contest logic, or recommendation logic, read:

1. `research/knowledge-base/README.md`
2. `research/knowledge-base/00-ontology-and-model-rules.md`
3. the relevant long-form chapter under `research/knowledge-base/`
4. `research/knowledge-base/SOURCES.md`
5. `research/hypixel_farming_master_ai_2026-09-16.json`
6. any newer narrow verified research/runtime module and its tests

The long-form knowledge base exists so an AI with no Internet access and no prior Hypixel SkyBlock knowledge has definitions, modeling rules, context, strategy, edge cases, and provenance instead of only compact numbers.

## Canonical machine-oriented file

`research/hypixel_farming_master_ai_2026-09-16.json` remains the compact machine-oriented fact/optimizer input. It defines, among other things:

- Farming Fortune, Crop Fortune and Overbloom as separate stat systems
- context-dependent FF <-> Overbloom valuation via marginal coins/hour rather than a fixed exchange rate
- coin-cost and time-cost upgrade factors
- crop-specific progression and Crop Fortune isolation
- armor, equipment, tool and pet progression
- mutually exclusive loadouts and reforges
- Chips, Shards, Pests, Feast/Grand Feast, Greenhouse, Visitors, Composter and Jacob's Contests
- temporary buffs such as Cookie/God Potion/Mixins/Century Cake/Mason Jar
- cross-stat dependencies such as Strength -> Mooshroom -> Farming Fortune, Thorns -> Thorny -> Overbloom, and Unique Visitors -> Mosquito -> Sugar Cane Fortune
- explicit research gaps that must be reverified instead of guessed

## Non-negotiable item rule

A physical item is the atomic object. Base stats, rarity, reforge, gemstones, enchantments, attributes, and counters are item-local. Armor/equipment pieces only become a collective set state where an explicitly documented set/tiered/piece-count bonus requires it. Never infer that one piece having Mossy, Pesterminator, Rooted, Green Thumb, Peridot, or another upgrade means the other pieces have it.

## Agent rule

Treat all research as evidence, not infallible game truth. Follow `AGENTS.md`: current live Hypixel behavior and newer verified sources override stale entries. Never allow Alpha/coming-soon data to affect live recommendations.

When a source is known stale or a mechanic changed after its verification date, downgrade the affected fact to VERIFY until the exact current behavior is re-established. Unknown is not zero.

If the knowledge base is missing, incomplete, or older than the latest relevant Farming patch, update/reverify the research layer before changing live optimizer weights.
