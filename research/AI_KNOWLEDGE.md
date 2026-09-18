# Farming420 AI Master Knowledge Base

As of: 2026-09-16
Repository target: Farming420
Document role: canonical single-file offline knowledge source for AI agents
Status: ACTIVE with explicit VERIFY / LEGACY / COMING_SOON markers where applicable

This file is intentionally redundant. An AI with no Internet access and no prior Hypixel SkyBlock knowledge should be able to read this single document and understand the core object model, Farming systems, current verified values, strategy framework, parser rules, uncertainty policy, and optimizer constraints. The modular files under `research/knowledge-base/` remain useful for focused maintenance, but this file is the first document to read and should contain the broadest consolidated view.

If this file conflicts with a newer narrow research module or a newer live verification test, the newer verified source wins. Never preserve a stale value merely because it appears here.

---

# 1. Evidence, source, and uncertainty standard

Every non-trivial mechanic should be represented with the following mental schema:

- `status`: `ACTIVE`, `VERIFY`, `LEGACY`, `COMING_SOON`, or an equivalent explicit uncertainty marker.
- `lastVerified`: date of the most recent mechanics verification.
- `effectiveSince`: patch/date if known.
- `source`: current source URL or repository-local verified test/research module.
- `scope`: account, Garden, crop, physical item, armor piece, equipment piece, set/tiered bonus, pet phase, pest phase, contest, Feast, Greenhouse, etc.
- `formula`: exact formula when known; otherwise `unspecified`.
- `conditions`: requirements for activation.
- `stacking`: additive, multiplicative, exclusive, capped, threshold/tier based, temporary, or unknown.
- `incompatibilities`: states that cannot coexist.
- `parserAliases`: API/NBT/Lore/OCR identifiers where useful.
- `notes`: caveats, staleness warnings, or known conflicts.

Unknown is not zero. A missing value must remain unknown if zero would change the optimizer result.

## Source priority

Use this order unless there is a concrete reason not to:

1. Current live behavior reproduced on Hypixel.
2. Current Hypixel patch notes / staff posts.
3. Official Hypixel public API and resource endpoints for API contracts/resources.
4. Maintained community wiki: `https://hypixelskyblock.minecraft.wiki`.
5. Specialist testing sources such as Elite Farmers / Elite SkyBlock.
6. General forum, Reddit, Discord, video, spreadsheet, or player discussion as corroboration/research leads.

The old official wiki at `wiki.hypixel.net` was closed in 2026 and must not be treated as a current live mechanics source. Fandom is stale unless independently verified.

The central maintained Farming Fortune page currently warns that significant content became outdated after Greenhouse. Therefore it is a useful index but not sufficient authority for every optimizer-changing value. Dedicated pages and current tests are preferred.

---

# 2. Core object model: account state vs physical items

A SkyBlock profile contains account-wide progression and physical objects. Do not flatten both into one undifferentiated stat list.

## Account state examples

- Farming Skill
- Garden level
- Anita upgrades
- Elizabeth / Garden account upgrades
- owned/unlocked Garden plots
- Crop Upgrades per crop
- Crop Analyzer milestones
- Garden Bestiary
- visitor progression
- Jacob contest history/medals
- crop milestones
- collections
- accessory power and tunings
- permanent consumptions
- permanent profile unlocks

Account progression may affect many items/contexts but is not itself an item.

## Physical item state

A physical item should preserve, when available:

- `skyblockId` / `ExtraAttributes.id`
- item UUID
- display name
- item class / allowed slot
- rarity
- recombobulation / rarity upgrade
- exactly one active compatible reforge
- enchantment map with exact levels
- gemstone slots and gemstone qualities
- attributes / shard-related item state
- counters such as Cultivating/tool XP where item-local
- item tier/model such as specialized Farming Tool generation
- raw API/NBT provenance

Derived mechanics should be calculated later. Never destroy the raw item record by converting it into a full-set aggregate.

---

# 3. Non-negotiable armor/equipment rule: one piece is one piece

A physical item is the atomic unit.

Base stats, rarity, reforge, gemstones, enchantments, attributes, counters, item upgrades, and recombobulation belong to the individual item on which they exist.

Correct conceptual calculation:

```text
itemContribution(piece)
= baseStats(piece)
+ reforge(piece, rarity)
+ enchantments(piece)
+ gemstones(piece, rarity)
+ other explicit item upgrades(piece)
```

Then a build is:

```text
buildStats
= sum(itemContribution(each equipped piece))
+ sum(explicit collective set/tiered bonuses whose exact conditions are met)
```

Incorrect patterns:

```text
if any set piece exists -> add full set
if full set exists -> assume every piece has the same reforge
if full set exists -> assume every piece has the same enchant levels
if full set exists -> assume every compatible gemstone slot is unlocked and Perfect
```

Examples:

- One Mossy helmet means one Mossy helmet contribution.
- Four Mythic Mossy armor pieces mean four independent rarity-scaled Mossy contributions.
- One Rooted Blossom Bracelet means only that Bracelet receives Rooted.
- Three Green Thumb V equipment pieces and one Green Thumb III piece must be summed as V+V+V+III, not treated as a binary full-set state.
- A full Helianthus armor loadout has four base piece contributions plus the separate documented Feast tiered piece-count bonus.

This rule is a CI invariant in Farming420.

---

# 4. Exclusivity and complete-state comparison

One physical item has one active compatible reforge.

Examples:

- Blessed and Bountiful cannot coexist on one Farming Tool.
- Rooted and Thorny cannot coexist on one equipment piece.
- Mossy and Mantid cannot coexist on one armor piece.

The correct upgrade delta is always the complete before/after state:

```text
delta = value(new complete legal state) - value(current complete legal state)
```

Never rank only the candidate effect while pretending the replaced effect remains active.

Likewise only one pet is active at a time. A pet holds at most one pet item. Pet switching creates separate time phases, not simultaneous stats.

---

# 5. Stat ontology

## Farming Fortune

General Farming drop stat. The maintained current wiki describes it as increasing crop/pest drops in relevant contexts and states it does not function on the Private Island.

Verified base account contribution:

- Farming Skill: +4 Farming Fortune per level.
- Farming 60: +240 Farming Fortune.

Source index: `https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune`
Last verified: 2026-09-16
Status: ACTIVE for this verified slice.

## Crop Fortune

Crop-specific Fortune. It is an independent axis per crop.

Examples:

- Wheat Fortune has no value for Melon normal output.
- Melon Crop Upgrade applies to Melon, not globally.
- Turbo enchant must match the crop.

Do not sum all Crop Fortunes into a single account-wide Fortune number.

## Overbloom

Rare Crop probability stat.

Current maintained formula:

```text
rareDropChance = baseChance * (1 + applicableOverbloom / 100)
```

The current Overbloom page describes it as uncapped and non-functional on the Private Island.

Source: `https://hypixelskyblock.minecraft.wiki/w/Overbloom`
Last verified: 2026-09-16
Status: ACTIVE.

## Pest-scoped Overbloom / pest-only modifiers

A modifier that applies only to pest loot must remain pest-scoped. Do not apply it to normal crop Rare Crop rolls.

## Bonus Pest Chance

Spawn-side pest stat. It is not normal crop Fortune and not loot quality. More BPC is not universally better because it can increase interruptions and alter strategy.

## Farming Wisdom

Increases Farming XP. Useful when skill progress or a level gate matters, but it is not direct normal crop yield.

## Speed

Operational throughput input. Speed only increases useful output if farm geometry, hit timing, crop regeneration, tool behavior, and server conditions convert it into more valid breaks per second.

Never translate +Speed directly to coins/hour without a throughput model or measurement.

---

# 6. Core normal-drop and Rare Crop value model

For a simple Fortune-scaled normal drop:

```text
expectedUnitsPerValidBreak
= baseUnits * (1 + applicableFortune / 100)
```

For Rare Crops using Overbloom:

```text
rareProbability
= baseProbability * (1 + applicableOverbloom / 100)

rareCoinsPerHour
= eligibleRollsPerHour * rareProbability * netDropValue
```

There is no universal fixed exchange rate between Farming Fortune and Overbloom.

Compute marginal values in the current context:

```text
coinsPerHourPer1FF
= validBreaksPerSecond * 3600 * baseUnitsPerBreak * netUnitValue / 100

coinsPerHourPer1Overbloom
= sum(eligibleRollsPerHour * baseProbability * netDropValue / 100)

contextualFFEquivalentOf1Overbloom
= coinsPerHourPer1Overbloom / coinsPerHourPer1FF
```

The result changes by crop, prices, Feast state, pest activity, roll frequency, farm speed, loadout, and sell route.

---

# 7. Farming objectives and optimizer contexts

A recommendation must name its objective. Common objectives:

- coins/hour
- Farming XP/hour
- Collection
- Crop Milestones
- Jacob contest score
- pest spawn rate
- pest loot value
- Rare Crop / Overbloom value
- visitor progression
- Sowdust progression
- tool/chip progression
- Greenhouse output
- Ironman acquisition efficiency
- low-attention farming

Important contexts:

- normal crop farming
- named crop farming
- Farming XP leveling
- crop milestone grinding
- Jacob contest
- pest spawn farming
- pest kill/loot farming
- visitor grinding
- Harvest Feast / Grand Feast
- Greenhouse
- composter/Sowdust
- tool leveling
- Ironman

An item can be excellent in one context and poor in another without contradiction.

---

# 8. Garden fundamentals

The Garden is the main Farming island/system. It contains farm plots, crop progression, visitors, Crop Upgrades, Garden upgrades, SkyMart, milestones, pests, contests, and later systems such as Greenhouse progression.

The Desk is the central configuration interface and can manage plots, Crop Upgrades, SkyMart, Crop Milestones, and Barn configuration. `/desk` opens it while on the Garden.

Source: `https://hypixelskyblock.minecraft.wiki/w/The_Garden`
Last verified: 2026-09-16
Status: ACTIVE.

## Crops represented in Farming420

- Wheat
- Carrot
- Potato
- Pumpkin
- Melon
- Mushroom
- Cactus
- Sugar Cane
- Cocoa Beans
- Nether Wart
- Sunflower
- Moonflower
- Wild Rose

Sunflower and Moonflower share an Eclipse Sickle physical tool bucket, but their crop-specific progression remains separate.

---

# 9. Crop Milestones

Current Garden semantics:

- Crop Milestones advance by harvesting the corresponding crop on The Garden.
- Crops broken outside The Garden do not count toward Garden Crop Milestones.
- Other collection-producing methods may affect Collection without affecting Crop Milestones.
- Current crop milestone structure has 46 tiers per crop.

Source: The Garden page.
Last verified: 2026-09-16
Status: ACTIVE.

Crop Milestones matter because other mechanics, especially Dedication, can scale from them.

---

# 10. Crop Upgrades

Crop Upgrades are crop-specific Desk upgrades.

Current verified model:

```text
cropUpgradeLevel = 0..9
matchingCropFortune = 5 * cropUpgradeLevel
max = +45 matching Crop Fortune
```

For Melon profit, only the Melon Crop Upgrade contributes. Do not add Wheat/Carrot/etc. Crop Upgrade Fortune.

Sources:
- `https://hypixelskyblock.minecraft.wiki/w/The_Garden`
- `https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune`
Last verified: 2026-09-16
Status: ACTIVE for current 0..9/+5 model.

---

# 11. Garden plots

Current verified plot rule:

- each unlocked Fortune-granting plot: +3 Farming Fortune
- each plot also grants +5 SkyBlock XP
- current maximum plot Fortune model: +72 Farming Fortune

Source: The Garden page.
Last verified: 2026-09-16
Status: ACTIVE.

Plot purchases also have non-stat utility because they create farm space. A pure coins-per-FF metric can undervalue a plot when the player still needs physical farm capacity.

---

# 12. Visitors

Track at least two different visitor axes:

1. unique visitor identities served
2. total accepted/served offers/visits

They are not interchangeable.

Unique visitor progression matters for mechanics such as Green Thumb. Total Garden visitors served matters for Blossom Florist.

Visitor rosters can expand. Do not hard-code a timeless maximum unique visitor count if current data can be read from the profile.

Source: The Garden page plus current corroborating forum discussions.
Last verified: 2026-09-16
Status: ACTIVE for semantics; absolute roster maximum remains dynamic.

---

# 13. Blossom equipment and Florist

Blossom is four physical equipment items:

- Blossom Necklace
- Blossom Cloak
- Blossom Belt
- Blossom Bracelet

Each piece independently has +7 base Farming Fortune.

Four actual equipped Blossom pieces therefore have +28 base FF before Florist/reforges/enchants/gems.

Florist is a separate per-piece Piece Bonus based on total visitors served.

Current Florist table per equipped Blossom item:

```text
1 visitor    -> +1.5 FF
5            -> +3.0
10           -> +4.5
20           -> +6.0
50           -> +7.5
75           -> +9.0
100          -> +10.5
150          -> +12.0
250          -> +13.5
500          -> +15.0
750          -> +16.5
1000         -> +18.0
1500         -> +19.5
2000         -> +21.0
2500         -> +22.5
```

At 2,500 visitors, four equipped Blossom pieces give four independent +22.5 Florist contributions = +90 Florist FF, plus +28 base FF.

Source: `https://hypixelskyblock.minecraft.wiki/w/Blossom_Set`
Last verified: 2026-09-16
Status: ACTIVE.

---

# 14. Green Thumb

Green Thumb I-V is equipment-local.

Current formula on one equipment piece:

```text
pieceGreenThumbFF
= 0.05 * greenThumbLevel * uniqueVisitorsServed
```

Example at 137 unique visitors and level V:

```text
0.05 * 5 * 137 = 34.25 FF on that one piece
```

Four actual Green Thumb V pieces at 137 unique visitors sum to +137 FF.

Mixed levels must be summed per piece.

Source: current Farming Fortune index.
Last verified: 2026-09-16
Status: ACTIVE.

---

# 15. Rooted, Thorny, Squeaky equipment reforges

One equipment piece can have only one reforge.

## Rooted current FF by host rarity

```text
Common      +6
Uncommon    +9
Rare        +12
Epic        +15
Legendary   +18
Mythic      +21
```

Calculate each worn piece independently from its actual rarity.

## Thorny

Current live values by equipment rarity:

```text
Farming Fortune:  +2 / +4 / +6 / +8 / +10 / +12
Base Overbloom:  +0.25 / +0.5 / +0.75 / +1 / +1.25 / +1.5
```

The Thorny Bonus is item-local to every equipped Thorny equipment piece:

```text
thorny_armor_bonus_overbloom
= thorny_equipment_piece_count
* total_worn_armor_thorns_tiers
* 0.1
```

Hypixel's 0.26.1 release explicitly confirms that Thorny grants additional Overbloom from the tiers of Thorns on worn armor. The current item data documents the exact +0.1 coefficient.

### Pufferfish Hat secret strategy

Do not collapse the two Pufferfish Hats into one item.

- `PUFFERFISH_HAT` is the ordinary craftable hat and does not intrinsically carry Thorns V.
- `PUFFERFISH_HAT_CELEBRATION` is the Century/Raffle reward variant and comes pre-enchanted with Thorns V. Hypixel again listed `Pufferfish Hat (Thorns V)` among the Year 500 Century Celebration rewards in 2026.
- Thorns V contributes five Thorns tiers to the Thorny formula. With four Thorny equipment pieces, the hat's five tiers contribute `4 * 5 * 0.1 = +2.0 Overbloom`.
- The relevant marginal comparison is normally against the helmet it replaces. Replacing a Thorns IV helmet with the Thorns V celebration hat adds only one extra tier, i.e. `+0.4 Overbloom` with four Thorny equipment pieces.
- Never recommend the Pufferfish Hat from the +2.0 headline alone. Subtract the replaced helmet's Farming Fortune, set-bonus tier, reforge, gemstones, enchantments, Bonus Pest Chance and any other objective-specific effects. It is a niche maximum-Overbloom/rare-drop or Pest-loot swap candidate, not a universal farming helmet.
- Pest spawn/loot snapshot timing remains a separate VERIFY target. Do not assume a last-moment armor swap affects a drop unless the relevant live timing is verified.

Sources:
- https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/
- https://hypixel.net/threads/list-of-item-in-skyblock-update-1-81.6151548/
- https://hypixel.net/threads/hypixel-skyblock-0-21-2-year-400-raffle-event.5841821/
- https://hypixel.net/threads/skyblock-year-500-century-celebration.6114883/
Last verified: 2026-09-18
Status: ACTIVE for Thorny and the celebration hat; VERIFY Pest-loot swap timing.

## Squeaky

Current index FF by rarity:

```text
+2 / +4 / +6 / +8 / +10 / +12
```

Its pest utility belongs in pest context.

Sources:
- Farming Fortune page
- Overbloom page
Last verified: 2026-09-18
Status: ACTIVE for displayed current values, with central index staleness warning propagated.

---

# 16. Armor progression and Helianthus exact model

Historical/main armor chain totals currently indexed include Farmhand, Haymaker, Sprout, Tater, Cropie, Squash, Fermento, and Helianthus. Older totals must be reverified individually when a live recommendation depends on them.

Helianthus is independently verified.

Current Helianthus base piece stats:

```text
Helmet:     +35 Farming Fortune, +20 Bonus Pest Chance, +6 Speed
Chestplate: +40 Farming Fortune, +20 Bonus Pest Chance, +7 Speed
Leggings:   +40 Farming Fortune, +20 Bonus Pest Chance, +7 Speed
Boots:      +35 Farming Fortune, +20 Bonus Pest Chance, +6 Speed
```

Base four-piece sum:

```text
+150 Farming Fortune
+80 Bonus Pest Chance
+26 Speed
```

Separate Feast tiered piece-count bonus:

```text
1 Helianthus piece -> +0 FF
2 pieces            -> +25 FF
3 pieces            -> +50 FF
4 pieces            -> +75 FF
```

Therefore four base pieces (+150) plus 4-piece Feast (+75) explain +225 combined FF. Do not store +225 as base stats and then add +75 again.

Source: `https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor`
Last verified: 2026-09-16
Status: ACTIVE.

---

# 17. Armor reforge/enchant item-local rules

## Mossy

Current rarity scaling:

```text
Common +5
Uncommon +10
Rare +15
Epic +20
Legendary +25
Mythic +30
```

Four Mythic Mossy pieces are four separate +30 contributions.

## Pesterminator

Current indexed model: +2 Farming Fortune per enchant level on each enchanted armor piece.

Pesterminator VI on one piece = +12 FF.

A loadout with one V and three VI pieces must calculate:

```text
10 + 12 + 12 + 12
```

not a binary full-set flag.

## Sunset

Sunset is not Farming Fortune. Current Overbloom behavior: +1 Overbloom per enchant level during daytime on each armor piece. Four Sunset V pieces = +20 daytime Overbloom.

Source: Overbloom page.
Last verified: 2026-09-16
Status: ACTIVE.

---

# 18. Peridot gemstones

Peridot Fortune depends on gemstone quality and host item rarity.

Current table Common→Mythic host rarity:

```text
Rough:    0.5 / 1 / 1.5 / 2 / 2.5 / 3
Flawed:   1 / 1.5 / 2 / 2.5 / 3 / 4
Fine:     1.5 / 2 / 3 / 4 / 5 / 6
Flawless: 2 / 3 / 4 / 5 / 6 / 8
Perfect:  3 / 4 / 5 / 6 / 8 / 10
```

Perfect Peridot Mythic host item = +10 FF for that gemstone slot.

Only count real compatible slots and real inserted gems. Do not infer all set pieces have unlocked slots.

Source: current Farming Fortune index.
Last verified: 2026-09-16
Status: ACTIVE with index staleness caveat.

---

# 19. Specialized Farming Tools

Farming420 currently models these physical crop tools:

- Euclid's Wheat Sickle — Wheat
- Gauss Carrot Shovel — Carrot
- Pythagorean Potato Shovel — Potato
- Pumpkin Dicer — Pumpkin
- Melon Dicer — Melon
- Fungi Cutter — Mushroom
- Cactus Knife — Cactus
- Turing Sugar Cane Cutter — Sugar Cane
- Cocoa Chopper — Cocoa Beans
- Newton Nether Wart Cutter — Nether Wart
- Eclipse Sickle — Sunflower and Moonflower
- Wild Rose Cutter — Wild Rose

Tool progression is physical-item-local. Sunflower and Moonflower share the Eclipse Sickle physical state where the game uses the same item.

Current modern tool progression is indexed from +4 to +200 matching Crop Fortune across its level path. Exact recipes/tool-XP breakpoints should use dedicated current pages/tests before economic ranking.

Source: current Farming Fortune index.
Last verified: 2026-09-16
Status: ACTIVE for tool mapping; VERIFY recipes/breakpoints as needed.

---

# 20. Tool enchantments

## Harvesting

+12.5 Farming Fortune per level.

Harvesting VI = +75 FF.

Status: ACTIVE.

## Cultivating

+2 Farming Fortune per level.

Cultivating X = +20 FF.

Cultivating is item-local and also has counter/progression implications.

Status: ACTIVE.

## Dedication

Current matching Crop Fortune coefficient per Crop Milestone tier:

```text
Dedication I   0.5
Dedication II  0.75
Dedication III 1
Dedication IV  2
```

At Crop Milestone XLVI, Dedication IV reaches +92 matching Crop Fortune.

Status: ACTIVE.

## Turbo-Crop

Modern maximum: Turbo-Crop VII.

Current value: +5 matching Crop Fortune per level.

Turbo VII maximum = +35 matching Crop Fortune.

Turbo enchant must match the crop. Turbo-Wheat must not affect Melon.

Current contest page documents historical/older gates:

- Turbo IV requires Bronze in that crop.
- Turbo V requires Silver in that crop.

Modern VI/VII exact gate behavior should not be invented from older IV/V language.

Status: ACTIVE for +5/level and VII maximum; VERIFY modern gate details when needed.

## Feast

Current Overbloom page: Feast I-V gives +2 Overbloom per level.

Feast V = +10 Overbloom on that tool.

Status: ACTIVE.

## Crop Fever

Temporary proc state, not permanent Fortune.

Current indexed active state includes +100 Farming Fortune and the Overbloom page lists +15 Overbloom while active, with 60-second duration. Exact proc probability must be verified before precise uptime EV.

Status: ACTIVE as temporary proc; VERIFY proc chance details.

## Replenish and Delicate

Operational utility, not direct Fortune in the current model.

Value them through throughput/farm integrity, not fake FF.

---

# 21. Farming Tool reforges

One tool, one active reforge.

## Blessed FF Common→Mythic

```text
+5 / +7 / +9 / +13 / +16 / +20
```

The current index also lists a small enchanted-item crop-drop chance.

## Bountiful FF Common→Mythic

```text
+1 / +2 / +3 / +5 / +7 / +10
```

Current index also lists coin generation per crop break.

## Earthy

Current indexed FF:

```text
+5 / +10 / +15 / +20 / +25 / +30
```

Also associated with Sowdust/progression utility.

## Deep Fried

Current indexed FF plus Harvest Feast/Seasoning specialization. Treat dedicated exact values as VERIFY before a price-sensitive recommendation.

## Overpriced

Current indexed FF plus rarity-scaled Overbloom on current Overbloom source. Rare-crop/Feast context, not universal best reforge.

Always compare new reforge minus current reforge.

---

# 22. Jacob's Farming Contest

Current contest structure:

- occurs once per real-life hour / every 3 SkyBlock days
- lasts 20 real-life minutes / one SkyBlock day
- selects 3 random Farming Collection crops
- requires Farming 10 and talking to Jacob
- requires at least 100 of the event crop for reward eligibility

Current percentile brackets without GOATed:

```text
Bronze   top 60%
Silver   top 30%
Gold     top 10%
Platinum top 5%
Diamond  top 2%
```

With Finnegan GOATed:

```text
Bronze   top 70%
Silver   top 40%
Gold     top 20%
Platinum top 10%
Diamond  top 5%
```

These are population-relative thresholds. Do not claim a static crop count guarantees a medal without current population data.

Current reward structure uses Bronze/Silver/Gold medal currencies; Platinum/Diamond award combinations of existing medals rather than separate medal items.

Source: `https://hypixelskyblock.minecraft.wiki/w/Jacob%27s_Farming_Contest`
Last verified: 2026-09-16
Status: ACTIVE.

Current wiki strategy includes preparing pests and Greenhouse output for contest start. Exact best timing depends on current pest/Greenhouse mechanics.

---

# 23. Collection vs milestone vs contest score vs tool counters

These are separate counters:

- Collection: account collection progression.
- Crop Milestone: Garden crop-specific player harvest progression.
- Jacob score: event-window crop collection score.
- Tool counters: physical-item-local counters/progression such as Cultivating/tool XP.

Never substitute one for another simply because several increase while farming.

---

# 24. Pets

Only one pet is active at a time.

## Elephant

Current indexed level-100 Fortune:

- Legendary: +150 Farming Fortune
- Mythic: +200 Farming Fortune

Use full current perk state for non-FF comparisons.

Sources:
- `https://hypixelskyblock.minecraft.wiki/w/Elephant_Pet`
- current Farming Fortune index
Last verified: 2026-09-16
Status: ACTIVE for current listed FF values.

## Mooshroom Cow

Current dedicated page shows +100 base Farming Fortune at level 100.

At level 100, current page states +0.7 Farming Fortune per every 20 Strength for relevant rarities.

Conceptual form:

```text
mooshroomFF = 100 + strengthScaling
```

Do not invent a floor/rounding rule from tooltip wording if exact rounding is not verified.

The current index states parity with level-100 Mythic Elephant at roughly 2,857.14 Strength for the stated comparison.

Sources:
- `https://hypixelskyblock.minecraft.wiki/w/Mooshroom_Cow_Pet`
- current Farming Fortune index
Last verified: 2026-09-16
Status: ACTIVE for displayed scaling; exact rounding VERIFY.

## Other modern Farming pets

Modern Farming has context pets such as Slug, Hedgehog, Rose Dragon, Orchid Mantis, Mosquito, Bee, Chicken, Pig, and others. Do not collapse the game into Elephant vs Mooshroom only.

Examples currently indexed:

- Slug: sprayed-plot conditional Farming Fortune.
- Hedgehog: pest-specialized Fortune / Overbloom dependencies.
- Rose Dragon: endgame multi-source Farming bonuses.
- Mosquito: Sugar Cane/visitor-related scaling.
- Orchid Mantis: Tool XP/Speed/Overbloom interactions.

Each dependency must be modeled separately before recommending the pet.

---

# 25. Pet items and pet switching

A pet has at most one active held item.

Examples of relevant pet items include Green Bandana and context-specific alternatives. When switching pet items, subtract the lost old pet-item effect.

Pet switching is phase-separated:

```text
crop phase -> crop-profit pet
pest spawn phase -> spawn pet
pest kill phase -> loot pet
contest phase -> contest pet
```

Autopet/payback should be evaluated from marginal value:

```text
paybackHours = acquisitionCost / marginalCoinsPerHourFromAutomation
```

Do not invent a universal number of hours at which Autopet becomes worthwhile.

Do not claim an automatic switch is possible if the required current Autopet trigger/rule is not verified.

Repository source: `research/pet-switching.js`

---

# 26. Overbloom sources and Rare Crop strategy

Current Overbloom page sources tracked by Farming420 include:

- Feast V tool enchant: +10 Overbloom
- active Crop Fever: +15 Overbloom
- Sunset V on 4 armor pieces during daytime: +20 total
- Overpriced tool reforge: rarity-scaled Overbloom
- Thorny equipment: rarity-scaled base + Thorns interaction
- Lucky Clover: +7 Overbloom
- Poignant Lucky Clover: +13 Overbloom
- Rose Dragon: up to current documented high value
- Orchid Mantis: context-dependent Overbloom
- Hedgehog: pest-scoped Overbloom

The current page discusses extreme theoretical Sun's Grasp/fist setups. Never assume the highest displayed Overbloom produces the highest coins/hour: losing a specialized tool can reduce valid breaks, Crop Fortune, and total eligible rolls/hour.

Evaluate complete throughput and EV.

---

# 27. Pests

At minimum model two modes:

```text
normalCropMode:
  maximize crop output while controlling pest penalties/interruption

pestFarmingMode:
  maximize pest spawn * expected pest loot
  minus crop uptime lost to spawning/killing/vacuuming
```

Important separations:

- pest spawn chance vs pest loot quality
- Bonus Pest Chance vs Overbloom
- pest-only Fortune vs global crop Fortune
- time spent killing pests vs time farming crops
- prepared/stored pests vs naturally spawned pests

Do not treat Bonus Pest Chance as universally positive.

Current advanced pest systems require continued dedicated verification; unresolved exact formulas must remain VERIFY rather than guessed.

---

# 28. Temporary effects and consumables

Temporary effects need duration, trigger, and recurring cost.

Examples relevant to Farming research include:

- Booster Cookie: convenience/Wisdom/flight/AFK-related utility, not a fake flat Farming Fortune value.
- God Potion: evaluate relevant contained effects individually.
- Chocolate Century Cake: temporary Farming Fortune effect.
- Celestial Mason Jar: temporary Farming-related effect.
- mixins such as Melon Juice where live availability/effect is verified.
- Harvest Harbinger potion.
- Atmospheric Filter season-dependent Garden behavior.
- Magic 8 Ball conditional effects.
- Crop Fever proc state.
- Feast windows.
- Pesthunter-style temporary stacks.

Never fold a temporary effect into permanent base state without duration/activation metadata.

---

# 29. Global vs crop-specific recommendation scope

## Global planner

Global mode should rank only account/setup changes that are genuinely global or useful across many crops.

Examples can include:

- Farming Skill
- Garden-wide account progression
- general armor/equipment upgrades
- global permanent Farming Fortune
- broadly applicable pet/setup upgrades

## Crop-specific planner

When a crop is selected, include:

- matching Crop Upgrade
- physical specialized tool for that crop
- matching Turbo enchant
- Dedication using that crop's milestone
- crop-specific Fortune
- crop-specific pet effects
- that crop's measured throughput/farm geometry
- applicable global setup contributions

Do not let Wheat-only upgrades win a Melon calculation.

Crop-specific context should be introduced at the point where it matters for coins/hour or best-next-upgrade, not forced globally across every UI page.

---

# 30. Coins/hour

Normal crop model:

```text
normalUnitsPerHour
= validBreaksPerSecond * 3600 * expectedUnitsPerBreak

normalProfitPerHour
= normalUnitsPerHour * netUnitValue
- recurringConsumableCostPerHour
- otherRecurringOperatingCost
```

Rare/RNG output adds separately:

```text
rareProfitPerHour
= sum(
    eligibleRollsPerHour
    * baseProbability
    * (1 + applicableOverbloom/100)
    * netDropValue
  )
```

`netUnitValue` must distinguish NPC, Bazaar instant, Bazaar order, AH, taxes/fees, and liquidity where relevant.

Market prices are dynamic. An offline AI can explain the formula and compare stat efficiency, but should not pretend stale prices are current market truth.

---

# 31. Upgrade cost model

Keep separate:

```text
acquisitionCost
applicationCost
consumableCost
recurringCostPerHour
lostResaleValue
recoveredResaleValue
activeGrindTime
passiveWaitTime
marketWaitTime
opportunityCost
```

For coins:

```text
roiHours = netCoinCost / deltaProfitPerHour
```

For grind progression:

```text
remainingHours = remainingProgress / measuredProgressPerHour
```

Do not automatically convert time into coins. If the user supplies a value for their time, an optional combined measure may be computed:

```text
combinedCost = netCoinCost + activeGrindHours * userTimeValueCoinsPerHour
```

Passive waiting and market waiting should still remain visible separately.

---

# 32. Armor/equipment transition simulation

When replacing a piece, evaluate:

- old piece base stats
- new piece base stats
- old/new rarity
- old/new reforge
- old/new enchants
- old/new gems
- recombobulation effects
- collective tier/set bonuses before and after
- special drop effects
- Speed/BPC/Overbloom side effects
- resale/recovery value
- level requirements

A single new piece can be profitable before full-set completion if its item-local gain exceeds the lost collective bonus. Conversely, breaking a strong 4-piece threshold can make a nominally stronger individual piece a net loss.

Always simulate actual before/after loadouts.

---

# 33. Example: Helianthus 3→4 transition

At three Helianthus pieces:

- three actual base item contributions are counted
- Feast tier = +50 FF

Adding the fourth piece contributes:

1. fourth piece base stats
2. fourth piece reforge/enchant/gem state
3. collective Feast change from +50 to +75 = additional +25 FF

The marginal upgrade is not merely the fourth base piece.

---

# 34. Example: Green Thumb marginal level

At `U` unique visitors, raising one equipment piece from Green Thumb IV to V gives:

```text
deltaFF = 0.05 * U
```

Therefore Green Thumb cost-efficiency changes continuously with visitor progression. A low-visitor account should not be ranked as if it had endgame visitor count.

---

# 35. Ironman

Normal-profile market price ranking does not transfer directly to Ironman.

For each Ironman upgrade preserve:

- source NPC/event/drop/craft
- prerequisite skill/collection
- required deterministic quantity or RNG expectation
- event/time-limited availability
- medals/Tickets/Copper/Bits/Sowdust/etc.
- competing use of the same materials
- active vs passive time requirements

A cheap Bazaar upgrade can be a huge Ironman grind. A normally expensive deterministic NPC progression can be comparatively efficient on Ironman.

---

# 36. API, NBT, lore, OCR, and resource-pack truth layers

Never collapse these into one evidence source.

## API/NBT

Preferred raw item identity comes from decoded Hypixel item NBT, especially `ExtraAttributes.id`/`skyblockId`, UUID, rarity/lore, modifier/reforge, enchantment map, gemstone data, attributes, and counters.

## Display lore

Lore is useful for rarity/stat text and user-visible confirmation but may wrap, localize, or change formatting.

## OCR screenshots

OCR text is not automatically game truth.

Pipeline:

```text
screenshot
-> tooltip region
-> OCR
-> whitespace/unicode normalization
-> lore structure detection
-> alias normalization
-> knowledge-base validation
-> confidence/review
-> explicit apply
```

Common OCR failure classes:

- `I/l/1`
- Roman numerals
- truncated lines
- wrapped lore
- punctuation confusion
- Minecraft formatting codes
- resource-pack glyphs
- historical renamed items
- display names mistaken for internal IDs

Unknown OCR values must not silently overwrite known data.

## Official resource pack

Farming420 uses Hypixel's official SkyBlock resource-pack metadata endpoint and accepts downloads only from the official resource pack host. Pack hash/SHA-1 is verified at build time.

Runtime item art lookup uses only real SkyBlock IDs. It must never guess an asset from a display name.

The local generated asset snapshot is allowed to be absent; UI must degrade to text rather than invent art.

---

# 37. Enchant presentation / max-level policy

Rainbow/max presentation is metadata-driven.

Verified modern maxima currently tracked include examples such as:

- Dedication IV
- Cultivating X
- Harvesting VI
- Turbo-Crop VII
- Pesterminator VI
- Green Thumb V
- Crop Fever V
- Feast V
- Sunset V
- Bug Blender V
- Delicate V
- Replenish I

Removed/legacy enchants must not receive a current max recommendation state.

Ultimate enchantments must obey the game's one-Ultimate-per-item constraint where applicable.

Unknown enchantments stay neutral instead of being guessed max/rainbow.

---

# 38. Progression strategy framework

A useful fresh→endgame reasoning sequence is:

1. Unlock Garden functionality and enough plots to operate.
2. Raise Farming Skill to important item/content gates.
3. Acquire the appropriate basic/specialized tool for the intended crop.
4. Build a farm that reaches reliable valid break rates.
5. Progress Crop Upgrades, Crop Milestones, and physical tool levels.
6. Move through armor/equipment generations when requirements/costs make sense.
7. Fill high-efficiency missing enchants/reforges/gems.
8. Develop visitors, contests, pests, pet options, chips/shards, Feast, and specialized loadouts.
9. Only after core progression is strong should luxury marginal Fortune/Overbloom upgrades dominate ranking.

This is a framework, not a fixed universal shopping list.

---

# 39. Best-next-upgrade algorithm

For every legal candidate transition:

1. Build the current complete context state.
2. Apply exactly one candidate transition.
3. Enforce slot/reforge/pet/enchant exclusivity.
4. Recompute item-local derived stats from actual physical items.
5. Recompute collective bonuses only where explicit conditions are met.
6. Recompute valid-break throughput and loot EV for the selected objective/context.
7. Compute marginal output/profit/XP/contest score.
8. Compute coin cost, recurring cost, resale recovery, and time cost separately.
9. Exclude unresolved mechanics if ranking would require invented numbers.
10. Explain why the candidate ranks where it does.

For Global mode, exclude crop-only upgrades unless they truly affect multiple crops/account state. For a selected crop, include matching crop-specific transitions.

---

# 40. Common optimizer mistakes

1. Treating one armor piece as a full set.
2. Adding full-set reforge value when only one piece is reforged.
3. Assuming all pieces share the same rarity.
4. Assuming all pieces have the same enchants/gems.
5. Counting Crop Fortune globally.
6. Adding multiple pets simultaneously.
7. Ranking a reforge without subtracting the old reforge.
8. Treating Overbloom as a fixed FF multiple.
9. Double-counting a full-set headline total plus its set bonus.
10. Treating temporary proc stats as permanent uptime.
11. Using stale prices for live ROI.
12. Ignoring blocks/second and farm geometry.
13. Treating Bonus Pest Chance as always positive.
14. Assuming the highest screenshot stat is the highest-profit build.
15. Using pre-Greenhouse/pre-Harvest-Feast mechanics without date checks.
16. Letting Alpha/coming-soon data affect live ranking.
17. Converting unknown to 0 without marking it unknown.
18. Guessing item identity from display names when real NBT ID is available.
19. Letting screenshot OCR overwrite trusted API/NBT without review.
20. Treating account progression as if it were an item enchant.

---

# 41. Current repository-local verified narrow sources

When they are newer than this document, prefer these narrow slices for exact code behavior:

- `research/core-fortune.js`
- `research/gear-fortune.js`
- `research/equipment-fortune.js`
- `research/pet-switching.js`
- `src/armor-fortune.js`
- `src/equipment-fortune.js`
- `src/enchant-presentation.js`
- `src/exclusivity.js`
- `src/pet-strategy.js`
- corresponding tests

The compact machine-oriented research file `research/hypixel_farming_master_ai_2026-09-16.json` remains useful for structured optimizer ingestion. This Markdown file is intentionally broader and more explanatory.

---

# 42. Source index

Primary maintained community sources currently used by this corpus:

- Farming Fortune: `https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune` — VERIFY-AS-INDEX because the page warns about post-Greenhouse staleness.
- The Garden: `https://hypixelskyblock.minecraft.wiki/w/The_Garden` — ACTIVE for Garden structure/milestone semantics.
- Blossom Set: `https://hypixelskyblock.minecraft.wiki/w/Blossom_Set` — ACTIVE for +7 base per piece and Florist per-piece table.
- Helianthus Armor: `https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor` — ACTIVE for exact piece stats and Feast tiers.
- Jacob's Farming Contest: `https://hypixelskyblock.minecraft.wiki/w/Jacob%27s_Farming_Contest` — ACTIVE for timing/brackets/rewards/older Turbo gates and documented strategy.
- Overbloom: `https://hypixelskyblock.minecraft.wiki/w/Overbloom` — ACTIVE for formula and current displayed Overbloom sources.
- Mooshroom Cow Pet: `https://hypixelskyblock.minecraft.wiki/w/Mooshroom_Cow_Pet` — ACTIVE for current displayed scaling; exact rounding VERIFY.
- Elephant Pet: `https://hypixelskyblock.minecraft.wiki/w/Elephant_Pet` — ACTIVE for pet identity/acquisition; current FF summary cross-checked with Fortune index.

Corroborating forum/specialist sources are research leads, not automatic live truth.

---

# 43. Staleness protocol

When a patch changes Farming:

1. Identify affected systems.
2. Mark affected facts VERIFY before changing live weights if exact values are unknown.
3. Update the narrow dedicated research/runtime module first where possible.
4. Add/update regression tests.
5. Update the modular long-form chapter.
6. Update this `AI_KNOWLEDGE.md` master document.
7. Only then promote affected live optimizer mechanics back to ACTIVE.

A smaller set of correct facts is better than a large set of silently stale facts.

---

# 44. Research gaps that remain explicit

The offline corpus is intentionally not finished. High-priority areas for continued deep verification include:

- complete pest spawn/cooldown/drop tables after the latest live patches
- exact Greenhouse progression/formulas and contest-preparation EV
- complete Garden Chip leveling, duplicate requirements, and every chip's current effect
- complete Shard/attribute applicability and conflict rules
- full pet list with exact current level/rarity scaling and context triggers
- all temporary buffs and mixins with exact duration/current availability
- complete specialized tool upgrade recipes/tool-XP breakpoints
- modern Turbo VI/VII exact activation/gate details
- all current armor/equipment generations and requirements before Helianthus/Blossom
- crop-by-crop farm geometry, target Speed/angles, measured blocks/second, regeneration constraints
- live market integration for Bazaar/AH/NPC sell route and tax/fee/liquidity handling
- contest score distributions rather than static percentile-only structure
- Feast/Grand Feast exact crop/season rare-drop tables
- full API field matrix for all Garden/Farming progression
- historical/legacy timeline and migration behavior

Until verified, these gaps must not be filled with invented constants.

---

# 45. Final agent rules

Before answering or coding a Farming recommendation:

- identify the objective and context;
- identify which values are account-wide vs item-local;
- keep crop-specific stats crop-specific;
- enforce one reforge per item and one active pet;
- treat armor/equipment pieces individually;
- add collective bonuses only when their documented conditions are met;
- preserve unknowns as unknowns;
- use current source dates/status;
- exclude Alpha/coming-soon mechanics from live recommendations;
- rank marginal changes from the player's current state;
- calculate coins/hour only after throughput, sell route, and relevant RNG layers are defined;
- explain caveats instead of hiding them.

This file is the canonical single-file starting point. Read newer verified narrow repository modules/tests whenever an exact mechanic can have changed after 2026-09-16.
