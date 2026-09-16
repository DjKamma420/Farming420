# Verified farming mechanics

Values confirmed against a current source, with the date and the source, as
`AGENTS.md` correctness rule 2 requires.

**Source used for this pass:** `hypixelskyblock.minecraft.wiki`, the community
wiki, verified actively maintained (pages edited within days of the pass).

**Why not the official wiki:** it was closed in July 2026 — Hypixel staff
announced on 2026-07-21 that "pages will soon no longer be available to be
browsed". Every `wiki.hypixel.net` link is dead. A test now fails if one is
cited again.

**Why not Fandom:** `hypixel-skyblock.fandom.com` is stale. It still lists the
specialised farming tools under their pre-rename names, which is how this
repository came to carry them.

Pass date: **2026-09-16**.

## The tool rename

Hypixel renamed the specialised farming tools. `src/data.js` had the old names,
which broke tool detection for seven of thirteen crops in silence, because
`cropsForToolItem` matches a decoded item's display name against the tool name.

| Crop | Old name in this repo | Current name |
| --- | --- | --- |
| Wheat | Euclid's Wheat Hoe | **Euclid's Wheat Sickle** |
| Carrot | Gauss Carrot Hoe | **Gauss Carrot Shovel** |
| Potato | Pythagorean Potato Hoe | **Pythagorean Potato Shovel** |
| Sugar Cane | Turing Sugar Cane Hoe | **Turing Sugar Cane Cutter** |
| Nether Wart | Newton Nether Wart Hoe | **Newton Nether Wart Cutter** |
| Sunflower / Moonflower | Eclipse Hoe | **Eclipse Sickle** |
| Wild Rose | Wild Rose Hoe | **Wild Rose Cutter** |

Unchanged: Pumpkin Dicer, Melon Dicer, Fungi Cutter, Cactus Knife, Cocoa
Chopper.

Matching is now on `toolMatch` — the crop-distinctive part of the name, such as
`euclid s wheat` — plus any known tool noun. That survives the next rename and
still matches the old names, so a player's older data is not stranded. Requiring
a tool noun keeps a stack of the crop itself ("Wild Rose", "Melon Slice") from
being read as the tool.

Source: <https://hypixelskyblock.minecraft.wiki/w/Farming_Tools>

## Confirmed values already in this repo

Each of these matched what `src/data.js` already stored.

| Mechanic | Verified value |
| --- | --- |
| Farming skill | +4 Farming Fortune per level, up to +240 at Farming 60 |
| Extra Farming Fortune perk | +4 per tier, up to +60 at 15 tiers |
| Garden Farming Fortune account upgrade | +4 per level, up to +40, **only while on The Garden** |
| Crop Upgrades | +5 Crop Fortune each, up to +45, for one specific crop |
| Garden plots | +3 per plot owned, up to +72 with all plots |
| Cultivating | +2 per level, +20 at Cultivating X |
| Harvesting | +12.5 per level, +75 at Harvesting VI |
| Dedication IV | up to +92 Crop Fortune per crop |
| Pesterminator VI | +2 per level, +48 on a full armour set |
| Green Thumb V | +0.05 per unique visitor per piece, +137 on full equipment at 137 visitors |
| Blessed reforge | +20 Farming Fortune at Mythic |
| Bountiful reforge | +10 Farming Fortune at Mythic, plus 0.2 coins per crop broken |
| Zorro's Cape | +10, and its stats are doubled during Jacob's Farming Contest |
| Helianthus Armor | Legendary, +225 Farming Fortune |

Source: <https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune>

## Corrections found

- **Turbo-Crop** maxes at **+35 Crop Fortune at level VII** (+5 per level), not
  at level V. `src/data.js` capped it at 5.
- **Garden Bestiary** is up to **+102** Farming Fortune with 17 Pest Bestiary on
  the Farming Fortune page, while the Pests page says 0.4 per tier up to +100.
  The two disagree by 2, so the entry stays marked as needing confirmation
  rather than silently taking one number.

## Mechanics this app does not model yet

Found during the pass. Each one materially affects profit, so the planner must
not claim a coins/hour figure until they are in:

1. **Farming Fortune has no effect on the Private Island.** It applies in The
   Garden and other farming areas only.
2. **Pests reduce Fortune.** With 4 or more pests on the Garden, Farming Fortune
   *and* every crop-specific Fortune is cut — first by 5%, then in multiples of
   15%, up to 8 pests, for a maximum **75% loss**. No more pests spawn at 8
   until one is killed. Every 100 Bonus Pest Chance allows one more pest before
   the reduction starts.
   This is a large negative term the current model has no concept of.
3. **Pest spawn rate:** base 0.2% (1 in 500) per crop broken, while off cooldown.
4. **Pests can only be damaged with Vacuums**, and each vacuumed pest gives 1
   Pest currency.

Sources: <https://hypixelskyblock.minecraft.wiki/w/Pests>,
<https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune>

## In-game locations confirmed

The first entries for the "Where do I find this?" layer that are grounded
rather than guessed:

| Thing | Where |
| --- | --- |
| Crop Upgrades | The Desk in The Garden, bought with Copper |
| Specialised farming tools | SkyMart in The Garden, 250 Copper |
| Basic Gardening Hoe / Axe | SkyMart, 5 Copper |
| Advanced Gardening Hoe / Axe | SkyMart, basic tool + 20 Copper |
| Cultivating I | Elizabeth, 4,000 Bits |
| Dedication I | SkyMart |
| Turbo-Crop I | Jacob's Farming Contests, or serving the Librarian |
| Harvesting I–V | Enchantment Table; VI drops from the Shiny Pig |
| Pesterminator I | Drops from a Beetle; VI from A Beginner's Guide to Pesthunting |
| Green Thumb I | SkyMart |

## How to extend this

The research path that worked: this environment's egress proxy blocks every
SkyBlock domain directly, but a server-side extractor reaches them. The
community wiki refuses plain HTTP (403) and needs a browser tier.
