# 10 — Core Farming and The Garden

As of: 2026-09-16
Status: ACTIVE with explicit VERIFY notes where upstream pages warn about staleness

This chapter explains the core systems an offline AI needs before it can reason about Farming progression, crop yield, Garden progression, visitors, or Jacob contests.

## 1. Farming as a skill

Farming is one of SkyBlock's skills. Farming level is account progression and affects access to later Farming content while also granting Farming Fortune.

Verified current base progression:

- Farming grants +4 Farming Fortune per level.
- Farming 60 therefore contributes +240 Farming Fortune.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE

Do not confuse Farming Skill level with Garden level, Crop Milestones, Farming Tool level, or crop Collection. They are separate progress axes.

## 2. Farming Fortune and Crop Fortune

The maintained wiki describes Farming Fortune as a stat that increases crop and pest drops and states it does not work on the Private Island. Crop Fortune is crop-specific.

Important optimizer rule:

```text
General Farming Fortune applies wherever the target mechanic consumes general Farming Fortune.
Matching Crop Fortune applies only to its matching crop/mechanic.
Unrelated Crop Fortune contributes zero.
```

The central Farming Fortune page currently warns that much of its content is outdated since the Greenhouse update. Treat it as a source index. Cross-check expensive or recommendation-changing values against dedicated pages.

Source: https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16

### Currently listed account/global sources

The page currently lists:

- Farming Skill: +4 FF per level, up to +240 at Farming 60.
- Anita Extra Farming Fortune: +4 FF per tier, up to +60 at 15 tiers.
- Garden Farming Fortune Account Upgrade: +4 FF per level, up to +40 while on The Garden.
- Crop Analyzer Milestones: +5 FF each, up to +30.
- Garden Plot Land: +3 FF per owned plot, up to +72.
- Garden Bestiary: up to +102 FF with the current 17-pest structure according to the page.
- Crop Upgrades: +5 matching Crop Fortune per level, up to +45 for each crop independently.

Because the page carries an explicit post-Greenhouse staleness warning, values not already independently tested in Farming420 should remain subject to re-verification before they alter live ranking.

## 3. The Garden

The Garden is the primary Farming island/system. It provides farm plots, crop progression, visitors, Crop Upgrades, Garden upgrades, SkyMart, milestones, pests, contests, and later systems such as Greenhouse progression.

The Desk is the central configuration interface. It can configure plots, add Crop Upgrades, access SkyMart, view Crop Milestones, and configure the Barn. `/desk` opens it while on the Garden.

Source: https://hypixelskyblock.minecraft.wiki/w/The_Garden
Last verified: 2026-09-16
Status: ACTIVE

## 4. Crops currently represented in Farming420

The current Garden-facing crop model contains 13 crops:

- Wheat
- Carrot
- Potato
- Pumpkin
- Sugar Cane
- Melon
- Cactus
- Cocoa Beans
- Mushroom
- Nether Wart
- Sunflower
- Moonflower
- Wild Rose

Crop-specific progression must remain independent per crop. Moonflower and Sunflower may share a physical Eclipse Sickle tool, but their crop progression is not automatically the same.

## 5. Crop Milestones

Current Garden behavior:

- Crop Milestones advance by harvesting the corresponding crop on The Garden.
- Crops broken outside The Garden do not count toward Garden Crop Milestones.
- Crops farmed by means other than the player can still affect Collection while not counting toward Crop Milestones.
- Each crop has 46 Crop Milestone tiers.

Source: https://hypixelskyblock.minecraft.wiki/w/The_Garden
Relevant current section: Crop Milestones
Last verified: 2026-09-16
Status: ACTIVE

Crop Milestones matter beyond their direct rewards because other mechanics such as Dedication can scale from crop milestone state.

## 6. Crop Upgrades

Crop Upgrades are configured through the Garden Desk and are crop-specific. The maintained Farming Fortune page currently lists +5 matching Crop Fortune per upgrade level, up to +45 for a crop.

Model them as:

```text
crop_upgrade[crop].level = 0..9
crop_upgrade[crop].crop_fortune = 5 * level
```

Do not add all crop-upgrade Fortune together when evaluating one crop. For Melon farming, only the Melon Crop Upgrade is relevant.

Source index:
- https://hypixelskyblock.minecraft.wiki/w/The_Garden
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE for the currently tested 0..9/+5 model; recheck after Garden progression changes.

## 7. Garden plots

Unlocked Garden plots are both space and account progression.

Current verified rule:

- Each unlocked plot grants +3 Farming Fortune.
- Each unlocked plot also grants +5 SkyBlock XP.
- The current plot structure allows a maximum +72 Farming Fortune from plots, corresponding to 24 Fortune-granting plot unlocks in the current model.

Source: https://hypixelskyblock.minecraft.wiki/w/The_Garden
Current page lines/section: plot unlock table
Last verified: 2026-09-16
Status: ACTIVE

Optimization note: plot purchases consume Compost/Compost Bundles and are not purely a stat purchase; additional farm space can have throughput/strategy value. A coins-per-FF comparison should not ignore the non-stat utility if that utility matters to the user's farm plan.

## 8. Visitor system

Visitors are Garden NPCs that request items/crops and provide rewards. Two milestone families are tracked separately:

1. Unique Visitors Served: number of distinct visitor identities for which the player has accepted an offer.
2. Offers Accepted: total accepted offers, including repeat visitors.

Both milestone families grant Farming XP, Garden XP, and SkyBlock XP at milestone thresholds.

Source: https://hypixelskyblock.minecraft.wiki/w/The_Garden
Last verified: 2026-09-16
Status: ACTIVE

### Unique Visitor milestone structure

The current table begins at 1 unique visitor, then 5, 10, 20, and proceeds mostly in increments of 10. The current page exposes milestones beyond 100 and into the expanded visitor roster.

A May 2026 forum discussion, citing the current wiki and in-game verification, reported 140 total visitors at that time and discussed Taylor/Spaceman completion for the maximum unique milestone. Because visitor rosters can change, store `unique_visitors_served` as a live account state rather than assuming a timeless maximum.

Corroborating source: https://hypixel.net/threads/do-you-not-need-to-accept-the-visitor-offers-for-both-taylor-spaceman-now.6095282/
Last verified: 2026-09-16
Status: ACTIVE for milestone semantics; VERIFY the absolute roster maximum whenever new visitors are added.

### Why visitors matter to stats

Visitors are not only reward progression. Current item mechanics can scale from visitor progress. Examples:

- Green Thumb equipment enchant scales with unique visitors served.
- Blossom Florist scales with total Garden Visitors served.
- Some pet or newer Farming mechanics may scale from visitor state.

Therefore an optimizer should persist both unique visitor state and total accepted/served state rather than storing a single `visitors` number.

## 9. Blossom visitor interaction

Each Blossom equipment piece has its own Florist piece bonus. Florist uses total visitors served and applies independently to each worn Blossom piece.

Current Florist per-piece table:

```text
1 visitor -> +1.5 FF
5 -> +3.0
10 -> +4.5
20 -> +6.0
50 -> +7.5
75 -> +9.0
100 -> +10.5
150 -> +12.0
250 -> +13.5
500 -> +15.0
750 -> +16.5
1000 -> +18.0
1500 -> +19.5
2000 -> +21.0
2500 -> +22.5
```

This is per worn piece, independently. Four Blossom pieces at the 2,500-visitor tier therefore contribute four instances of the +22.5 Florist bonus in addition to their four +7 base stats.

Source: https://hypixelskyblock.minecraft.wiki/w/Blossom_Set
Last verified: 2026-09-16
Status: ACTIVE

## 10. Jacob's Farming Contest

Jacob's Farming Contest is a recurring event:

- Occurs every 3 SkyBlock days / once per real-life hour.
- Lasts one SkyBlock day / 20 real-life minutes.
- Selects three random Farming Collection crops.
- Requires Farming 10 and talking to Jacob at least once.
- A player must collect at least 100 of the current event crop to receive any reward.

Source: https://hypixelskyblock.minecraft.wiki/w/Jacob%27s_Farming_Contest
Last verified: 2026-09-16
Status: ACTIVE

### Current brackets without GOATed

- Bronze: top 60%
- Silver: top 30%
- Gold: top 10%
- Platinum: top 5%
- Diamond: top 2%

With Finnegan's GOATed perk active, the current page lists wider thresholds:

- Bronze: top 70%
- Silver: top 40%
- Gold: top 20%
- Platinum: top 10%
- Diamond: top 5%

These are population-relative thresholds. Do not predict a guaranteed medal from a static crop count unless using current contest distributions.

### Rewards and medals

Bronze/Silver/Gold have their own medal currencies. Platinum and Diamond do not introduce separate medal items; instead they award combinations of existing medals plus increased tickets/rewards.

Current listed reward examples:

- Bronze: Bronze medal, 10 Jacob's Tickets, 1 Carnival Ticket, Turbo-Crop I, 40 Bits.
- Silver: Silver medal, 15 Jacob's Tickets, 1 Carnival Ticket, Turbo-Crop I, 50 Bits.
- Gold: Gold medal, 25 Jacob's Tickets, 2 Carnival Tickets, Turbo-Crop I, 60 Bits.
- Platinum: Gold + Bronze medals, 30 Jacob's Tickets, 2 Carnival Tickets, Turbo-Crop I, 70 Bits.
- Diamond: Gold + Silver medals, 35 Jacob's Tickets, 3 Carnival Tickets, Turbo-Crop I, 80 Bits.

Source: Jacob contest page above.
Last verified: 2026-09-16

## 11. Turbo-Crop contest gates

The current contest page states Turbo-Crop grants +5 matching Crop Fortune per level. It also documents medal gates for older levels:

- Turbo IV requires having earned Bronze in that crop.
- Turbo V requires having earned Silver in that crop.
- If the requirement is not met, the enchantment acts as if the player did not have Turbo-Crop at all.

The modern Farming Fortune page also lists Turbo-Crop VI and VII through Turbo Gourd / Enchanted Turbo Gourd and gives a current maximum of +35 matching Crop Fortune at VII.

Because the contest page's explanatory text still says "up to 5" while the modern Farming Fortune page lists VI/VII, the offline corpus must distinguish historical gate text from modern maximum level. Do not infer VI/VII gate behavior from the old IV/V text without dedicated verification.

Sources:
- https://hypixelskyblock.minecraft.wiki/w/Jacob%27s_Farming_Contest
- https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune
Last verified: 2026-09-16
Status: ACTIVE for IV/V gates and VII/+35 maximum; VERIFY exact VI/VII application gates if recommendation depends on them.

## 12. Contest preparation

The current wiki explicitly notes two high-level contest preparation techniques:

- Pest preparation: up to 20 pests can be prepared ahead of the contest (8 on Garden plus 12 in Vermin Traps according to the current page) and killed at contest start for a score spike.
- Greenhouse preparation: Greenhouse plots can be prepared with the contest crop for an immediate collection burst influenced by Greenhouse upgrades and Farming Fortune.

Source: Jacob contest page, Tips section.
Last verified: 2026-09-16
Status: ACTIVE as documented strategy; exact optimal timing depends on current pest/Greenhouse mechanics.

## 13. Collection vs Crop Milestone vs contest score

These are different counters:

- Collection: account collection progression; may count sources that do not count toward Crop Milestones.
- Crop Milestone: Garden-only player-harvest progression for a specific crop.
- Jacob score: event-window crop collection for one selected contest crop.
- Tool counters: item-local counters such as Cultivating/tool XP.

Never substitute one counter for another because they happen to increase while farming.

## 14. Garden progression strategy principles

For a fresh or midgame profile, prioritize gates before luxury stats:

1. Unlock Garden functionality and enough plots to build viable farms.
2. Raise Farming level to unlock armor/tools/content.
3. Progress Crop Milestones for permanent/account interactions and item scaling.
4. Buy crop-specific upgrades for the crop actually being farmed.
5. Serve visitors when their rewards/progression are worth the material/opportunity cost.
6. Build contest capability when medals/Tickets unlock meaningful upgrades.
7. Only then compare expensive marginal FF/Overbloom improvements using current prices.

This is not a universal fixed purchase order. The optimizer should branch by current profile state, target crop, Ironman/normal economy, and whether the user's goal is XP, coins, contest placement, visitors, pests, or collection.
