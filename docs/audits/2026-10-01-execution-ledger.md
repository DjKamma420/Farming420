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

Final classification supersedes the historical next-action entries. A completed review can contain FAIL or BLOCKED results.

| Area | Final classification |
|---|---|
| Current repository/deployed build | PASS: pinned main still unchanged; previously checked live stamp matches |
| Repository checkpoints | PASS: incremental CONT17–24 evidence, inventories and final fix plan committed |
| Complete Node/Python tests | PASS in fresh full-checkout validation: 1,360 Node / 8 Python |
| Planner/page sweep | PASS in all ten areas, limited by swallowed actions/errors and external request failures |
| Existing overlay audit | Executed zero reported findings; SOURCE_REVIEW identifies owner/scope/exit-code gaps |
| Browser startup/idempotence | PASS startup and approximate same-state checks; strict zero-mutation acceptance not established |
| Persistence/schema/migration/backup | FAIL future startup/writers and inconsistent backup envelope; PASS ordinary migration/rejection and verified export; disposable restore final run pending below |
| Item identity/rarity/origin/reforges/gems | FAIL duplicate Cow copy and competing legacy Tool Reforge flags; PASS documented identity/rarity/manual controls and existing regression; unresolved live rarity curves BLOCKED |
| Normal/rare/Pest/Feast profit and cost | PASS explicit zero/unknown cost/active unpriced Feast boundaries; FAIL unknown Pest helper coercion; complete unsourced Pest economics stays UNMODELLED |
| Chips/shards/effects | SOURCE_REVIEW complete inventory and current filtering; specific curves/stacking BLOCKED; Phillip/UI controls have retained fix plans |
| Greenhouse/Contest/Vacuum | PASS 53-source-table match and current Vacuum damage; FAIL stale helper / missing Contest stat wrapper; complete gameplay economics BLOCKED |
| UI/menus/art/scroll | FAIL Cancel/Escape/header/controlled manual scroll; tool-relative anchors and last-option reachability PASS; fallback art findings retained |
| Phone matrix/landscape/taps | PASS execution across eight viewports; observed app failures recorded; physical keyboard/notch/pan/OS rotation/zoom BLOCKED |
| Original full 109-version report | BLOCKED: unavailable approved bytes; historical identity/findings preserved |
| Deployment | SOURCE_REVIEW completed; account Pages configuration endpoint BLOCKED; no deploy performed |

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


## CONT22 — eight-viewport runtime matrix completed

Run 36890836600 / job 110465744798, audit source unchanged, executed all eight viewport fixtures without probe-execution BLOCKED cases. Raw counts were 75 PASS, 29 FAIL, 8 NOTE (112 cases). Eight FAIL were a probe expectation defect: 13 logical crops map to 12 physical tool cards because Sunflower/Moonflower share a tool. These are not application defects. The final probe now derives physical tool coverage from the current crop-to-tool map. Corrected interpretation of this run: 83 PASS, 21 genuine FAIL, 8 NOTE; do not alter the raw evidence JSON.

Confirmed application failures: blank Add Set Cancel in all eight viewports; Pet Item menu Escape in all eight; fixed FF/BPC labels clipped at all four portrait widths; third-tab center obscured by Remove Set at 320px. These are four behavior categories, not 21 distinct defects.

Normal tool changes completed for all twelve physical tools in all eight viewports. Non-clamped movement is at most 1.375px; 320px Wheat has -9px movement at an actual scroll boundary. It must not be repaired by forcing impossible scroll coordinates. Runtime pageerror arrays are empty. Every Pet Item menu's last option became hit-test reachable after scrolling. Initial menu placement below the viewport is recorded NOTE, not an unreachable-option defect.

CONT13 correction: actual 320px editor expands to 270px, yielding 240px inner budget and a 240px grid; grid-vs-editor excess is zero. The CSS-only 234px budget prediction did not account for the expanded parent and is not a runtime grid-overflow failure. Main still reports clientWidth=280 and scrollWidth=287 (7px internal excess); this remains a narrow-width owner/spacing observation requiring exact clip/reachability acceptance in a fix, not an established 6px clipped Pet Item control. Other viewports fit their grid budgets within 0.375px.

The eight viewport tuples are 320×568, 360×800, 390×844, 412×915, 568×320, 800×360, 844×390 and 915×412. They use hasTouch=true and tap controls in Chromium. Landscape dimensions are independently created contexts, not physical OS rotation. Menu reachability uses wheel scrolling, so it does not establish real finger-pan behavior.

Evidence committed as docs/audits/2026-10-01-mobile-evidence-CONT22.json. Screenshots/log artifact: https://github.com/DjKamma420/Farming420/actions/runs/36890836600/artifacts/11176951464 (2,636,663 bytes, SHA256 512bda760a9533388e45cdff7197aa84a3cfccc5138d5cbcafacc7e9326b455a).

Final supplemental revision 9d3f3893e7fd308bbe3f294ed9baa472d3b3ea55 adds downloaded-backup byte/state verification, newer-schema startup storage preservation, and controlled late-mutation behavior after manual wheel scrolling. The mutation case specifically exercises the real app observer with a harmless audit attribute; it is not claimed to be a spontaneous production snapback reproduction.


## CONT23 — complete source/catalog inventory and remaining acceptance boundaries

Fresh full-source inventory confirms 158 src files, 184 test files, 30 storage-write call sites across 24 JS files. Exactly 18 call sites across 17 files target the main state (the earlier scoped count is confirmed, not replaced by all-cache counts). 24 files construct MutationObservers. Fourteen main-writer files contain no explicit future-version guard anywhere; file-level guard presence is only a source signal, not proof that every call path is protected. Full locations and statements are committed in docs/audits/2026-10-01-source-inventory.json. This closes inventory collection; B01's reproduced failures still require implementation.

Catalog inventory: 13 logical crops, 98 upgrade entries, 85 ACTIVE and 13 VERIFY, zero duplicate IDs, zero missing source URLs. Sections: account 10, accessories 8, crops 3, tools 14, chips 10, gear 13, pets 5, buffs 10, shards 25. All 25 Attribute Shard cards share max=10; explicit unpriced multi-output shard rows retain empty plannerTargets and stay unranked through the objective adapter. The lower mechanics module contains ten chips, ten temporary modifiers and twelve shard records. Counts and exact metadata are committed in docs/audits/2026-10-01-catalog-inventory.json. Existing passed regression covers shard objectives, chip cap/rarity behavior, effect controls, reforge exclusivity, gemstone thresholds, manual acquisition costs and crop-context routes. Structural tests are not independent game-mechanic proof.

Source provenance boundary: several shard mechanics remain ACTIVE_REPORTED_0_27 and link to a community thread explicitly titled outdated/Alpha. The official live 0.27 article independently confirms Pest shard identities, Praying Mantis +3–30% Pest damage and Field Mouse +0.5–5 Pest Overbloom. It does not enumerate every other current shard rarity/effect curve; it explicitly excludes some Alpha changes from its release. No current live profile/item lore was provided to close the remaining numerical provenance checks. Fix plan: retain visible provenance and confidence, replace Alpha-derived curves only with live official/lore evidence, and prevent unresolved curves from producing a confident complete Coins/h rank. Source: https://hypixel.net/threads/hypixel-skyblock-0-27-torrhus-canyon-critter-safari.6132090/

Independent positive identity control: a manual Melon Helmet remains byte-equivalent after an automatic worn-armor sync; empty Boots fill from the same fixture, demonstrating the sync actually executes. Explicit overwrite replaces the helmet with Synced Helmet. Base RARE plus one Recombobulator resolves to EPIC. The current model's manual-origin and basic rarity behaviors pass these cases; historical B03 is not treated as a blanket failure of current prefill. Separate Cow physical identity and legacy manual-progress/reforge routes remain governed by their recorded findings.

Current Greenhouse reference deliberately produces no Coins/h from loot multipliers alone; growth/harvest/water/mutation/minigame inputs are not invented. All 53 coefficients previously compared with the August 20 official source remain the recorded verified table; the prose comment claiming 55 is inaccurate documentation, not two proved missing rows. Contest collection never determines a live medal bracket without percentile input; current wrapper's unknown-stat failure is in CONT21. Dashboard Pest/Grand Feast economics explicitly remain UNMODELLED rather than substituting crop profit. Phillip's binary UI approximation and temporary-duration model still need the retained per-Pest/expiry fix plan.

Deployment source review: pages.yml explicitly states that branch-based Pages publication runs alongside its stamped workflow and works around it with sleep 70. The stamped deploy job has no dependency on the validation workflow. This supports B08's race/gating concern at source level. The connector rejects the /pages settings endpoint, so current account configuration is BLOCKED rather than a freshly verified dual-publisher runtime fact. Fix plan: use one Pages publishing authority, deploy a validated immutable SHA, include stamping before upload, remove timing-based ordering, and verify deployed build markers plus complete asset paths. No deployment was initiated.

Checks needing unavailable evidence stay explicitly BLOCKED: authenticated live sync with a real safe profile/API key; complete backup restoration against original user data (disposable export bytes are separately being tested); exact live Pest divisors/cooldown/cap economic model and every pet rarity/perk curve; physical Android/iOS finger scrolling, software keyboard, notch/insets, real OS rotation and accessibility zoom; original version-109 report bytes. These are dependencies, not unexplored executable tests or implied PASS results.


## CONT24 — final scroll, future-storage and exported-file execution

Run 36897926730 / job 110489525918 verified application source unchanged and completed the corrected physical-tool matrix. Counts: 84 PASS, 30 FAIL, 8 NOTE, zero BLOCKED (122 cases). These include known failures and are not an acceptance pass merely because the evidence-preserving job's overall conclusion is success. The mobile probe's own exit code is 1, and continue-on-error preserves all following evidence uploads.

B07 is now executed, not only source-inferred: in every viewport, a normal tool tap establishes an anchor; manual wheel moves main by +160px; a subsequent harmless controlled app-root attribute mutation causes the actual app observer to restore the previous scroll position within approximately 1px. Example 390px: 841 → 1001 → 841. Fix plan: cancel the interaction anchor and any queued restore on manual wheel, touch-pan/pointer intent, scrolling keys and a new navigation context; distinguish app-owned restoration from user scrolling. Preserve normal tool-change anchoring and valid boundary clamps. Acceptance must include late content/image mutations after manual movement, rapid interactions, all tool cards, editor changes and no observer restoration beyond the user’s last chosen position. The probe is a controlled late-mutation regression, not a claim about a specific production image load.

B01 now has browser startup evidence: seeding schemaVersion=11 and page=gear produces persisted page=setups, populated cropFortune/plannerEconomics and computed-stat objects, while leaving the numeric version at 11. The future sentinel survives, but identical-byte/no-write safety fails. This is stronger than the pure navigation-helper case and does not prove that every future field has been lost.

The downloaded backup in a disposable 390px fixture is a real JSON file, 12,486 bytes, schemaVersion=10; its sentinel survives and exported state matches current persisted state exactly. This closes CONT05's “download event without verified bytes” uncertainty for this fixture. It does not claim a restore of the original user's unknown state. The final supplemental probe revision d2476f4da62e0cc0bcdf2879403af17be7724442 additionally exercises actual valid/invalid/future-mismatched UI restore with disposable files.

Evidence committed in docs/audits/2026-10-01-mobile-evidence-CONT24.json. Artifact: https://github.com/DjKamma420/Farming420/actions/runs/36897926730/artifacts/11179978492 (2,640,429 bytes, SHA256 39d0eda9d7b0f8cb002e008db77b455373f61ce707f7405701bf3068fe6f86f9).

Additional B02 pure legacy regression: current Tool Reforge entry calculation with both Blessed/Bountiful level flags and explicit bucket.reforge=bountiful returns two cropFortune contributions totaling 30. Current UI selection/sync tests do not authorize stacking two modifiers on one physical tool. The source correctly enforces Beady/Buzzing exclusivity separately. Evidence: docs/audits/2026-10-01-legacy-reforge-evidence.json. Fix plan: resolve the selected physical tool/reforge as the sole stat authority, ignore incompatible legacy progression flags, preserve manual provenance and costs during reconciliation, and test stale flags with absent/known selected reforges, recomb rarity and shared Eclipse crop buckets.

Additional portrait screenshot review shows overlapping activity labels in Dashboard as well as Loadouts. At 320px Farming/Spawning/Killing widths are approximately 37px with 24/35/12px text excess; Spawning remains 4px over its width at 412px. This extends the same topbar group-layout fix, not a new independent root cause. Geometry containment alone does not certify legibility.
