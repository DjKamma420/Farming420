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

## CONT18 — complete existing regression gates

Source snapshot: 461 text files, 3,489,149 bytes, each verified against its immutable Git blob SHA before execution. No source modification was needed.

Local Node run: 1,360 tests executed, 1,357 passed, 3 failed. Two failures are asset-integrity tests because the UTF-8-only GitHub reader cannot materialize PNG blobs (confirmed UnicodeDecodeError on a real PNG). They are snapshot limitations, not established repository defects. The third was mkdtemp ENOENT because /tmp is unavailable in this sandbox. Re-running only deploy-completeness.test.js with TMPDIR under the writable workspace passed. The unaffected full test results are retained; no failing fixture was weakened.

Python: all 8 tests passed. Static local references and service-worker retirement checks passed.

A fresh validation job was requested through the GitHub connector on the exact audited main commit: workflow run 36657388139, new job 110456575169. It completed success. JavaScript syntax, Python tooling, required files, static references, service-worker retirement, browser startup smoke, and the complete npm test step all concluded success on the original repository with its assets. This is current CI evidence, separate from the incomplete local PNG snapshot. No Pages/deployment job was rerun.

Browser limitations remain: the CI idempotence harness uses a 1280x1000 iframe and compares node count/markup length, not exact DOM equality or zero mutations. A success is useful for its declared scope but does not prove every enhancer's strict no-op invariant or real phone layout. The 390/412px matrix is not cleared by this CI job.

Next: audit the sweep/overlay harnesses themselves, then independent model boundaries and remaining source gates.

## CONT19 — test-harness blind spots and CI audit route

SOURCE_REVIEW: scripts/overlay-audit.mjs scrolls window at 0/300/700 even though current app scroll ownership is main. Those three samples therefore do not establish nonzero main-scroll coverage. It also only audits default page content, not opened editors/menus, and does not fail its process when findings exist. Planned fixes: scroll the real main pane, verify actual landing/scroll position, open representative overlays/editors, and make the finding count affect the gate.

SOURCE_REVIEW: scripts/sweep-all.sh prints FAIL/BUDGET/KILLED but run_one returns the successful echo status, and the final logs echo also succeeds. The wrapper can exit zero despite failed workers. sweep-area.mjs additionally reports collected page errors/crashes but computes failure only from a verdict regex or budget. Planned fixes: propagate aggregate worker status and page errors/crashes; pin deliberately failing workers so the gate cannot be silently green. No repository harness was modified by this audit.

SOURCE_REVIEW: the idempotence harness only compares node/character counts; different markup of equal length or repeated equal-value writes can escape that comparison. Planned stronger regression: observe actual mutation count and canonical DOM equality after settlement, across populated representative editor states, without letting the test itself create the observed writes.

A new audit-only workflow was added on the isolated documentation branch to invoke the existing sweep/overlay scripts in GitHub CI, where disposable browser contexts can have real 390/412px sizes. It has contents:read permission, no secrets, no deployment step, and verifies app source is unchanged against the audited SHA. Dependencies install outside the checkout. Supplemental mobile probe code will live under docs/audits, separate from application source. continue-on-error preserves evidence; overall workflow success must NOT be interpreted as audit acceptance. Individual logs and verdicts decide PASS/FAIL/BLOCKED.
