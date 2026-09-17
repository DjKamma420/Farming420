# Farming profile autodetection contract — 2026-09-17

Runtime implementation: `src/profile-farming-autodetect.js`.

## Purpose

The profile importer already decodes raw Hypixel profile/Garden payloads and item NBT. This layer derives a Farming-specific view without collapsing different kinds of truth into one checkbox.

The derived view separates:

1. **Account progression** — Farming skill and Garden progression.
2. **Physical ownership** — concrete armor, equipment, crop tools, vacuums, pets and physical Garden Chip items.
3. **Currently active state** — equipped armor/equipment and the API-marked active pet.
4. **Unobserved state** — redeemed Garden Chip levels, Farming Shards and temporary buffs when no verified current API field exists.

## Physical item detection

The detector reuses the app's existing canonical sources rather than duplicating IDs:

- exact crop-tool chains from `src/exact-farming-items.js`;
- exact five Garden Vacuum IDs from `src/exact-farming-items.js`;
- Farming armor/equipment recognition from `src/item-catalog.js`;
- Garden Chip item IDs from `src/farming-modifiers-data.js`.

Decoded NBT model data such as `skullTexture` is preserved in the derived item view so profile-owned player-head models remain usable by the art pipeline.

## Active gear

`inventory.inv_armor` is normalized as container `armor` and `inventory.equipment_contents` as container `equipment`. Those concrete locations are used to identify currently equipped pieces. Loadout copies remain ownership locations and do not independently imply active use.

Pet activity is accepted only from the normalized API `active` boolean:

- exactly one `active=true` -> `AUTO` active pet;
- all pets explicitly `active=false` -> known no active pet;
- missing activity booleans -> `UNKNOWN`;
- multiple active pets -> `UNKNOWN` conflict;
- hidden pet API -> `HIDDEN`.

## Setup assignment rule

Autodetection must not overwrite the user's strategy/setup choice.

- crop tools have automatic `farming` affinity;
- Garden Vacuums have automatic `pest` affinity;
- armor remains `manual-context` between Farming and Pest setups;
- equipment remains `manual-context`;
- pets remain `manual-context`.

This matches the calculator contract: normal Fortune calculations default to the Farming setup, while Pest-only stats belong to the Pest setup only when that setup is selected.

## Garden Chips

A Garden Chip item in inventory is only a **physical item**. It does not prove that the player redeemed that chip on the Garden profile.

As of this research pass, a current, sufficiently documented Garden API field for redeemed chip rarity/level was not found. Therefore:

- physical chip items are auto-detected;
- redeemed chip levels remain `UNKNOWN`;
- no physical chip is converted into an account stat;
- missing account-chip data is never interpreted as level 0.

When a verified API field becomes available, add a source-specific adapter and provenance rather than changing the physical-item rule.

## Farming Shards and temporary buffs

The same conservative rule applies to active Farming Shards and short-lived effects such as Crop Fever or Pesthunter Phillip. Without a verified observable source, their active state stays `UNKNOWN` and must be supplied by a live observable source or manually.

## Hidden/stale API data

The existing normalized snapshot deliberately preserves last-known items when the inventory API later becomes hidden. The Farming detector therefore carries the source status (`AUTO`, `HIDDEN`, `UNKNOWN`, etc.) alongside derived physical candidates. A stale item may remain visible to the user, but it must not be described as freshly verified ownership.

## Calculator integration

Future calculator/UI consumers should call `detectFarmingProfile(snapshot)` instead of independently scanning profile arrays. The result contains `account`, `physical`, `active`, `setupHints`, `sourceStatus`, and explicit invariant `rules`.
