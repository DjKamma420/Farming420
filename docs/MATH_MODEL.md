# Farming420 Math Model

This document defines how Farming420 calculations must be structured. It intentionally avoids inserting unsourced constants.

## Implementation status — 2026-09-17

The generic calculation architecture is now implemented in `src/profit-engine.js` and `src/strategy-model.js`.

Implemented:

- explicit breaks/second and farming uptime;
- normal crop streams with explicit Fortune-axis selection;
- Rare/RNG expected-value streams with explicit Overbloom-axis selection;
- Pest loot streams with chance scaling separated from quantity scaling;
- Pest handling time fed back into available farming time;
- recurring costs;
- full before/after profit transitions, resale recovery and payback;
- context/crop-aware strategy evaluation;
- incomplete-data propagation instead of silently treating unknown values as zero.

Not yet complete automatically:

- exact live per-crop drop models for all 13 Garden crops;
- complete Rare Crop/Seasoning tables;
- exact Pest spawn and all Pest loot tables;
- Chip/Shard/buff state mapping and all temporary-effect rules;
- contest score/reward projection;
- Greenhouse mutation production after the August 20, 2026 rebalance;
- complete live market routing and prices.

Those are data/mechanics gaps, not reasons to bypass the implemented calculation structure with guessed constants.

See `research/knowledge-base/40-calculator-model-strategy-gap-audit.md` for the current gap audit and source boundaries.

## General rule

Every displayed number must be reproducible from:

- profile/setup state;
- sourced game constants;
- sourced/current market data;
- explicit user assumptions;
- pure calculation functions.

If any required term is unknown, the result must be marked incomplete rather than silently approximated.

`unknown != 0` applies to stats as well as formulas. If a stream requires Farming Fortune, Crop Fortune, Pest Fortune, Overbloom, or Pest Overbloom and that input is not known, the stream is incomplete. The caller must pass an explicit `0` when zero is actually known.

## Units

Use explicit units internally.

Recommended conventions:

- time: seconds;
- rates: per second unless named otherwise;
- market values: coins per item;
- throughput: blocks/crops broken per second;
- expected value: coins per event or coins per hour;
- probabilities: decimal in `[0, 1]`;
- percentages: convert only for UI display.

## Core profit identity

For a selected crop/activity/setup:

```text
net_profit_per_hour = gross_expected_revenue_per_hour
                      - recurring_costs_per_hour
                      - consumable_costs_per_hour
                      - amortized_nonrecoverable_costs_per_hour (optional view)
```

Do not subtract the purchase price of durable gear every hour. Durable upgrades belong in acquisition/payback calculations.

## Gross expected revenue

```text
gross_expected_revenue_per_hour =
    crop_revenue_per_hour
  + rare_drop_ev_per_hour
  + pest_drop_ev_per_hour
  + attributable_event_reward_ev_per_hour
  + other_verified_revenue_per_hour
```

Each component should be separately visible in advanced details.

## Throughput

The engine needs two throughput values:

1. **mechanical cap/target** — e.g. a clean 20 blocks per second assumption where relevant;
2. **real sustained throughput** — accounts for turning, reconnects, misses, movement pattern, Pest handling and other downtime.

Never hard-code a universal `19.5 blocks/s` assumption without a documented basis.

Preferred baseline model:

```text
baseline_farming_seconds_per_hour
= 3600 * base_farming_uptime_ratio

valid_breaks_per_hour
= breaks_per_second * effective_farming_seconds_per_hour
```

Activity-specific downtime should be modeled separately instead of hiding everything inside one ratio whenever its cause is known.

## Farming Fortune / crop output

Do not assume a single universal formula for all crop mechanics without verification.

The calculation layer should expose a crop-specific function/data model equivalent to:

```js
expectedCropDropsPerBreak(crop, setup, profile, context)
```

The function may use:

- Farming Fortune;
- crop-specific Fortune;
- base crop drops;
- crop/tool-specific multipliers;
- farming-tool mechanics;
- pet effects;
- armor/equipment effects;
- temporary/conditional effects.

Every input must have a source.

For a stream whose verified mechanic is ordinary average Fortune scaling, the generic engine can represent:

```text
expected_units_per_hour
= valid_breaks_per_hour
* base_units_per_break
* (1 + applicable_fortune / 100)
```

`applicable_fortune` may be Farming Fortune, matching Crop Fortune, their verified combination, or another explicit Fortune axis. The engine never chooses the axis implicitly.

## Expected value for RNG drops

For each independent drop:

```text
EV per eligible event = probability * quantity_expectation * sale_value
EV per hour = EV per event * eligible_events_per_hour
```

For a quantity range `a..b` with uniform distribution:

```text
quantity_expectation = (a + b) / 2
```

Only use that if the game distribution is actually uniform.

For multiple outcomes in one table:

```text
EV = sum(probability_i * value_i)
```

If outcomes are mutually exclusive, verify probabilities sum appropriately. If they are independent rolls, calculate them independently.

For an Overbloom-scaled probability stream:

```text
scaled_probability
= base_probability * (1 + applicable_overbloom / 100)
```

Do not assume probability overflow/cap behavior. If the calculated value can exceed 1.0, the exact verified cap/overflow rule is required before the stream is complete.

## Pest expected value

Pests must be modeled as a time-consuming side process, not free extra loot.

Current live rule boundary: since the May 14, 2026 Harvest Feast changes, non-guaranteed Pest drop **chance** is scaled by Overbloom rather than Farming Fortune. This does not mean all Pest output uses Overbloom. Guaranteed/base crop-drop **quantity** and other Pest mechanics must use their own verified Fortune rule.

Represent Pest streams with separate chance and quantity multipliers:

```text
expected_units_per_pest
= rolls_per_pest
* effective_probability
* expected_quantity_per_successful_roll
```

Examples of structural intent:

```text
non-guaranteed Pest RNG:
  effective_probability <- base_probability * Overbloom multiplier
  expected_quantity <- base quantity

verified Fortune-scaled base/guaranteed drop:
  effective_probability <- base/guaranteed probability
  expected_quantity <- base quantity * applicable Fortune multiplier
```

Never use a generic Fortune multiplier on Pest RNG probability unless a current source explicitly says that exact drop chance is Fortune-scaled.

### Pest spawn and handling feedback

When the exact per-break spawn model is known:

```text
pests_per_break
= spawn_probability
* spawn_opportunities_per_break
* pests_per_spawn_expectation
```

If each handled Pest consumes average `handling_seconds_per_pest`, spawning depends on farming, while handling removes farming time. Solve the loop directly:

```text
effective_farming_seconds_per_hour
= baseline_farming_seconds_per_hour
/ (1 + breaks_per_second * pests_per_break * handling_seconds_per_pest)

valid_breaks_per_hour
= breaks_per_second * effective_farming_seconds_per_hour

pests_per_hour
= valid_breaks_per_hour * pests_per_break
```

This captures the opportunity cost without double-counting Pest time.

When the exact spawn pipeline is not available, a measured/verified `fixed_pests_per_hour` may be used as an explicit assumption. It must be labeled as such.

Separate strategy models may be required for:

- passive Pest spawning during normal farming;
- deliberate Pest spawning setup;
- vacuum/drop-focused setup;
- Harvest Feast Pest hunting;
- trap/passive Pest interactions.

## Temporary buffs

A temporary buff needs:

- activation requirement;
- duration;
- refresh/reacquisition cost;
- stat effect;
- whether it is eligible for Hypercharge or other amplification;
- whether it requires Booster Cookie/God Potion or another state.

For a recurring consumable:

```text
cost_per_hour = consumable_cost / duration_hours
```

If the buff is free but takes time to refresh, model the time cost.

## Hypercharge / multiplicative effects

Never add Hypercharge as ordinary Farming Fortune if the game applies it to a subset of temporary base stats.

Model explicitly:

```text
hypercharged_bonus = eligible_temporary_base * hypercharge_multiplier_delta
```

The eligible source set must be source-controlled data.

## Mutually exclusive setups

The following pattern is mandatory:

```text
current setup = exactly one active option from each exclusive group
```

Examples:

- active pet;
- pet item;
- tool reforge;
- armor preset;
- equipment preset;
- contest swap.

The calculation engine must never sum all owned alternatives.

## Strategy contexts and objectives

A Farming strategy is not one global score. Evaluate the complete active setup in an explicit context.

Current strategy contexts supported structurally by `src/strategy-model.js`:

```text
normal-crop
harvest-feast
pest-spawn
pest-loot
jacob-contest
greenhouse
tool-leveling
visitor-progression
ironman
```

A candidate can be restricted to crops and/or contexts. A Feast-only or crop-only mechanic must not be ranked in an unrelated state.

Default objectives:

- normal crop / Harvest Feast / Pest economic contexts: net Coins/hour;
- Jacob's Contest: explicit contest score;
- tool leveling: explicit Tool XP/hour;
- Greenhouse / Visitors / Ironman: explicit progression/hour.

Do not convert contest score, XP, or progression into Coins/Fortune unless a separate, sourced economic conversion exists.

## Recommendation marginal value

For an action `A`:

```text
profit_delta_per_hour(A) = profit_after(A) - profit_before
```

This is the central number for profit upgrades.

For durable purchases:

```text
cash_required
= purchase_cost + application_cost + nonrecoverable_cost

net_acquisition_cost
= cash_required - expected_resale_value_recovered

payback_hours
= net_acquisition_cost / profit_delta_per_hour
```

Only compute payback when `profit_delta_per_hour > 0`.

Display raw cash required separately, because recoverable value does not remove the liquidity requirement.

## Progression/unlock actions

Some actions have little or no immediate profit delta but unlock later actions.

Represent this as a prerequisite graph, not by inventing a fake direct profit number.

Example:

```text
Action A -> unlocks Action B -> unlocks Setup C -> +X coins/hour
```

The planner can show:

- nearest blocker;
- total path cost;
- total active time;
- total passive time;
- end-state profit delta.

## Time valuation

Do not force all time into coins automatically.

Store both:

- active play time;
- passive/calendar wait time.

Optional advanced ranking may use a user-configurable value of active player time, but the default planner should show time explicitly rather than hiding it in a coin score.

## Jacob's Contest model

Once contest mechanics and score conversion are fully sourced:

```text
projected_collection = expected_crop_output_per_second * active_contest_seconds
```

Then map collection to projected contest reward thresholds using current verified rules.

Include:

- contest-only setup;
- setup switching time if material;
- medal/ticket/reward expected value;
- progression value/unlocks.

Do not infer real bracket placement from historical thresholds without labeling the estimate and data window. The strategy engine therefore requires an explicit contest metric instead of fabricating it from profit or Fortune.

## Greenhouse

The Greenhouse must use the live production rule set, not Alpha values or announced follow-ups.

As of 2026-09-17:

- the August 20, 2026 patch changed multipliers for most crops/mutations;
- base crops have a 72-hour decay timer;
- 0.27.1 announced follow-up plans where watering/decay would freeze instead of kill plants, plus a guaranteed mutation-spread minimum and a future Attribute Shard for the Unique Crop Bonus;
- those 0.27.1 follow-ups were explicitly presented as planned and had no concrete release date, so they do not affect live calculations yet.

Greenhouse production needs explicit growth, mutation, decay, maintenance, slot and value inputs. Do not treat passive/calendar time as active player time.

## Market pricing

### Bazaar sale routes

Maintain separate values:

```text
instant_sell_value
sell_order_expected_value
npc_value
```

The calculator should allow pricing policy:

- instant liquidation;
- sell-order optimized;
- NPC where higher/required.

### Auction valuation

Auction items require a comparable-item model.

Do not use only:

```text
cheapest current listing
```

Prefer a robust estimator based on comparable attributes and recent sale evidence. Store a confidence score and sample timestamp.

## Setup value

Two separate concepts:

```text
liquidation_value = expected coins recovered by selling tradeable farming assets
replacement_value = expected coins required to rebuild equivalent farming assets
```

Untradeable/account-bound progress has no fabricated liquidation value.

## Validation requirements

Every calculation module should have tests for:

- zero Fortune/base state;
- unknown Fortune/stat state;
- max/large Fortune state;
- missing price data;
- missing API visibility;
- mutually exclusive alternatives;
- conditional buffs on/off;
- crop/tool sharing cases such as Eclipse Sickle;
- temporary buff expiry;
- probability boundary/cap cases;
- Pest chance-vs-quantity scaling;
- Pest handling feedback;
- market route changes;
- migration from older saved schemas.

## Remaining data backlog for complete automatic profit estimates

The architecture exists. These current game-data/mechanics inputs still require verified datasets before the app can claim automatic end-to-end profit accuracy:

- exact live crop drop formulas for every current Garden crop;
- current farming-tool level/tier mechanics per tool where not already represented;
- all relevant enchantment effects;
- Rose Dragon farming mechanics;
- Mooshroom Cow current 0.26.1+ conversion/effects;
- Hedgehog current effects and use cases;
- Helianthus normal-farming setup;
- Helianthus Pest setup differences;
- Garden Chips and Hypercharge formulas;
- Pest spawn mechanics and Pest-type distributions;
- every relevant Pest drop table and RNG probability;
- vacuum interactions and affected Fortune sources;
- current Attribute Shard conditions, including Pest Shards added/changed in 0.27;
- God Potion/mixin durations and interactions;
- current Jacob's Contest scoring/reward rules;
- live post-August-20 Greenhouse values;
- all current crop NPC/Bazaar products and transformations;
- realistic sustained throughput assumptions by farm design/crop.

Each completed research item should update the data source with `lastVerified` and source URLs.
