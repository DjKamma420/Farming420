# Greenhouse live model — 2026-09-17

Status: ACTIVE research baseline for Farming420.

## Calculator rule

The Greenhouse is a passive/hybrid production system and must be evaluated over **real elapsed time**, not only active play time. The app must not guess growth durations, water uptime, mutation spread probability, minigame success, or base harvest quantities when those values are not source-verified.

Runtime implementation: `src/greenhouse-model.js`.

## Verified live boundaries

### Release baseline — 2025-12-15

Official 0.24 release notes:
- Greenhouse unlocks at Garden Level 7.
- The Greenhouse plot is 10x10.
- Crops grow over real-life hours/days, including while offline.
- Crops require water to keep growing.
- Crop Effects can modify nearby crops; official examples include Wheat `Harvest Boost` (+20% yield) and Nether Wart `Improved Harvest Boost` (+30% yield) together with `XP Loss` (-20% Farming XP).
- Mutations use specific arrangements and can spread during Greenhouse growth cycles.
- Different mutations have different growth mechanics, water requirements, spread requirements and minigames.

Source: https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/

### Current live balance — 2026-08-20

The August 20 patch changed the loot multiplier for the majority of base crops and mutations and added **72 hour decay to base crops**. Farming420 stores the complete 53-entry current multiplier table in `GREENHOUSE_LIVE_LOOT_MULTIPLIERS`.

Important examples:
- Wheat: 0.18
- Carrot: 0.125
- Nether Wart: 0.09
- Mushroom: 0.08
- Sunflower: 0.29
- Ashwreath: 0.15
- Snoozling: 21
- PlantBoy Advance: 23
- Stoplight Petal: 25
- Timestalk: 9

A lower multiplier means less loot from that plant. These multipliers are **not** enough by themselves to derive coins/day: base output, completed harvest count, water coverage, mutation mechanics and value/price remain separate inputs.

Source: https://hypixel.net/threads/august-20-skyblock-patch-notes.6141710/

## Planned, not live

The 0.27.1 development update announced follow-up Greenhouse changes but explicitly gave no concrete release date. As of 2026-09-17 Farming420 keeps them `PLANNED` and excludes them from live scoring:

1. Watering/decay should eventually freeze plants rather than kill them.
2. A mutation-spread minimum should guarantee some spreads before crops decay; exact values were not announced.
3. A new Attribute Shard should cover the Unique Crop Bonus; the bonus is planned to move from 12 to 10 with adjusted values.

Source: https://hypixel.net/threads/hypixel-skyblock-0-27-1-chocolate-factory-improvements-qol-changes-and-more.6147732/

## Runtime input contract

`evaluateGreenhouseWindow()` requires the caller to provide, per plant:
- plant id/name that resolves to the current live multiplier table;
- planted count;
- `harvestsPerPlantInWindow` — already accounting for the caller's verified/measured growth timing, water coverage, collection schedule and mutation/minigame outcome;
- pre-multiplier expected base units per completed harvest;
- explicit Crop Effect yield multiplier;
- explicit unit value in coins.

The schedule also requires positive wall-clock hours. Recurring costs are optional only when there truly are no recurring costs.

The model returns:
- gross expected value;
- net expected value;
- net coins per **real elapsed hour**;
- expected units;
- missing inputs;
- warnings;
- an explicit guarantee that planned 0.27.1 follow-ups were not applied.

## Unknown != zero rules

- Missing growth/harvest timing does not become zero harvests.
- Missing Crop Effect multiplier does not become 1.0.
- Unknown plants do not inherit a generic multiplier.
- Exact 72h decay boundary is returned as unresolved instead of guessing server tick ordering.
- Mutation spread chance is not inferred from rarity, surrounding crops or historical/community layouts.
- Market/NPC value is not embedded in the Greenhouse mechanic table; price freshness belongs to the pricing layer (Step 8).

## Strategy implications

The Greenhouse should be compared on at least two separate axes:
- passive economic output per real hour/day;
- progression output (crop milestone/analyzer/mutation-tree goals).

Do not rank a mutation as universally best from its loot multiplier alone. A high multiplier can be offset by growth duration, layout requirements, spread chance, water/minigame maintenance, opportunity cost, base loot table, decay risk and the user's actual objective.

## Remaining VERIFY work after this step

This step deliberately does not fabricate the following:
- exact growth duration/stage count for every base crop/mutation;
- complete Crop Effect table and all stacking/interactions;
- exact water duration/consumption for every plant and watering-can setup;
- exact spread probabilities and mutation-layout success rates;
- every mutation minigame's expected-value impact;
- live prices for outputs.

Those inputs can be added independently without changing the core live-state boundary or passive economics contract.
