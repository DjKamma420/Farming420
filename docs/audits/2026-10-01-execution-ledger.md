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


## CONT20 — completed repository sweep and first mobile runtime checkpoint

Run 36889907588 / job 110462606790 checked out audit commit 312c6276f1361c2fc7283681112fde576327baff and verified no application source delta from the immutable pin. All ten sweep areas completed PASS. The existing overlay audit reported zero distinct findings, within the harness limitations in CONT19. Per-area logs also contain external HTTP 403/429 resource failures; a sweep PASS is not online-resource availability acceptance.

The supplemental mobile probe executed all eight viewport fixtures, producing 32 PASS, 8 FAIL and 8 BLOCKED cases. Blank Add Set → Cancel remained open in all eight fixtures (existing R06). The probe then stopped in each fixture because two Pet Item slot buttons exist after adding the third set; this is an audit selector defect, not an application runtime crash. Revision 63835c5fbf77dcea3b18496672267198d776b9a1 scopes the slot to data-setup-target="normal" and reruns the remaining checks. No application fix was made.

New executed header evidence: at 320px the two fixed-role set buttons are only approximately 13.75px wide, with 41px/51px clipped text. With three sets, each set tab is 12px wide and the Remove Set button overlaps the third tab. The screenshot confirms unreadable labels and overlapping controls. At 360/390px both role labels are clipped; at 412px BPC Set is still clipped. Header containment/page-width checks originally passed and did not detect this usability defect; additional readability and center-point hit tests now prevent that false acceptance. Custom 48-character labels alone may legitimately use ellipsis, but fixed-role labels must remain identifiable and interactive. Fix plan: allow the activity/set control group its own mobile row; avoid shrinking role tabs below their label budget; place Add/Remove separately or give tabs a deliberate internal horizontal scroller with all targets reachable. Accept 2/3 sets and maximum custom names at all four phone widths and landscape heights.

Current official resource audit resolved 152/152 physical Farming items: 43 direct model routes, 109 fallback routes (18 resource-pack set fallbacks and 91 vanilla material fallbacks). This proves resolver coverage, not semantic art accuracy or current game formulas. Source endpoint: https://api.hypixel.net/v2/resources/skyblock/items. Artifact records resource pack lastUpdated=1789684384763. No unresolved IDs. Fallback Pesthunter art remains a separate presentation finding.

Evidence artifact: https://github.com/DjKamma420/Farming420/actions/runs/36889907588/artifacts/11176517159 (43 files, 2,039,234 bytes, SHA256 f40bad8cb9540fe5073043a2a91afd8984e90bee84739d7fee2b0fdc2630793d). Retention is 30 days; JSON checkpoint and findings are stored in the repository for persistence. Genuine device keyboard/notch/OS behavior is still outside headless Chromium viewport evidence.


## CONT21 — independent state/economics boundary execution

Independent deterministic probes against the verified source produced 30 cases: 17 PASS, 13 FAIL. These are case counts, not 13 distinct application defects. Full inputs/results are preserved in docs/audits/2026-10-01-boundary-evidence.json.

- B01 future-schema protection: migrateState preserves a newer shape and reports isNewer; ordinary newer backups are rejected (PASS). canonicalizeStoredPage nonetheless rewrites a newer state (gear → setups), producing one storage write (FAIL). The central saveState guard is insufficient because independent writers bypass it. New backup boundary: a current-version envelope enclosing schemaVersion=11 state is accepted and restamped to 10 (FAIL). Fix plan: validate both declared schema versions before migration; reject inconsistent envelope/state versions and either future value; guard every persistence entry point centrally. Acceptance must prove identical raw storage bytes and zero writes for newer data across startup, navigation, editors, settings/sync and restore rejection, plus valid older-version migration.
- NEW01 unknown Pest inputs: null/blank BPC becomes one expected Pest, and null/blank Farming + Crop Fortune becomes one guaranteed Fly crop item (four FAIL cases). Undefined remains unknown; explicit zero remains valid (PASS). Fix plan: reject null/undefined/blank before Number conversion in both helpers and propagate missing inputs into coverage/revenue. Never substitute an assumed zero for absent user stats.
- NEW06 same-species identity: a selected level-100 Cow identified by pet:selected-copy resolves to the first same-species level-1 Cow (other-copy); derived Fortune is 1 and marked complete rather than the selected copy's 100 (two FAIL cases). Fix plan: resolve physical pet UUID first; never borrow a different copy's level/experience. Missing exact identity must remain unresolved unless an explicit local level is present. Test duplicate species in both orders, explicit/manual level, missing synced UUID and active-profile fallback.
- NEW02 scope correction: current research/vacuum-damage.js and live Vacuum damage route are correct; src/pest-mechanics-data.js still exports the old 100/120/150/200/250 table. idealVacuumKillSeconds disagrees for four upgraded tiers (FAIL). The helper is not established as the active UI damage path. CONT11 cleared the current UI/research claim, not every remaining exported legacy helper. Fix plan: remove the obsolete duplicated table or derive it from the canonical current damage source; never turn ideal damage/pull arithmetic into sourced real handling time. Official 0.27 confirms 100/150/200/300/400 and Bookworm +20: https://hypixel.net/threads/hypixel-skyblock-0-27-torrhus-canyon-critter-safari.6132090/
- NEW03 scope correction: the current source-driven adapter DOES accept explicit zero throughput and retains an active Feast rare-drop stream when its price is unknown (PASS, incomplete with missing price). Older retained claims about this lower adapter are superseded for this pin. Measured-baseline/UI positive-only input handling is a separate policy boundary, not proof that profit-engine rejects zero.
- New Contest wrapper boundary: contestEstimate with measured 20 breaks/s, 100% uptime and missing Fortune stats returns complete=true and 24,000 collection; the underlying Jacob model keeps missing Fortune incomplete. Fix plan: preserve missing stats in the wrapper instead of Number(stats.* ?? 0), retaining the documented explicit default only for legitimate absent contest-specific bonuses. Test null/blank/missing and known zero separately. Do not infer medal rank from collection alone.

Current acquisition cost null remains unknown with null payback; explicit zero cost remains known. Crop price null remains incomplete, price zero is complete zero revenue. These correct behaviors require no proposed fix.

Fresh source verification now also reaches the first-party September 30 0.27.2 Release Candidate in the Alpha Network forum: https://hypixel.net/threads/september-30-0-27-2-release-candidate.6158219/. Its Greenhouse/Minister changes are excluded from live numerical acceptance until released live. This resolves the prior inability to retrieve the official candidate; it does not promote Alpha mechanics.
