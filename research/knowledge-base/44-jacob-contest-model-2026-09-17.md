# Jacob's Farming Contest calculator model — 2026-09-17

Runtime implementation: `src/jacob-contest-model.js`.

## Live event structure

- A contest lasts 20 real-life minutes (1 SkyBlock day).
- Contests occur every 3 SkyBlock days / 1 real-life hour.
- Three crops are offered per contest.
- Participation requires collecting at least 100 units.
- Greenhouse 0.24 expanded the contest crop pool to all 13 current Farming crops: the original ten plus Sunflower, Moonflower and Wild Rose.

## Current brackets

The 0.19.7 Pest update changed the percentile brackets and added Platinum and Diamond:

| Bracket | Final percentile | Jacob Tickets | Medal currencies |
|---|---:|---:|---|
| Diamond | top 2% | 35 | 1 Gold + 1 Silver |
| Platinum | top 5% | 30 | 1 Gold + 1 Bronze |
| Gold | top 10% | 25 | 1 Gold |
| Silver | top 30% | 15 | 1 Silver |
| Bronze | top 60% | 10 | 1 Bronze |
| Participation | remaining eligible players | 1 | none |

Current Better Mayors event rewards also grant 3 Carnival Tickets for Diamond, 2 for Platinum/Gold, and 1 for Silver/Bronze.

### Critical calculator boundary

A raw crop score does **not** imply a medal. Brackets are relative to the participant population for that specific contest. The app therefore must not contain a permanent "Gold = X crops" threshold.

`jacobBracketFromFinalPercentile()` accepts a finalized percentile. `estimateJacobContestScore()` deliberately returns `bracket: null`.

Live in-contest counters/cutoffs have also had player-reported reliability issues in 2026, reinforcing that provisional counters should be labeled provisional rather than treated as final results.

## Score model

Contest score is modeled as collection gained during the event, not Coins/h.

Direct farming expectation:

`validBreaks = breaksPerSecond × durationSeconds × uptimeRatio`

`effectiveFortune = Farming Fortune + crop-specific Fortune + contest-only crop Fortune`

`directCollection = validBreaks × baseUnitsPerBreak × (1 + effectiveFortune / 100)`

The direct model requires explicit Farming Fortune, Crop Fortune, contest-only Crop Fortune and uptime. Missing values remain unknown; callers must provide an explicit `0` only when a bonus is known to be absent.

Additional collection sources are separate explicit streams. Examples:

- pre-spawned Pest drops collected during the contest;
- Pest drops obtained while the contest is active;
- Greenhouse harvest prepared for the contest;
- other verified collection-increasing sources.

This separation is intentional. A Pest/Greenhouse score contribution must not be disguised as extra breaks-per-second or generic Farming Fortune.

## Personal Best perk

Anita's Personal Best perk grants permanent crop-specific Fortune from the player's best contest score, capped at +100 Crop Fortune per crop.

Crops required for +0.1 Crop Fortune:

| Crop | Collection / +0.1 | Collection for +100 |
|---|---:|---:|
| Wheat | 1,000 | 1,000,000 |
| Carrot | 3,000 | 3,000,000 |
| Potato | 3,000 | 3,000,000 |
| Pumpkin | 1,000 | 1,000,000 |
| Melon | 5,000 | 5,000,000 |
| Mushroom | 1,000 | 1,000,000 |
| Cactus | 2,000 | 2,000,000 |
| Sugar Cane | 2,000 | 2,000,000 |
| Nether Wart | 3,000 | 3,000,000 |
| Cocoa Beans | 3,000 | 3,000,000 |
| Sunflower | 2,000 | 2,000,000 |
| Moonflower | 2,000 | 2,000,000 |
| Wild Rose | 2,000 | 2,000,000 |

The runtime formula preserves fractional Fortune rather than rounding to whole/tenth values before the final display.

## Anita contest accessories

During Jacob's Contest the Anita accessory line grants crop Fortune to a selected/random contest crop:

- Talisman: +5
- Ring: +15
- Artifact: +25

The selected crop is player-specific and is not safely inferred from another player's calendar/result. If the selected crop for the current player is not known, the calculator must return unknown rather than assuming the bonus applies.

## Overdrive Chip

Overdrive is modeled in `src/farming-modifiers-data.js` as a contest-only crop-Fortune source. It belongs in `directFarming.contestCropFortune` only while the relevant Jacob context is active.

## API boundary

The current official `/v2/skyblock/garden` schema documents Garden experience, crop upgrades, resources, plots, visitors/commissions, composter and barn skins. It does not document Personal Best contest values, current contest percentile/cutoffs, redeemed Garden Chip levels or active short-lived farming buffs.

Those values therefore remain manual/external/live-observable inputs until a verified source is mapped. Missing API fields must not be treated as zero.

## Strategy objective

For `jacob-contest` context, candidate upgrades are compared by expected **contest collection score** (or a known finalized bracket result), not by Coins/h. A candidate can improve normal profit but still be irrelevant to contest score, and vice versa.

## Sources

- Official original contest release: https://hypixel.net/threads/0-9-11-city-project-farm-merchants-dwelling.3502250/
- Official 0.19.7 bracket changes: https://hypixel.net/threads/skyblock-patch-notes-0-19-7-garden-pests.5537683/
- Official 0.24 Greenhouse/new crops: https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/
- Official Better Mayors Carnival rewards: https://hypixel.net/threads/june-3-better-mayors.5646904/
- Current Anita Personal Best table: https://hypixel-skyblock.fandom.com/wiki/Anita
- Anita accessory effect: https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Artifact
- Official current API schema: https://api.hypixel.net/
