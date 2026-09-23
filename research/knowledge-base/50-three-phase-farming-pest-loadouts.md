# Three-phase Farming / Pest loadout model

Verified: 2026-09-21

## Decision

The app must model **three logical Pest-farming phases** but must not assume that all three phases require three different physical armor sets.

The phases are:

1. **Farming** — maximize normal crop output/Farming Fortune while the Pest spawn cooldown is running.
2. **Spawning** — shortly before Pests can spawn, switch to the Bonus Pest Chance / cooldown loadout and continue breaking crops until the spawn occurs.
3. **Killing** — after the spawn, switch away from the spawning loadout and kill/vacuum the Pests with the Pest-loot setup.

Phase count, armor-set count, equipment-set count, and pet count are separate concepts. The data model must preserve that distinction.

## Evidence hierarchy

### Official mechanics

Hypixel SkyBlock 0.26.1 confirms that **Thorny** is an Equipment reforge that grants Farming Fortune and Overbloom, with extra Overbloom from Thorns tiers on worn armor. The same update changed Lucky Clover / Poignant Lucky Clover to stronger Overbloom values.

Sources:
- https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/
- https://hypixel.net/threads/july-15-0-26-1-release-candidate.6114430/

### Current specialist progression guide

The continuously updated Elite SkyBlock Pest Farming guide explicitly separates Farming, Spawning, and Killing. It also documents the practical progression from two physical armor sets into an optional third ultra-min-max set:

- The normal Farming/Killing armor is **3/4 Mossy + 1/4 Mantid**.
- The dedicated Spawning armor is **full Mantid**.
- The Spawning equipment is Pesthunter/Pest Vest with **Squeaky** and uses a Mosquito/Slug-style BPC pet.
- Before Rose Dragon, Farming and Killing can reuse the same main armor while using different pets.
- At Farming 40 progression, Hedgehog is moved from Green Bandana to Poignant Clover for the killing role.
- At Farming 50, the guide explicitly says two armor sets are used: 3/4 Mossy + 1/4 Mantid for **Farming and Killing**, and full Mantid only for **Spawning**.
- At Farming 60, Rose Dragon with Green Bandana becomes the Farming pet.
- In the later >5000-hour progression section, a **second level-200 Rose Dragon with Poignant Clover** is specified only for killing Pests while the Green Bandana Rose Dragon remains for Farming.
- The guide later adds a third physical armor set as an extreme min-max layer: full Mossy for Farming, full Mantid for Spawning, and 3/4 Mossy + 1/4 Mantid for Killing.

Source:
- https://eliteskyblock.com/guides/eAb9M5

### September 2026 community corroboration

A September 1, 2026 Hypixel forum discussion describes the same hierarchy:

- set 1: Farming Fortune / normal Farming,
- set 2: pure Pest cooldown + BPC,
- optional set 3: a more expensive Overbloom-focused Pest-killing split.

The thread explicitly calls the third physical set a newer, expensive min-max step rather than a prerequisite for ordinary Pest farming.

Source:
- https://hypixel.net/threads/why-do-you-need-2-sets-for-pest-farming.6148221/

## Progression model

### Mid-game / pre-Rose-Dragon practical model

Model three logical loadouts, normally backed by **two physical armor sets** and multiple pet roles.

| Phase | Armor | Equipment | Pet / item | Objective |
| --- | --- | --- | --- | --- |
| Farming | 3/4 Mossy + 1/4 Mantid Helianthus (or current progression equivalent) | Rooted/Blossom-style Fortune equipment | Fortune farming pet, normally Green Bandana | crop Farming Fortune/output |
| Spawning | Full Mantid Helianthus | Squeaky Pesthunter + Pest Vest | Mosquito/Slug + Brown Bandana | BPC + shortest practical spawn cooldown |
| Killing | Reuse the Farming armor | Fortune/kill equipment available at that stage | Hedgehog or other Pest-killing pet; Poignant Clover when appropriate | Pest kill/vacuum return |

Important: "three sets" in the UI may mean three **phase loadouts**, not three duplicate armor wardrobes. Farming and Killing may point to the same physical armor pieces while selecting different pets.

### End-game two-armor-set baseline

Rose Dragon collapses the Farming/Killing **pet species** distinction, but not necessarily the pet-item distinction.

Keep two physical armor sets as the normal end-game baseline:

1. **Farming/Killing armor:** 3/4 Mossy + 1/4 Mantid Helianthus.
2. **Spawning armor:** full Mantid Helianthus.

The three phases still exist:

- **Farming:** Rose Dragon + Green Bandana.
- **Spawning:** Mosquito + Brown Bandana with full Mantid/Squeaky cooldown+BPC gear.
- **Killing:** Rose Dragon again.

For a fully developed account, Killing should be able to reference a **second Rose Dragon** carrying **Poignant Lucky Clover**, because pet items are fixed to the pet and Green Bandana remains better for the normal Farming phase. Do not model this as an impossible mid-phase pet-item swap on one physical pet.

The Rose Dragon itself is now modeled as profile-dependent rather than as a flat
planner gain. At pet level 200 it contributes 40 base Farming Fortune, +3
Farming Fortune per Farming level, +0.15 Farming Fortune per total Crop
Milestone, and +40 Overbloom. Symbiosis activates only at level 200 and adds +3
Farming Fortune for each **other unique maxed Farming Pet**; duplicate species
and other Rose Dragons do not add extra Symbiosis stacks. Between levels 100
and 200 the four level-scaled terms interpolate exactly at +0.2 base FF,
+0.015 FF/Farming-level coefficient, +0.00075 FF/Crop-Milestone coefficient,
and +0.2 Overbloom per pet level.

The Garden API exposes cumulative `resources_collected`, so total Crop
Milestones are derived from the current threshold tables rather than manually
entered. There are currently 13 Garden crops × 46 milestones = 598 maximum.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Rose_Dragon_Pet
- https://api.hypixel.net/v2/skyblock/garden
- https://github.com/Vyriv/BetterPV/blob/master/src/main/resources/assets/betterpv/data/garden.json
Last verified: 2026-09-23.

### Ultra-min-max optional split

At the very top end, a third physical armor/equipment split can be modeled as a luxury optimization:

- Farming: full Mossy Helianthus + Rooted Farming equipment + Green Bandana Rose Dragon.
- Spawning: full Mantid Helianthus + Squeaky Pesthunter/Pest Vest + Brown Bandana Mosquito.
- Killing: 3/4 Mossy + 1/4 Mantid Helianthus + Thorny equipment + Poignant Lucky Clover Rose Dragon.

This layer is optional and must not be treated as the prerequisite for Pest farming or for the end-game two-set baseline.

## Timing rule for the Spawning phase

The BPC/cooldown loadout should not be assumed active for the full cooldown.

Current guides switch into the spawn loadout only when the effective Pest spawn cooldown is about to expire, then continue farming until the Pest spawn occurs. The app therefore needs to model the spawn set as a **short timed phase**, not as the gear worn throughout the whole waiting period.

### Verified Mantid / Squeaky spawning math

The setup evaluator now scores these item-local mechanics directly from the
physical armor/equipment pieces instead of using one global manual value.

**Mantid** and **Squeaky** share the same rarity-scaled base table:

| Effective rarity | Farming Fortune | Bonus Pest Chance |
| --- | ---: | ---: |
| Common | 2 | 0.5 |
| Uncommon | 4 | 0.5 |
| Rare | 6 | 1 |
| Epic | 8 | 1.5 |
| Legendary | 10 | 2 |
| Mythic | 12 | 2.5 |

Recombobulation therefore matters because the reforge value follows effective
rarity. Mantid additionally grants +0.25 BPC per Pest killed in the previous
10 minutes, capped at +5 BPC **per Mantid piece**. The profile API does not
expose this rolling kill window, so that one term stays unknown unless runtime
context supplies the recent kill count.

Squeaky additionally reduces Pest spawn cooldown by 2.5% per reforged equipment
piece. Pesthunter equipment cooldown reductions are additive: +10% for each
Pesthunter Necklace/Cloak/Belt/Gloves, while Pest Vest is +15%. Their base BPC
is +5 per Pesthunter piece and +10 from Pest Vest. A typical 3/4 Pesthunter +
Pest Vest layout therefore gives +25 base BPC and 45% cooldown reduction before
Squeaky; four Squeaky reforges add another 10 percentage points.

Helianthus contributes +20 BPC per armor piece (+80 full set). Current
Pesterminator VI contributes +12 Farming Fortune and +6 BPC per piece, so the
existing Fortune calculation and the spawning BPC calculation both derive from
the actual per-piece enchant levels.

Pesthunter's Eradicator tiered bonus is kill-phase Pest Fortune only:
0/50/75/100 FF while vacuuming Pests at 1/2/3/4 Pesthunter pieces. Pest Vest
does not count as a fourth Pesthunter piece for that tier.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Mantid_Claw
- https://hypixelskyblock.minecraft.wiki/w/Squeaky_Toy
- https://hypixelskyblock.minecraft.wiki/w/Pesthunter%27s_Set
- https://hypixelskyblock.minecraft.wiki/w/Pest_Vest
- https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor
- https://eliteskyblock.com/articles/news-pesthunters-wares-update
Last verified: 2026-09-23.

This matters for profit calculations: applying the lower-Fortune spawn gear for the entire cooldown would materially understate crop output.

## Calculator rules

### Farming mode

Use:
- crop farming tool,
- Farming loadout armor/equipment/pet/pet item,
- ordinary global/crop Farming Fortune,
- globally applicable Overbloom only where the target mechanic actually uses Overbloom.

Exclude:
- Vacuum-only Farming Fortune,
- Pest Vacuum Drops effects,
- spawn-only Bonus Pest Chance / Pest Cooldown effects.

### Pest Spawning mode

Use:
- crop farming tool, because this phase still occurs while breaking crops,
- Spawning loadout armor/equipment/pet/pet item,
- general Farming effects that still apply while farming,
- Bonus Pest Chance,
- Pest Cooldown / spawn effects.

Exclude:
- Vacuum-only effects,
- Pest-drop-only Farming Fortune,
- Pest-killing-only Overbloom sources.

### Pest Killing mode

Use:
- Vacuum instead of crop farming tool,
- Killing loadout armor/equipment/pet/pet item,
- Pest/Vacuum Farming Fortune,
- Pest-drop Overbloom and rare-drop modifiers.

Exclude:
- crop-tool-only effects,
- spawn-only Bonus Pest Chance,
- spawn-cooldown-only effects.

The Pest drop Fortune path keeps its separate scaling model; it must not be valued like ordinary crop Fortune.

## Data-model rules

The optimizer should represent:

- three phase loadouts: `farming`, `pest-spawn`, `pest-kill`,
- references from each phase to physical armor/equipment/pet objects,
- intentional reuse of the same physical armor/equipment across multiple phases,
- multiple copies of the same pet species with different pet items,
- a progression tier that distinguishes the two-armor baseline from the optional three-armor min-max layer.

Never infer that a player owns duplicate armor simply because Farming and Killing are separate phases.

## State compatibility

The previous app used:
- `normal` = Farming
- `pest` = generic Pest

Migration rule:
- keep `normal` as Farming,
- reinterpret existing `pest` as Pest Spawning so existing user gear is preserved,
- add `pest-kill` as a new Pest Killing loadout,
- preserve old/custom setups in stored data instead of deleting them.

The visible activity switch exposes the three calculation phases with full labels: **Farming / Spawning / Killing**.


## Setup-local pet item implementation — 2026-09-23

The calculator now treats pet items as part of one physical active pet setup, not
as account-global toggles.

Verified setup-local rules implemented:

- Green Bandana: +4 Farming Fortune per Garden Level, capped at +60 at Garden 15.
  Garden Level is derived from `garden_experience` through the current
  cumulative level thresholds.
- Poignant Lucky Clover: +13 Overbloom.
- Brown Bandana: +0.2 Bonus Pest Chance per eligible Pest Bestiary tier, capped
  at +45. It is applied only in the Pest Spawning phase.

Brown Bandana reads the eligible tier sum from the normalized profile
Bestiary when `member.bestiary.kills` is available. The current eligible set is
15 Pest families: 13 use Bestiary bracket 6, while Field Mouse and Lunar Moth
use bracket 7; every family caps at tier 15, for a maximum eligible tier sum of
225 and therefore +45 BPC. Timestalk Clone and Zombuddy are deliberately
excluded. Missing or explicitly unmigrated Bestiary data remains unknown rather
than becoming zero.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Pest
- https://hypixelskyblock.minecraft.wiki/w/Brown_Bandana
- current individual Pest pages for bracket/tier thresholds
Rose Dragon profile entries commonly expose XP rather than a ready-made level. The
current NEU pet constants define Rose Dragon as a level-200 custom pet: the
normal rarity-offset pet curve applies through level 100 and every level from
100 to 200 costs 1,886,700 XP. Farming420 therefore derives the Rose Dragon
level directly from live profile XP and does not require a manual level field.

XP source:
- https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/blob/master/constants/pets.json
Last verified: 2026-09-23.

### Verified Mosquito / Slug spawning pet math

**Mosquito** provides +0.5 Bonus Pest Chance per pet level at every rarity,
therefore +50 BPC at level 100. Smooth Jazz scales by rarity: Common/Uncommon
+0.25% Pest Vinyl effectiveness per level, Rare +0.35%/level, and
Epic/Legendary +0.5%/level. Rare+ also has Buzzin' Barterer for Sugar Cane:
Rare gains +0.01 Sugar Cane Fortune per unique Garden visitor per pet level,
while Epic/Legendary gain +0.02 per visitor per level, capped at +175 Sugar
Cane Fortune. The visitor count comes from normalized Garden profile data; it
is never manually guessed.

**Slug** provides +0.4 Bonus Pest Chance per level at both Epic and Legendary,
therefore +40 BPC at level 100. Legendary additionally has Repugnant Aroma:
+1 Farming Fortune per pet level while farming in a plot affected by a
Sprayonator, for +100 at level 100 before any separate Hypercharge
amplification. Because the profile API does not expose whether the current
plot is presently sprayed, that conditional Fortune remains unknown unless the
runtime context explicitly says the Sprayonator effect is active or inactive.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Mosquito_Pet
- https://hypixelskyblock.minecraft.wiki/w/Slug_Pet
Last verified: 2026-09-23.

The common computed-stat path now ignores the legacy Green/Poignant planner
toggles as direct stats. Their values are derived only from the pet item attached
to the active setup, so two different Rose Dragons with Green Bandana and
Poignant Lucky Clover can be represented without impossible simultaneous
stacking.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Garden_Level
- https://hypixelskyblock.minecraft.wiki/w/Green_Bandana
- https://hypixelskyblock.minecraft.wiki/w/Poignant_Lucky_Clover
- https://hypixelskyblock.minecraft.wiki/w/Brown_Bandana
