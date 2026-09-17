# Active Farming Drop Models

Status: ACTIVE + explicit VERIFY gaps
As of: 2026-09-17
Runtime data: `src/farming-mechanics-data.js`, `src/pest-mechanics-data.js`

This chapter records the exact live boundaries used by the profit engine for normal crop output, Harvest Feast RARE CROPS, Pests, and Garden Vacuums. Unknown values remain `VERIFY`; they must not be silently substituted with vanilla/minion assumptions.

## 1. Normal crop output

All 13 active Farming crops have a dedicated Crop Fortune stat and are represented in `ACTIVE_CROP_MODELS`:

- Wheat
- Carrot
- Potato
- Pumpkin
- Melon Slice
- Mushroom
- Cactus
- Sugar Cane
- Cocoa Beans
- Nether Wart
- Sunflower
- Moonflower
- Wild Rose

For normal crop drops the calculator uses the combined active Fortune axis:

```text
expected units = valid crop breaks × base units per break × (1 + (Farming Fortune + matching Crop Fortune) / 100)
```

The matching Crop Fortune must be selected from the crop being broken. Crop Fortune is never globalized across crops.

### Verified base-output constants currently safe for runtime

- Pumpkin: fixed 1 Pumpkin per broken pumpkin block before Fortune.
- Cactus: fixed 1 Cactus per broken cactus block before Fortune.
- Melon: 3-7 Melon Slices, expected value 5, on the normal non-Silk-Touch path.

The exact live player-break expected base quantity for Wheat, Carrot, Potato, Mushroom, Sugar Cane, Cocoa Beans, Nether Wart, Sunflower, Moonflower, and Wild Rose is still `VERIFY` in the runtime dataset. This is intentional. Do not copy minion averages or generic vanilla assumptions into live scoring without direct verification.

Sources / leads:

- Crop Fortune stat behavior: https://hypixel-skyblock.fandom.com/wiki/Crop_Fortune
- Greenhouse/custom crops: https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/
- Pumpkin: https://hypixel-skyblock.fandom.com/wiki/Pumpkin
- Melon: https://hypixel-skyblock.fandom.com/wiki/Melon
- Cactus: https://hypixel-skyblock.fandom.com/wiki/Cactus

## 2. Harvest Feast RARE CROPS

Current first-party rules from Hypixel 0.24.4:

- Seasoning base chance: `1 / 2,250` from an in-season crop break.
- Seasoning is not a physical inventory item; it is donated automatically to the Communal Stew.
- Each in-season crop has one crop-specific Feast crafting material with base chance `1 / 18,000`.
- Both Seasoning and these crop materials are `RARE CROP` drops.
- Every 1 Overbloom adds 1% of the base drop chance. Runtime formula:

```text
P(drop) = base chance × (1 + Overbloom / 100)
```

- During a Grand Feast, each Seasoning drop also grants one Kernel.
- May 5, 2026 live changes: Feast enchant gives +2 Overbloom per level; Lucky Clover +3 Overbloom; Poignant Lucky Clover +7 Overbloom; Freshly Baked accessories double their own Overbloom during Feast events.

Crop-specific Feast RARE CROPS:

| Crop | RARE CROP |
| --- | --- |
| Wheat | Cornucopia |
| Carrot | Carrot Zest |
| Potato | Deepfries |
| Pumpkin | Aggourdian |
| Sugar Cane | Cane Knot |
| Melon | Melon Juice |
| Cactus | Cactus Flower |
| Cocoa Beans | Designer Coffee Beans |
| Mushroom | Feastfungus |
| Nether Wart | Botroot |
| Sunflower | Salted Sunflower Seeds |
| Moonflower | Crystalized Moonlight |
| Wild Rose | Floral Gelatin |

Primary source: https://hypixel.net/threads/hypixel-skyblock-0-24-4-harvest-feast-event-fossil-essence-shop-and-more.6089392/
May 5 source: https://hypixel.net/threads/may-5-skyblock-patch-notes.6094300/

### Economic modeling rule

Do not assign a fake coin value to Seasoning. It is a progression/donation outcome. A caller may supply an explicit shadow value only when intentionally converting progression rewards to economics. Crop-specific Feast materials are physical items and may use current market/NPC values.

## 3. Pests and Vacuums

### Active spawn event

Current base active Garden spawn chance is `0.2%` (`1 / 500`) per crop break from Garden Level 5.

Bonus Pest Chance does not replace that event probability. It changes the number of Pests produced when a successful spawn event occurs:

```text
expected pests per successful event
= 1 + floor(Bonus Pest Chance / 100) + (Bonus Pest Chance mod 100) / 100
```

Example: 250 Bonus Pest Chance has an expected 3.5 Pests per successful event.

Spray, Repellent, event, vinyl, pet, and other spawn modifiers must enter the runtime as explicit modifiers. The base module does not guess their stacking order.

Sources:

- Current Pest overview: https://hypixel-skyblock.fandom.com/wiki/Pest
- Bonus Pest Chance: https://hypixel-skyblock.fandom.com/wiki/Bonus_Pest_Chance
- 0.2% change first-party history: https://hypixel.net/threads/nov-13th-pesthunters-wares-chocolate-factory-additions-crimson-qol-and-more.5801731/

### Guaranteed Pest crop drops

Guaranteed crop drops use Farming Fortune plus the matching Crop Fortune. The Day-3 Pesthunter balancing table defines a per-Pest divisor. Runtime expectation for the ten classic crop Pests is:

```text
expected guaranteed quantity
= base quantity + (Farming Fortune + matching Crop Fortune) / divisor
```

| Pest | Crop | Base enchanted drop | Fortune divisor |
| --- | --- | ---: | ---: |
| Fly | Wheat | 1 | 35 |
| Rat | Pumpkin | 1 | 35 |
| Slug | Mushroom | 1 | 35 |
| Mite | Cactus | 2 | 17.5 |
| Mosquito | Sugar Cane | 2 | 17.5 |
| Moth | Cocoa Beans | 3 | 12 |
| Beetle | Nether Wart | 3 | 12 |
| Cricket | Carrot | 3 | 10.5 |
| Locust | Potato | 3 | 10.5 |
| Earthworm | Melon | 5 | 7 |

Dragonfly, Firefly, and Praying Mantis are represented in the runtime but their exact live guaranteed-drop divisor remains `VERIFY`; the calculator must not borrow a divisor from another crop.

First-party classic table: https://hypixel.net/threads/nov-13th-pesthunters-wares-chocolate-factory-additions-crimson-qol-and-more.5801731/

### Non-guaranteed Pest drops: current live rule

The May 14, 2026 Harvest Feast change supersedes old Farming-Fortune RNG formulas for Pest RNG drops:

- non-guaranteed Pest drops scale with Overbloom rather than Farming Fortune;
- this applies to all non-guaranteed Pest drops, not merely drops under 5%;
- Hypixel doubled the base drop rate of Pest items as compensation;
- Pest-specific Overbloom is additive to the global Overbloom axis for Pest contexts.

Therefore runtime Pest RNG rows use `PEST_OVERBLOOM`, not Farming Fortune.

First-party current source: https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/

Old community pages can still display the pre-May-14 Fortune formula. Treat that text as stale when it conflicts with the staff post.

### Harvest Feast drops from Pests

During the active Feast rules:

- a normal crop-specific Pest has a 15% base chance to drop its crop's in-season Feast RARE CROP;
- a Field Mouse has a 30% base chance to drop one of the in-season Feast RARE CROPS at random;
- Overbloom, not Farming Fortune, scales these probabilities.

Source: https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/

### Garden Vacuums

| Internal ID | Vacuum | Damage/s | Tracker | Stereo Harmony |
| --- | --- | ---: | --- | --- |
| `SKYMART_VACUUM` | SkyMart Vacuum | 100 | no | no |
| `SKYMART_TURBO_VACUUM` | SkyMart Turbo Vacuum | 120 | yes | no |
| `SKYMART_HYPER_VACUUM` | SkyMart Hyper Vacuum | 150 | yes | no |
| `INFINI_VACUUM` | InfiniVacuum™ | 200 | yes | no |
| `INFINI_VACUUM_HOOVERIUS` | InfiniVacuum™ Hooverius | 250 | yes | yes |

Normal Pests have 600 HP in the current Pest reference. Ideal uninterrupted vacuum time is therefore `HP / damage per second`, before movement, targeting, lag, pathing, or player reaction time. This is an analytical lower bound, not a real-world handling-time assumption.

Vacuum source: https://wiki.hypixel.net/Vacuums
Pest-health source: https://hypixel-skyblock.fandom.com/wiki/Pest

## Runtime safety rules added by this pass

1. All 13 crops exist in the mechanic dataset even when a base-output constant is unknown.
2. Unknown base output stays `VERIFY` and produces an incomplete profit result rather than zero or a guessed value.
3. Seasoning stays a progression result unless a caller explicitly assigns a shadow value.
4. Guaranteed Pest crops and Pest RNG drops use separate scaling paths.
5. Old Pest Fortune RNG formulas do not override the May 14 staff patch.
6. Vacuum damage is not treated as full real handling time; movement/target acquisition remain explicit inputs.
