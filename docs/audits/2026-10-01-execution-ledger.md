# Farming420 final audit — execution ledger

Date: 2026-10-01. Audited application commit: `bda761d81deb0be37af9fad31f5469efb992df82`. Documentation branch: `audit/final-verification-2026-10-01-cont17`.

User authorization: continue the audit until all checks are accounted for and save intermediate progress in the repository. This extends repository writes to audit documentation; it does not authorize application fixes or deployment. Historical planning coverage is not a current test pass.

## Status rules

- PASS: completed against the pinned current source with recorded evidence.
- FAIL: executed and contradicted the expected behavior; a concrete fix plan is required.
- BLOCKED: attempted or inspected, but required device capability, authoritative source, credentials, or complete test input is unavailable. Never turn this into PASS.
- UNKNOWN: not yet executed or not adequately evidenced.
- SOURCE_REVIEW: source path inspected without claiming runtime acceptance.

## Work queue

| Area | Current state | Next action |
|---|---|---|
| Current repository and deployed build | PASS: unchanged main and prior live build stamp match | Keep immutable source pin |
| Repository checkpoints | PASS: mobile CONT12–16 saved in commit 2f6eaaa4249f4c037ee8d3d5bf5cc3f351e0f7e9 | Append checkpoints after each substantive check group |
| Complete Node/Python tests | UNKNOWN | Materialize hash-verified source and execute |
| Planner sweep | UNKNOWN | Run unchanged repository script; record scope and exit code |
| Overlay audit | UNKNOWN | Run unchanged repository script; distinguish source audit from runtime DOM checks |
| Browser startup/idempotence gate | UNKNOWN | Inspect harness and current CI evidence; browser interaction only through supported CUA |
| Persistence/schema/migration/backup | SOURCE_REVIEW retained; not a fresh full pass | Review writers and tests, exercise safe fixtures |
| Item identity, pet copies, rarity, origin, reforges, gemstones | SOURCE_REVIEW retained | Recheck owning models and independent boundary cases |
| Normal/rare/Pest/Feast profit and cost routes | SOURCE_REVIEW retained | Check unknown/zero and current authoritative sources |
| Chips, shards, effects, temporary/permanent scope | SOURCE_REVIEW retained | Check metadata, current source gates and planner filtering |
| Greenhouse/Contest/Vacuum | Partial source verification retained | Finish unresolved mechanic boundaries; keep Alpha excluded |
| UI controls, menus, art and scroll | Partial live desktop checks in CONT03–16 | Continue remaining representative paths and owner checks |
| Phone 320/360/390/412px, rotation, touch, software keyboard | BLOCKED: current browser has no resize/emulation API | Do not claim live mobile acceptance; source matrix in mobile checkpoint |
| Original full 109-version report bytes | BLOCKED: not available in this workspace/approved file references | Preserve identity and retained findings; do not overwrite or pretend recovery |

## CONT17 — checkpoint preservation

Pinned current main was fetched again and remains `bda761d81deb0be37af9fad31f5469efb992df82`. AGENTS.md applies repository-wide; recursive tree contains no nested AGENTS.md. Current package declares Node tests, Python tests, sweep, overlay and farming-model audit commands, with no external package dependency declaration. The integrated backlog explicitly leaves complete regression and real phone flows open. Existing historical claims in tasks/todo.md do not replace a fresh execution.

The source snapshot is being created separately for read-only test execution. Each materialized text file must match its recorded Git blob SHA before its results are accepted. This is not a Git clone; no local git-status pass is claimed. Test executions must not mutate the audited app source.
