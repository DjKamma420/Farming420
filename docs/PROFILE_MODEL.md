# Normalized Profile Model

Farming420 must not let raw Hypixel field names leak through the recommendation and profit engines. All upstream sources should be normalized into one stable internal model first.

Current implementation:

- `src/hypixel-import.js` — raw profile/Garden adapters
- `src/nbt.js` — dependency-free Base64 + gzip + NBT inventory decoder
- `src/item-normalizer.js` — source-neutral item facts
- `src/profile-items.js` — profile inventory/loadout extraction
- `src/profile-normalizer.js` — stable profile/Garden model
- `src/profile-sync.js` — persistence and merging

Last verification pass: **2026-09-15**.

## Why this exists

Raw Hypixel payloads are source-specific and can be partial depending on endpoint, profile type and player API settings. Farming420 therefore separates:

1. raw payload parsing
2. NBT decoding and item normalization
3. normalized profile modelling
4. persistent user state
5. future calculation and recommendation engines

The calculation engine should consume the normalized model, never reach directly into raw API JSON or raw NBT.

## Status vocabulary

The normalized model uses the same provenance statuses as `docs/PROFILE_DATA_MATRIX.md`:

- `AUTO`: copied from a verified API field
- `DERIVED`: calculated deterministically from verified API fields and a sourced table/formula
- `AUTO_CANDIDATE`: likely exposed, but path/semantics are not verified enough for production logic
- `MANUAL`: cannot be derived reliably
- `EXTERNAL`: comes from another data source
- `HIDDEN`: data is expected but unavailable because an API setting/source is unavailable
- `UNKNOWN`: the parser/model cannot currently interpret it

Unknown data must remain unknown. It must never silently become zero, false, unequipped or unowned.

## Current normalized shape

```js
{
  modelVersion: 1,
  identity: {
    playerUuid,
    playerName,
    profileId,
    profileName,
    gameMode,
    selected
  },
  sync: {
    sources: {},
    warnings: []
  },
  skills: {
    farming: {
      xp,
      level,
      cap,
      status
    }
  },
  garden: {
    experience,
    level,
    unlockedPlotIds: [],
    unlockedPlotCount,
    cropUpgrades: {},
    resourcesCollected,
    visitors: {
      visits,
      completed,
      totalCompleted,
      uniqueNpcsServed
    },
    composter,
    activeCommissions
  },
  accountUpgrades: [],
  pets: [],
  items: [],
  buffs: {},
  unknown: [],
  provenance: {}
}
```

The model is intentionally broader than the currently implemented parsers. Empty fields are placeholders for future verified adapters; they are not inferred.

## Implemented profile normalization

From raw `/v2/skyblock/profile` or `/v2/skyblock/profiles` JSON, the current normalizer can preserve:

- player/member UUID
- profile ID
- profile cute name
- selected-profile flag when present
- game mode when present
- Farming Skill XP
- Farming Skill level after loading the official skill resource table
- Community Upgrade state IDs/tier/start/claim timestamps
- current `pets_data.pets` entries: UUID, type, rarity, XP, active state, held item, candy count and skin
- the older direct `pets` array for compatibility with older recorded payloads

Missing pet API data is `HIDDEN`, not an empty owned-pet list. A later import that hides pet data therefore does not erase last-known pets.

The normalizer deliberately does **not** retain the `fasttracked` Community Upgrade field. Farming420 does not need monetization-derived information to recommend farming progression.

## Implemented Garden normalization

From raw `/v2/skyblock/garden` JSON:

- Garden XP
- unique unlocked plot IDs and plot count
- per-crop upgrade levels
- resources collected
- visitor visit/completion metadata
- unique NPCs served
- composter data
- active commissions
- unknown future crop keys, retained as explicit unknown records instead of guessed mappings

Garden level is not yet derived because its current authoritative level table still needs a dedicated verification task.

## Automatic item and enchantment import

Hypixel inventory fields are Base64-encoded, gzip-compressed NBT. Farming420 now decodes that format directly in the browser without a third-party runtime dependency.

Currently decoded profile containers include, when exposed by the selected member payload:

- main inventory
- equipped armor
- equipped equipment
- Ender Chest
- Personal Vault
- backpacks
- talisman bag
- saved armor loadout sets
- saved equipment loadout sets

Each decoded item is normalized into raw facts such as:

- SkyBlock item ID and item UUID
- source container and slot
- display name
- reforge (`modifier`)
- the complete `enchantments` map — unknown/future enchantment names are preserved
- gemstones
- attributes
- Farming for Dummies count
- recombobulation state
- Cultivating counter
- Overclocker level
- item tier
- raw pet info when present

This layer intentionally does **not** convert those fields into Farming Fortune, profit or upgrade recommendations. Mechanical effects remain in the separately sourced game-data layer.

If the same physical item UUID appears in multiple representations, it is stored once and all observed `locations` are retained. If inventory API data is hidden, the item collection is marked `HIDDEN` and previous last-known items are retained as stale rather than replaced with an empty list.

## Persistent normalized snapshot

Schema 3 stores one `profile.normalizedSnapshot` in the local application state. Profile and Garden imports merge into that snapshot using source provenance:

- a Garden import may update Garden fields but cannot clear identity or skills
- hidden/unknown pet and item collections cannot erase last-known collections
- unknown crop/API fields are retained explicitly
- raw Hypixel payloads and raw NBT are not persisted in the snapshot

This gives the future profit engine one stable source-neutral input model.

## Sources verified for the adapter layer

### Official Hypixel API

- `https://api.hypixel.net/v2/skyblock/profile`
- `https://api.hypixel.net/v2/skyblock/profiles`
- `https://api.hypixel.net/v2/skyblock/garden`
- `https://api.hypixel.net/v2/resources/skyblock/skills`

These endpoints and their roles were re-checked on 2026-09-15. Hypixel's API documentation also documents SkyBlock inventory item data as Base64-encoded gzipped NBT.

### Hypixel PublicAPI repository

`HypixelDev/PublicAPI` currently exposes SDK methods for SkyBlock profile, profiles and Garden endpoints. PublicAPI issue #674 also provides a concrete current example of the `community_upgrades.upgrade_states` profile structure.

### SkyCrypt implementation cross-check

Current SkyCrypt code is used only as an implementation cross-check, not as authority for Farming420 game mechanics. Its current backend/type definitions confirm:

- Farming XP under the member player-data experience structure
- pets under `pets_data.pets`
- inventory containers such as `inv_contents`, `inv_armor`, `equipment_contents`, Ender Chest, Personal Vault and backpacks
- Base64 -> gzip -> NBT decoding
- generic item `ExtraAttributes` such as `id`, `enchantments`, `modifier`, `gems`, `farming_for_dummies_count`, `farmed_cultivating` and `levelable_overclocks`

## Next adapter tasks

1. Add a Garden-level resource/table adapter once verified.
2. Map exact farming-related Community Upgrade IDs.
3. Expand accessory/container coverage only where current payload fields are verified.
4. Convert normalized items and pets into **candidate farming setups** without stacking mutually exclusive equipment or pets.
5. Add the server-side proxy so the same normalizer can consume live API payloads.
6. Attach market-value sources to normalized item IDs without mixing price data into the raw item decoder.

No recommendation engine should depend on a field until its normalized value and provenance are covered by tests.
