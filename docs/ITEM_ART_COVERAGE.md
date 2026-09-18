# Item art coverage

What the app can picture, what it cannot, and why. Kept honest by
`tests/pack-item-art.test.js`, `tests/skull-art.test.js`,
`tests/item-art-coverage.test.js` and
`tests/item-model-coverage-audit.test.js`.

## The precedence, strongest first

1. **Concrete item-instance NBT** from the synced profile: head texture, item
   model and dyed-leather colour are preserved instead of collapsed to a set
   name.
2. **Exact rendered item image** from SkyCrypt's public item renderer. That
   renderer resolves Hypixel/NEU model metadata and vanilla Minecraft assets;
   head and dyed-leather endpoints preserve instance-specific visuals.
3. **Exact local Hypixel resource-pack texture** for an item the shipped pack
   overrides.
4. **Verified id-backed player-head model** for saved/manual farming gear that
   only contains a SkyBlock id.
5. **Local vanilla/SVG material fallback**, used only when the exact renderer
   is unavailable.
6. **Letter badge.** The last resort, and a coverage failure.

The external renderer is presentation-only. Farming420 does not use it for
stats, mechanics, prices or recommendations. Local art remains in place so an
offline PWA does not become unusable when the renderer is unreachable.

## Exact armor and equipment head models

Verified 2026-09-18 against the current NotEnoughUpdates item repository. The
hashes live in `KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES` in
`src/skull-art.js`. The historical export name is kept to avoid breaking old
tests/imports; it now covers farming armor heads as well as equipment.

| Family | SkyBlock ids | Count |
|---|---|---:|
| Farming armor heads | `CROPIE_HELMET`, `FERMENTO_HELMET`, `HELIANTHUS_HELMET`, `MELON_HELMET`, `PUMPKIN_HELMET`, `SQUASH_HELMET`, `ENCHANTED_JACK_O_LANTERN`, `PUFFERFISH_HAT` | 8 |
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

Set representatives are no longer used as armor pictures. Cropie, Squash,
Fermento and Helianthus ingredients are not substitutes for their worn armor
models. Representatives remain only for non-armor fallback surfaces where no
exact physical model is available.

The following entries in `SET_ART` are explicitly stand-ins:

| Token | Stands in with | Why |
|---|---|---|
| `BLOSSOM` | `bachelors_rose` | Deep fallback only; exact Blossom heads now resolve by SkyBlock id |
| `THORNY` | `blooming_thorns` | the reforge is named for thorns |
| `ROOTED` | `deep_root` | the reforge is named for a root |

## Offline limits

Without network access, synced head textures can still use their Mojang skin
fallback and pack-backed items still use the bundled Hypixel pack. Exact
isometric head rendering and arbitrary vanilla/block-model rendering fall back
to the local presentation layer.

Enchantments remain non-items: Pesterminator, Harvesting, Cultivating and the
rest have no independent item model, so their cards show the physical gear or
book/item they actually belong to.

Farm Suit, Melon and Rabbit armour are not static progression entries in this
app. They exist through the setup catalogue, where live NBT/Hypixel metadata and
the vanilla material fallback handle them.

## The rule this file exists to enforce

Use an exact model when its identity is verified. Keep live upstream data above
frozen fallbacks. Label stand-ins as stand-ins. Record unresolved gaps instead
of silently presenting an unrelated item as the real model.
