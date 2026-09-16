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
- On 2026-09-16, the remaining Garden/Pest Bestiary permanent Farming Fortune total was deliberately kept VERIFY because current references still disagree (notably 66 vs 96). Do not guess this value without a newer authoritative source.

## Implemented in this continuation

- `src/farming-reforges.js`
  - Covers the five current Farming Tool reforges: Bountiful, Blessed, Overpriced, Deep Fried, Earthy.
  - Separates normal crop-profit, Feast RARE-CROP/Overbloom, XP/collection, Seasoning/milestone, and Sowdust use cases.
  - Adds explicit records for all 13 farming crops.
  - Marks Overpriced/RARE-CROP recommendations as in-season conditional.
- `src/workspace-direct-picker.js` + `.css`
  - Replaces the visible Tools dropdown with direct tool choice buttons while preserving the existing select as the underlying state/control bridge.
- `src/direct-controls.js` + `.css`
  - Direct controls apply to non-derived progression cards.
  - Binary entries use direct ON/OFF controls.
  - Small level chains expose every state from 0 through max.
  - Large chains use compact decrement/current/increment controls.
  - Reads state fresh on each action instead of using a stale captured level.
  - Clears mutually exclusive peers when a new exclusive state is selected.
  - `gear` is now treated as setup-derived and therefore does not get duplicate direct-edit controls.
- `src/editor-dedupe.js`
  - Removes the second Tool-upgrade card grid from the Crops workspace; Tool state is edited only in Tools.
  - Removes duplicate Ownership & Level controls from the detail drawer because progression state is already edited directly on cards/workspaces.
  - Keeps the drawer for cost/planner evaluation, source location, rules and scope.
- `src/item-art-ui.js` + `.css`
  - Existing Hypixel pack textures remain the preferred item art source.
  - Missing manifest entries, missing SkyBlock IDs or image load failures now render a consistent pixel-style text fallback instead of leaving an empty visual hole.
  - Setup slot art uses skull textures first, then pack assets, then the fallback.
  - Gear analysis cards derived from Setups show a `FROM SETUP` marker and no duplicate direct editor.
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
- `src/planner-modes.js`
  - Defines seven planner goals: Profit, Collection/Contest, Farming XP, Feast RARE CROPS, Seasoning, Sowdust and Pest Farming.
  - Profit remains revenue/payback based.
  - Non-profit goals use relevance filtering and never invent Coin/FF conversions for unrelated metrics.
- `src/planner-mode-ui.js` + `.css`
  - Adds direct planner goal tabs.
  - Stores the selected mode under `profile.plannerMode`.
  - Non-profit modes hide the revenue panel and show only active, non-maxed upgrades relevant to that goal and crop.
  - Rows show marginal value, current level and mode context without pretending they have a payback value.
- `src/runtime-data-patches.js` VERIFY audit
  - Filled Rosewater Flask is now ACTIVE: +1 permanent Farming Fortune per consumed Filled Flask, up to 5.
  - Mutation Analysis is now ACTIVE as a +30 total permanent Farming Fortune source; individual analyzer reward breakpoints are not yet modeled.
  - The old generic `Exportable item (selected crop)` record is moved to `legacy` because Carrolyn does not support every crop.
  - Seven explicit Carrolyn +12 Crop Fortune entries were added for Wheat/Fine Flour, Carrot/Exportable Carrots, Pumpkin/Expired Pumpkin, Mushroom/Half-Eaten Mushroom, Cocoa Beans/Supreme Chocolate Bar, Nether Wart/Warty and Wild Rose/Prickly Kiss.
  - Garden/Pest Bestiary remains VERIFY due conflicting current totals rather than inventing a value.
- `research/effective-gain-model-2026-09-16.md`
  - Documents the formulas, source assumptions and planner implications for future agents.
- Tests:
  - `tests/farming-reforges.test.js`
  - `tests/effective-gain.test.js`
  - `tests/revenue-ranking.test.js`
  - `tests/planner-modes.test.js`
  - `tests/verified-permanent-sources.test.js`

## Effective-gain formula

For normal crop revenue `N`, effective Fortune `F`, rare-crop revenue `R`, Overbloom `O`, and Overbloom change `dO`:

`FF_equivalent = dO * (R / N) * ((100 + F) / (100 + O))`

Use this only for coin-efficiency comparison. Collection, XP, Feast milestone, Sowdust and other goals require separate scoring.

## Next implementation priorities

1. Continue the live-version VERIFY audit for unresolved entries other than the now-documented Garden/Pest Bestiary conflict; prioritize exact current mechanics over theoretical-max lists.
2. Expand actual pack-backed coverage by attaching verified SkyBlock IDs/packAsset keys to more upgrade entries, now that missing assets have a safe fallback.
3. Add browser-level/UI regression coverage for direct controls, revenue inputs, planner goal switching, drawer opening, art fallback and exclusive-state transitions.
4. Add automatic or assisted cost acquisition where data quality is sufficient; until then, unknown prices must remain explicit rather than guessed.
5. Continue collapsing one-state/multiple-editor leftovers outside Gear; Gear state is now authoritative in Setups and analysis-only elsewhere.
6. Remove the hidden legacy planner implementation from `src/app.js` once browser-level coverage exists; the visible Planner is now revenue-aware and goal-aware but old markup remains as a compatibility surface.
7. Improve non-profit goal ranking beyond text relevance where verified formulas exist (for example explicit XP/hour, Seasoning/hour, Sowdust/hour or pest-output models). Do not create fake universal conversions.

## Verification note

The repository has not exposed a connector-visible GitHub Actions run for the latest commits in this continuation. Local clone/test attempts from the execution container previously could not resolve `github.com`; therefore no passing test result is claimed unless a later agent obtains an actual CI/local result.
