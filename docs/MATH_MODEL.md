# Farming420 Math Model

This document defines how Farming420 calculations must be structured. It intentionally avoids inserting unsourced constants.

## General rule

Every displayed number must be reproducible from:

- profile/setup state
- sourced game constants
- sourced/current market data
- explicit user assumptions
- pure calculation functions

If any required term is unknown, the result must be marked incomplete rather than silently approximated.

## Units

Use explicit units internally.

Recommended conventions:

- time: seconds
- rates: per second unless named otherwise
- market values: coins per item
- throughput: blocks/crops broken per second
- expected value: coins per event or coins per hour
- probabilities: decimal in `[0, 1]`
- percentages: convert only for UI display

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

1. **mechanical cap/target** — e.g. a clean 20 blocks per second assumption where relevant.
2. **real sustained throughput** — accounts for turning, reconnects, misses, movement pattern, pest handling and other downtime.

Never hard-code a universal `19.5 blocks/s` assumption without a documented basis.

Preferred model:

```text
sustained_blocks_per_second = nominal_blocks_per_second * farming_uptime_ratio
```

Where `farming_uptime_ratio` is either measured/profiled or an explicit assumption.

Later, activity-specific downtime should be modeled separately instead of hiding everything inside one ratio.

## Farming Fortune / crop output

Do not assume a single universal formula for all crop mechanics without verification.

The calculation layer should expose a crop-specific function:

```js
expectedCropDropsPerBreak(crop, setup, profile, context)
```

The function may use:

- Farming Fortune
- crop-specific Fortune
- base crop drops
- crop/tool-specific multipliers
- farming-tool mechanics
- pet effects
- armor/equipment effects
- temporary/conditional effects

Every input must have a source.

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

## Pest expected value

Pests must be modeled as a time-consuming side process, not free extra loot.

Suggested structure:

```text
pests_spawned_per_hour = spawn_opportunities_per_hour * spawn_probability * pests_per_spawn_expectation

pest_loot_ev_per_hour = pests_spawned_per_hour * expected_loot_value_per_pest

pest_handling_time_per_hour = pests_spawned_per_hour * average_seconds_per_pest_handled

crop_uptime_after_pests = max(0, 3600 - pest_handling_time_per_hour) / 3600
```

Then crop revenue must use the reduced crop uptime.

This naturally captures the opportunity cost of pest handling.

Separate models may be required for:

- passive pest spawning during normal farming
- deliberate pest farming/spawning setup
- vacuum/drop-focused setup

## Temporary buffs

A temporary buff needs:

- activation requirement
- duration
- refresh/reacquisition cost
- stat effect
- whether it is eligible for Hypercharge or other amplification
- whether it requires Booster Cookie/God Potion or another state

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

- active pet
- pet item
- tool reforge
- armor preset
- equipment preset
- contest swap

The calculation engine must never sum all owned alternatives.

## Recommendation marginal value

For an action `A`:

```text
profit_delta_per_hour(A) = profit_after(A) - profit_before
```

This is the central number for profit upgrades.

For durable purchases:

```text
net_acquisition_cost = purchase_cost - expected_resale_value_delta
payback_hours = net_acquisition_cost / profit_delta_per_hour
```

Only compute payback when `profit_delta_per_hour > 0`.

Also display raw cash required, because recoverable value does not remove the liquidity requirement.

## Progression/unlock actions

Some actions have little or no immediate profit delta but unlock later actions.

Represent this as a prerequisite graph, not by inventing a fake direct profit number.

Example:

```text
Action A -> unlocks Action B -> unlocks Setup C -> +X coins/hour
```

The planner can show:

- nearest blocker
- total path cost
- total active time
- total passive time
- end-state profit delta

## Time valuation

Do not force all time into coins automatically.

Store both:

- active play time
- passive/calendar wait time

Optional advanced ranking may use a user-configurable value of active player time, but the default planner should show time explicitly rather than hiding it in a coin score.

## Jacob's Contest model

Once contest mechanics and score conversion are fully sourced:

```text
projected_collection = expected_crop_output_per_second * active_contest_seconds
```

Then map collection to projected contest reward thresholds using current verified rules.

Include:

- contest-only setup
- setup switching time if material
- medal/ticket/reward expected value
- progression value/unlocks

Do not infer real bracket placement from historical thresholds without labeling the estimate and data window.

## Market pricing

### Bazaar sale routes

Maintain separate values:

```text
instant_sell_value
sell_order_expected_value
npc_value
```

The calculator should allow pricing policy:

- instant liquidation
- sell-order optimized
- NPC where higher/required

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

Every calculation module should eventually have tests for:

- zero Fortune/base state
- max/large Fortune state
- missing price data
- missing API visibility
- mutually exclusive alternatives
- conditional buffs on/off
- crop/tool sharing cases such as Eclipse Hoe
- temporary buff expiry
- probability boundary cases
- market route changes
- migration from older saved schemas

## Research backlog before final profit engine

The following must be verified before declaring profit estimates accurate:

- exact live crop drop formulas for every current Garden crop
- current farming-tool level/tier mechanics per tool
- all relevant enchantment effects
- Rose Dragon farming mechanics
- Mooshroom Cow conversion/effects
- Hedgehog effects and use cases
- Helianthus normal-farming setup
- Helianthus pest setup differences
- Garden Chips and Hypercharge formulas
- pest spawn mechanics and pest-type distributions
- every relevant pest drop table and RNG probability
- vacuum interactions and affected Fortune sources
- current Attribute Shard conditions
- God Potion/mixin durations and interactions
- current Jacob's Contest scoring/reward rules
- all current crop NPC/Bazaar products and transformations
- realistic sustained throughput assumptions by farm design/crop

Each completed research item should update the data source with `lastVerified` and source URLs.
