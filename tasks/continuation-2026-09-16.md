# Farming420 continuation state — 2026-09-16

This file is for future coding agents continuing the project.

## User direction

- Treat this as a web app, not a spreadsheet.
- Reduce visual complexity aggressively.
- Main mental model: Account / Crops / Tools / Items.
- Prefer direct on/off or direct-choice controls instead of nested editors and redundant selectors.
- Do not put a global crop selector at the top of the Tools workflow. The user should enter Tools, select the physical tool, then edit that tool.
- Show all valid Farming Tool reforges so an incorrect/current state can be represented.
- Show recommendations in crop context, but do not invent crop-specific differences where mechanics are actually goal/event dependent.
- Use SkyBlock/Minecraft texture-pack art wherever useful and available.
- Progression must include lower tiers through max tiers, not only endgame states.
- Upgrade ranking must eventually account for cost versus effective gain, including Farming Fortune and Overbloom rather than treating Crop Fortune as a universal stat.

## Implemented in this continuation

- `src/farming-reforges.js`
  - Covers the five current Farming Tool reforges: Bountiful, Blessed, Overpriced, Deep Fried, Earthy.
  - Separates normal crop-profit, Feast RARE-CROP/Overbloom, XP/collection, Seasoning/milestone, and Sowdust use cases.
  - Adds explicit records for all 13 farming crops.
  - Marks Overpriced/RARE-CROP recommendations as in-season conditional.
  - Uses official Hypixel Harvest Feast notes for Blessed/Golden Ball/Large Walnut mechanics and the current community reforge guide for the specialist Feast reforges.
- `src/workspace-direct-picker.js` + `.css`
  - Replaces the visible Tools dropdown with direct tool choice buttons while preserving the existing select as the underlying state/control bridge.
- `tests/farming-reforges.test.js`
  - Guards five-reforge coverage, all 13 crop records, and Feast condition handling.

## Next implementation priorities

1. Make the same direct-choice interaction pattern consistent across the remaining Account/Crops/Items editors.
2. Replace duplicated/legacy editor surfaces instead of stacking new cards on top of old ones.
3. Add goal-aware recommendation presentation: normal profit, contest/collection, Farming XP, Feast RARE CROPS, Seasoning, Sowdust.
4. Audit complete farming progression and hidden stat sources after the 0.26.1 changes, including equipment/Thorny, pets, permanent consumables, account upgrades, buffs, cookies/potions, pests, Greenhouse and Feast systems.
5. Tie recommendations to the cost-vs-effective-gain model and live prices where data quality permits.
6. Expand texture-pack-backed item art coverage.

## Verification note

The repository currently exposes no GitHub Actions run for the latest commit, so the new Node test file has been added but no connector-visible CI result was available at the time of this handoff.
