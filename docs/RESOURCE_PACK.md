# Official SkyBlock resource-pack assets

Farming420 uses only Hypixel's official SkyBlock resource pack for custom item visuals.

## Source of truth

Pack metadata is resolved from `https://api.hypixel.net/v2/resources/packs`. The build pipeline selects the newest usable `SkyBlock` pack format whose download URL is hosted by `resourcepacks.hypixel.net`. No deploy id, pack URL, or release hash is hard-coded.

Hypixel introduced the official SkyBlock resource pack in SkyBlock 0.26 on July 8, 2026 and states that the current pack can be downloaded through the Hypixel API. The release post also states that the pack files are intentionally browsable and that the pack contains its own `LICENSE` file.

Release source: `https://hypixel.net/threads/hypixel-skyblock-0-26-skyblock-resource-pack-loadouts-security-quest-and-more.6117801/`

Last verified: 2026-09-16.

## Generation

Run:

```text
npm run sync:pack
```

`scripts/sync-hypixel-pack.py` then:

1. resolves the current pack from Hypixel's public API;
2. accepts downloads only from `https://resourcepacks.hypixel.net/`;
3. downloads the selected ZIP once;
4. verifies its SHA-1 against the hash supplied by Hypixel;
5. refuses unsafe ZIP paths;
6. extracts only SkyBlock item definitions, item models, item textures, and the pack `LICENSE`;
7. creates `assets/hypixel-pack/manifest.json`;
8. skips the download entirely when the existing manifest already has the current hash.

Generated pack files are not hand-edited. The copied `LICENSE` remains next to the generated assets and must be reviewed before publishing a newly generated pack revision.

## Runtime lookup

`src/item-assets.js` resolves textures only from a real Hypixel `ExtraAttributes.id` / `skyblockId`. Display names are not converted into guessed item ids. If the manifest has no exact normalized id match, the UI must use the existing text/rarity fallback.

The generated pack directory is intentionally not part of the PWA install-time precache. It can contain a large number of files. Same-origin manifest and texture requests are cached on demand by the service worker after first use.

## Attribution and endorsement

The assets belong to Hypixel and remain subject to the `LICENSE` included in the selected official pack. Farming420 must not imply that Hypixel endorses or maintains this project.
