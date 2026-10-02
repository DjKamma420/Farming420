# Audit fixes — 2026-10-02

Goal: implement and verify the eighteen ordered audit work packages, without merge or deployment.
Branch: `fix/audit-2026-10-02`.
Application baseline: `bda761d81deb0be37af9fad31f5469efb992df82`.
Audit baseline: `e666096b55d1a2a887374feb7c7cd743e8cbe111`.
Last secured commit: initial checkpoint (this commit); obtain its SHA with `git log -1`.

## Actual repository state

- Real Git clone is available. Initial `--no-checkout` staging deletions were the unmaterialized clone, not existing user work. Switching the new branch materialized all files; `git status --short` was empty.
- Remote main and the audit branch match the supplied baselines; no newer application delta.
- Only open PR found: #108, stale enchant branch. No audit fix branch existed.
- Current user authorization overrides AGENTS.md's historical automatic merge instruction: no merge/deployment.
- Read repository AGENTS.md, product/profile/math specifications, render safety, task queue and continuation records. Audit handover documents copied byte-for-byte from the pinned audit branch.

## Work packages

| Order | Work | Status |
|---|---|---|
| 1 | Future-schema storage protection | in progress |
| 2 | Backup envelope/state validation | open |
| 3 | One physical tool reforge | open |
| 4 | Physical pet identity | open |
| 5 | Unknown numeric helper inputs | open |
| 6 | Contest missing Fortune | open |
| 7 | Manual scroll cancels restores | open |
| 8 | Mobile header/set layout | open |
| 9 | Add Set Cancel/focus | open |
| 10 | Menu/drawer keyboard ownership | open |
| 11 | Cropshot valid controls/idempotence | open |
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
