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
- `src/editor-dedupe.js`
  - Removes the second Tool-upgrade card grid from the Crops workspace; Tool state is edited only in Tools.
  - Removes duplicate Ownership & Level controls from the detail drawer because progression state is already edited directly on cards/workspaces.
  - Keeps the drawer for cost/planner evaluation, source location, rules and scope.
- `src/effective-gain.js`
  - Adds pure revenue-aware math for Farming Fortune versus Overbloom.
  - There is intentionally no fixed universal `1 Overbloom = X FF` conversion.
  - FF-equivalent Overbloom depends on current FF, current Overbloom, normal crop coins/hour, and RARE-CROP coins/hour.
  - Includes marginal coins/hour, Coins per Effective Fortune and payback-hours helpers.
- `src/revenue-ranking.js`
  - Converts modeled upgrade gains into Farming Fortune / Overbloom deltas without merging unrelated metrics.
  - Evaluates marginal coins/hour, FF-equivalent, Coins/FF-equivalent and payback.
  - Known-cost upgrades rank by shortest payback; unknown-cost rows remain visible but follow costed rows.
- `src/revenue-planner.js` + `.css`
  - Replaces the visible legacy planner list with the revenue-aware ranking while retaining the old list only as a hidden compatibility surface.
  - Adds per-crop inputs for normal crop Coins/hour, RARE-CROP Coins/hour and current Overbloom.
  - Stores economics under `profile.plannerEconomics[cropId]`.
  - Dashboard next-upgrade card switches to shortest-payback recommendation when a profit baseline and a priced candidate exist.
  - Missing costs are shown as missing, not treated as free.
- `research/effective-gain-model-2026-09-16.md`
  - Documents the formulas, source assumptions and planner implications for future agents.
- Tests:
  - `tests/farming-reforges.test.js`
  - `tests/effective-gain.test.js`
  - `tests/revenue-ranking.test.js`

## Effective-gain formula

For normal crop revenue `N`, effective Fortune `F`, rare-crop revenue `R`, Overbloom `O`, and Overbloom change `dO`:

`FF_equivalent = dO * (R / N) * ((100 + F) / (100 + O))`

Use this only for coin-efficiency comparison. Collection, XP, Feast milestone, Sowdust and other goals require separate scoring.

## Next implementation priorities

1. Remove the hidden legacy planner implementation from `src/app.js` once browser-level coverage exists; the visible Planner is now revenue-aware but the old markup remains as a compatibility surface.
2. Add goal-aware planner modes: normal profit, total profit, contest/collection, Farming XP, Feast RARE CROPS, Seasoning, Sowdust and pest farming.
3. Continue the complete live-version farming audit, focusing on sources still marked VERIFY rather than re-researching mechanics already confirmed in runtime patches.
4. Expand texture-pack-backed item art coverage and make missing-art fallbacks visually consistent.
5. Add browser-level/UI regression coverage for direct controls, revenue inputs, drawer opening and exclusive-state transitions.
6. Add automatic or assisted cost acquisition where data quality is sufficient; until then, unknown prices must remain explicit rather than guessed.
7. Continue collapsing one-state/multiple-editor leftovers in Gear/Setups where the same property is still represented twice.

## Verification note

The repository has not exposed a connector-visible GitHub Actions run for these latest commits. A local clone/test attempt from the execution container also could not run because that environment could not resolve `github.com`; therefore no passing test result is claimed. The test files are committed and await an environment with repository/network access or CI.
