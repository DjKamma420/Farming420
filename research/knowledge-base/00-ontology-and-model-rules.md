# 00 — Ontology and Model Rules

As of: 2026-09-16
Status: ACTIVE

This chapter defines how an offline AI must think about Hypixel SkyBlock Farming before it reasons about upgrades, setups, or profit. It is intentionally stricter than casual player language because many optimization errors come from combining values that cannot coexist.

## 1. Object hierarchy

A SkyBlock profile contains account-wide progression plus many physical objects. The optimizer must not flatten everything into one number.

### Account state

Examples: Farming Skill, Garden level, Anita upgrades, Elizabeth/Garden account upgrades, unlocked plots, crop upgrades, Crop Analyzer milestones, Garden Bestiary, visitor milestones, Jacob medals, accepted visitors, crop milestones, collections, accessory power, SkyBlock level, permanent consumptions.

Account state can modify many items or contexts, but it is not an item. An account-wide value should never be stored as if it were an enchantment on one tool.

### Physical item state

A physical item is identified by its item record and, when available, UUID. Relevant fields include:

- SkyBlock item ID / ExtraAttributes.id
- display name
- item class / allowed slot
- rarity
- recombobulation / rarity upgrades
- reforge / modifier
- enchantment map with exact levels
- gemstone slots and gemstone quality
- attributes / shard-derived data when applicable
- counters such as Cultivating or tool XP
- item tier/model, e.g. Mk. I/II/III Specialized Farming Tool

Every physical item has its own state. Do not infer that all items in an armor/equipment family share the same upgrades.

## 2. Armor and equipment are item-local by default

"Full set" is a description of four simultaneously equipped armor pieces, not an atomic object.

Correct reasoning:

```text
helmet.base_fortune
+ chestplate.base_fortune
+ leggings.base_fortune
+ boots.base_fortune
+ each piece's own reforge
+ each piece's own enchantments
+ each piece's own gemstones
+ explicit set/tiered bonus(piece_count)
```

Incorrect reasoning:

```text
if any Helianthus exists -> add full Helianthus total
if all pieces exist -> assume all are Mossy/Pesterminator/Peridot
```

The same applies to four equipment slots. Blossom Necklace, Blossom Cloak, Blossom Belt, and Blossom Bracelet are four items. Each piece gives its own base stat and Florist piece bonus independently. Green Thumb and Rooted are item-local upgrades.

## 3. Explicit collective bonuses

A collective bonus is allowed only where the mechanic itself references multiple equipped pieces. The bonus must be represented separately from piece stats.

Example: Helianthus armor has independent item stats and a separate Feast tiered piece-count bonus. Therefore `helianthus_base` and `helianthus_feast` are different mechanics and should have different provenance and tests.

## 4. Reforge exclusivity

One physical item has one active compatible reforge.

A farming tool cannot be both Blessed and Bountiful. An equipment piece cannot be both Rooted and Thorny. An armor piece cannot be both Mossy and Mantid.

When comparing reforges, calculate the delta relative to the currently equipped reforge:

```text
marginal_gain(new reforge) = effect(new) - effect(current)
net_cost = acquisition_cost(new) - expected_resale_or_recovered_value(old, if applicable)
```

Never rank a reforge as if the old reforge continues to contribute.

## 5. Rarity scaling

Many reforges and Peridot gemstone values scale with host item rarity. Therefore rarity is required input. Recombobulation can change the relevant rarity and therefore change more than one downstream stat.

If the host rarity is unknown, do not assume Legendary or Mythic. Mark the affected dynamic value unresolved.

Verified examples from the current Farming Fortune page:

- Rooted: Common/Uncommon/Rare/Epic/Legendary/Mythic = +6/+9/+12/+15/+18/+21 Farming Fortune.
- Mossy: +5/+10/+15/+20/+25/+30 Farming Fortune.
- Blessed: +5/+7/+9/+13/+16/+20 Farming Fortune.
- Bountiful: +1/+2/+3/+5/+7/+10 Farming Fortune.
- Perfect Peridot: +3/+4/+5/+6/+8/+10 Farming Fortune depending on host rarity.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Status note: the page warns that parts are outdated after Greenhouse; these specific values should still be cross-checked against dedicated reforge/gem pages before a future mechanics change.
Last verified: 2026-09-16

## 6. Stat separation

### Farming Fortune

General crop/pest drop stat. The maintained wiki currently describes it as increasing crop and pest drops and states it has no effect on the Private Island.

### Crop Fortune

Fortune restricted to a named crop and its respective pest interactions where documented. Treat each crop as its own axis. Do not add Wheat Fortune to Melon Fortune.

### Overbloom

Overbloom increases Rare Crop probability using:

```text
chance = baseChance * (1 + Overbloom / 100)
```

It is uncapped according to the current Overbloom page and has no effect on the Private Island.

Source: https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16

### Pest Overbloom / pest-specific modifiers

A modifier that applies only against pests must remain scoped to pest rolls. Do not apply it to normal crop Rare Crop rolls.

### Bonus Pest Chance

This influences pest-spawn behavior, not normal crop yield. More Bonus Pest Chance is not automatically better: it can increase interruption frequency and may have opportunity-cost interactions with pest strategy.

### Farming Wisdom

Wisdom changes Farming XP gain. It can be economically valuable when Farming level is a gate, but it is not direct crop yield.

### Speed

Speed is operational throughput. It changes blocks broken per second only when farm geometry, server behavior, player movement, and tool mechanics allow it. Do not translate Speed directly into coins/hour without a measured or modeled throughput relationship.

## 7. Expected-value model

For a normal drop whose amount scales linearly with Fortune, the useful conceptual form is:

```text
expected_units_per_valid_break = base_units * (1 + applicable_fortune / 100)
```

`applicable_fortune` may include general Farming Fortune plus the matching Crop Fortune where that loot table uses both.

For Rare Crops using Overbloom:

```text
rare_drop_probability = base_probability * (1 + applicable_overbloom / 100)
expected_rare_value_per_hour = eligible_rolls_per_hour * rare_drop_probability * net_drop_value
```

Never use one global FF↔Overbloom exchange rate. Convert them only through marginal coins/hour in a stated context.

## 8. Marginal-value optimization

The relevant question is not "which item has the most Fortune?" but "from this player's current state, which attainable change produces the largest useful return?"

For upgrade candidate `u`:

```text
delta_profit_per_hour(u) = profit(current + u) - profit(current)
net_coin_cost(u) = acquisition + application + consumables - recoverable_resale
roi_hours(u) = net_coin_cost / delta_profit_per_hour
```

Track separately:

- acquisition cost
- application cost
- recurring/consumable cost
- resale/recovery value
- active grind time
- passive waiting time
- market waiting time
- opportunity cost from replacing another mutually exclusive item/effect

Do not combine time and coins unless the user gives a value for their time.

## 9. Context state

A recommendation must declare context. Important contexts include:

- normal crop farming
- named crop farming
- Farming XP leveling
- crop milestone grinding
- Jacob contest
- pest spawn farming
- pest kill/loot farming
- visitor grinding
- Harvest Feast / Grand Feast
- Greenhouse
- composter/Sowdust progression
- tool leveling
- Ironman acquisition

An item can be strong in one context and weak in another without contradiction.

## 10. Temporary vs permanent effects

Temporary effects must carry duration, activation conditions, and recurring cost. Permanent account upgrades should not be priced as recurring consumables.

Examples of temporary/contextual layers include Crop Fever procs, seasonal effects, Feast windows, contest-only boosts, Pesthunter-style temporary stacks, potions/mixins, Century Cake duration, and pet-rule switching.

## 11. Pet state

Only one pet is active at a time. A pet can hold at most one pet item. Compare complete `(pet, pet item, context)` states. Do not sum Elephant and Mooshroom Cow simultaneously unless a documented switching mechanic means they are active at different times.

Pet switching is useful only if the value gained during the switched phase exceeds switching friction and any acquisition/Autopet cost. Use payback from measured marginal profit instead of a universal threshold.

## 12. Enchant state

Enchantments belong to an item. Normal max level, special obtainable higher level, removed legacy level, and Ultimate status are separate metadata.

Known Farming-relevant examples currently tracked by Farming420 include Dedication IV, Cultivating X, Harvesting VI, Turbo-Crop VII, Pesterminator VI, Green Thumb V, Crop Fever V, Feast V, Sunset V, Bug Blender V, Delicate V, and Replenish I. Unknown enchantments must remain neutral rather than receiving a guessed max/rainbow state.

## 13. Data provenance

Every dynamic mechanic record should include `source`, `lastVerified`, and `status`. If a source itself says it is outdated, that warning propagates to any fact that is not independently confirmed.

A high-end optimizer should prefer a smaller set of correct facts over a large set of silently stale facts.
