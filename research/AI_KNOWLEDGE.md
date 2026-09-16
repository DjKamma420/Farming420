# AI Farming Knowledge Entry Point

This repository contains a machine-oriented Farming research knowledge base intended for ChatGPT, Codex and other AI agents working on Farming420.

## Canonical knowledge file

Read `research/hypixel_farming_master_ai_2026-09-16.json` before changing Farming mechanics, progression, upgrade ranking, profit calculations, Pest/Overbloom logic, Greenhouse logic, Contest logic, or recommendation logic.

The JSON is designed for machine consumption. It defines:

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

## Agent rule

Treat the JSON as research input, not infallible game truth. Follow `AGENTS.md`: current live Hypixel behavior and newer verified sources override stale entries. Never allow Alpha/coming-soon data to affect live recommendations.

If the canonical JSON is missing, incomplete, or older than the latest relevant Farming patch, stop relying on it as complete and update/reverify the research layer first.
