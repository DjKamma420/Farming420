# Farming420 effective-gain model — 2026-09-16

## Verified mechanics

- Official Harvest Feast changes define `+1 Overbloom` as `+1%` to RARE CROP drop rates.
- Official May 14 changes explicitly move Pest RARE-CROP/non-guaranteed drop scaling away from Farming Fortune and onto Overbloom.
- Farming Fortune and crop-specific Fortune remain the normal crop-output axis.

Sources:
- https://hypixel.net/threads/april-21-fossil-essence-shop-farming-toolkit-harvest-feast-changes.6083245/
- https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/
- https://hypixel.net/threads/hypixel-skyblock-0-24-4-harvest-feast-event-fossil-essence-shop-and-more.6089392/

## Why no fixed conversion is valid

A fixed statement such as `1 Overbloom = 5 Farming Fortune` is only true for one particular setup and revenue mix.

For normal crop revenue `N`, current effective Fortune `F`, rare-crop revenue `R`, and current Overbloom `O`:

- marginal normal revenue from `ΔF` is `N * ΔF / (100 + F)`
- marginal rare-crop revenue from `ΔO` is `R * ΔO / (100 + O)`

Therefore the Farming-Fortune equivalent of an Overbloom increase is:

`FF_equivalent = ΔO * (R / N) * ((100 + F) / (100 + O))`

This is only a coin-efficiency comparison. It must not be used for collection, Farming XP, Feast milestone, Sowdust, pest-spawn, or other non-coin goals.

## Planner implications

The upgrade planner should eventually collect or estimate, per crop/setup:

- effective global + crop Fortune while farming that crop;
- Overbloom in the relevant context;
- normal crop coins/hour before a candidate upgrade;
- RARE-CROP coins/hour before a candidate upgrade;
- acquisition cost of the candidate;
- whether the candidate is permanent, temporary, event-only, pest-only, crop-only, or mutually exclusive with another state.

Then rank money upgrades using marginal coins/hour and payback time. Display Coins per Effective Fortune only as a secondary normalized diagnostic, not as the primary universal score.

## Current implementation

`src/effective-gain.js` implements the pure math. `tests/effective-gain.test.js` locks the conversion and zero-denominator behavior. The UI/planner still needs revenue-stream inputs or live estimates before this model can replace the prototype Fortune-only sorter.
