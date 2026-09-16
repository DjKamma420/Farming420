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
- Upgrade ranking must account for cost versus effective gain, including Farming Fortune and Overbloom rather than treating Crop Fortune as a universal stat.

## Current game-version baseline

- Do not stop the audit at 0.26.1. The live game has since received 0.27 and 0.27.1 changes.
- Relevant current farming corrections already represented in the data include Cropshot Chip +3/+4/+5 FF per chip level by rarity, Harvesting up to +75 total, Pesthunter Phillip +5 FF per pest capped at +200, Orchid Mantis, Thorny/Overbloom and the current God-Potion/Mixin handling.
- Keep official Hypixel patch notes as the preferred source when a later patch supersedes older wiki/community values.

## Implemented in this continuation

- `src/farming-reforges.js`
  - Covers the five current Farming Tool reforges: Bountiful, Blessed, Overpriced, Deep Fried, Earthy.
  - Separates normal crop-profit, Feast RARE-CROP/Overbloom, XP/collection, Seasoning/milestone, and Sowdust use cases.
  - Adds explicit records for all 13 farming crops.
  - Marks Overpriced/RARE-CROP recommendations as in-season conditional.
- `src/workspace-direct-picker.js` + `.css`
  - Replaces the visible Tools dropdown with direct tool choice buttons while preserving the existing select as the underlying state/control bridge.
- `src/direct-controls.js` + `.css`
  - Direct controls now apply consistently to upgrade cards across Account/Crops/Items-style sections.
  - Binary entries use direct ON/OFF controls.
  - Small level chains expose every state from 0 through max.
  - Large chains use compact decrement/current/increment controls.
  - Reads state fresh on each action instead of using a stale captured level.
  - Clears mutually exclusive peers when a new exclusive state is selected.
- `src/effective-gain.js`
  - Adds pure revenue-aware math for Farming Fortune versus Overbloom.
  - There is intentionally no fixed universal `1 Overbloom = X FF` conversion.
  - FF-equivalent Overbloom depends on current FF, current Overbloom, normal crop coins/hour, and RARE-CROP coins/hour.
  - Includes marginal coins/hour, Coins per Effective Fortune and payback-hours helpers.
- `research/effective-gain-model-2026-09-16.md`
  - Documents the formulas, source assumptions and planner implications for future agents.
- Tests:
  - `tests/farming-reforges.test.js`
  - `tests/effective-gain.test.js`

## Effective-gain formula

For normal crop revenue `N`, effective Fortune `F`, rare-crop revenue `R`, Overbloom `O`, and Overbloom change `dO`:

`FF_equivalent = dO * (R / N) * ((100 + F) / (100 + O))`

Use this only for coin-efficiency comparison. Collection, XP, Feast milestone, Sowdust and other goals require separate scoring.

## Next implementation priorities

1. Remove duplicated/legacy editor surfaces now that direct card controls work, instead of stacking new UI on old UI.
2. Add setup inputs/estimates for normal crop coins/hour, RARE-CROP coins/hour and current Overbloom, then replace the prototype Fortune-only planner sort with `effective-gain.js` marginal coins/hour/payback logic.
3. Add goal-aware planner modes: normal profit, total profit, contest/collection, Farming XP, Feast RARE CROPS, Seasoning, Sowdust and pest farming.
4. Continue the complete live-version farming audit, focusing on sources still marked VERIFY rather than re-researching mechanics already confirmed in runtime patches.
5. Expand texture-pack-backed item art coverage and make missing-art fallbacks visually consistent.
6. Add browser-level/UI regression coverage for direct controls and exclusive-state transitions.

## Verification note

The repository has not exposed a connector-visible GitHub Actions run for these latest commits. Node tests have been added to the repository, but CI confirmation is still pending.
