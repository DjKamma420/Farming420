# 40 — Calculator, Item Model, Strategy, and Function Gap Audit

As of: 2026-09-17
Status: ACTIVE implementation audit; unresolved mechanics remain explicitly unresolved

This chapter compares Farming420's research contract against the actual calculator/runtime. Its purpose is to prevent a broad research document from being mistaken for implemented calculator coverage.

## 1. Current live Farming baseline

The relevant modern Farming line is post-Greenhouse and post-Harvest-Feast.

- Hypixel SkyBlock 0.24 released the Greenhouse on 2025-12-15. It added three crops, revamped Farming Tools, added Tool XP/rarity/gemstone progression, Sowdust, and Garden Chips.
- The 2025-12-16 patch explicitly changed new Pest base drops by doubling the effect of Farming Fortune on them.
- The 2026-02-04 and 2026-02-17 patches changed/fixed Greenhouse mutations, Crop Fever Wart, Garden Chip redemption, Delicate in the Greenhouse, and other Farming behavior.
- Hypixel SkyBlock 0.24.4 released Harvest Feast on 2026-04-28.
- The 2026-05-05 patch raised Feast to +2 Overbloom per level and changed Lucky Clover / Poignant Lucky Clover Overbloom.
- The 2026-05-14 Harvest Feast patch is a major Pest calculator boundary: non-guaranteed Pest drops are no longer scaled by Farming Fortune; they are scaled by Overbloom. Pest Feast RARE CROPS use 15% base chance, while Field Mice use 30%, before applicable Overbloom. The same patch gave Crop Bug +10 Overbloom, Pest Luck +20 Pest Overbloom, and Hedgehog +35 Pest Overbloom.

Primary sources:

- https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/
- https://hypixel.net/threads/december-16-skyblock-patch-notes.6030054/
- https://hypixel.net/threads/february-4-skyblock-patch-notes.6057003/
- https://hypixel.net/threads/february-17-skyblock-patch-notes.6062397/
- https://hypixel.net/threads/hypixel-skyblock-0-24-4-harvest-feast-event-fossil-essence-shop-and-more.6089392/
- https://hypixel.net/threads/may-5-skyblock-patch-notes.6094300/
- https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/

Do not mix pre-2026 Pest RNG formulas with the current May-14 behavior.

## 2. What the old calculator actually did

Before this audit, the revenue planner was not a complete profit calculator. It asked the user for:

```text
normalCropCoinsPerHour
rareCropCoinsPerHour
currentOverbloom
```

It then valued Farming Fortune and Overbloom as marginal improvements to those manually entered baseline streams.

That approach is useful as a fallback and does correctly avoid a fake universal FF/Overbloom conversion, but it does not independently calculate:

- crop output from breaks/second;
- crop-specific drop formulas;
- Rare Crop EV from individual rolls;
- Pest spawn rate;
- Pest loot EV;
- Pest handling downtime;
- recurring/consumable operating costs;
- full before/after strategy states.

Therefore it must not be described as the final Profit Calculator from `docs/PRODUCT_SPEC.md`.

## 3. Generic profit engine added in this pass

`src/profit-engine.js` adds a source-driven calculation core.

It deliberately contains no guessed Hypixel constants. Mechanic-specific data is passed in as explicit model inputs.

### Normal crop stream

For each declared normal drop:

```text
validBreaksPerHour
= breaksPerSecond
* effectiveFarmingSecondsPerHour

expectedUnitsPerHour
= validBreaksPerHour
* baseUnitsPerBreak
* explicitFortuneMultiplier

coinsPerHour
= expectedUnitsPerHour * unitValueCoins
```

The caller must explicitly select one of:

- no Fortune scaling;
- Farming Fortune;
- matching Crop Fortune;
- combined Farming + matching Crop Fortune;
- Pest Fortune where a Pest base-drop mechanic explicitly uses it.

A missing scaling rule is incomplete data, not zero.

### Rare/RNG stream

For each declared Rare/RNG drop:

```text
eligibleRollsPerHour
= validBreaksPerHour * rollsPerBreak

scaledProbability
= baseProbability * explicitProbabilityMultiplier

expectedUnitsPerHour
= eligibleRollsPerHour
* scaledProbability
* expectedQuantity
```

Probability scaling must be explicitly `none`, `overbloom`, or `pest-overbloom`.

If a scaled probability exceeds 100%, the engine refuses to invent overflow/cap behavior. The caller must supply the verified cap behavior.

### Pest handling feedback

Pest value cannot be added to crop profit without charging the lost farming time.

When the caller has an exact expected-Pests-per-break model:

```text
pestsPerBreak
= spawnProbability
* spawnOpportunitiesPerBreak
* expectedPestsPerSpawn
```

and Pest handling consumes `handlingSecondsPerPest`, the engine solves the farming-time feedback directly:

```text
effectiveFarmingSeconds
= baselineFarmingSeconds
/ (1 + breaksPerSecond * pestsPerBreak * handlingSecondsPerPest)
```

Then both crop breaks and Pest spawns are recalculated from that effective farming time.

A measured/verified `fixedPestsPerHour` can be supplied instead when the spawn pipeline is not yet modeled exactly.

### Costs and transitions

Recurring costs are deducted per hour. A before/after transition keeps these acquisition axes separate:

```text
purchaseCost
applicationCost
nonRecoverableCost
expectedResaleRecovered
activeGrindHours
passiveWaitHours
```

```text
netAcquisitionCost
= purchase + application + nonRecoverable - resaleRecovered

paybackHours
= netAcquisitionCost / deltaNetCoinsPerHour
```

Raw cash required remains separate from recovered resale value.

## 4. Unknown-data behavior

The new calculator follows the repository invariant:

```text
unknown != 0
```

If a requested stream lacks a required mechanic input:

- `complete = false`;
- `netCoinsPerHour = null`;
- known partial streams remain visible as `knownNetCoinsPerHour` for diagnostics;
- the exact missing path/reason is returned.

This prevents an unresearched Rare Crop/Pest stream from making a setup appear worse merely because the app silently valued it at zero.

## 5. Strategy layer added in this pass

`src/strategy-model.js` introduces explicit strategy contexts:

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

Candidates can declare context and crop applicability. Wheat-only or Feast-only actions therefore do not participate in an unrelated Melon/normal-farming state.

The strategy evaluator also reuses setup, reforge-entry, and pet cardinality constraints. Impossible states are invalid rather than additive.

Default objectives are context-specific:

- normal crop / Feast / Pest economic modes: net Coins/hour;
- Jacob: contest score;
- tool leveling: Tool XP/hour;
- Greenhouse / Visitors / Ironman: explicit progression/hour.

Contest score, XP, and progression are never fabricated from Coins or Farming Fortune. Those contexts remain incomplete until their actual measured/verified metric is provided.

## 6. Item models and image coverage

The item-model pipeline is broader than the shipped SkyBlock resource pack alone.

Current sources, strongest first where applicable:

1. Player-head texture from the concrete item's NBT/profile component.
2. `skin` hash from Hypixel's public SkyBlock item resource.
3. Exact texture from the synced SkyBlock resource pack.
4. A documented set-representative texture for Farming sets that have no individual pack model.
5. Vanilla material model/reference.
6. Unresolved placeholder only when all sources fail.

Official item resource used by the app:

- https://api.hypixel.net/v2/resources/skyblock/items

`src/skull-art.js` supports legacy `SkullOwner`, modern `profile` components, list-style texture properties, direct texture URLs, and validated bare texture hashes.

`src/item-catalog.js` already identifies the modern Farming armor families, equipment families, specialized tools, and official item capability fields.

`src/item-model-coverage.js` added in this pass makes the model state auditable. It classifies every recognized Farming armor/equipment/tool/vacuum item as:

```text
official-skin
resource-pack-item
resource-pack-set
vanilla-material
unresolved
```

An unresolved item is now a measurable coverage failure rather than an invisible generic badge fallback.

Important limitation: a set-representative icon is a fallback, not a claim that the source item and armor piece have the same in-game model. If the official item resource later exposes an exact skin/model, it must take precedence.

## 7. Research areas now structurally supported but still missing exact constants

The calculator can represent the following without another architecture change, but exact current values/tables still need sourced data before automatic recommendations can use them.

### Crop output

Still required per each active Garden crop/tool behavior:

- base units per valid break;
- multi-block versus per-break semantics;
- Dicer/random-extra-drop tables;
- mushroom/cactus/cocoa/sugar-cane special break behavior where relevant;
- compacted/enchanted conversion and sell route;
- sustainable real blocks/second assumptions by farm geometry.

Do not put one global `baseUnitsPerBreak` constant across all crops.

### Harvest Feast / Rare Crops

Still required:

- exact per-crop normal-farming RARE CROP base probabilities;
- exact Seasoning probabilities and quantities;
- event/Grand Feast eligibility windows;
- Crop Fever proc rates and eligible-roll interaction;
- any probability cap/overflow behavior that can become reachable;
- market/NPC values and liquidity for resulting drops.

The May-14 Pest base chances are verified, but that does not define normal crop-break Rare Crop chances.

### Pests

Still required for full automatic Pest Coins/hour:

- exact live spawn cooldown/pipeline;
- Bonus Pest Chance formula;
- spray/vinyl/pet/armor/chip/shard spawn modifiers and stacking order;
- Pest type distribution by state;
- exact guaranteed/base drop quantities;
- current non-guaranteed base probabilities per Pest;
- exact Pest Fortune behavior for base/guaranteed crop drops;
- vacuum kill/handling time by model/damage/state;
- simultaneous-vacuum and swap timing;
- Pest penalty/debuff as Pest count accumulates;
- trap/passive Pest interactions.

The May-14 rule only settles which stat scales non-guaranteed Pest rolls.

### Chips and temporary effects

Still required before full automatic EV:

- exact live Chip level/rarity tables where not already verified;
- Hypercharge whitelist and order of operations;
- Crop Fever uptime;
- seasonal/day-night conditions;
- God Potion/Mixin relevant effects and duration;
- recurring cost amortization.

Hypercharge must multiply only its verified eligible temporary source, never total Farming Fortune.

### Jacob contests

Still required:

- exact score model per crop/current mechanics;
- current reward/medal/Ticket EV;
- contest phase swaps and setup costs;
- reliable historical/player percentile data if any projection is shown.

Percentile medals are population-relative. Never present a static score as a guaranteed medal unless current mechanics provide such a guarantee.

### Greenhouse

Still required:

- exact growth-cycle and water logic per crop/mutation;
- mutation prerequisites/spread probabilities where probabilistic;
- decay/freeze/offline grace behavior;
- expected harvest values;
- maintenance active time;
- storage/slot constraints;
- mutation/Greenhouse progression value.

The 2026-02 patches demonstrate why old Alpha growth constants must not be copied into the live model.

## 8. Profile/API mapping still incomplete

The runtime still cannot fully auto-detect every calculator input from Hypixel profile data.

High-impact remaining mappings include:

- active physical armor/equipment identity as an authoritative equipped loadout;
- active pet and held pet item;
- Garden Chips and levels/rarities;
- Attribute Shards and relevant shard effects;
- temporary buffs;
- day/night and Feast state;
- Hypercharge state;
- contest history/active contest state where exposed;
- measured blocks/second and handling times, which may require client-side/manual measurement rather than API data.

Manual input remains valid only where the API cannot provide the state or until an exact parser is implemented.

## 9. Priority order for the next data pass

The highest-value missing data is not another list of headline Farming Fortune sources. It is the data that unlocks complete before/after Coins/hour simulation:

1. Exact crop output model for all 13 active Garden crops.
2. Exact current normal Rare Crop/Seasoning tables.
3. Pest spawn formula + Pest loot tables + vacuum timing.
4. Hypercharge/Crop Fever temporary-state model.
5. Automatic Chip/Shard/pet/equipped-item profile mapping.
6. Contest score/reward model.
7. Greenhouse mutation production model.
8. Live price routing, fees, depth, and timestamping for every monetized stream.
9. Item-model coverage audit against the full official item resource on every sync.

Until those constants are verified, the new calculator core should accept measured/manual inputs and expose incompleteness rather than synthesize values.
