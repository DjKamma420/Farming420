# Item art coverage

What the app can picture, what it cannot, and why. Kept honest by
`tests/pack-item-art.test.js` and `tests/item-model-coverage-audit.test.js`,
which fail if a key named here stops resolving against the shipped pack.

## The precedence, strongest first

1. **Player-head NBT texture** from the item's own tag. The item's real picture.
2. **`skin`** from Hypixel's official item resource. Also the real picture.
3. **Exact pack texture** for the item's own id.
4. **Armour item model** from the official item's category/material and leather
   dye colour. This is used before any set representative.
5. **Set-representative pack texture** — one in-family item stands in only when
   the physical item has no stronger model source.
6. **Generic material model / letter badge.** Last-resort coverage.

Steps 1 and 2 need `api.hypixel.net`, which is unreachable from this
environment and from CI. So everything measured offline is the *weaker* view:
if it resolves here it resolves live, but the reverse does not follow.

## Exact, not stand-ins

| What | Pack key | Count |
|---|---|---|
| Farming tools, all three tiers | `theoretical_hoe_*`, `*_dicer*`, `cactus_knife*`, `fungi_cutter*`, `coco_chopper*` | 36 |
| Garden vacuums | `skymart_*_vacuum`, `infini_vacuum*` | 5 |
| Crops | see `CROP_ART` in `src/skyblock-redesign.js` | 13 |
| Peridot gemstones, 5 tiers plus the generic | `*_peridot_gem`, `peridot_crystal` | 6 |

The crop table is shared: the Pests page borrows it rather than starting a
second copy.

## Armour models

As of the 2026-07 SkyBlock Resource Pack rollout, armour items do not have
Resource Pack models. The live Hypixel item resource still exposes the data
needed to picture the real item form:

- a valid `skin` renders the player-head face plus hat layer;
- `category` / `material` select Helmet, Chestplate, Leggings or Boots;
- `color` supplies the exact leather dye RGB when the piece is dyed.

Therefore Cropie, Squash, Fermento and Helianthus crop/ingredient textures are
never used as armour stand-ins. Body pieces render as pixel armour in the API
colour; head items use their Mojang skin whenever Hypixel supplies one.

Source checked 2026-09-18:
https://hypixel.net/threads/list-of-item-in-skyblock-major-update.6123513/

## Set representatives

Set representatives remain for equipment and abstract upgrade rows where no
stronger physical model source exists.

Three entries are in-family stand-ins rather than the item itself, and are
marked as such in `SET_ART`:

| Token | Stands in with | Why |
|---|---|---|
| `BLOSSOM` | `bachelors_rose` | Blossom equipment has no item of its own; a real blossom from the Garden's wild-rose line |
| `THORNY` | `blooming_thorns` | the reforge is named for thorns |
| `ROOTED` | `deep_root` | the reforge is named for a root |

Each gives way to a head texture the moment one exists.

## Not resolvable offline

These need step 1 or step 2, so this repo cannot verify them:

- **Pets and pet items** — Green Bandana, Orchid Mantis, Lucky Clover, the pet
  switch entries. Pets carry head textures, so they resolve live.
- **Reforges with no matching pack item** — Mossy, Sunset, Green Thumb.
- **Accessories and capes** — Zorro's Cape.
- **Enchantments** — Pesterminator, Harvesting, Cultivating and the rest. An
  enchantment is not an item and has no model of its own; the card shows the
  gear it applies to.

Farm Suit, Melon and Rabbit armour are **not entries in this app**. They exist
only in the live setup catalogue, where steps 1, 2 and 4 already cover them.
There is nothing in the repo to hang art on, so nothing here claims to.

## The rule this file exists to enforce

A stand-in is labelled a stand-in, and a gap is recorded as a gap. Searching
one source and reporting absence is a statement about the drawer you opened,
not about the item.
