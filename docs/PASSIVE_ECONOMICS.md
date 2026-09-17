# Farming420 Passive Economics

Status: normative calculator policy addendum
Last verified: 2026-09-17

This document extends `docs/UPGRADE_SCORING_MODEL.md` with a second independent classification axis for how economic value is produced.

## 1. Acquisition mode and output mode are different axes

The planner keeps exactly two acquisition formulas:

```text
acquisition_mode = BUYABLE | EARNED
```

Separately, every modeled effect can have an output mode:

```text
output_mode = ACTIVE | PASSIVE | HYBRID | PASSIVE_UTILITY
```

Examples:

- a bought Mouse Trap is `BUYABLE + PASSIVE`;
- an earned account upgrade that improves Greenhouse yield can be `EARNED + PASSIVE`;
- a tool upgrade used only while farming is normally `BUYABLE/EARNED + ACTIVE`;
- Buzzybee's Fantabulous Disco Destination is currently `BUYABLE + PASSIVE_UTILITY`, because its verified live effect corrals offline Pests rather than directly increasing the number or loot value of Pests.

Do not create a third acquisition-cost formula for passive systems.

## 2. Passive value must use wall-clock time

Passive systems produce or preserve value while the player is not actively performing the corresponding action. Their rate denominator is real elapsed time, not active farming time.

For any bounded observation/collection window:

```text
passive_net_coins_per_real_hour =
  (
      expected_stored_output_value
    - recurring_input_cost
    - collection_and_maintenance_active_hours * player_time_value_coins_per_hour
  )
  / wall_clock_hours
```

Always keep the raw components visible. `collection_and_maintenance_active_hours` is an opportunity-cost conversion, not a literal coin payment.

If the system has a storage/capacity limit, compute output over the real collection schedule. Never assume an infinite uninterrupted passive rate after the storage is full.

## 3. Schedule-aware total economics

Passive value can overlap active farming. Do not subtract passive output merely because the player was farming something else at the same time.

For a schedule window:

```text
window_value =
    active_hours * active_net_coins_per_hour
  + wall_clock_hours * always_on_passive_net_coins_per_hour
  + offline_hours * offline_only_passive_net_coins_per_hour
```

Then:

```text
schedule_net_coins_per_real_hour = window_value / wall_clock_hours
```

The calculator must not count an offline-only system during online hours.

## 4. Pest Trap and Mouse Trap classification

Pest Trap / Mouse Trap output is passive background production.

Verified base behavior from the official 0.20.8 notes:

- up to 3 Pest/Mouse Traps can be placed in the Garden;
- traps require bait;
- a non-full, baited trap catches one Pest every 15 minutes;
- Pest Trap capacity is 2;
- Mouse Trap capacity is 3;
- Mouse Trap is 3x as likely to catch a Field Mouse;
- the original listed Field Mouse chances were 2.4% for Pest Trap and 7% for Mouse Trap, with Enderman Slayer 9 able to affect elusive-mob odds.

Source:
https://hypixel.net/threads/hypixel-skyblock-0-20-8-pesthunters-wares-chocolate-factory-additions-and-more.5804948/

These base values are historical source anchors. Any optimizer-changing value must still be checked against newer live behavior before hard-coding if a later Pest patch modified it.

### Trap EV

For one collection window:

```text
expected_caught_pests = trap_capture_model(
  trap_type,
  bait_state,
  starting_fill,
  capacity,
  elapsed_time,
  active_pet_effects,
  other_verified_modifiers
)

trap_output_value =
  SUM(expected_count_of_pest_type_i * net_expected_value_of_pest_type_i)
```

Then subtract:

- bait consumed during the window;
- active time to release/kill/vacuum/collect Pests;
- any other recurring setup cost.

A full trap produces no additional stored Pests until capacity is freed. Therefore collection frequency can materially change realized passive coins/hour.

## 5. Vacuum discs affect passive trap distribution

Official 0.21.1 notes state that the Pest type spawning in a Pest Trap is influenced by the disc currently playing in the player's Vacuum.

Source:
https://hypixel.net/threads/hypixel-skyblock-0-21-1-experimentation-table-rng-meter-abandoned-quarry-and-more.5839374/

Therefore a Vacuum disc is not assigned a generic passive coin value. It changes the probability distribution inside `trap_capture_model`, which changes expected trap loot/progression value.

The same disc can have different value depending on:

- target Pest;
- Pest drop values;
- Bestiary/progression target;
- Field Mouse weighting;
- active pet modifiers;
- whether the user is optimizing coins, collection, contest preparation, or another objective.

## 6. Mosquito Pet trap interaction

Current maintained item data describes Legendary Mosquito's `Bloodsucker's Betrayal` as:

```text
When collected, Pest Traps will catch the next pest up to 20% faster.
```

This is not equivalent to permanently multiplying all trap production by 1.20. Model the accelerated next capture after collection as its own state transition.

Current reference:
https://wiki.hypixel.net/Mosquito_Pet

Because the old official wiki is no longer the canonical project source, this reference is supporting evidence only; newer live behavior or maintained community-wiki evidence overrides it.

## 7. Buzzybee's Fantabulous Disco Destination

The live 0.26.1 patch states:

```text
Buzzybee's Fantabulous Disco Destination
- now only corrals offline Pests
```

Source:
https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/

Classify the current item as:

```text
output_mode = PASSIVE_UTILITY
offline_only = true
```

Do not assume it creates extra Pests, increases Pest loot, or increases offline Pest spawn rate unless a separate verified mechanic proves that.

Its default economic value is time saved when dealing with offline Pests:

```text
disco_value_per_window =
  max(0, cleanup_time_without_disco - cleanup_time_with_disco)
  * player_time_value_coins_per_hour
```

If corralling also changes a verified gameplay outcome beyond cleanup time, model that outcome separately with its own source.

## 8. Greenhouse remains passive/semi-passive production

Greenhouse continues to use the passive production framework from the main scoring model, including:

- real growth-cycle time;
- plot/crop capacity;
- mutation/yield behavior;
- decay/freeze rules;
- recurring inputs;
- active harvest/replant/maintenance time.

Greenhouse and Pest Traps are both passive systems, but they are not combined into one mechanic. They only share the wall-clock economic framework.

## 9. Required passive fields

A passive-capable candidate/context should preserve:

```text
output_mode
wall_clock_hours
offline_hours
online_hours
passive_net_coins_per_real_hour
always_on_passive_net_coins_per_hour
offline_only_passive_net_coins_per_hour
collection_maintenance_active_hours
recurring_passive_input_cost_coins
storage_capacity
starting_storage_fill
ending_storage_fill
capacity_limited
requires_offline
passive_source_ids
passive_last_verified
```

Unknown values stay unknown. Zero is only valid when the value is known to be zero.

## 10. Scoring upgrades to passive systems

The same before/after rule still applies:

```text
G = total_schedule_net_coins_per_real_hour_after
  - total_schedule_net_coins_per_real_hour_before
```

Then use the normal acquisition formula:

```text
BUYABLE: payback = C_buy / G
EARNED:  payback = C_earned / G
```

This makes a Pest Trap upgrade, Disco Destination, Greenhouse upgrade, and normal Farming Fortune purchase comparable economically without pretending their mechanics are the same.
