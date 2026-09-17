# Vacuum Research Reference

**Status:** ACTIVE  
**Last verified:** 2026-09-17  
**Scope:** Garden Pest Vacuums, progression, acquisition cost, modifiers, damage, Pest Farming Fortune, gemstone slots, reforges, Stereo Harmony, Pest interactions, and optimizer rules.  
**Calculator safety:** Production-safe for rows marked `ACTIVE`. Rows marked `VERIFY` must not affect recommendations until reverified.

This file is the canonical Vacuum-specific research layer for Farming420. If a newer Hypixel patch changes any mechanic below, reverify the affected section before using it in calculations.

---

## 1. Non-negotiable calculator rules

1. A Vacuum is a **Pest-phase held tool**, not a crop harvesting tool. Do not add its held-item Farming Fortune to a crop tool at the same time.
2. Vacuum damage has **threshold value**, not a universal linear coin value. Extra damage matters when it reduces Pest kill/capture time or enables a relevant HP threshold; beyond that threshold its marginal handling-time value can approach zero.
3. `Beady` and `Buzzing` are mutually exclusive because a physical Vacuum has one active reforge.
4. Bookworm's Favorite Book, Farming For Dummies, Bug Blender, gemstones, recombobulation, and the active reforge are separate item states and must be parsed independently.
5. **Pest Farming Fortune is not rare-drop chance.** Since the May 14, 2026 Pest changes, non-guaranteed Pest drops use Overbloom. Do not feed Vacuum Farming Fortune, Beady, or Bug Blender directly into rare Pest drop EV.
6. Stereo Harmony changes **Pest selection/composition**, not total Pest spawn rate. Do not model it as Bonus Pest Chance.
7. Stable SkyMart/Copper requirements and dynamic market prices are different cost classes. Do not turn Copper into a fixed coin value without an explicit opportunity-cost model.
8. Modified Vacuum Auction House value must be compared with the player's current item's resale/liquidation value. Do not treat every already-owned modifier as a fresh acquisition cost.
9. Old guides are unsafe for Vacuum damage. Hypixel SkyBlock 0.27 changed several base damage values and doubled Bookworm's Favorite Book from +10 to +20 Damage per application.

---

## 2. Vacuum progression

All current Vacuums are Garden Pest tools. Garden level 5 is the core unlock point for the Pest system and the initial Vacuum progression.

| Tier | Item | SkyBlock ID | Rarity | Incremental self-upgrade requirement | Cumulative fixed self-upgrade requirement* | Base Damage | Base Farming Fortune | Range | Special | Museum XP |
|---|---|---|---|---|---:|---:|---:|---|---:|
| 1 | SkyMart Vacuum | `SKYMART_VACUUM` | COMMON | 5,000 coins, or one-time quest acquisition where applicable | 5,000 coins | 100 | +5 | 5 | Vacuum + Pest Tracker | +2 |
| 2 | SkyMart Turbo Vacuum | `SKYMART_TURBO_VACUUM` | UNCOMMON | Previous tier + 200 Copper | 5,000 coins + 200 Copper | 150 | +10 | 7.5 | Vacuum + Pest Tracker | +2 |
| 3 | SkyMart Hyper Vacuum | `SKYMART_HYPER_VACUUM` | RARE | Previous tier + 500 Copper | 5,000 coins + 700 Copper | 200 | +15 | 10 | Vacuum + Pest Tracker | +4 |
| 4 | InfiniVacuum™ | `INFINI_VACUUM` | EPIC | Previous tier + 1,000 Copper | 5,000 coins + 1,700 Copper | 300 | +20 | 12.5 | +1 Peridot slot | +6 |
| 5 | InfiniVacuum™ Hooverius | `INFINI_VACUUM_HOOVERIUS` | LEGENDARY | Previous tier + 2,500 Copper + 1 Chirping Stereo | 5,000 coins + 4,200 Copper + 1 Chirping Stereo | 400 | +25 | 15 | Stereo Harmony + 2 Peridot slots | +8 |

\* If the first Vacuum was obtained free from the Pesthunter Phillip progression rather than purchased, remove the 5,000-coin initial purchase component from the player's personal cumulative acquisition cost.

### Core abilities

- **Vacuum — HOLD RIGHT CLICK:** pulls/damages Pests in range. Capturing/killing a Pest grants Pest currency.
- **Pest Tracker — LEFT CLICK:** points toward the nearest Pest; 1-second cooldown.
- **Stereo Harmony — SNEAK LEFT CLICK, Hooverius only:** uses a compatible Vinyl to heavily increase the selection weight of the Vinyl's associated Pest. The effect can continue while the player is offline when configured.

### 0.27 damage correction

Current values must override older guide values:

- Turbo: **150**, not 120.
- Hyper: **200**, not 150.
- Infini: **300**, not 200.
- Hooverius: **400** current base Damage.
- Bookworm's Favorite Book: **+20 Damage each**, not +10.

Status: `ACTIVE`  
Last verified: 2026-09-17.

---

## 3. Complete modifier matrix

| Modifier | Applies to Vacuum | Maximum / state | Current effect | Cost type | Optimizer scope | Status |
|---|---|---|---|---|---|---|
| Bookworm's Favorite Book | Yes | 5 applications | +20 Damage each; +100 max | Dynamic Bazaar/component market | Pest handling / damage threshold | ACTIVE |
| Farming For Dummies | Yes | 5 applications | +1 Farming Fortune each; +5 max | Dynamic Bazaar | Vacuum-held FF | ACTIVE |
| Bug Blender | Yes | V | +20/+40/+60/+80/+100 Farming Fortune while vacuuming Pests | Dynamic book cost + XP level application cost | Pest-only Vacuum FF | ACTIVE |
| Buzzing reforge | Yes | One active reforge | Rarity-scaled FF + doubles Vacuum Damage | Dynamic Clipped Wings + reforge fee | Damage threshold + FF | ACTIVE |
| Beady reforge | Yes | One active reforge | Rarity-scaled Damage/Intelligence +100 FF on Pests | Dynamic Beady Eyes + reforge fee | Pest-only FF + small Damage | ACTIVE |
| Recombobulator 3000 | Yes | Once | Raises rarity by one; indirectly improves rarity-scaled reforge/gem stats | Dynamic Bazaar | Depends on current build | ACTIVE |
| Peridot gemstone | Infini/Hooverius | 1 / 2 slots | Farming Fortune based on quality and host rarity | Dynamic gemstone cost; second Hooverius slot has unlock inputs | Vacuum-held FF | ACTIVE |
| Hot Potato Book | Historically claimed in old guides | Unknown current support | Do not encode | Unknown | None until verified | VERIFY |
| Fuming Potato Book | Historically claimed in old guides | Unknown current support | Do not encode | Unknown | None until verified | VERIFY |

`VERIFY` rows must contribute **zero modeled effect only because they are disabled from the model**, not because their real in-game effect is assumed to be zero.

---

## 4. Bookworm's Favorite Book

**SkyBlock ID:** `BOOKWORM_BOOK`  
**Current source:** maintained community wiki + official 0.27 patch notes.  
**Acquisition:** rare Earthworm drop; current maintained source lists **4%** base drop chance.  
**Application:** Anvil, up to 5 books per Vacuum.  
**Effect:** +20 Vacuum Damage per book.

```text
bookwormDamage = 20 * bookCount
bookCount = 0..5
maxBookwormDamage = 100
```

### Stale-source trap

Some Hooverius trivia still describes a 900-Damage maximum using Buzzing and five books. That arithmetic is stale after 0.27.

Current item-local calculation:

```text
Hooverius base damage = 400
5 Bookworm books      = +100
pre-Buzzing damage    = 500
Buzzing               = x2
current result        = 1,000 Damage
```

Do **not** encode 900.

---

## 5. Bug Blender I-V

**SkyBlock ID:** `ENCHANTMENT_BUG_BLENDER`  
**Added:** SkyBlock 0.24.4, April 28, 2026.  
**Applies to:** Vacuums.

| Level | Farming Fortune while vacuuming Pests | Application XP level cost |
|---:|---:|---:|
| I | +20 | 10 |
| II | +40 | 20 |
| III | +60 | 30 |
| IV | +80 | 40 |
| V | +100 | 50 |

Level I crafting currently yields **8 Bug Blender I books** from **3 Enchanted Paper + 8 Designer Coffee Beans**. Higher levels are obtained by combining lower-level books through the normal Anvil progression.

Calculator rule:

```text
bugBlenderPestFF = 20 * bugBlenderLevel
bugBlenderLevel = 0..5
```

This is **Pest/vacuuming scoped**. Never apply it to normal crop harvesting.

The generic item metadata/lore classification that may describe Vacuums as non-enchantable must not be interpreted as prohibiting this explicit special Vacuum enchant.

---

## 6. Farming For Dummies

Farming For Dummies can currently be applied to Vacuums. Compatibility was explicitly added by Hypixel in 2025.

```text
farmingForDummiesFF = min(farmingForDummiesCount, 5)
```

- +1 Farming Fortune per application.
- Maximum 5 applications = +5 Farming Fortune.
- Store the exact count `0..5` on the physical Vacuum.
- Treat price as dynamic Bazaar/market data.

Status: `ACTIVE`, high confidence from official compatibility notes plus current modified-item evidence.

---

## 7. Vacuum reforges

A Vacuum has exactly one active reforge. Compare complete before/after states.

### 7.1 Buzzing — Clipped Wings

**Reforge stone:** Clipped Wings  
**SkyBlock ID:** `CLIPPED_WINGS`  
**Reforge:** `Buzzing`  
**Requirement:** Mining XV  
**Current source acquisition:** Mosquito rare drop; maintained Pest data lists **2%** base drop chance.

Rarity-scaled Farming Fortune:

| Host rarity | COMMON | UNCOMMON | RARE | EPIC | LEGENDARY | MYTHIC |
|---|---:|---:|---:|---:|---:|---:|
| Farming Fortune | +2 | +3 | +5 | +7 | +9 | +11 |

Reforge bonus:

```text
vacuumDamageAfterBuzzing = vacuumDamageBeforeBuzzing * 2
```

Reforge application fee by host rarity:

| Rarity | COMMON | UNCOMMON | RARE | EPIC | LEGENDARY | MYTHIC |
|---|---:|---:|---:|---:|---:|---:|
| Coins | 10,000 | 20,000 | 50,000 | 75,000 | 100,000 | 150,000 |

Primary use: preserve/achieve damage thresholds while still adding a smaller amount of FF.

### 7.2 Beady — Beady Eyes

**Reforge stone:** Beady Eyes  
**SkyBlock ID:** `BEADY_EYES`  
**Reforge:** `Beady`  
**Requirement:** Mining XV  
**Current source acquisition:** Fly rare drop; maintained Pest data lists **3%** base drop chance.

Rarity-scaled static stats:

| Host rarity | COMMON | UNCOMMON | RARE | EPIC | LEGENDARY | MYTHIC |
|---|---:|---:|---:|---:|---:|---:|
| Damage | +5 | +10 | +15 | +20 | +25 | +30 |
| Intelligence | +10 | +20 | +30 | +40 | +50 | +60 |

Special reforge bonus:

```text
+100 Farming Fortune on Pests
```

Application fees are the same 10k / 20k / 50k / 75k / 100k / 150k rarity scale shown above.

Primary use: strong Pest Fortune candidate when the rest of the setup already preserves the desired kill/capture threshold.

### 7.3 Reforge decision rule

Never encode a universal `Beady > Buzzing` or `Buzzing > Beady` rule.

```text
value(reforge)
= pestDropValueDelta
+ handlingTimeValueDelta
+ thresholdUnlockValue
- acquisitionCostAmortization
- replacedReforgeValue
```

If both states already satisfy the same practical Pest handling threshold, Beady's +100 Pest FF can be much more valuable. If switching away from Buzzing causes an extra damage cycle or breaks a special threshold, the time loss can dominate.

---

## 8. Peridot gemstone slots

Peridot grants Farming Fortune.

- InfiniVacuum™: **1 Peridot slot**.
- InfiniVacuum™ Hooverius: **2 Peridot slots**.
- Hooverius second slot current live-item evidence: **20 Fine Peridot Gemstones + 50,000 coins** to unlock.
- After a slot is unlocked, applying the gemstone itself does not add another slot-opening fee; gemstone acquisition cost remains dynamic.
- Do not assume every owned Vacuum has every slot unlocked. Parse the actual physical item where possible.

### Peridot Farming Fortune by quality and host rarity

| Quality | COMMON | UNCOMMON | RARE | EPIC | LEGENDARY | MYTHIC |
|---|---:|---:|---:|---:|---:|---:|
| Rough | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 |
| Flawed | 1 | 1.5 | 2 | 2.5 | 3 | 4 |
| Fine | 1.5 | 2 | 3 | 4 | 5 | 6 |
| Flawless | 2 | 3 | 4 | 5 | 6 | 8 |
| Perfect | 3 | 4 | 5 | 6 | 8 | 10 |

### Gem removal fees

| Quality | Removal fee |
|---|---:|
| Rough | 1 coin |
| Flawed | 100 coins |
| Fine | 10,000 coins |
| Flawless | 100,000 coins |
| Perfect | 500,000 coins |

For a Legendary Hooverius with two Perfect Peridots:

```text
2 * 8 = +16 Farming Fortune
```

For a recombobulated Mythic Hooverius with the same two Perfect Peridots:

```text
2 * 10 = +20 Farming Fortune
```

---

## 9. Recombobulator 3000

A Recombobulator raises Hooverius from Legendary to Mythic. The base Hooverius +25 Farming Fortune and +400 Damage do not become larger merely because rarity changed. Its value comes from rarity-scaled attached systems.

For Hooverius specifically:

- Beady Damage: +25 -> +30.
- Beady Intelligence: +50 -> +60.
- Buzzing Farming Fortune: +9 -> +11.
- Perfect Peridot: +8 -> +10 each; two slots therefore gain +4 FF total from the rarity increase.

Model recombobulation as a complete state transition, not as a flat generic FF upgrade.

```text
recombDelta = value(mythicCompleteState) - value(legendaryCompleteState)
```

Its acquisition price is dynamic Bazaar data and must not be hardcoded.

---

## 10. Hooverius Stereo Harmony and Chirping Stereo

### Hooverius upgrade component

**Chirping Stereo**  
**SkyBlock ID:** `CHIRPING_STEREO`  
**Current acquisition:** Cricket rare drop; maintained Pest data lists **1%** base drop chance.  
**NPC sell value:** 100,000 coins.  
**Market:** tradeable/auctionable; use live AH-derived value in production.

The Hooverius purchase consumes:

```text
InfiniVacuum + 2,500 Copper + 1 Chirping Stereo
```

### Stereo Harmony

Hooverius can equip/use Vinyls to bias Pest selection. Current selection model:

```text
defaultPestWeight = 100
SprayonatorTargetBonus = +1000 selection weight
StereoHarmonyTargetBonus = +1000 selection weight
```

A Mosquito Pet's Smooth Jazz effect can increase Stereo Harmony effectiveness. Treat that as an external pet-dependent multiplier/weight modification, not intrinsic Hooverius value.

Stereo Harmony can continue operating while configured offline. This creates composition/control value that must be modeled separately from held-item combat stats.

### Standard Pest/Vinyl mapping

| Pest | Crop association | Vinyl |
|---|---|---|
| Fly | Wheat | Pretty Fly |
| Cricket | Carrot | Cricket Choir |
| Locust | Potato | Cicada Symphony |
| Rat | Pumpkin | Rodent Revolution |
| Mosquito | Sugar Cane | Buzzin' Beats |
| Earthworm | Melon | Earthworm Ensemble |
| Mite | Cactus | DynaMITES |
| Moth | Cocoa Beans | Wings of Harmony |
| Slug | Mushroom | Slow and Groovy |
| Beetle | Nether Wart | Not Just a Pest |
| Dragonfly | Sunflower | Imagine Dragonflies |
| Firefly | Moonflower | Firefly in the Hole |
| Praying Mantis | Wild Rose | Pray For Me |

Do not invent Stereo mappings for special Pest types that are not part of this standard mapping.

---

## 11. Pest mechanics that determine Vacuum value

### Base HP and damage threshold

Current normal Pest HP baseline:

```text
normalPestHP = 600
```

Known special case:

```text
Derpy doubled Pest HP = 1,200
```

Damage should therefore be evaluated against the active HP context and the actual timing model.

### Guaranteed vs rare Pest drops

This distinction is mandatory:

- Guaranteed/crop-style Pest drops can be affected by applicable Farming Fortune and matching Crop Fortune according to the current Pest drop system.
- Non-guaranteed rare Pest drops use **Overbloom** under the current 2026 system.
- Some pet-drop formulas can have their own Pet Luck component.

Therefore:

```text
Beady +100 Pest FF          != +rare Pest drop chance
Bug Blender V +100 Pest FF != +rare Pest drop chance
```

Use Overbloom for the rare-drop EV path.

### Pest currency utility

A vacuumed Pest yields Pest currency. Pesthunter Phillip can convert Pest currency into a temporary Farming Fortune buff:

```text
1 Pest spent -> +5 Farming Fortune for 30 minutes
maximum stack: 40 Pests -> +200 Farming Fortune
```

Pest currency also has alternative uses, so its optimizer value should use the player's selected conversion/use case rather than assume it is always spent on Fortune.

---

## 12. Current damage snapshots

These are validation cases, not universal recommendations.

### Hooverius + five Bookworm books

```text
base = 400
books = 5 * 20 = 100
pre-reforge = 500
```

#### Buzzing

```text
(400 + 100) * 2 = 1,000 item-local Damage
```

#### Beady Legendary

```text
400 + 100 + 25 = 525 item-local Damage
```

#### Beady Mythic

```text
400 + 100 + 30 = 530 item-local Damage
```

### External modifiers

A level-100 Hedgehog can double damage dealt to Pests. Other external Pest-damage systems include Insect Power and Book of Progression effects. Keep these outside the Vacuum object and combine them only in the active Pest combat state.

Example with a 2x external Pest damage multiplier:

```text
Buzzing max-book Hooverius: 1,000 * 2 = 2,000
Beady L max-book Hooverius:   525 * 2 = 1,050
Beady M max-book Hooverius:   530 * 2 = 1,060
```

Against 1,200 HP, this external setup preserves the threshold for Buzzing but not for those Beady examples unless another applicable modifier is present. This is why reforge value must be threshold-aware.

---

## 13. Maxed Hooverius item-contribution validation snapshots

Scope: Vacuum item contribution **while vacuuming Pests**, excluding account progression, armor, equipment, pet, accessories, Crop Fortune, global temporary buffs, etc.

Assume:

- Hooverius base: +25 FF.
- Farming For Dummies: 5/5 = +5 FF.
- Bug Blender V: +100 Pest-only FF.
- Two Perfect Peridots.
- Five Bookworm books.
- Reforge as listed.

### Legendary Hooverius

```text
base FF                    25
Farming For Dummies         5
2x Perfect Peridot         16
Bug Blender V             100
pre-reforge Pest-context  146
```

- **Buzzing Legendary:** 146 + 9 = **155 Pest-context FF**, 1,000 item-local Damage.
- **Beady Legendary:** 146 + 100 = **246 Pest-context FF**, 525 item-local Damage, +50 Intelligence.

### Mythic Hooverius

```text
base FF                    25
Farming For Dummies         5
2x Perfect Peridot         20
Bug Blender V             100
pre-reforge Pest-context  150
```

- **Buzzing Mythic:** 150 + 11 = **161 Pest-context FF**, 1,000 item-local Damage.
- **Beady Mythic:** 150 + 100 = **250 Pest-context FF**, 530 item-local Damage, +60 Intelligence.

Comparison only:

- Mythic Beady has **+89 Pest-context FF** over Mythic Buzzing in this item snapshot.
- Legendary Beady has **+91 Pest-context FF** over Legendary Buzzing in this item snapshot.
- Those differences do **not** prove Beady is always better because the damage threshold can change real handling time.

---

## 14. Cost model

### 14.1 Stable fixed progression requirements

From a purchased first Vacuum:

```text
SkyMart Vacuum              5,000 coins
Turbo upgrade                 200 Copper
Hyper upgrade                 500 Copper
Infini upgrade              1,000 Copper
Hooverius upgrade           2,500 Copper + 1 Chirping Stereo
-----------------------------------------------------------
Cumulative                  5,000 coins + 4,200 Copper + 1 Chirping Stereo
```

If the base Vacuum came from the free one-time quest path, its personal acquisition ledger should omit the 5,000-coin purchase.

### 14.2 Copper must use opportunity cost

Copper has no safe timeless coin conversion.

Recommended model:

```text
copperOpportunityCostPerUnit
= bestOrSelectedAlternativeNetCoinValue / copperRequiredByAlternative

vacuumCopperOpportunityCost
= copperRequired * copperOpportunityCostPerUnit
```

Store the raw Copper requirement even when no opportunity-cost conversion is available.

### 14.3 Dynamic market components

Never hardcode production prices for:

- Chirping Stereo.
- Beady Eyes.
- Clipped Wings.
- Recombobulator 3000.
- Peridot gemstones.
- Fine Peridot components for the second Hooverius slot.
- Farming For Dummies.
- Bookworm's Favorite Book.
- Bug Blender books.
- completed/modified Vacuum Auction House listings.

All market prices require source + timestamp + buy/sell method.

### 14.4 Cost classes

For every proposed upgrade, store separately:

```text
acquisitionCost
consumedMaterialCost
reforgeApplicationFee
slotUnlockFee
gemAcquisitionCost
xpLevelCost
copperRawCost
copperOpportunityCost
marketWaitingCost
currentItemResaleValue
newItemExpectedResaleValue
```

Do not collapse them into one opaque number before the UI/recommendation layer has enough information to explain the result.

### 14.5 Buy-versus-self-upgrade comparison

For a player at current tier/state:

```text
selfUpgradeEconomicCost
= incrementalCoins
+ dynamicConsumedMaterials
+ copperOpportunityCost
+ irreversibleFees
+ valueOfAnyLost/ReplacedModifiers

marketSwapNetCost
= marketPurchasePrice(targetState)
- realisticNetSaleValue(currentState)
+ transaction/market friction if modeled

chosenAcquisitionCost
= min(valid self-upgrade route, valid market-swap route)
```

For Ironman or non-market modes, disable invalid market routes instead of assigning them arbitrary huge costs.

---

## 15. Value model for the upgrade planner

Vacuum upgrade value is multi-axis.

```text
vacuumUpgradeNetValuePerHour
= guaranteedPestDropValueDeltaPerHour
+ handlingTimeRecoveredValuePerHour
+ pestCompositionControlValuePerHour
+ progressionUnlockValuePerHour
+ pestCurrencyValueDeltaPerHour
- recurringOrAmortizedUpgradeCostPerHour
```

### Damage value

```text
currentCycles = cyclesNeeded(currentDamage, pestHP, combatTiming)
newCycles     = cyclesNeeded(newDamage, pestHP, combatTiming)
handlingTimeSaved = time(currentCycles) - time(newCycles)
```

Do not use `coinsPer1Damage` as a universal stat.

### Range value

Range can reduce travel/aim/positioning time, but there is no safe universal `coins per range block`. Use measured/calibrated handling-time data or leave this component manual.

### Farming Fortune value

Evaluate against only the drop streams that current Pest mechanics allow Farming Fortune to affect.

Do not write:

```text
rarePestDropEV *= 1 + pestFarmingFortune / 100
```

That is stale under the current Overbloom-based rare-drop system.

---

## 16. Physical item state required by the app

Minimum Vacuum record:

```json
{
  "skyblockId": "INFINI_VACUUM_HOOVERIUS",
  "rarity": "LEGENDARY",
  "recombobulated": false,
  "reforge": "buzzing",
  "bookwormCount": 0,
  "farmingForDummiesCount": 0,
  "bugBlenderLevel": 0,
  "gemstoneSlots": [
    {
      "type": "PERIDOT",
      "unlocked": true,
      "quality": null
    },
    {
      "type": "PERIDOT",
      "unlocked": false,
      "quality": null
    }
  ],
  "stereoVinyl": null,
  "rawItemData": null
}
```

Do not infer a maxed item from the item name alone.

### Pest-context inputs outside the item

```json
{
  "gardenLevel": 5,
  "targetPest": null,
  "pestHpMode": "NORMAL",
  "externalPestDamageMultiplier": 1.0,
  "externalPestDamageFlat": 0,
  "applicableCropFortune": 0,
  "applicableOverbloom": 0,
  "petLuck": 0,
  "pestSpawnRate": null,
  "pestsPerHour": null,
  "vacuumHandlingSecondsPerPest": null,
  "copperOpportunityCostPerUnit": null,
  "marketPriceTimestamp": null
}
```

Unknown inputs should remain `null`, not silently become zero where that would change recommendations.

---

## 17. Progression/recommendation graph

Base tier graph:

```text
SkyMart Vacuum
  -> SkyMart Turbo Vacuum
  -> SkyMart Hyper Vacuum
  -> InfiniVacuum
  -> InfiniVacuum Hooverius
```

Independent item-upgrade branches:

```text
Bookworm books: 0 -> 1 -> 2 -> 3 -> 4 -> 5
Farming For Dummies: 0 -> 1 -> 2 -> 3 -> 4 -> 5
Bug Blender: 0 -> I -> II -> III -> IV -> V
Reforge: none/other <-> Buzzing <-> Beady
Rarity: base -> recombobulated
Peridot slot state: locked -> unlocked -> gemstone quality progression
Stereo/Vinyl: none <-> selected valid Vinyl
```

The planner should evaluate branches against the player's **actual current physical Vacuum** and objective instead of prescribing a fixed maxing order.

---

## 18. Known stale/conflicting information traps

### Trap A: old Vacuum base damage

Pre-0.27 guides can show lower Turbo/Hyper/Infini/Hooverius damage. Current values in this file supersede them.

### Trap B: Bookworm +10

Pre-0.27 Bookworm data is stale. Current effect is +20 Damage per application.

### Trap C: Hooverius “900 max damage” trivia

Stale after 0.27. Current item-local max-book Buzzing calculation is 1,000 Damage before external modifiers.

### Trap D: old Pest rare-drop Fortune formula

Rare non-guaranteed Pest drops changed to Overbloom in 2026. Do not increase rare-drop EV with Beady, Bug Blender, or generic Vacuum FF.

### Trap E: generic “not enchantable” interpretation

Bug Blender is an explicit Vacuum enchant and overrides a naive generic-enchantability interpretation.

### Trap F: Hot/Fuming Potato Books

Historical community guides mention them for Vacuums, but the maintained current Vacuum research used here does not provide sufficient current verification. Exclude them from production calculations until live item/NBT or current authoritative data verifies support and effect.

### Trap G: fixed market-price constants

Any copied AH/Bazaar number becomes stale quickly. Keep only dynamic price inputs in production logic. Historical price snapshots may be used for tests/sanity checks but never as live recommendation inputs.

---

## 19. Implementation assertions/tests

The calculation layer should have tests for at least these cases:

```text
1. Hooverius base damage == 400
2. Hooverius + 5 Bookworm == 500 pre-reforge damage
3. Buzzing Hooverius + 5 Bookworm == 1000 item-local damage
4. Beady Legendary Hooverius + 5 Bookworm == 525 item-local damage
5. Beady Mythic Hooverius + 5 Bookworm == 530 item-local damage
6. Bug Blender V == +100 Pest-vacuuming FF
7. Five Farming For Dummies == +5 FF
8. Legendary Hooverius + two Perfect Peridots == +16 gem FF
9. Mythic Hooverius + two Perfect Peridots == +20 gem FF
10. Max-state Legendary Buzzing snapshot == 155 Pest-context item FF
11. Max-state Legendary Beady snapshot == 246 Pest-context item FF
12. Max-state Mythic Buzzing snapshot == 161 Pest-context item FF
13. Max-state Mythic Beady snapshot == 250 Pest-context item FF
14. Beady and Buzzing cannot coexist
15. Vacuum held FF is not added to crop-tool held FF in the same phase
16. Pest FF does not modify the current rare-Pest-drop Overbloom formula
17. Stereo Harmony changes target weighting, not total Pest spawn rate
18. Copper remains a separate currency/opportunity-cost input
19. Unknown market or timing data remains unknown rather than silently zero
```

---

## 20. Source register

All links below were rechecked for this file on **2026-09-17**.

### Primary / maintained current mechanics

- Maintained community wiki — Vacuums:  
  https://hypixelskyblock.minecraft.wiki/w/Vacuums
- Maintained community wiki — InfiniVacuum Hooverius:  
  https://hypixelskyblock.minecraft.wiki/w/InfiniVacuum%E2%84%A2_Hooverius
- Maintained community wiki — Bookworm's Favorite Book:  
  https://hypixelskyblock.minecraft.wiki/w/Bookworm%27s_Favorite_Book
- Maintained community wiki — Bug Blender:  
  https://hypixelskyblock.minecraft.wiki/w/Bug_Blender
- Maintained community wiki — Beady Eyes:  
  https://hypixelskyblock.minecraft.wiki/w/Beady_Eyes
- Maintained community wiki — Clipped Wings:  
  https://hypixelskyblock.minecraft.wiki/w/Clipped_Wings
- Maintained community wiki — Gemstone Slot:  
  https://hypixelskyblock.minecraft.wiki/w/Gemstone_Slot
- Maintained community wiki — Chirping Stereo:  
  https://hypixelskyblock.minecraft.wiki/w/Chirping_Stereo
- Maintained community wiki — Pest:  
  https://hypixelskyblock.minecraft.wiki/w/Pest

### Official Hypixel patch verification

- Hypixel SkyBlock 0.27 — Vacuum damage rebalance and Bookworm damage increase:  
  https://hypixel.net/threads/hypixel-skyblock-0-27-torrhus-canyon-critter-safari.6132090/
- Official Hypixel patch notes/search evidence for Farming For Dummies Vacuum compatibility, 2025 update. Reverify the exact permanent forum URL if this compatibility changes before editing the rule.

### Secondary/live-market corroboration

- SkyCofl item/flip data was used only to corroborate live modified-item states such as Farming For Dummies count and the second Hooverius Peridot-slot unlock inputs. It must not be used as a timeless price constant:  
  https://sky.coflnet.com/

### Source-quality note

- `wiki.hypixel.net` is closed and must not be used as a current source.
- Fandom pages can be stale and must not override maintained/current sources.
- Market trackers are appropriate for timestamped price/state corroboration, not immutable mechanics.

---

## 21. Research maintenance trigger

Reverify this file after any patch touching:

- Pests or Pest drop formulas.
- Vacuum base damage/range/Farming Fortune.
- Bug Blender.
- Bookworm's Favorite Book.
- Farming For Dummies compatibility.
- Clipped Wings/Buzzing or Beady Eyes/Beady.
- Peridot gemstone values or Vacuum slots.
- Hooverius/Stereo Harmony/Vinyl weighting.
- Pest HP or Pest damage multipliers.
- Copper/SkyMart acquisition requirements.

When reverified, update `lastVerified`, affected rows, source notes, and calculation tests together.