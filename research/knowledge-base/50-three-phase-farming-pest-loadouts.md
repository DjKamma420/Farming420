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

### Ultra-min-max optional split

At the very top end, a third physical armor/equipment split can be modeled as a luxury optimization:

- Farming: full Mossy Helianthus + Rooted Farming equipment + Green Bandana Rose Dragon.
- Spawning: full Mantid Helianthus + Squeaky Pesthunter/Pest Vest + Brown Bandana Mosquito.
- Killing: 3/4 Mossy + 1/4 Mantid Helianthus + Thorny equipment + Poignant Lucky Clover Rose Dragon.

This layer is optional and must not be treated as the prerequisite for Pest farming or for the end-game two-set baseline.

## Timing rule for the Spawning phase

The BPC/cooldown loadout should not be assumed active for the full cooldown.

Current guides switch into the spawn loadout only when the effective Pest spawn cooldown is about to expire, then continue farming until the Pest spawn occurs. The app therefore needs to model the spawn set as a **short timed phase**, not as the gear worn throughout the whole waiting period.

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
