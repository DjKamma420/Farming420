# Item-model audit and structural Farming gaps — 2026-09-17

Status: ACTIVE implementation/research boundary
Last verified: 2026-09-17

## Purpose

Farming420 uses several independent visual sources. A Farming item is not considered visually covered merely because some generic icon can be shown. The runtime and pack-sync audit now use the same resolution hierarchy and the same Farming item classifier.

## Model-source hierarchy

For every recognized Farming armor, equipment, crop tool, and Vacuum, use the first valid source below:

1. `official-skin`
   - Exact `skin` hash from Hypixel's current `/v2/resources/skyblock/items` resource.
   - This is the required path for SkyBlock head models that are not represented as an exact resource-pack item texture.
2. `resource-pack-item`
   - Exact SkyBlock item id resolved through `assets/hypixel-pack/manifest.json` generated from Hypixel's official SkyBlock resource pack.
3. `resource-pack-set`
   - Deliberate representative set fallback from `src/pack-item-art.js`.
   - This is a fallback, never an exact-item claim.
4. `vanilla-material`
   - Exact vanilla material from the current Hypixel item resource when no custom item/head texture is available.
5. `unresolved`
   - No safe model source is known. The sync must fail instead of silently presenting a placeholder as if coverage were complete.

Runtime implementation: `src/item-model-coverage.js`
Sync audit: `scripts/audit-farming-models.js`

Official technical sources:
- `https://api.hypixel.net/v2/resources/packs`
- `https://api.hypixel.net/v2/resources/skyblock/items`

## Sync-time audit

`.github/workflows/sync-pack.yml` now runs the Farming model audit immediately after the official pack is synchronized.

The audit writes:

`assets/hypixel-pack/farming-model-audit.json`

The file records:

- current pack metadata,
- number of recognized Farming physical items,
- number resolved/unresolved,
- direct model count (`official-skin` + exact pack item),
- fallback model count (set fallback + vanilla material),
- counts by source type,
- every item not represented by an exact pack item,
- every unresolved item,
- full per-item source provenance.

An item that exists in SkyBlock but not in the texture pack is therefore still explicit in the report. A head-model item is expected to appear as `official-skin`; a normal Minecraft-model item can appear as `vanilla-material`. Neither is mislabeled as an exact pack hit.

The sync fails when `unresolvedCount > 0`. This makes missing Farming models a CI-visible regression instead of a UI-only discovery.

## Scope of the Farming physical-item audit

The shared runtime classifier includes:

- current and legacy-recognized Farming armor families,
- Farming equipment families and standalone Farming equipment,
- every exact crop-tool tier listed in `src/exact-farming-items.js`,
- every Garden Vacuum tier listed in `src/exact-farming-items.js`.

Combat/non-Farming items from the Hypixel item catalog are excluded.

## Reforge structural gap closed

The Farming tool reforge exclusivity group previously listed only Blessed and Bountiful even though the runtime now models five current Farming tool reforges.

The max-one group is now derived from `FARMING_TOOL_REFORGES`, so all current entries are mutually exclusive on one physical Farming tool:

- Bountiful
- Blessed
- Overpriced
- Deep Fried
- Earthy

This is intentionally derived rather than duplicated. Adding a future Farming tool reforge to `src/farming-reforges.js` automatically places it in the same max-one constraint group.

Vacuum reforges remain a different physical-item context and are not falsely made exclusive with a crop-tool reforge.

## Remaining model limitations

These are not silently converted into live values:

- The generated audit reflects the item resource and pack available at the time the sync runs. A game update between scheduled syncs can temporarily make the checked-in report stale.
- `resource-pack-set` is deliberately a representative visual fallback, not evidence that the individual item has its own exact pack definition.
- `vanilla-material` is a valid model source, but does not imply a custom SkyBlock texture exists.
- Pack basename collisions remain recorded under `manifest.json -> ambiguous`; colliding ids are not guessed.
- Pets are not included in this physical armor/equipment/tool/Vacuum audit because pet presentation has a separate model/skin path. If pet visual coverage becomes part of the optimizer surface, it should get a dedicated audit rather than being mixed into equipment coverage.

## Completion rule for this step

Step 9 is complete when all of the following hold:

1. pack synchronization generates a Farming-specific model audit;
2. the audit uses the same resolver/classifier as runtime UI;
3. official head skins and non-pack fallback models are explicitly distinguishable;
4. unresolved Farming physical items fail the sync;
5. all five current Farming tool reforges obey one physical-item max-one constraint;
6. tests pin both the model-source classification and the reforge constraint.
