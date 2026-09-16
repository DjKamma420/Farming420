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

**Read this first.** The Farming Fortune page these came from carries the
community wiki's own `Outdated pages` and `Confirmations needed` markers, so
"confirmed" here means *consistent with the best available public source*, not
verified against the live game. See `docs/FARMING_HISTORY.md`, and treat the
armour-Fortune discrepancy below as a symptom of it.

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

## Strategies and non-obvious interactions

Fifteen entries were added to `HIDDEN_INTERACTIONS` in `src/data.js` from this
pass, each with its source and date, and they render on the app's Mechanics
page. The ones that change how a planner must calculate:

- **Zorro's Cape rolls at claim time.** Its 20% extra-medal chance is checked
  when contest rewards are claimed, not during the contest, so it costs nothing
  in farming stats and never competes with the contest loadout.
- **Bonus Pest Chance is a step function.** Each full 100 guarantees one more
  Pest; the remainder is the percent chance of one more. 299 -> 300 adds a whole
  Pest, 300 -> 399 adds almost nothing. Ranking it linearly would be badly wrong.
- **300+ Bonus Pest Chance inverts the pest penalty.** Eight active Pests
  normally cost 75% Fortune; at 300-399 they cost 15%. That makes letting Pests
  build up viable for low-attention farming instead of ruinous.
- **Contest medals gate Turbo-Crop per crop.** Bronze makes IV work for that
  crop, Silver makes V work. Owning the book is not the same as it applying, so
  a purchase can be entirely wasted.
- **Gold medals raise the Farming cap.** Each unique crop with a Gold result
  lets Anita raise the cap by one, up to 10 and Farming 60 — so the last ten
  levels, worth +4 Fortune each, are a contest unlock, not a grind.
- **Mk. II at tool level 15, Mk. III at 30**, with Overclocker 3000 carrying
  levels 40-50. Rarity scales reforges and gemstones, so the tier upgrade
  changes the value of everything already on the tool.
- **Freezing Garden time makes one of the two day/night shards useless.** With a
  Day Saver and a Night Saver given to the Garden, the Desk can freeze the time,
  so only Moonflower farming genuinely needs Lunar Power.
- **A Sundial frees the boot slot.** Per-crop Speed at the Desk removes the
  reason to wear Rancher's Boots instead of the Fortune boots.
- **One Mantid piece kept in the kill set preserves stack credit**, because the
  stacks come from Pest kills rather than from wearing the full set at the time.
- **Sunset V pulls both ways**: +5 Overbloom by day, but -5% Visitor cooldown
  while breaking crops at night. The two halves want opposite time settings.
- **Brown Bandana scales with eligible Pest Bestiary tiers** (+0.2 each, max 45),
  and Timestalk Clone and Zombuddy do not count.
- **Mushroom is the Farming XP crop** at 6 base XP per block, which is a
  different answer from the coins-per-hour crop.
- **Beth's quest is a wall-clock gate** spanning several Garden visits, and its
  later part unlocks the Crop Analyzer. Coins cannot shorten it.
- **Greenhouse values are rebalanced repeatedly**, including a mutation
  multiplier change in August 2026. A hard-coded Greenhouse figure goes stale
  silently.

## The 304 Bonus Pest Chance baseline

A fully permanent baseline, before any spray, pet or swap:

| Source | Bonus Pest Chance |
| --- | --- |
| 5x Wriggling Larva | +10 |
| Level 20 Vermin Vaporizer Chip | +100 |
| Pesthunter Relic | +80 |
| Full Helianthus Armor | +80 |
| Pesterminator VI on all four pieces | +24 |
| Level 10 Keeled Slug Shard | +10 |
| **Total** | **304** |

Temporary and swap sources on top: Sprayonator +25 / Juicy +50 / Salty +75,
Level 100 Legendary Slug Pet +40, Level 100 Mosquito Pet +50, Brown Bandana up
to +45, Douce Pluie de Stinky Cheese Potion +20, Doug's Feast Crasher +2-6.

## Farming attributes and their shards

The app models three shards; there are at least twelve farming attributes. Each
still needs its own Fortune value before it can be ranked, so they are listed
rather than added as scored entries.

| Attribute | Shard | Use |
| --- | --- | --- |
| Solar Power | Firefly | Farming Fortune during the day |
| Lunar Power | Lunar Moth | Farming Fortune at night; required for Moonflower |
| Pest Fortune | Cricket | Farming Fortune while killing Pests |
| Pest Luck | Field Mouse | Overbloom on Pests |
| Bonus Pest Chance | Keeled Slug | Bonus Pest Chance |
| Infiltration | Earthworm | Farming Fortune while the current Plot has a Pest |
| Sprayonator Serendipity | Rat | More Sprayonator materials |
| Pest Cooldown | Moth | Shorter Pest spawn cooldown |
| Enchanted Farmer | Mosquito | Chance of an Enchanted Crop while farming |
| Visitor Bait | Mudworm | Visitors arrive faster |
| Fancy Visit | Invisibug | Chance of a RARE or better Visitor |
| Garden Wisdom | Dragonfly | Farming Wisdom on the Garden |

## Open discrepancy: armour Farming Fortune

Two pages on the same wiki disagree, so neither is taken:

| Set | Farming Guide ("base full-set") | Farming Fortune page |
| --- | --- | --- |
| Tater | +70 | +100 |
| Cropie | +90 | +135 |
| Squash | +110 | +170 |
| Fermento | +130 | +205 |
| Helianthus | +150 | +225 |

Farmhand (+20), Haymaker (+40) and Sprout (+60) agree. This repo stores no
number for armour Fortune, so nothing is currently wrong — but the figure must
be resolved before the profit engine uses one.

## Armour progression chain

Verified, and both pages agree on the level gates: Farmhand 3, Haymaker 10,
Sprout 15, Tater 20, Cropie 30, Squash 35, Fermento 40, Helianthus 50.

## Reforge progression

Bustling is the cheap early armour reforge, later replaced by Mossy. Blooming is
a good early Equipment reforge. Bountiful is the default tool reforge; Blessed
gives more Farming Wisdom and some Fortune and is mainly for an XP-focused
setup. Squeaky is used on the Pest-spawning Equipment set.

## When a value goes stale

A verification date alone does not establish that a value is current: what
matters is whether the game changed after it. `docs/FARMING_HISTORY.md` records
the change timeline for exactly that comparison, and names the eras whose
numbers no longer transfer.

## How to extend this

The research path that worked: this environment's egress proxy blocks every
SkyBlock domain directly, but a server-side extractor reaches them. The
community wiki refuses plain HTTP (403) and needs a browser tier.
