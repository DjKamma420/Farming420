# Farming420 Upgrade Scoring Model

Status: normative calculator policy
Last verified: 2026-09-17

This document defines how the planner converts Farming upgrades with different mechanics into a comparable economic rating. It is intentionally based on before/after economic output, not on a fixed points table for Farming Fortune, Overbloom, Bonus Pest Chance, Visitors, Greenhouse stats, or any other stat.

## 1. Core principle

Every legal candidate upgrade is evaluated as a complete state transition:

```text
current legal state S0
-> apply exactly one candidate action or one explicit prerequisite bundle
-> resulting legal state S1
```

Then recompute the full modeled output in the relevant context.

```text
R(S, C) = expected net coin-equivalent output per hour in context C

G = R(S1, C) - R(S0, C)
```

`G` is the universal recurring gain axis, in coins/hour. It may be positive, zero, or negative.

There is no universal fixed conversion such as `1 Overbloom = X Farming Fortune`. The value of a stat is the amount by which it changes the modeled revenue streams in the current state.

## 2. Exactly two acquisition-cost formulas

The calculator must classify every acquisition route as either `BUYABLE` or `EARNED`.

If an upgrade can legally be acquired by both routes, evaluate both routes independently and show both. Do not silently pretend a self-farmed tradeable item was free.

### 2.1 BUYABLE

Use for an upgrade that can be acquired through Bazaar, Auction House, NPC purchase, direct coin purchase, or another market-like route.

```text
C_buy =
    purchase_price
  + application_fees
  + required_consumed_input_market_value
  + unavoidable_switching_cost
  - sale_proceeds_from_replaced_assets
```

Keep these values separately available to the UI:

```text
cash_required
net_cost
recoverable_asset_value
market_price_source
market_price_timestamp
market_confidence
```

The primary ranking cost is `C_buy = net_cost`. `cash_required` remains visible because liquidity requirements still matter even when an old item can be sold.

### 2.2 EARNED

Use for progression or an item/effect that must be earned and cannot simply be bought into the resulting state. Examples include required skill progress, Crop Milestones, Tool XP, account progression, unique/total Visitor thresholds, Sowdust progression, Bestiary progress, and other soulbound/profile-bound requirements.

```text
C_earned =
    direct_coin_cost
  + consumed_tradeable_input_market_value
  + active_grind_hours * max(0, V_time - incidental_grind_profit_per_hour)
```

Where:

```text
V_time = player-specific sustainable farming coins/hour when reliable
         otherwise the dated Internet farming benchmark
```

`incidental_grind_profit_per_hour` means liquid profit earned while doing the required grind, excluding the value of the progression reward itself. This prevents double-counting the same farming time as both a full loss and a profitable activity.

Passive/calendar waiting time is never multiplied by `V_time`. It remains a separate `passive_wait_hours` field. Market/order waiting is also separate.

Every result produced with this formula must be visibly marked:

```text
EARNED — time converted to coins
```

The UI must also show the original grind hours. The coin-equivalent is a ranking device, not a claim that those coins were literally paid.

## 3. Internet time-value fallback

The current fallback is:

```text
V_time_internet = 20,000,000 coins/hour
```

This is not claimed to be a server-wide average. It is a rounded median of eight recent public community observations/expectations sampled from March through July 2026, ranging from early/mid progression normal farming through stronger normal/pest farming. The selected observations are stored in `research/upgrade-economics-benchmark-2026-09-17.json`.

The public sample is deliberately only a fallback because reported Farming rates vary strongly with Farming Fortune, crop-specific Fortune, blocks/second, pest strategy, market prices, setup quality, and active attention. Recent reports span roughly 10.5m to 33m coins/hour in the selected sample.

Priority order:

1. measured sustainable rate for the current player and setup, if the sample is representative;
2. modeled sustainable rate for the current player from verified mechanics and current prices;
3. the dated Internet fallback above.

The Internet benchmark must be re-researched after any Farming-economy patch that materially changes output, and at least every 30 days while it is used by the live planner.

## 4. Primary rating

For a candidate with positive recurring gain:

```text
payback_hours = acquisition_cost / G
```

Use `C_buy` for `BUYABLE` routes and `C_earned` for `EARNED` routes.

Lower payback is better. This is the primary economic rating because it has a real interpretation and requires no arbitrary 0-100 scale.

A secondary efficiency number may be displayed:

```text
gain_per_million = G / (acquisition_cost / 1,000,000)
```

This means additional coins/hour gained per 1m effective acquisition cost.

Tie-breaking order for the same objective/context:

1. lower payback hours;
2. higher `G`;
3. lower cash required;
4. higher evidence/price confidence.

If `G <= 0`, there is no positive direct-profit payback. Do not invent one. If the action is a prerequisite, score the explicit prerequisite bundle described below.

## 5. Universal effect valuation

Every boost must enter one or more modeled revenue/progression streams. The stat name itself is never the score.

### Farming Fortune and matching Crop Fortune

For simple normal crop drops:

```text
expected_units_per_break = base_units * (1 + applicable_fortune / 100)

normal_crop_coins_per_hour =
    valid_breaks_per_hour
  * expected_units_per_break
  * net_unit_value
```

Matching Crop Fortune is included only for its matching crop. Unrelated Crop Fortune is zero in that crop context.

### Overbloom

For each eligible Rare Crop/non-guaranteed roll:

```text
rare_probability = base_probability * (1 + applicable_overbloom / 100)

rare_ev_per_hour =
    eligible_rolls_per_hour
  * rare_probability
  * expected_quantity
  * net_drop_value
```

Official April 21, 2026 Harvest Feast changes define `+1 Overbloom` as `+1%` relative Rare Crop drop rate. Official May 14 changes moved the listed non-guaranteed Pest drop scaling from Farming Fortune to Overbloom. Scope normal Overbloom and Pest-only Overbloom correctly.

### Bonus Pest Chance and other pest-spawn modifiers

Bonus Pest Chance is a spawn-side stat, not free profit and not loot quality.

Use the verified pest spawn function for the current state:

```text
pests_per_hour = pest_spawn_model(current_setup, BPC, cooldowns, sprays, pets, chips, shards, context)

pest_net_ev_per_hour =
    pests_per_hour * net_expected_loot_per_pest
  - lost_crop_profit_from_pest_handling
  - recurring_pest_costs
```

The resulting `G` may be negative. A spawn increase can reduce normal-farming profit if interruption cost exceeds additional pest EV.

### Visitor boosts and Visitor progression

Visitor-related effects must be separated by what they actually change:

```text
visitor_net_ev_per_hour =
    visitors_completed_per_hour
  * (expected_reward_value - expected_offer_cost)
```

Cooldown/speed effects change `visitors_completed_per_hour`. Copper/reward effects change `expected_reward_value`. Offer-cost modifiers change `expected_offer_cost`.

Unique Visitors Served and total Visitors/Offers Served are separate progression axes. When they alter Green Thumb, Florist, pet effects, or another verified mechanic, recompute the complete before/after equipment/pet state. Do not assign a generic coin value to `+1 visitor`.

### Greenhouse

Greenhouse is its own passive/semi-passive production context and must not be converted into Farming Fortune.

```text
greenhouse_net_ev_per_hour =
    expected_sale_or_npc_value_per_growth_cycle / real_cycle_hours
  - recurring_greenhouse_inputs_per_hour
  - maintenance_active_hours_per_real_hour * V_time
```

Yield, mutation multipliers, mutation chance, growth speed, plot capacity, decay/freeze behavior, and Unique Crop effects must change the actual simulated cycle before computing the delta.

The August 20, 2026 official patch changed most crop/mutation multipliers and added 72h base-crop decay. The September 1, 2026 official 0.27.1 notes announced additional Greenhouse follow-up changes, but explicitly described them as planned without a concrete release date. Planned values must remain excluded from live scoring until released and verified.

### Farming Wisdom and XP acceleration

Farming Wisdom is not direct crop profit. Give it value only against a defined progression target:

```text
time_saved_hours = time_to_target_before - time_to_target_after
progression_time_value = time_saved_hours * V_time
```

Use that value to reduce the effective cost of the explicit progression path. Do not fabricate permanent coins/hour if the only effect is reaching a level sooner.

### Speed and throughput

Speed has value only if it changes sustained valid breaks/hour for the real farm geometry and crop.

```text
value(speed_delta) = R(after measured/modeled throughput) - R(before throughput)
```

A Speed increase that does not increase valid breaks/hour has zero crop-output value in that state.

### Sowdust, Tool XP, Crop Analyzer Copper, medals, tickets, and other progression currencies

Do not assign a timeless fixed coin exchange rate unless the game exposes a valid liquid exchange.

Value them through the actual path they accelerate:

```text
remaining_path_cost_before
vs
remaining_path_cost_after
```

If the currency unlocks a profitable state, evaluate the complete path/bundle to that state.

### Temporary buffs, procs, Hypercharge, and conditional effects

Use actual uptime/proc rate:

```text
effective_delta = active_effect_delta * uptime_ratio
```

Subtract refresh/consumable cost and refresh time. Hypercharge must only amplify the verified eligible temporary base effects, never total Farming Fortune.

### Pets, reforges, armor, equipment, tools, chips, and attributes

Always compare complete legal states. Subtract the effect of the current mutually exclusive alternative. One active pet, one pet item, one compatible reforge per item, and the actual item-local enchant/gem/attribute state.

## 6. Prerequisites and zero-immediate-profit actions

A gate with no immediate revenue delta must not receive a fake direct-profit score.

Instead create an explicit bundle from the player's state to the first newly reachable profitable state:

```text
bundle = [required action A, required action B, ..., resulting setup]

C_bundle = sum(route costs without double-counting shared progress)
G_bundle = R(resulting setup) - R(current setup)
payback_bundle = C_bundle / G_bundle
```

Examples include a Farming-level requirement before equipping armor, Visitor thresholds before a Florist/Green Thumb step, medal requirements before a usable Turbo level, or Sowdust/duplicate-chip requirements before a higher chip tier.

Partial progress remains visible as progress and remaining cost. It does not receive fictional linear value when the mechanic is actually thresholded.

## 7. Market price policy

All BUYABLE costs require timestamped pricing.

Bazaar:

- prefer current executable buy/order pricing appropriate to the configured acquisition policy;
- use quantity-aware depth when the required amount is large;
- include taxes/fees where applicable.

Auction House:

- compare genuinely comparable configurations;
- prefer a robust median/trimmed estimator from comparable listings or recent-sale evidence when available;
- never use one cheapest BIN as the universal value of a configured item;
- preserve confidence and sample size.

NPC/direct costs:

- use exact current costs, account requirements, and limits.

## 8. Global versus context-specific ranking

A candidate's gain must be computed in the context where the effect operates. Normal crop farming, pest spawning, pest loot, Visitors, Greenhouse, Jacob contests, Harvest Feast, tool leveling, and Ironman acquisition are different contexts.

For a global recommendation list, do not add incompatible contexts as if they happen simultaneously. Use the player's configured/observed activity exposure to aggregate context values. If exposure is unknown, keep context-specific ratings separate rather than inventing a global blend.

## 9. Required result schema

Every scored candidate should expose at least:

```text
candidate_id
context
acquisition_mode = BUYABLE | EARNED
cost_label
cash_required_coins
net_effective_cost_coins
active_grind_hours
passive_wait_hours
market_wait_hours
time_value_coins_per_hour
time_value_source
before_net_coins_per_hour
after_net_coins_per_hour
delta_net_coins_per_hour
payback_hours
gain_per_million
mechanic_confidence
price_confidence
last_verified
source_ids
caveats
```

For `EARNED`, `cost_label` must explicitly say that active time was converted into coins. For an Internet-derived time value, the UI must display the benchmark date.

## 10. Current source anchors

Mechanics/economy checks used for this policy:

- https://hypixel.net/threads/april-21-fossil-essence-shop-farming-toolkit-harvest-feast-changes.6083245/
- https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/
- https://hypixel.net/threads/august-20-skyblock-patch-notes.6141710/
- https://hypixel.net/threads/hypixel-skyblock-0-27-1-chocolate-factory-improvements-qol-changes-and-more.6147732/
- repository research in `research/AI_KNOWLEDGE.md`, `research/hypixel_farming_master_ai_2026-09-16.json`, and `research/knowledge-base/30-strategy-and-economics.md`

The Internet time-value sample and its exact source observations live in `research/upgrade-economics-benchmark-2026-09-17.json`.
