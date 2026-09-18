# Three-phase Farming / Pest loadout model

Verified: 2026-09-18

## Decision

The app must not model Pest gameplay as one generic "Pest Set".

Current high-end Farming/Pest play uses three mechanically different phases:

1. **Farming** — maximize ordinary crop Farming Fortune / crop output.
2. **Pest Spawning** — farm crops while maximizing Bonus Pest Chance and reducing Pest spawn cooldown.
3. **Pest Killing** — switch to the Vacuum and optimize Pest-drop Farming Fortune plus Overbloom/rare Pest drops.

These phases are mutually exclusive loadouts. Their armor, equipment, pet and pet item must therefore be stored separately.

## Evidence hierarchy

### Official mechanics

Hypixel SkyBlock 0.26.1 confirms that **Thorny** is an Equipment reforge that grants both Farming Fortune and Overbloom, with an additional Thorny bonus based on Thorns tiers on worn armor. The same update increased Lucky Clover / Poignant Lucky Clover to +7 / +13 Overbloom.

Source:
- https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/

The 0.26.1 release-candidate notes describe the same Thorny/Overbloom mechanics and the Poignant Lucky Clover change.

Source:
- https://hypixel.net/threads/july-15-0-26-1-release-candidate.6114430/

### Current community meta

A September 1, 2026 Hypixel forum discussion explicitly describes three min-max loadouts: normal farming, pure spawning/cooldown+BPC, and a newer Overbloom-focused Pest-killing set. One concrete example given there is:

- Farming: Mossy Helianthus + Blossom equipment + Green Bandana Rose Dragon.
- Spawning: Mantid Helianthus + Pest Vest/Pesthunter equipment + Brown Bandana Mosquito.
- Killing: farming-style set with one Mantid piece retained and Poignant Lucky Clover; discussion also identifies the third set as the Overbloom-killing setup.

Source:
- https://hypixel.net/threads/why-do-you-need-2-sets-for-pest-farming.6148221/

This is a **min-max reference**, not a requirement for every player. The same thread notes that one/two-set compromises can be reasonable when the extra gear cost does not pay back.

Other current forum descriptions of Pest spawning consistently separate:
- Mantid/BPC armor,
- Squeaky Pesthunter/Pest Vest equipment,
- Mosquito/Slug + Brown Bandana,
from the gear used after the Pests have spawned.

Sources:
- https://hypixel.net/threads/biohazard-armor-buff-to-encourage-people-to-buy-a-pest-spawning-loadout.6117110/
- https://hypixel.net/threads/pest-farming-not-being-as-good-as-people-keep-telling-me.6077065/

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

## State compatibility

The previous app used:
- `normal` = Farming
- `pest` = generic Pest

Migration rule:
- keep `normal` as Farming,
- reinterpret existing `pest` as Pest Spawning so existing user gear is preserved,
- add `pest-kill` as a new empty Pest Killing loadout,
- preserve old/custom setups in stored data instead of deleting them.

The visible activity switch exposes only the three calculation phases: **Farm / Spawn / Kill**.

## Reference loadout, not hard-coded recommendation

For UI hints or future recommendation logic, the current high-end reference is approximately:

| Phase | Armor | Equipment | Pet / item | Primary objective |
| --- | --- | --- | --- | --- |
| Farming | Mossy Helianthus | Rooted/Blossom-style Farming equipment | Rose Dragon + Green Bandana | crop Farming Fortune/output |
| Spawning | Mantid Helianthus | Squeaky Pesthunter + Pest Vest | Mosquito + Brown Bandana | BPC + Pest cooldown |
| Killing | 3/4 Mossy + 1 Mantid Helianthus | Thorny Blossom/Zorro-style equipment | Rose Dragon + Poignant Lucky Clover | Pest loot + Overbloom |

Do not automatically equip these. The app records what the player actually has and uses the reference only for upgrade comparisons/recommendation context.
