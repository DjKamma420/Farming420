# Farming420 Knowledge Base — Source Index

As of: 2026-09-16

This file records the main sources used by the offline Farming knowledge base. A source being listed here does not make every statement on that page automatically current. Pages with known staleness warnings are explicitly marked.

## Source policy

Preferred order:

1. Current live behavior reproduced on Hypixel.
2. Current Hypixel patch notes / staff forum posts.
3. Maintained community wiki at `https://hypixelskyblock.minecraft.wiki`.
4. Specialist testing sources such as Elite Farmers / Elite SkyBlock.
5. General forum/Reddit/community discussion only as corroboration or a lead unless independently verified.

Never use the closed `wiki.hypixel.net` as a current mechanics source. Treat Fandom as stale unless independently verified.

## Maintained community wiki

### Farming Fortune

URL: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: VERIFY-AS-INDEX

Use for source discovery and current displayed tables, but the page itself warns that significant parts are outdated since the Greenhouse update. Any optimizer-changing value should be cross-checked against a dedicated page or newer current evidence before being promoted to ACTIVE.

Known material indexed from this page includes Farming Skill Fortune, Anita, Garden account Fortune, plots, Crop Analyzer milestones, Garden Bestiary, Crop Upgrades, tool mappings, Harvesting, Cultivating, Dedication, Turbo-Crop, Farming tool reforges, armor/equipment reforges, Green Thumb, Peridot, and pet Fortune summaries.

### The Garden

URL: https://hypixelskyblock.minecraft.wiki/w/The_Garden
Last verified: 2026-09-16
Status: ACTIVE

Used for Garden Desk behavior, Crop Milestones, plot progression, visitor milestone semantics, Garden progression, and Garden-specific counters.

### Blossom Set

URL: https://hypixelskyblock.minecraft.wiki/w/Blossom_Set
Last verified: 2026-09-16
Status: ACTIVE

Used for the four physical Blossom equipment items, +7 base Farming Fortune per piece, and the independent Florist visitor-scaling Piece Bonus table.

### Helianthus Armor

URL: https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor
Last verified: 2026-09-16
Status: ACTIVE

Used for exact per-piece base Farming Fortune / Bonus Pest Chance / Speed and the separate Feast tiered piece-count bonus.

### Jacob's Farming Contest

URL: https://hypixelskyblock.minecraft.wiki/w/Jacob%27s_Farming_Contest
Last verified: 2026-09-16
Status: ACTIVE

Used for contest timing, crop selection count, entry requirements, percentile brackets, GOATed bracket changes, rewards, Turbo IV/V medal gates, and documented pest/Greenhouse preparation strategy.

Important caveat: modern Turbo VI/VII exists in newer Farming data; do not infer its exact gating from the older IV/V explanatory text on this page without separate verification.

### Overbloom

URL: https://hypixelskyblock.minecraft.wiki/w/Overbloom
Last verified: 2026-09-16
Status: ACTIVE

Used for Rare Crop probability formula, uncapped behavior, and current Overbloom sources such as Feast, Crop Fever, Sunset, Overpriced, Thorny, Lucky Clover, Poignant Lucky Clover, Rose Dragon, Orchid Mantis, and pest-scoped Hedgehog effects.

### Mooshroom Cow Pet

URL: https://hypixelskyblock.minecraft.wiki/w/Mooshroom_Cow_Pet
Last verified: 2026-09-16
Status: ACTIVE

Used for level-100 base Farming Fortune and Farming Strength wording/scaling. Tooltip wording alone does not establish a rounding rule; exact rounding remains VERIFY until tested or explicitly documented.

### Elephant Pet

URL: https://hypixelskyblock.minecraft.wiki/w/Elephant_Pet
Last verified: 2026-09-16
Status: ACTIVE

Used for current pet identity/acquisition context. Current Farming Fortune summary values are cross-referenced from the Farming Fortune page.

## Hypixel Forum / staff and current community corroboration

### Visitor roster / unique visitor discussion

URL: https://hypixel.net/threads/do-you-not-need-to-accept-the-visitor-offers-for-both-taylor-spaceman-now.6095282/
Date: 2026-05
Last verified: 2026-09-16
Status: CORROBORATION

Used only as corroboration for the 2026 visitor-roster/unique-visitor discussion. The absolute number of visitors is treated as dynamic because new visitors can be added.

### Alpha farming changes / reverted changes discussion

URL: https://hypixel.net/threads/outdated-more-farming-nerfs-on-alpha-including-math.6132043/page-3
Date: 2026-08
Last verified: 2026-09-16
Status: CORROBORATION / LEGACY-ALPHA WARNING

Useful for identifying tested Alpha behavior and changes that were reverted. Alpha values never enter live recommendations unless separately confirmed live.

### SkyBlock Things spreadsheets thread

URL: https://hypixel.net/threads/skyblock-things-spreadsheets-v2-4-0-6-attributes-fusions-garden-pest-prices-sb-xp-updates-and-more.5936248/
Last verified: 2026-09-16
Status: SPECIALIST-COMMUNITY

Useful for research leads, update tracking, and cross-checking complex Farming/Pest/Harvest Feast changes. Not a substitute for current primary mechanics evidence.

## Repository-local verified slices

The following files contain smaller, test-backed research slices and should be preferred over broad prose when they are newer than a chapter:

- `research/core-fortune.js`
- `research/gear-fortune.js`
- `research/equipment-fortune.js`
- `research/pet-switching.js`
- `src/enchant-presentation.js`
- `src/armor-fortune.js`
- `src/equipment-fortune.js`
- tests covering those modules

## Staleness handling

When a new Farming patch changes a system:

1. Mark affected facts VERIFY before updating optimizer weights if exact new values are unknown.
2. Update the dedicated narrow research file first where possible.
3. Update the long-form chapter and source index.
4. Add or update regression tests.
5. Only then promote the mechanic back to ACTIVE in live recommendation logic.

Unknown is not zero. VERIFY facts must not silently score as if their unknown value were a confirmed zero.
