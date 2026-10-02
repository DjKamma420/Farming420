# Audit fixes — 2026-10-02

Goal: implement and verify the eighteen ordered audit work packages, without merge or deployment.
Branch: `fix/audit-2026-10-02`.
Application baseline: `bda761d81deb0be37af9fad31f5469efb992df82`.
Audit baseline: `e666096b55d1a2a887374feb7c7cd743e8cbe111`.
Last secured remote commit: `657a4fd0130a189d872968f043f256c9cbe64551` (packages 1–2). Local checkpoint: `a12cb5b`. CLI push is unavailable; GitHub API mirrors verified local trees without force updates.

## Actual repository state

- Real Git clone is available. Initial `--no-checkout` staging deletions were the unmaterialized clone, not existing user work. Switching the new branch materialized all files; `git status --short` was empty.
- Remote main and the audit branch match the supplied baselines; no newer application delta.
- Only open PR found: #108, stale enchant branch. No audit fix branch existed.
- Current user authorization overrides AGENTS.md's historical automatic merge instruction: no merge/deployment.
- Read repository AGENTS.md, product/profile/math specifications, render safety, task queue and continuation records. Audit handover documents copied byte-for-byte from the pinned audit branch.

## Work packages

| Order | Work | Status |
|---|---|---|
| 1 | Future-schema storage protection | implemented; browser verification pending |
| 2 | Backup envelope/state validation | implemented; browser verification pending |
| 3 | One physical tool reforge | implemented; regression tested |
| 4 | Physical pet identity | implemented; regression tested |
| 5 | Unknown numeric helper inputs | implemented; regression tested |
| 6 | Contest missing Fortune | implemented; regression tested |
| 7 | Manual scroll cancels restores | in progress; browser acceptance pending |
| 8 | Mobile header/set layout | in progress; browser acceptance pending |
| 9 | Add Set Cancel/focus | in progress; browser acceptance pending |
| 10 | Menu/drawer keyboard ownership | in progress; browser acceptance pending |
| 11 | Cropshot valid controls/idempotence | in progress; browser acceptance pending |
| 12 | Phillip count/duration/expiry | open |
| 13 | Canonical Vacuum helper | open |
| 14 | Canonical chip rates/confidence | open |
| 15 | Numerical provenance/incompleteness | open |
| 16 | Canonical art ownership | open |
| 17 | Validated single Pages publisher | open |
| 18 | Honest browser/sweep gates | open |

## Changes, evidence and validation

- Confirmed main-state writes in sixteen modules bypass the core app guard, including startup derived-stat/capability adapters.
- Confirmed backup validator selects envelope version with `||` and overwrites the inner version before migration.
- Tests: not yet run in this checkout. Historical audit passes are not fix acceptance.
- Running CI/processes: none. Clone session 32815 completed with exit 0.
- Current interruption/error: none; implementation has started, this checkpoint is incomplete.
- Next executable step: route all main-state writes through one guard, add future-schema raw-byte and backup disagreement regressions, then run targeted tests.

## Packages 1–2 checkpoint

- Added `src/app-storage.js`: single guarded main-state write/reset owner, read-only access, recheck disk at every write (cross-tab upgrade protection). Routed all 15 existing runtime writers through it; profile imports/sync and restore use strict rejection. Future-schema actions are blocked before editor listeners; navigation/export/reload remain available. Raw backup export reads saved data, not the older UI projection.
- Fixed startup derived-cache dispatch to announce only a successful write, avoiding a repeated rejected-write loop.
- Backup validation checks both independent schema declarations before migration, rejects disagreement and invalid explicit versions, retains legacy omitted-version migration.
- New regressions: future raw bytes and opaque fields, cross-tab upgrade, supported migrations/reset, no bypass writer, future envelope/inner disagreement, invalid version types.
- Targeted persistence/import suite: 66/66 pass, exit 0. Expanded backup/property/UI route suite after corrections: 29/29 pass, exit 0.
- Initial full Node suite: 1,365/1,367 passed, exit 1. Both failures addressed: legacy omitted backupVersion compatibility and old source assertion requiring the unsafe direct restore writer. Not yet claiming a repeated full-suite pass.
- Browser runtime unavailable locally (no Chrome/Playwright found yet); CI browser verification will run on a remote fix commit.
- Next: packages 3–6 (reforge exclusivity, physical pet UUID, missing numeric inputs, contest adapter).

## Packages 3–11 checkpoint (incomplete)

- PR #301 is a draft; no merge/deploy. Remote persistence commit CI run 36947438507 concluded success; individual steps still to be recorded before final acceptance.
- Central physical tool reforge selection/write functions reused by computed totals and all editors. Explicit none suppresses stale flags; conflicting legacy flags contribute one incomplete source. Existing numeric reforge tables were not reinterpreted as new game evidence.
- Shared UUID-first pet resolver now serves Cow, Rose Dragon, Mosquito/Slug and editor levels. Missing explicit UUID never falls back to another copy; duplicate species without physical identity remain unresolved; explicit local level wins.
- Shared finite-number validation protects Pest/Chip/Hypercharge and Contest helpers from null/blank/boolean/array coercion. The omitted temporary Hypercharge option keeps its legitimate zero default.
- Regression suite covers flag order, Eclipse sharing, rarity/metadata preservation, duplicate pets in both orders, missing UUID/manual levels, unknown versus zero/default inputs. Five multi-case regressions pass. Existing targeted identity/numeric suite 69/69 pass. Full local suite after packages 3–6: 1,372 Node + 8 Python PASS, exit 0.
- Packages 7–11 now have code changes for user scroll cancellation generations, dedicated mobile control row/wrapping, non-submit Cancel/focus return, one shared picker keyboard owner, Effects drawer keyboard/focus, and sibling card controls. Browser acceptance is pending.
- Discovered an additional optional-chain writer in setup-selection-ui.js; routed it through the same storage guard and broadened bypass regression.
- Initial UI full suite: 1,371/1,372 pass, one old CSS expectation required nowrap. Updated to the new intentional wrap contract; browser geometry remains required.
- New three-engine workflow and probe based on the immutable October 2 audit, expanded to eight phone/landscape contexts and cancel/48-character-name scenarios. It checks exact PR head and propagates probe failure.
- Active local processes: none. Latest full-suite session 93202 completed exit 1 with the CSS assertion described above.
- Next: sync this incomplete working checkpoint to PR #301, inspect browser CI evidence, then implement packages 12–18 and expand final browser/gate acceptance.
