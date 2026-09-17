# Item price coverage gaps

As of: 2026-09-17 · generated against `src/data.js` UPGRADES and `research/*costs*.json`

## What this measures

Every entry the upgrade planner can rank, checked for a **machine-linkable**
cost record in the shipped price research.

This is deliberately not the question "does the research mention a price anywhere". It is the narrower one the calculator actually needs: can code
get from an upgrade entry to a cost without a human reading a document. Today
it cannot, for a structural reason:

> The 85 `UPGRADES` entries carry no cost field at all. Their fields are
> `category, cropScope, hypercharge, id, manualDefault, max, metric,`
> `modeScope, name, notes, rawMarginal, section, source, status, stepGain,`
> `workbookRank`. There is no `cost`, no `price`, no `timeToObtain`.

So the price research and the ranked entries are two disconnected data sets,
which is why the planner has to ask for Coins/h baselines by hand.

**Matching method and its limits.** Normalised name overlap between an entry
and the named cost records in the research files. That produces false
negatives: a cost documented under a set name, a reforge stone name or a
gemstone tier will not match an entry called "Mossy on full armor". Treat a
line below as "no link exists", not as "no research exists".

## Current state: 7 of 85 linkable

| Section | Entries without a linkable cost |
|---|---|
| Account layer | 14 |
| Crop layer | 3 |
| Tool layer | 11 |
| Garden Chips | 10 |
| Armor & Equipment | 11 |
| Pets | 5 |
| Attribute Shards | 12 |
| Buffs & Consumables | 11 |
| Pests | 1 |
| **Total** | **78** |

## The gaps, by section

`coins` = a purchase price is the right unit. `time` = the entry is earned,
not bought, so the useful figure is time or progression, per the request that
"Coins **or** the time it costs to obtain this item" be documented.

### Account layer

| Entry | id | likely unit |
|---|---|---|
| Farming Skill level | `account-skill-farming-skill-level` | time |
| Extra Farming Fortune perk | `anita-extra-farming-fortune-perk` | time |
| Garden plots unlocked | `garden-garden-plots-unlocked` | time |
| Elizabeth Garden Farming Fortune | `account-upgrade-elizabeth-garden-farming-fortune` | coins |
| Pest/Garden Bestiary FF | `garden-pest-garden-bestiary-ff` | time |
| Mutation Analysis rewards | `greenhouse-mutation-analysis-rewards` | time |
| Rosewater Flask permanent stacks | `consumable-rosewater-flask-permanent-stacks` | coins |
| Relic of Power + Perfect Peridot effect | `accessory-relic-of-power-perfect-peridot-effect` | coins |
| Fermento Artifact | `accessory-fermento-artifact` | coins |
| Helianthus Relic | `accessory-helianthus-relic` | coins |
| Anita accessory crop bonus | `jacob-accessory-anita-accessory-crop-bonus` | coins |
| Chocolate Factory Cocoa perk | `chocolate-factory-chocolate-factory-cocoa-perk` | time |
| Refined Dark Cacao permanent bonus | `chocolate-factory-refined-dark-cacao-permanent-bonus` | coins |
| Feast Burger permanent Overbloom | `consumable-feast-burger-permanent-overbloom` | coins |

### Crop layer

| Entry | id | likely unit |
|---|---|---|
| Crop Upgrade (selected crop) | `crop-progression-crop-upgrade-selected-crop` | coins |
| Personal Best perk (selected crop) | `jacob-personal-best-perk-selected-crop` | time |
| Exportable item (selected crop) | `permanent-crop-item-exportable-item-selected-crop` | coins |

### Tool layer

| Entry | id | likely unit |
|---|---|---|
| Farming Tool level | `tool-tool-base-counter-fortune` | time |
| Tool Mk. II | `tool-mk-ii` | coins |
| Tool Mk. III | `tool-mk-iii` | coins |
| Turbo-Crop | `tool-enchant-turbo-crop` | coins |
| Cultivating X | `tool-enchant-cultivating-x` | coins |
| Harvesting VI | `tool-enchant-harvesting-vi` | coins |
| Blessed reforge | `tool-reforge-blessed-reforge` | coins |
| Bountiful reforge | `tool-reforge-bountiful-reforge` | coins |
| Perfect Peridot on Farming Tool | `tool-gem-perfect-peridot-on-farming-tool` | coins |
| Recombobulator effect on tool stats | `tool-recombobulator-effect-on-tool-stats` | coins |
| Beady - Pest-only Farming Fortune | `vacuum-reforge-beady-pest-only-farming-fortune` | coins |

### Garden Chips

| Entry | id | likely unit |
|---|---|---|
| Cropshot Chip | `garden-chip-cropshot-chip` | coins |
| Hypercharge Chip next level | `garden-chip-hypercharge-chip-next-level` | time |
| Rarefinder Chip | `garden-chip-rarefinder-chip` | coins |
| Overdrive Chip | `garden-chip-overdrive-chip` | coins |
| Quickdraw Chip | `garden-chip-quickdraw-chip` | coins |
| Synthesis Chip | `garden-chip-synthesis-chip` | coins |
| Evergreen Chip | `garden-chip-evergreen-chip` | coins |
| Vermin Vaporizer Chip | `garden-chip-vermin-vaporizer-chip` | coins |
| Mechamind Chip | `garden-chip-mechamind-chip` | coins |
| Sowledge Chip | `garden-chip-sowledge-chip` | coins |

### Armor & Equipment

| Entry | id | likely unit |
|---|---|---|
| Helianthus armor base stats | `armor-helianthus-armor-base-stats` | coins |
| Helianthus Feast set bonus | `armor-helianthus-feast-set-bonus` | coins |
| Mossy on full armor | `armor-reforge-mossy-on-full-armor` | coins |
| Perfect Peridot on full armor | `armor-gem-perfect-peridot-on-full-armor` | coins |
| Pesterminator VI on full armor | `armor-enchant-pesterminator-vi-on-full-armor` | coins |
| Blossom set visitor bonus | `equipment-blossom-set-visitor-bonus` | coins |
| Rooted on full equipment | `equipment-reforge-rooted-on-full-equipment` | coins |
| Sunset V (day Overbloom) | `armor-enchant-sunset-v-day-overbloom` | coins |
| Helianthus armor BPC | `armor-helianthus-armor-bpc` | coins |
| Thorny on full Mythic equipment - FF | `equipment-reforge-thorny-on-full-mythic-equipment-ff` | coins |
| Thorny on full Mythic equipment - Overbloom | `equipment-reforge-thorny-on-full-mythic-equipment-overbloom` | coins |

### Pets

| Entry | id | likely unit |
|---|---|---|
| Green Bandana | `pet-item-green-bandana` | coins |
| Switch to best farming pet | `pet-switch-to-best-farming-pet` | time |
| Lucky Clover / Poignant Lucky Clover | `pet-item-lucky-clover-poignant-lucky-clover` | coins |
| Rabbit/XP pet switch | `pet-rabbit-xp-pet-switch` | coins |
| Orchid Mantis - Intelligent Specimen | `pet-orchid-mantis-intelligent-specimen` | coins |

### Attribute Shards

| Entry | id | likely unit |
|---|---|---|
| Firefly or Lunar Moth shard | `attribute-shard-firefly-or-lunar-moth-shard` | coins |
| Galaxy Fish shard | `attribute-shard-galaxy-fish-shard` | coins |
| Earthworm Shard (formerly Termite) | `attribute-shard-earthworm-shard-formerly-termite` | coins |
| Field Mouse Shard - Pest Overbloom | `attribute-shard-field-mouse-shard-pest-overbloom` | coins |
| Cricket Shard - Pest Fortune | `attribute-shard-cricket-pest-fortune` | coins |
| Keeled Slug Shard - Bonus Pest Chance | `attribute-shard-keeled-slug-bonus-pest-chance` | coins |
| Rat Shard - Sprayonator Serendipity | `attribute-shard-rat-sprayonator-serendipity` | coins |
| Mosquito Shard - Enchanted Farmer | `attribute-shard-mosquito-enchanted-farmer` | coins |
| Mudworm Shard - Visitor Bait | `attribute-shard-mudworm-visitor-bait` | coins |
| Invisibug Shard - Fancy Visit | `attribute-shard-invisibug-fancy-visit` | coins |
| Dragonfly Shard - Garden Wisdom | `attribute-shard-dragonfly-garden-wisdom` | coins |
| Moth Shard - Pest Cooldown | `attribute-shard-moth-pest-cooldown` | coins |

### Buffs & Consumables

| Entry | id | likely unit |
|---|---|---|
| Pesthunter Phillip buff | `temporary-buff-pesthunter-phillip-buff` | coins |
| Celestial Mason Jar | `mixin-celestial-mason-jar` | coins |
| Melon Juice Mixin | `mixin-melon-juice-mixin` | coins |
| Atmospheric Filter (Spring) | `temporary-atmospheric-filter-spring` | coins |
| Magic 8 Ball FF roll | `temporary-magic-8-ball-ff-roll` | coins |
| Chocolate Century Cake | `temporary-chocolate-century-cake` | coins |
| Harvest Harbinger V | `temporary-harvest-harbinger-v` | coins |
| Fortunate Feasting V | `harvest-feast-fortunate-feasting-v` | coins |
| Grand Feast rare-crop bonus | `harvest-feast-grand-feast-rare-crop-bonus` | coins |
| Feast Crashers III | `harvest-feast-feast-crashers-iii` | coins |
| Celestial Mason Jar Wisdom | `mixin-celestial-mason-jar-wisdom` | coins |

### Pests

| Entry | id | likely unit |
|---|---|---|
| Pesthunter accessory / BPC setup | `pest-pesthunter-accessory-bpc-setup` | coins |

## What would close this

1. A cost field on each `UPGRADES` entry, or an id-keyed cost table beside it,
   so the link is data rather than prose.
2. A unit per entry: coins, or time/progression for the earned ones. Mixing
   them into one number would be the fake universal conversion the scoring
   model already refuses.
3. Sourcing and a timestamp per price, matching the existing research files.

Priority 8 in `research/knowledge-base/40-calculator-model-strategy-gap-audit.md`
already names the live-price half of this: "Live price routing, fees, depth,
and timestamping for every monetized stream."

