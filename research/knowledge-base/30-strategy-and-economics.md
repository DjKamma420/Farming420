# 30 — Strategy, Progression, and Upgrade Economics

As of: 2026-09-16
Status: ACTIVE methodology; individual price-dependent recommendations require live market data

This chapter explains how an offline AI should turn mechanics into decisions. It deliberately avoids claiming one universal "best" build because Farming has multiple objectives, mutually exclusive setups, and volatile prices.

## 1. Define the objective before ranking anything

A player can optimize for different goals:

- coins per hour
- Farming XP per hour
- crop Collection
- Crop Milestones
- Jacob contest score
- pest spawn rate
- pest loot value
- Rare Crop/Overbloom value
- visitor progression
- Sowdust/tool/chip progression
- Greenhouse output
- Ironman acquisition efficiency
- minimum active attention / low-input farming

A recommendation is invalid if it does not name the objective and context.

## 2. Global vs crop-specific planning

Farming420 should support two recommendation scopes:

### Global

Only upgrades that improve the account/setup independent of a specific crop, or that are useful across many crops, should compete here. Examples can include Farming Skill, Garden-wide progression, account Fortune, armor/equipment, general tool-independent permanent stats, and some pets.

### Crop-specific

When a crop is selected, include:

- matching Crop Upgrade
- that crop's physical tool state
- matching Turbo enchant
- Dedication scaling from that crop's milestone
- crop-specific Fortune
- crop-specific pet effects
- throughput/farm geometry for that crop
- the global setup contributions that also apply

Do not let a Wheat-only upgrade win a Melon recommendation.

## 3. Coins/hour model

For normal crop output, use measured or modeled valid breaks per second rather than theoretical movement speed alone.

Conceptual formula:

```text
normal_crop_units_per_hour
= valid_breaks_per_second
* 3600
* expected_units_per_break
```

Then:

```text
normal_crop_profit_per_hour
= units_per_hour * net_unit_value
- recurring_consumable_cost_per_hour
- other recurring operating costs
```

`net_unit_value` depends on sell route, taxes/fees, compacted form, and market liquidity. NPC and Bazaar values are not interchangeable.

Rare/RNG output is additive:

```text
rare_profit_per_hour
= sum(
    eligible_rolls_per_hour
    * base_probability
    * (1 + applicable_overbloom/100)
    * net_drop_value
  )
```

Total farming profit must also include documented bonus drops or item-specific effects where relevant.

## 4. Marginal value of +1 Farming Fortune

For a simple normal-drop stream where +1 FF increases expected base drops linearly:

```text
marginal_units_per_hour_per_1_ff
= valid_breaks_per_second * 3600 * base_units_per_break / 100
```

Then:

```text
marginal_coins_per_hour_per_1_ff
= marginal_units_per_hour_per_1_ff * net_unit_value
```

This is why `coins per Fortune` alone is incomplete: one Fortune is worth more on a faster, more valuable crop stream.

## 5. Marginal value of +1 Crop Fortune

For the matching crop and a loot table where Crop Fortune combines with general Fortune in the same way, +1 matching Crop Fortune has the same local marginal normal-drop effect as +1 FF.

For every other crop its value is zero.

Therefore a crop-specific upgrade can be superior for one crop while being irrelevant globally.

## 6. Marginal value of +1 Overbloom

Overbloom does not have a fixed Fortune exchange rate.

For each eligible Rare Crop drop:

```text
marginal_probability_per_1_overbloom = base_probability / 100
```

Thus:

```text
marginal_coins_per_hour_per_1_overbloom
= sum(eligible_rolls_per_hour * base_probability * net_drop_value / 100)
```

Only after both marginal coin rates are known may the optimizer derive a context-specific FF equivalent:

```text
ff_equivalent_of_1_overbloom
= coins_per_hour_per_1_overbloom
/ coins_per_hour_per_1_ff
```

This value changes by crop, Feast state, pest activity, prices, roll frequency, and loadout.

Source for Overbloom probability formula: https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16

## 7. Upgrade cost model

Keep cost components separate:

```text
acquisition_cost
application_cost
consumable_cost
recurring_cost_per_hour
lost_resale_value
recovered_resale_value
active_grind_time
passive_wait_time
market_wait_time
opportunity_cost
```

Examples:

- Reforge stone price is acquisition; applying it can have an application fee.
- Replacing a valuable existing item/upgrade may recover resale value.
- Cultivating progression costs time rather than only coins.
- Visitor progression consumes crops/items and time.
- A temporary potion has recurring cost and duration.
- Autopet has an acquisition/setup cost but can save manual switching friction.

## 8. ROI and payback

For a coin-cost upgrade:

```text
roi_hours = net_coin_cost / delta_profit_per_hour
```

For a time-gated upgrade:

```text
remaining_hours = remaining_progress / measured_progress_per_hour
```

Do not automatically convert time to coins. If the user gives a personal time value, an optional combined economic cost can be computed:

```text
combined_cost = net_coin_cost + active_grind_hours * user_time_value_coins_per_hour
```

Passive waiting time should still remain separately visible because it blocks calendar progression but not necessarily playtime.

## 9. Replacement opportunity cost

A candidate that occupies a mutually exclusive slot must be evaluated against the current occupant.

Examples:

- Blessed vs Bountiful on one tool.
- Rooted vs Thorny on one equipment piece.
- Mossy vs Mantid on one armor piece.
- Elephant vs Mooshroom Cow as active pet.
- Green Bandana vs another pet item.

Correct delta:

```text
delta = new_complete_state - current_complete_state
```

Incorrect delta:

```text
delta = new_effect_only
```

## 10. Early-game progression logic

The optimizer should prioritize gates and multiplicative access before luxury marginal stats.

Typical reasoning order:

1. Unlock Garden and enough plots to operate.
2. Raise Farming Skill for armor/tool/content requirements.
3. Acquire crop-appropriate basic/specialized tools.
4. Build sustainable farms that reach reliable break rates.
5. Progress crop upgrades, milestones, and tool levels.
6. Move through the armor progression as requirements and costs become sensible.
7. Fill missing high-efficiency enchants/reforges/gems.
8. Develop visitors, contests, pests, pet options, and specialized loadouts.
9. Only after the core setup is strong should ultra-expensive marginal FF/Overbloom upgrades dominate recommendations.

This is a policy framework, not a fixed shopping list. Ironman and market profiles differ drastically.

## 11. Armor progression reasoning

Do not compare armor families only by the headline full-set Fortune total.

For each candidate piece or set transition calculate:

- base stats of actual pieces replaced
- tiered/set bonus at new piece count
- rarity changes
- reforge scaling changes caused by rarity
- gemstone-slot availability and current gems
- enchantments that must be migrated/rebought
- Bonus Pest Chance / Speed / special drops
- sell value of replaced pieces
- Farming-level requirement

A single-piece upgrade can be rational even before completing the full set if its item-local gains outweigh the lost old set/tier state. Conversely, replacing one piece can reduce a collective bonus and be a net loss. Simulate the actual before/after loadouts.

## 12. Helianthus transition example

Helianthus demonstrates why item-local modeling matters.

Base FF by piece:

```text
Helmet 35
Chestplate 40
Leggings 40
Boots 35
```

Separate Feast tier:

```text
1 piece 0
2 pieces 25
3 pieces 50
4 pieces 75
```

When moving from three to four pieces, the fourth item's own base stats and upgrades are not the only gain; the Feast tier moves from +50 to +75, adding another +25 collective delta. When moving from four to three, that +25 is lost. The optimizer must calculate both.

Source: https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor
Last verified: 2026-09-16

## 13. Blossom/Green Thumb progression reasoning

Blossom pieces each have +7 base FF plus an independent Florist bonus based on total visitors served. A new Blossom piece is therefore immediately valuable even if the other three slots use different equipment.

Green Thumb is also per-piece and scales with unique visitors:

```text
piece_green_thumb_ff = 0.05 * level * unique_visitors_served
```

The marginal value of raising one piece from Green Thumb IV to V at `U` unique visitors is:

```text
delta_ff = 0.05 * U
```

This makes Green Thumb's cost-efficiency strongly dependent on visitor progression. A low-visitor profile should not be ranked as if it had endgame visitor count.

## 14. Pet choice

Pet selection is context-specific.

### Elephant

Use when its direct Farming Fortune and current perk set outperform alternatives for the target task. The current Fortune index lists +150 FF for Legendary level 100 and +200 for Mythic.

### Mooshroom Cow

Base level-100 +100 FF plus Strength scaling. The current dedicated page states +0.7 FF per 20 Strength at level 100 for Rare+ tiers. Therefore accessory power, tunings, armor stats, and other Strength sources indirectly change Farming output while this pet is active.

### Specialized pets

Modern Farming includes context pets for pests, flowers, Sugar Cane/visitors, Tool XP/Speed, sprayed plots, and endgame progression. The optimizer should expose them when their trigger is active instead of declaring one universal "best farming pet".

## 15. Pet switching and Autopet

Switching is worthwhile when the benefit during a phase exceeds switching friction and setup cost.

Example phase model:

```text
crop_phase -> profit_pet
pest_spawn_phase -> spawn_pet
pest_kill_phase -> pest_loot_pet
contest_start -> contest_pet
```

Only one is active in a phase.

Autopet payback:

```text
payback_hours = acquisition_cost / marginal_profit_per_hour_from_automation
```

If the relevant trigger cannot be expressed reliably by current Autopet rules, do not pretend the automation is possible. Farming420's existing pet research marks some modern pest-trigger behavior as requiring verification.

## 16. Jacob contest strategy

Contest optimization is score, not normal profit.

Current contest structure: 20 minutes every real-life hour, three selected crops, percentile brackets. Because brackets are population-relative, optimize expected score and consistency rather than claiming a fixed crop threshold guarantees a medal.

High-level current wiki strategy includes:

- prepare up to 20 pests (8 Garden + 12 Vermin Traps according to the current Tips section) for an opening score burst;
- prepare Greenhouse plots with the contest crop;
- use contest-specific equipment/pets/chips only for the contest phase;
- ensure Turbo-Crop medal gates are satisfied for the relevant levels.

Source: https://hypixelskyblock.minecraft.wiki/w/Jacob%27s_Farming_Contest
Last verified: 2026-09-16

## 17. Pest strategy

Pests impose multiple competing effects:

- accumulated pests can hurt normal farming efficiency/fortune;
- stopping to kill/vacuum them costs farming uptime;
- pest loot itself can be valuable;
- Bonus Pest Chance can be desirable when intentionally farming pests and undesirable when optimizing uninterrupted crop farming;
- pest-only Farming Fortune/Overbloom must stay scoped to pest loot;
- some strategies pre-stack pests for contests or events.

Therefore model at least two modes:

```text
normal_crop_mode: minimize interruption while keeping pest penalties controlled
pest_farming_mode: maximize pest spawn * loot value - lost crop uptime
```

Do not treat Bonus Pest Chance as universally positive.

## 18. Rare Crop / Harvest Feast strategy

Overbloom increases Rare Crop probability, not ordinary crop quantity. During Feast-related contexts, rare-drop EV can become large enough to justify a lower-FF, higher-Overbloom setup.

A proper comparison must include:

- eligible rare-drop base probabilities
- crop/season eligibility
- rolls per hour
- tool vs fist/Sun's Grasp throughput difference
- current Overbloom
- temporary Crop Fever uptime
- Feast enchants/reforges/accessories
- market value of Rare Crops/Seasonings

The current Overbloom page itself notes that theoretical Sun's Grasp maxima may be less realistic/optimal because switching away from a farming tool can reduce hourly Rare Crop rates. This is exactly why stats alone are insufficient.

Source: https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16

## 19. Market strategy

For Bazaar items:

- distinguish instant buy/sell from buy/sell orders;
- account for taxes/fees where applicable;
- use executable depth if the requested quantity is large;
- avoid ranking on stale unit price when an upgrade requires many units.

For Auction House items:

- compare the actual desired configuration, not base-item lowest BIN;
- enchants, recomb, rarity, gems, counters, and reforges may materially change value;
- avoid counting sunk upgrades at full acquisition price if they have resale value.

For NPC-sold/purchased materials, enforce daily limits and account-specific unlocks where relevant.

## 20. Ironman strategy

Ironman changes the cost function from market coins to acquisition chains and time gates.

For each upgrade, preserve:

- source NPC/event/drop/craft
- prerequisite collection/skill
- expected or deterministic quantity
- time-limited availability
- required medals/Tickets/Copper/Bits/Sowdust/etc.
- whether materials compete with another progression target

A cheap Bazaar upgrade can be an enormous Ironman grind; a normally expensive NPC progression can be relatively efficient on Ironman. Never reuse normal-profile price ranking unchanged.

## 21. Common optimization mistakes

1. Adding full-set reforge value when only one piece is upgraded.
2. Assuming all armor pieces share the same rarity.
3. Counting crop-specific Fortune globally.
4. Adding Elephant and Mooshroom at the same time.
5. Ranking a reforge without subtracting the old reforge.
6. Treating Overbloom as a fixed multiple of FF.
7. Using a full-set total as base armor stats and then adding the set bonus again.
8. Treating a temporary proc as permanent uptime.
9. Using static item prices for live ROI.
10. Ignoring blocks/second and farm geometry.
11. Assuming more Bonus Pest Chance is always desirable.
12. Assuming a high theoretical stat screenshot is the highest-profit loadout.
13. Using stale pre-Greenhouse or pre-Harvest-Feast formulas without checking update dates.
14. Letting coming-soon/Alpha mechanics affect live recommendations.
15. Converting an unknown value to zero without marking it unknown; zero is a real known value.

## 22. Best-next-upgrade algorithm

For each legal candidate state transition:

1. Build the current complete context state.
2. Apply exactly one candidate transition.
3. Enforce exclusivity/cardinality constraints.
4. Recompute derived stats from actual physical items.
5. Recompute throughput and loot EV for the selected context.
6. Compute delta profit/XP/score according to objective.
7. Compute net coin and time costs.
8. Exclude unresolved mechanics that would require invented values.
9. Present candidates with separate gain, cost, ROI, and caveats.
10. Never hide the reason a candidate ranks well.

For `Global`, exclude crop-only upgrades unless the transition genuinely improves multiple crops or account-wide state. For a named crop, include matching crop-specific candidates.

## 23. What an offline AI should ask when data is missing

Before inventing anything, determine whether the answer depends on:

- selected crop
- current Farming/Garden levels
- actual item rarities
- exact enchants/reforges/gems
- unique visitors and total offers/visitors served
- crop milestones
- current pet and pet item
- Strength/Speed
- contest/Feast/season state
- current market prices
- blocks per second
- Ironman vs normal profile

If a missing input can change the recommendation materially, state the missing input or calculate a range rather than guessing.
