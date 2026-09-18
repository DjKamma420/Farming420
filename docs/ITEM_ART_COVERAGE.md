# Item art coverage

What the app can picture, what it cannot, and why. Kept honest by
`tests/pack-item-art.test.js`, `tests/skull-art.test.js`,
`tests/item-art-coverage.test.js` and
`tests/item-model-coverage-audit.test.js`.

## The precedence, strongest first

1. **Player-head NBT texture** from the synced item's own tag. The item's real picture.
2. **Exact rendered item icon** for verified manual/offline gear ids. This is the
   same route used for equipment when flat skin cropping is unreliable.
3. **`skin`** from Hypixel's official item resource.
4. **Verified id-backed player-head model** for current farming equipment whose
   saved/manual setup record only contains a SkyBlock id.
5. **Exact pack texture** for the item's own id.
6. **Vanilla/material fallback.**
7. **Letter badge.** The last resort, and a coverage failure.

Live NBT and Hypixel metadata always outrank the static id-backed table. That is
intentional: if Hypixel changes an item's model, live data replaces the frozen
fallback automatically.

## Exact equipment head models

Verified 2026-09-18 against the current NotEnoughUpdates item repository. The
hashes live in `KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES` in
`src/skull-art.js`.

| Family | SkyBlock ids | Count |
|---|---|---:|
| Lotus / Peony | `LOTUS_NECKLACE`, `LOTUS_CLOAK`, `LOTUS_BELT`, `LOTUS_BRACELET` | 4 |
| Blossom | `BLOSSOM_NECKLACE`, `BLOSSOM_CLOAK`, `BLOSSOM_BELT`, `BLOSSOM_BRACELET` | 4 |
| Pesthunter | `PESTHUNTERS_NECKLACE`, `PESTHUNTERS_CLOAK`, `PESTHUNTERS_BELT`, `PESTHUNTERS_GLOVES` | 4 |
| Pest utility | `PEST_VEST` | 1 |
| Contest cape | `ZORROS_CAPE` | 1 |

The current Pesthunter equipment ids use **`PESTHUNTERS_`** with an `S`.
Zorro's Cape uses **`ZORROS_CAPE`**. Farming420 still accepts its historical
`ZORRO_CAPE` typo when loading old/manual state, but new catalogue matching
uses the real id.

Source: `NotEnoughUpdates/NotEnoughUpdates-REPO/items/*.json` and the matching
`itemsOverlay/4790/*.snbt` entries, checked 2026-09-18.


## Exact rendered armor icons

Armor now follows the same solution used for the Pesthunter Necklace: when a
manual/offline setup only has the exact SkyBlock id, the UI requests the
corresponding rendered SkyAH icon instead of drawing a generic armor outline or
substituting a crop/set material. The URL is derived only for the closed
farming-armor families accepted by the setup catalogue and for the standalone
farming pieces `RANCHERS_BOOTS`, `FARMER_BOOTS`,
`ENCHANTED_JACK_O_LANTERN` and `PUFFERFISH_HAT`.

Examples verified on current SkyAH item pages on 2026-09-18 include
`FARM_SUIT_LEGGINGS`, `FARM_ARMOR_CHESTPLATE`, `MELON_BOOTS` (shown
in-game as Tater Boots), `CROPIE_HELMET`, `SQUASH_LEGGINGS`,
`FERMENTO_HELMET`, `HELIANTHUS_CHESTPLATE`, `RANCHERS_BOOTS` and
`FARMER_BOOTS`.

A failed remote icon still falls back to the existing head/pack/material path,
so this does not make the setup editor depend on the remote source.

## Other exact art

| What | Pack key | Count |
|---|---|---:|
| Farming tools, all three tiers | `theoretical_hoe_*`, `*_dicer*`, `cactus_knife*`, `fungi_cutter*`, `coco_chopper*` | 36 |
| Garden vacuums | `skymart_*_vacuum`, `infini_vacuum*` | 5 |
| Crops | see `CROP_ART` in `src/skyblock-redesign.js` | 13 |
| Peridot gemstones, 5 tiers plus the generic | `*_peridot_gem`, `peridot_crystal` | 6 |

The crop table is shared: the Pests page borrows it rather than starting a
second copy.

## Set representatives

The shipped pack still has no armour or equipment pieces. Set materials such as
Helianthus or Fermento are no longer used as the picture of an armor piece when
an exact rendered armor icon is available. They remain deeper fallbacks only.

The following entries in `SET_ART` are explicitly stand-ins:

| Token | Stands in with | Why |
|---|---|---|
| `BLOSSOM` | `bachelors_rose` | Deep fallback only; exact Blossom heads now resolve by SkyBlock id |
| `THORNY` | `blooming_thorns` | the reforge is named for thorns |
| `ROOTED` | `deep_root` | the reforge is named for a root |

## Still not resolvable offline

These still depend on live metadata or another verified source:

- **Pets and pet items** — Green Bandana, Orchid Mantis, Lucky Clover and the
  pet switch entries.
- **Reforges with no matching pack item** — Mossy, Sunset and Green Thumb.
- **Enchantments** — Pesterminator, Harvesting, Cultivating and the rest. An
  enchantment is not an item and has no model of its own; the card shows the
  gear it applies to.

Farm Suit, Melon and Rabbit armour are not static progression entries in this
app. They exist through the setup catalogue, where live NBT/Hypixel metadata and
the vanilla material fallback handle them.

## The rule this file exists to enforce

Use an exact model when its identity is verified. Keep live upstream data above
frozen fallbacks. Label stand-ins as stand-ins. Record unresolved gaps instead
of silently presenting an unrelated item as the real model.
