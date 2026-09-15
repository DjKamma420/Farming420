# Normalized Profile Model

Farming420 must not let raw Hypixel field names leak through the recommendation and profit engines. All upstream sources should be normalized into one stable internal model first.

Current implementation: `src/profile-normalizer.js`.

Last verification pass: **2026-09-15**.

## Why this exists

Raw Hypixel payloads are source-specific and can be partial depending on endpoint, profile type and player API settings. Farming420 therefore separates:

1. raw payload parsing (`src/hypixel-import.js`)
2. normalized profile modelling (`src/profile-normalizer.js`)
3. persistent user state
4. future calculation and recommendation engines

The calculation engine should consume the normalized model, never reach directly into raw API JSON.

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
- Farming Skill level when the official skill resource table is supplied
- Community Upgrade state IDs/tier/start/claim timestamps
- pet UUID/type/rarity/XP/active state/held item/candy count/skin when those fields are present

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

## Sources verified for the adapter layer

### Official Hypixel API

- `https://api.hypixel.net/v2/skyblock/profile`
- `https://api.hypixel.net/v2/skyblock/profiles`
- `https://api.hypixel.net/v2/skyblock/garden`
- `https://api.hypixel.net/v2/resources/skyblock/skills`

These endpoints and their roles were re-checked on 2026-09-15.

### Hypixel PublicAPI repository

`HypixelDev/PublicAPI` currently exposes SDK methods for SkyBlock profile, profiles and Garden endpoints. PublicAPI issue #674 also provides a concrete current example of the `community_upgrades.upgrade_states` profile structure.

### SkyCrypt implementation cross-check

The current SkyCrypt backend reads Farming XP from `PlayerData.Experience.SkillFarming` and processes member pets including active state. SkyCrypt is used only as an implementation cross-check, not as authority for Farming420 game mechanics.

## Next adapter tasks

1. Persist one merged normalized snapshot after raw imports without duplicating raw payloads.
2. Add a Garden-level resource/table adapter once verified.
3. Map exact farming-related Community Upgrade IDs.
4. Build NBT decoding for tools, armor, equipment and accessory containers.
5. Normalize pets into farming-relevant candidate setups only after pet mechanics are individually sourced.
6. Add the server-side proxy so the same normalizer can consume live API payloads.

No recommendation engine should depend on a field until its normalized value and provenance are covered by tests.
