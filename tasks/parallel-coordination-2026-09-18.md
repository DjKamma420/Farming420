# Parallel work coordination — 2026-09-18

This file is a short-lived coordination snapshot for agents working on Farming420 in parallel.
It is not a substitute for `AGENTS.md`, `tasks/todo.md`, the research knowledge base, or current GitHub state.
Before editing a claimed area, refresh `main`, open PRs, and recent commits.

## Snapshot

- Repository: `DjKamma420/Farming420`
- Snapshot main commit: `373ae81c56e5d52f9e48338c69126b050500e59d`
- Snapshot time: 2026-09-18
- Recent main work is concentrated on accessory progression, exact item/head art, setup portraits, equipment art, and the Pesthunter Necklace rendered fallback.

## Open work already in flight

### PR #107 — Pufferfish Hat / Thorny / Overbloom

Branch: `fix/pufferfish-thorny-overbloom`

Primary scope:
- normal vs celebration Pufferfish Hat
- intrinsic Thorns V event hat handling
- Thorny Farming Fortune
- armor-Thorns Overbloom
- beyond-normal-max enchant handling where legitimate
- setup/stat propagation and regression coverage

Files touched by the PR include:
- `src/app.js`
- `src/armor-fortune.js`
- `src/computed-stats.js`
- `src/enchant-presentation.js`
- `src/equipment-fortune.js`
- `src/item-catalog.js`
- `src/item-editor.js`
- `src/runtime-data-patches.js`
- `src/setup-selection-ui.js`
- `src/skyblock-redesign.js`
- `src/snapshot-apply.js`
- related research and tests

At this snapshot GitHub reports the PR as not directly mergeable. Its base is 17 commits behind current main.

### PR #108 — farming enchant options and secret strategies

Branch: `feat/farming-enchant-options`

Primary scope:
- Feast
- Crop Fever
- Replenish
- Delicate V-only handling
- farming enchant compatibility by item family
- Thorny/Thorns secret-strategy presentation
- NBT synchronization for modeled tool enchants
- Sunflower/Moonflower Turbo isolation
- guide ladders and Bug Blender scope

Files touched:
- `src/app.js`
- `src/data.js`
- `src/enchant-presentation.js`
- `src/item-editor.css`
- `src/item-editor.js`
- `src/progression.js`
- `src/snapshot-apply.js`
- related tests

At this snapshot GitHub reports the PR as not directly mergeable. Its base is 14 commits behind current main.

## High-conflict files: avoid starting unrelated work here

Until the two PRs above and the current art/accessory work settle, avoid opportunistic refactors in:

- `src/app.js`
- `src/data.js`
- `src/enchant-presentation.js`
- `src/item-editor.js`
- `src/item-editor.css`
- `src/snapshot-apply.js`
- `src/item-art-ui.js`
- `src/item-art-coverage.js`
- `src/skull-art.js`
- `src/farming-accessories.js`
- `research/FARMING_ACCESSORIES.md`
- setup/armor/equipment presentation files unless the task explicitly owns that area

A task that must touch one of these files should first compare against both current `main` and the relevant open PR.

## Safe preparation work with high value

These tasks can be researched or specified without colliding with the current UI/model work.

### A. Resolve remaining VERIFY mechanics

Highest-value unresolved item already documented by the repository:

- Garden/Pest Bestiary permanent Farming Fortune total.
- Existing research explicitly records a current-source disagreement rather than a trusted value.
- Do not choose 66, 96, or another value by inference.
- Produce a source-backed result with exact scope, version/date, and whether the value is a total, incremental reward, or category subtotal.
- If authoritative evidence remains conflicting, improve the uncertainty record instead of activating a value.

### B. Close acquisition-cost coverage gaps

The generated cost link previously established:
- 85 rankable upgrade entries
- 12 priced from research
- 2 covered by another entry
- 11 earned rather than bought and needing a time figure
- 60 without linked price research

Useful preparation:
- map each unpriced entry to Bazaar item ids, AH-only acquisition, NPC cost, Garden currency, event currency, collection unlock, or time-only acquisition
- preserve `unknown != 0`
- separate acquisition cost, resale value, recurring cost, opportunity cost, and time-to-obtain
- do not inject snapshot prices into player-facing recommendations when a live Bazaar route exists

Prefer adding research/data mappings or generator inputs over hand-writing values into runtime UI code.

### C. Time-to-obtain model for earned upgrades

The calculator specification requires two economic paths:
- purchasable: coin acquisition cost
- earned: active time / passive wait / gated progression converted only when the model has a declared opportunity-cost basis

Prepare a machine-readable route schema covering:
- active farming time
- passive waiting/time gates
- market/order waiting
- event-only windows
- Garden currency or pest currency grinds
- prerequisite chains
- whether a route can also be bought instead

Do not collapse all time into coins without an explicit player-specific coins/hour baseline.

### D. Current-mechanics lastVerified audit

`AGENTS.md` requires non-trivial mechanics to carry a real source and `lastVerified`.
Safe work is to inventory missing/stale verification metadata and group it by mechanic/source.

Rules:
- no mass-fill of dates
- verification date must be later than the newest relevant game change in `docs/FARMING_HISTORY.md`
- Alpha/Coming Soon values must not affect live calculations
- current official patch notes outrank superseded older material
- the retired official wiki domain must not be treated as a live source

A useful output is an audit table of:
`mechanic -> runtime consumer -> current source -> last relevant patch -> verification status -> action`.

### E. Calculator data wiring audit

The calculator core is now reachable and live Bazaar crop pricing exists, but deeper ranking still depends on data coverage.

Prepare mappings for:
- crop base drops
- verified sustained BPS assumptions vs measured BPS
- crop-specific multipliers
- normal crop stream vs rare-crop stream
- pest EV
- recurring spray/consumable costs
- contest-only effects
- mutually exclusive setup contexts

Do not add a universal Farming Fortune/Overbloom conversion. Revenue equivalence must remain context-dependent.

## Integration order for the current parallel wave

1. Let exact art/accessory/equipment work on `main` stabilize.
2. Rebase/update PR #108 onto current main, resolving editor/CSS conflicts without discarding current art/accessory behavior.
3. Rebase/update PR #107 after #108 or explicitly reconcile their shared enchant/editor/snapshot changes.
4. Run the full test suite.
5. Run browser startup smoke.
6. Run overlay audit.
7. Run the click/page sweep on desktop-empty, desktop-filled, and phone-filled.
8. Only merge when required checks are successful, the mergeable state is clean, the PR is not draft, and no unresolved requested changes remain.

## Cross-agent invariants

- English-only repo content.
- Never invent a mechanic, item capability, model id, price, stat value, or source.
- Unknown is not zero.
- A displayed item model must be exact or explicitly documented as a stand-in/fallback.
- Mutually exclusive setups must never be summed.
- Recombobulation and rarity-scaled effects are per-item capability decisions, not blanket class rules.
- Accessory enrichments must be capability/rarity aware rather than exposed universally.
- Runtime DOM enhancers must converge to a no-op on an identical second pass.
- Do not create two writers for the same UI concern.
- New state fields require persistence/migration consideration and tests.
- Prefer pure model functions plus tests before UI wiring.

## Before claiming a new task

Check:
1. latest `main` commits
2. open PR filenames
3. this coordination file
4. `tasks/todo.md`
5. `research/AI_KNOWLEDGE.md`
6. the relevant machine-readable research files

If another branch owns the same runtime file, prepare research, tests, fixtures, schemas, or an isolated module first instead of editing the shared file blindly.
