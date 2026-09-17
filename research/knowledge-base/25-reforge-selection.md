# 25 — Reforge Selection

As of: 2026-09-17
Status: ACTIVE for dedicated-page armor reforge stats; CONTEXTUAL for strategy guidance; VERIFY where explicitly stated
Primary reader: AI agents and the recommendation engine

This chapter defines **when to select each farming-relevant armor reforge**. It supplements `20-items-armor-equipment-tools.md`, whose item-local rules still apply.

The central rule is simple: there is no universal "best armor reforge" without an objective. Bustling, Mossy, and Mantid solve different problems, and one physical armor piece may have only one active reforge at a time.

## 1. Decision summary

| Reforge | Primary use | Why | Do not treat as |
| --- | --- | --- | --- |
| **Bustling** | budget/progression Farming Fortune | cheap, accessible direct Farming Fortune | endgame best-in-slot when Mossy is economically justified |
| **Mossy** | normal crop farming, crop profit, collection/contest output, Pest kill/loot phase | highest direct Farming Fortune of these three at every shared rarity, plus Speed | Pest-spawn reforge |
| **Mantid** | Pest spawning / Bonus Pest Chance optimization | trades direct Farming Fortune for Bonus Pest Chance and a conditional Pest-kill BPC bonus | normal crop-profit default or Pest-loot reforge |

These are recommendation contexts, not mutually exclusive account ownership. A player may own separate Mossy and Mantid armor sets, or legally mix reforges across pieces. The optimizer must evaluate the actual four physical pieces.

## 2. Bustling — budget Farming Fortune

Reforge stone: **SkyMart Brochure**.

Current dedicated-page requirements and values:

```text
Use requirement: Mining IX
Acquisition: 100 Copper from SkyMart

Host rarity   Farming Fortune   Reforge apply cost
Common        +1                1,000 coins
Uncommon      +2                2,000 coins
Rare          +4                3,000 coins
Epic          +6                6,000 coins
Legendary     +8                10,000 coins
Mythic        +10               15,000 coins
```

Selection rule:

- Use Bustling when the objective is normal Farming Fortune but the account should not yet pay the acquisition/opportunity cost of Mossy.
- Treat it as a progression/budget branch, not as a permanent endgame recommendation.
- Compare the **incremental** cost of replacing the player's current reforge with Mossy against the marginal coins/hour from the added Farming Fortune and Speed.
- Copper is an opportunity-cost resource. Do not model a SkyMart Brochure as literally free merely because its direct purchase currency is Copper rather than coins.

Source: https://hypixelskyblock.minecraft.wiki/w/SkyMart_Brochure
Last verified: 2026-09-17
Status: ACTIVE.

## 3. Mossy — normal farming / Fortune branch

Reforge stone: **Overgrown Grass**.

Current dedicated-page requirements and values:

```text
Use requirement: Mining XXIII

Host rarity   Speed   Farming Fortune   Reforge apply cost
Common        +3      +5                20,000 coins
Uncommon      +3      +10               40,000 coins
Rare          +5      +15               80,000 coins
Epic          +5      +20               150,000 coins
Legendary     +7      +25               300,000 coins
Mythic        +7      +30               600,000 coins
```

The dedicated page currently lists Overgrown Grass from Garden Visitor offers, Greenhouse Harvest Bounties, and DNA Analysis progression. Acquisition value is market/time sensitive and must come from the live price/acquisition model rather than a static research price.

Selection rule:

Use Mossy when the active phase values direct Farming Fortune: normal crop farming, crop-profit farming, collection/milestone output, most crop contest output, and the Pest kill/loot/vacuum phase when the player has finished the Pest-spawn phase.

Among Bustling, Mossy, and Mantid, Mossy gives the most direct Farming Fortune at every shared rarity. At Mythic rarity on one piece:

```text
Mossy     +30 FF, +7 Speed
Bustling  +10 FF
Mantid    +12 FF, +2.5 BPC before its conditional Mantid Bonus
```

Therefore, before the conditional Mantid bonus is considered, replacing one Mythic Mossy piece with Mythic Mantid costs **18 Farming Fortune and 7 Speed** and gains **2.5 static Bonus Pest Chance**. Replacing Mythic Bustling with Mythic Mossy gains **20 Farming Fortune and 7 Speed**.

Do not translate Speed directly into coins/hour. Speed only matters through the farm's real valid-break throughput and crop-specific speed cap/geometry.

Source: https://hypixelskyblock.minecraft.wiki/w/Overgrown_Grass
Last verified: 2026-09-17
Status: ACTIVE.

## 4. Mantid — Pest-spawn / Bonus Pest Chance branch

Reforge stone: **Mantid Claw**.

Current dedicated-page requirements and values:

```text
Use requirement: Mining XXII

Host rarity   Farming Fortune   Bonus Pest Chance   Reforge apply cost
Common        +2                +0.5                7,500 coins
Uncommon      +4                +0.5                15,000 coins
Rare          +6                +1.0                30,000 coins
Epic          +8                +1.5                75,000 coins
Legendary     +10               +2.0                150,000 coins
Mythic        +12               +2.5                150,000 coins
```

The Mantid reforge also has the current tooltip bonus:

```text
Mantid Bonus:
+0.25 Bonus Pest Chance per Pest killed for 10 minutes
cap: +5 Bonus Pest Chance
```

The maintained dedicated page defines that conditional bonus, but the public source used here does **not** establish how multiple identical Mantid Bonus effects stack across several equipped Mantid pieces. Do not silently multiply the +5 cap by four. Keep multi-piece bonus stacking as `VERIFY` until live behavior or an explicit current source confirms it.

Selection rule:

- Use Mantid when the active objective is **spawning Pests**, not maximizing normal crop drops during the same seconds.
- A dedicated Mantid set is a phase-specific optimization: equip it while generating Pest spawns, then switch to the Fortune-oriented loadout for the Pest kill/loot phase when the strategy permits.
- A mixed Mossy/Mantid four-piece state is legal in the model and can be optimal. Enumerate actual piece combinations instead of forcing an all-or-nothing full-set flag.
- Do not convert Bonus Pest Chance to Farming Fortune. Evaluate its effect through the Pest spawn pipeline and the resulting expected Pest value/time.

Source: https://hypixelskyblock.minecraft.wiki/w/Mantid_Claw
Last verified: 2026-09-17
Status: ACTIVE for rarity stats and the per-reforge conditional tooltip; VERIFY multi-piece Mantid Bonus stacking.

## 5. Pest-farming strategy evidence

The Elite Farmers / Elite SkyBlock Pest guide, updated after the 0.24 Pest/Farming changes that introduced Mantid, describes the practical split as:

- primary Helianthus farming set: Mossy;
- optional second Helianthus set: Mantid for Pest spawning;
- use normal Farming gear while vacuuming/killing Pests for most drop-oriented farming contexts;
- a second Mantid set is a marginal specialist optimization and is not economically justified for every player.

This is **strategy evidence**, not a game-mechanic source. Do not hard-code the guide's example economics or a timeless hours-to-payback threshold. Prices, Pest value, progression, and the player's measured rates change.

Source: https://wiki.eliteskyblock.com/Introduction_to_Pest_Farming
Guide last updated: 2025-12-28
Last verified against source: 2026-09-17
Status: SPECIALIST-STRATEGY.

## 6. No universal Mossy ↔ Mantid breakpoint

Do **not** implement a rule such as:

```text
if BonusPestChance >= X then Mossy else Mantid
```

No current source establishes a universal `X`, and the correct economic choice depends on the full state:

```text
objective
crop
valid crop breaks / second
current Farming Fortune
current Bonus Pest Chance
Pest spawn cooldown/state
Pest spawn distribution/rounding
Pest value and eligible loot pool
Overbloom / Pest Overbloom
time spent spawning vs vacuuming
armor rarity and per-piece reforges
reforge acquisition + application cost
switching friction
```

The recommendation engine must compare complete legal states by marginal expected coins/hour or the user's selected non-profit objective.

Conceptually:

```text
value(candidateArmorState, context)
= normalCropEV(candidateArmorState, context)
+ pestSpawnEV(candidateArmorState, context)
+ pestLootEV(candidateArmorState, context)
- switchingAndInterruptionCost(candidateArmorState, context)

upgradeDelta
= value(candidate legal state) - value(current legal state)
```

Until Pest spawn EV is sufficiently verified, label Mossy↔Mantid recommendations as context-driven rather than inventing a numerical breakpoint.

## 7. Recommendation-engine mapping

Use these tags in the research/data layer:

```text
BUSTLING:
  objectiveTags = [budget_farming_fortune, progression]
  preferredPhases = [normal_crop]

MOSSY:
  objectiveTags = [normal_crop_profit, farming_fortune, collection, crop_milestone, crop_contest, pest_loot]
  preferredPhases = [normal_crop, pest_kill, pest_loot]

MANTID:
  objectiveTags = [bonus_pest_chance, pest_spawn]
  preferredPhases = [pest_spawn]
```

Defaults for Farming420's two user-facing armor setups:

```text
farmSet recommendation baseline -> Mossy
pestSet spawn-phase recommendation baseline -> Mantid
pestSet kill/loot evaluation -> compare switching back to Mossy/farmSet
budget farmSet fallback -> Bustling
```

These are recommendation baselines, not forced state. The user must still be able to select the reforge they actually own, including a non-recommended or mixed setup.

## 8. Per-piece and rarity rules

Never store armor reforge state as one full-set boolean.

Correct:

```text
armorPiece.reforge = bustling | mossy | mantid | other | none
armorPiece.rarity = actual host rarity
armorPiece.reforgeStats = table[reforge][rarity]
```

A Recombobulator can change the host rarity and therefore the rarity-scaled reforge contribution. Evaluate the actual post-Recomb rarity on each piece.

For four Mythic pieces, static reforge-only totals are:

```text
4x Bustling = +40 Farming Fortune
4x Mossy    = +120 Farming Fortune, +28 Speed
4x Mantid   = +48 Farming Fortune, +10 static Bonus Pest Chance
```

The conditional Mantid Bonus is intentionally excluded from the last line until multi-piece stacking is verified.

Mixed reforges must sum piece by piece.

## 9. Cost handling

For reforge replacement, track at least:

```text
stone acquisition cost / opportunity cost
coin application cost for the host rarity
lost value of the old reforge
resale implications if relevant
time cost if the stone is self-obtained
```

Do not save a static Auction/Bazaar price in this chapter. Use the live price service or a user-supplied price at recommendation time.

## 10. Source and staleness rule

The exact armor reforge stat tables in this chapter come from the maintained community wiki's **dedicated item pages**, not the broad Farming Fortune index. The repository's Farming history has no later recorded armor-reforge change after Mantid's 0.24-era introduction, but this does not make the tables timeless. Reverify after any Farming/Pest/reforge patch.

Mechanics sources:
- https://hypixelskyblock.minecraft.wiki/w/SkyMart_Brochure
- https://hypixelskyblock.minecraft.wiki/w/Overgrown_Grass
- https://hypixelskyblock.minecraft.wiki/w/Mantid_Claw

Strategy source:
- https://wiki.eliteskyblock.com/Introduction_to_Pest_Farming

Last verified: 2026-09-17
