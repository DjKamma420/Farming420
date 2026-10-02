# Audit fixes — 2026-10-02

Goal: implement and verify the eighteen ordered audit work packages, without merge or deployment.
Branch: `fix/audit-2026-10-02`.
Application baseline: `bda761d81deb0be37af9fad31f5469efb992df82`.
Audit baseline: `e666096b55d1a2a887374feb7c7cd743e8cbe111`.
Last secured remote commit: `36e076755ed4ffaf1c47da112dc2fdc6d57900fd` (focus checkpoint). Last available local checkpoint: `1f0e678`. Local execution is currently offline; subsequent changes use GitHub Git objects without force updates. CLI push is unavailable; GitHub API mirrors verified local trees without force updates.

## Actual repository state

- Real Git clone is available. Initial `--no-checkout` staging deletions were the unmaterialized clone, not existing user work. Switching the new branch materialized all files; `git status --short` was empty.
- Remote main and the audit branch match the supplied baselines; no newer application delta.
- Only open PR found: #108, stale enchant branch. No audit fix branch existed.
- Current user authorization overrides AGENTS.md's historical automatic merge instruction: no merge/deployment.
- Read repository AGENTS.md, product/profile/math specifications, render safety, task queue and continuation records. Audit handover documents copied byte-for-byte from the pinned audit branch.

## Work packages

| Order | Work | Status |
|---|---|---|
| 1 | Future-schema storage protection | tested (717a6bd); final-head verification pending |
| 2 | Backup envelope/state validation | tested (717a6bd); final-head verification pending |
| 3 | One physical tool reforge | implemented; regression tested |
| 4 | Physical pet identity | implemented; regression tested |
| 5 | Unknown numeric helper inputs | implemented; regression tested |
| 6 | Contest missing Fortune | implemented; regression tested |
| 7 | Manual scroll cancels restores | in progress; browser acceptance pending |
| 8 | Mobile header/set layout | tested original acceptance; final-head verification pending |
| 9 | Add Set Cancel/focus | tested original acceptance; final-head verification pending |
| 10 | Menu/drawer keyboard ownership | in progress; browser acceptance pending |
| 11 | Cropshot valid controls/idempotence | in progress; browser acceptance pending |
| 12 | Phillip count/duration/expiry | implemented; live numeric curve blocked (Alpha-only) |
| 13 | Canonical Vacuum helper | implemented; regression tested |
| 14 | Canonical chip rates/confidence | implemented; regression tested |
| 15 | Numerical provenance/incompleteness | implemented safeguards; remaining live lore blocked |
| 16 | Canonical art ownership | implemented; browser acceptance pending |
| 17 | Validated single Pages publisher | implemented workflow; account settings/deployment blocked |
| 18 | Honest browser/sweep gates | in progress; strict CI/negative acceptance pending |

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

## Browser gate diagnostic checkpoint

- Validation run 36948511791: success on remote baae1a5. Browser run 36948511845: FAILURE in Chromium job 110655961365, Firefox 110655961100, WebKit 110655961320; probe exits 1, no acceptance claimed.
- Detail JSON/screenshots are retained as binary artifacts; the available GitHub connector cannot download binaries. The workflow now also prints the probe log while preserving its exit code, so subsequent failures are diagnosable. This is an intentional new diagnostic run, not a blind rerun.
- Pages settings GET is rejected by the connector endpoint allowlist (HTTP 400); account publishing authority remains externally blocked.
- Next: inspect text evidence from the diagnostic commit while implementing count/duration and canonical numeric tables.

## Packages 12–18 and browser corrections checkpoint (incomplete)

- Browser diagnostic run 36949166626 on bbe5671: Chromium 87 PASS / 9 FAIL / 8 NOTE; Firefox and WebKit each 95 PASS / 1 FAIL / 8 NOTE; zero BLOCKED. All 24 menu settlement/Escape/ArrowDown/touch cases pass. Remaining failures: Chromium Add Set Escape asynchronous removal and long name at 800x360 in all engines. Durable extracted evidence: [browser checkpoint](../docs/audits/fix-browser-checkpoint-2026-10-02.json). Corrections now add explicit dialog cancel ownership and short-landscape tab wrapping; repeated browser acceptance pending.
- Phillip: discovered a second misleading +1000 maximum in pest-model.js. Both displays now derive +5 per Pest / +200 cap from one table, explicitly **Alpha preview**, never complete live Fortune. Added persisted Pest count, observed duration, single activation expiry/deactivation and scheduled recomputation. Missing duration/count remains unknown; no price/stack interpretation.
- Primary source search confirms Rarefinder 1.5/2/2.5 and +50 live patch. August 3 Phillip/Cropshot changes are explicitly Alpha. August 4 live release does not publish those curves. The affected numeric parts are blocked by current live lore; independent fixes continue. docs/VERIFIED_MECHANICS.md records the corrections before historical notes.
- All ten generated chip rows derive from farming-modifiers-data.js. Added rarity-aware chip totals/editor caps; Cropshot stays VERIFY without the misleading ACTIVE +100 claim or fabricated +60 curve.
- Vacuum legacy table now derives five current physical models and legal Bookworm/Buzzing modifiers. Added ideal damage-unit count; deprecated unsourced seconds return unknown, never real handling throughput.
- Historical 2024 Pest divisors retained only as historical fields; current guaranteed-drop calculation remains unknown. Alpha/community shard entries visible VERIFY and excluded from complete totals/rankings. Unsupported Cow rarity/level perk interpolation stays incomplete; pinned Legendary level-100 lore retained.
- Art: shared canonical Pesthunter equipment heads, no broken remote-icon glyph leaks, and failed Tater/other art retains its source identity so identical reapply cannot endlessly retry the same failed image. Clover correct mapping remains intact.
- Pages: workflow_run gate requires successful Validate Farming420 main push from this repository; exact validated SHA checked out/stamped; removed 70-second sleep. Account settings remain blocked by connector allowlist; no merge/deployment executed or claimed.
- Gates: exact PR head validation, .mjs syntax checks, real main scrolling/open overlays, nav/action outcomes, propagated sweep failures/pageerrors/crashes, exact DOM plus zero-mutation idempotence. Core identical state announcements now avoid needless repaint. Generic drawer changes route through shared setter (including exclusivity); direct reforge display reads physical authority.
- Full numerical regression suite before art/gates: 1,376 Node + 8 Python pass, exit 0. Subsequent full suite found three outdated source contracts; navigation, exclusivity and deployment gate contracts corrected, 32/32 pass. New sweep injected-worker test passes for exit 1/2/7 and success control.
- Current interruption: none; UI/art/new strict gates still require browser acceptance and expanded future-schema/backup/manual-scroll fixtures.
- Running processes: none at checkpoint. Latest sessions 88936/28021 completed; no rerun of a still-running job.
- Next executable step: sync this checkpoint; inspect strict CI mutation/failure evidence; extend retained browser probe with future raw bytes, schema disagreement, controlled late mutation, Home/End/Tab, drawer and Cropshot one-action checks. Complete final gates against final secured remote commit.

## Strict mutation and browser regression checkpoint (incomplete)

- Remote 1e5b65c: Validate run **36950721341**, job **110662833872**, FAILURE. Syntax, Python tooling, required files, static references and service-worker gates PASS. Startup FAIL in the strengthened idempotence probe; full npm tests skipped in CI. Locally at that checkpoint 1,377 Node + 8 Python tests PASS, exit 0.
- Browser run **36950721335** at 1e5b65c: retained UI probe PASS in Chromium job 110662833917, Firefox 110662834287 and WebKit 110662834094 (zero failed/blocked cases). Chromium strict overlay step FAILED; shell implicit errexit hid its diagnostic log and skipped the sweep/negative controls. No strict-gate acceptance claimed.
- Exact DOM/mutation probe found repeated navigation label/class writes, tool context classes, rarity remove/readd, and header attributes. Guards now avoid writing unchanged attributes/classes; rarity applies only changed tokens. Baseline waits for actual startup quiet, while all mutations during same-state announcements still fail.
- Cropshot direct writes now compute the existing derived cache before its single guarded persistence operation. The browser fixture counts main-state writes and verifies the persisted level.
- Expanded browser probe: future formatted raw schema 11 plus opaque sentinel stays byte-identical with zero writes across startup/edit/sync/reset; invalid JSON and future independent backup versions preserve saved bytes; normal export/restore; all picker Home/End/Tab/Escape/outside focus; Effects drawer keyboard/focus; controlled late DOM mutation after manual wheel.
- Strict workflow disables implicit shell errexit while collecting diagnostics, prints actual overlay/sweep exits, runs independent negative pageerror control even after a gate failure, and returns the combined failure.
- Idempotence negative controls now inject both a redundant attribute write (exact DOM unchanged) and a changed attribute of equal byte length; both pass through the same acceptance function and must return nonzero. These faults are confined to test harness query parameters.
- Changed files: src/{skyblock-redesign,activity-mode-ui,rarity-background-ui,direct-controls}.js; scripts/{audit-fix-browser.mjs,browser-idempotence-smoke.html,browser-startup-smoke.sh}; browser workflow; four old class-operation source contracts updated to the same-value no-op contract.
- Validation: session 25238 completed, **1,377 Node + 8 Python PASS**, exit 0. Node probe syntax, shell syntax, static audit (462 references), service-worker shim PASS, exit 0. Browser results for these new changes remain pending.
- No running local process. Previous remote jobs completed; a new run is justified by the code/diagnostic changes. Current error: strict browser acceptance is not complete; draft PR #301 remains incomplete. Account Pages settings and unresolved live numeric lore remain blocked as above.
- Next executable step: secure this checkpoint, inspect its new exact-head CI runs and printed overlay/sweep/mutation/probe failures, fix each actual regression, then run all final gates against the final secured commit.

## Persisted-state / art ownership checkpoint (incomplete)

- 2ccba15 Validate **36951800679 / 110666146885 FAILURE**: all pre-startup gates PASS; strict idempotence still fails only Setups (261 mutations, equal length), Crops (393, equal length) and Tools (60). Core render mutates its transient projection after saving; unchanged announcements incorrectly repaint. Core now compares the last observed persisted input before considering a repaint. UX hidden/class writes are conditional.
- 2ccba15 Browser **36951800721**: all engines 96 PASS / 0 FAIL / 0 NOTE / 8 BLOCKED. Original menu/layout plus separate future-schema/backup fixtures pass, but extended keyboard loop accidentally toggled an already-open editor closed. Probe now opens an editor only when absent. BLOCKED remains a failed job, not accepted coverage.
- Chromium strict overlay inspected: one finding, intentionally absolute listbox escapes its compact details trigger (overflow visible), no runtime errors; all 120 main scroll requests recorded, 20 real overlays opened. Gate now evaluates intentional anchored listbox horizontal bounds against viewport; it retains generic overflow findings and all other checks.
- Sweep really failed all navigation-ready checks: it waited for hidden links before opening the collapsed navigation. It now waits for the visible navigation trigger then opens and verifies the real links/landed page. Negative pageerror control previously did not reach injection; no negative acceptance claimed yet.
- Tool presentation and canonical farming-tool-art disagreed on Dicer tier and the latter removed another family's existing legacy fallback. Dicer variants derive from the existing verified pack table; unverified families leave their existing fallback owner intact. No new item art or live identity guessed. Tool recommendation display now also uses the shared physical reforge authority (explicit none/conflicts handled consistently).
- Two image-fallback routes replaced attempted identity with catalog/skull identity, retrying the failed original on identical apply. Both retain attempted identity. Added disposable offline-image fixture for Tater, four Pesthunter pieces and Clover, checking truthful nonempty art, no broken images, zero repeat mutations/requests. The fixture makes no network availability or physical-device claim.
- Art tests 66/66 PASS; session 12964 full suite 1,377 Node + 8 Python PASS, exit 0. This suite ran before final probe/navigation/overlay harness corrections; syntax rechecked before securing. Updated render incident log with causes and strict negative-control contract.
- No active local process; 2ccba15 jobs completed, no duplicate run started. Current failure: new browser/sweep coverage and zero-mutation acceptance still pending. Next: secure checkpoint; inspect new CI individual results, then resolve any remaining keyboard/action/scroll/gate regressions.

## Render-hook / absence and strict interaction checkpoint (incomplete)

- 717a6bd **Validate 36952429737 / 110668064526 SUCCESS**, all individual gates PASS: exact tested SHA, JavaScript/Python syntax/tooling, required files, static 464 references, SW retirement, Dashboard/Loadouts/rarity startup, exact DOM+zero mutations across ten pages, both injected equal-length/redundant-write negative controls, 11 art portraits, normal/trusted tool scroll across all 12 physical transitions, 1,377 Node and 8 Python tests. Maximum trusted tap anchor drift 1.42 px; no late displacement.
- 717a6bd Browser **36952429771** jobs 110668064737 (Chromium), 110668064761 (Firefox), 110668064582 (WebKit): retained original cases and future schema/backup PASS; extended loop again BLOCKED (open editor exists but dropdown disappears after selection). Core's async value-refresh render announces `farming420:rendered`, while setup selection only listened to clicks/state changes. Existing selection owner now rebuilds from that explicit render hook; no broad observer re-enabled.
- Chromium strict overlay PASS, exit 0, zero findings/errors, 120 actual main scroll requests and 16 opened overlays. Strict sweep FAIL exit 123: all pages capture external 403/429, planner stale-row snapshots time out, Shards budget incomplete. Injected runtime-error control did reach all three variants and return 1 with AUDIT_INJECTED_RUNTIME_ERROR; negative acceptance succeeds even though ordinary sweep remains red.
- Sweep now records observed failed HTTP response URLs. External 403/429 is an explicit network note (not successful networking); local resource failures, other console errors, all pageerrors/crashes and failed action outcomes still fail. Planner refreshes visible targets after each action instead of clicking obsolete rank snapshots. Per-variant budget 90 seconds / worker wall 300 seconds; budget expiry still nonzero.
- Added keyboard PageUp with controlled pane focus and synthetic touch intent/controlled scroll late-mutation fixtures. These do not claim physical touch-pan or OS rotation.
- Cow helpers now share strict finite parsing for experience/Strength/manual level. Unknown inputs stay unknown, known zero remains valid. Removed unverified exported Strength threshold interpolation; only pinned Legendary level-100 endpoint is usable. Unsupported rarities remain incomplete. New regression covers blank/boolean/array/object, zero, endpoint and unresolved curves.
- Session 54217: **1,378 Node + 8 Python PASS**, exit 0. Setup selection suite 22/22 PASS; injected-worker aggregation 1/1 PASS. Real resource model command session 28600 PASS **152/152**, 43 direct / 109 fallback; generated timestamp-only artifact delta was discarded, no coverage change or model invention.
- Active local processes: none. 717a6bd remote jobs now complete. No same-commit blind rerun. Current error: extended picker/scroll acceptance and complete ordinary sweep pending. PR #301 remains a draft; live numeric/account/device limitations retained.
- Next executable step: secure this implementation checkpoint, inspect its exact-head browser/gate cases (especially restored picker keyboard flow, one-write Cropshot, manual intent, offline art and full sweep), then resolve actual failures and finish final-commit validation.

## Active picker focus and final acceptance expansion (incomplete)

- **1ba9c8a Validate 36953329823 / 110670811971 SUCCESS**, every individual gate PASS, including 1,378 Node + 8 Python tests and strict positive/negative browser smoke. Latest browser jobs all completed; no rerun of a live process.
- **1ba9c8a Browser 36953329817**: Chromium 169 PASS / 1 FAIL / 8 NOTE; Firefox 168 PASS / 2 FAIL / 8 NOTE; WebKit 162 PASS / 8 FAIL / 8 NOTE; **zero BLOCKED**. All future-schema/backup, Cancel/layout, drawer, Cropshot exactly-one-write, offline physical-art and controlled keyboard/touch-intent cases PASS. Remaining: Chromium helmet focus during late price repaint; Firefox two Pet Item Tab exits; WebKit manual wheel sampled mid-native animation (all final deltas exactly requested +160, not a reverse anchor restore). Extracted evidence: [1ba9c8a browser evidence](../docs/audits/fix-browser-1ba9c8a-2026-10-02.json).
- Strict Chromium overlay PASS exit 0, zero findings/runtime errors, 120 main scroll targets / 16 opened overlays. Ordinary sweep **all ten areas PASS, exit 0** with external 403/429 URL notes. Negative pageerror sweep returns **1** with explicit injected marker in all three variants. No pageerrors/crashes hidden.
- Tab closes in a task after the browser's native focus action, rather than a microtask that could hide its target early. Tab also invalidates old queued interaction focus/scroll restorations, including inside editable controls.
- Price-only core renders defer while navigation/drawer/listbox is open or picker owns focus; leaving/closing it flushes through the existing render/interaction owner. Added a deterministic value-refresh event while an option is focused; its node/focus must survive. Expanded exact-DOM/zero-mutation acceptance to each open Pet/Pet Item/helmet editor; guarded unchanged editor classes.
- WebKit wheel fixture now waits for 200 ms of settled scrolling within the still-active anchor window before injecting a delayed DOM mutation; it still rejects a subsequent displacement. Known native scroll animation is not labeled an app restore defect.
- Pages rejects obsolete validation completion after main advances. It checks current main before configure/stamp/upload/deploy and skips obsolete source; exact validated SHA remains immutable. Fresh public main fetch still bda761d; no foreign delta. Account Pages publishing setting remains unreadable via connector; no deploy.
- Offline immutable artifact check at secured 1ba9c8a PASS: prepared marker/index match exact SHA, all 465 static references resolve. This is artifact validation, not deployment verification.
- Full suite session 14143 PASS 1,378 Node + 8 Python. A subsequent run (7542) found one outdated source contract for immediate price rendering; contract now requires deferred owner plus blocked-interaction guard/capture/render/restore. Session 80623 rerun PASS (exit 0). Node syntax and diff whitespace checks pass.
- Current interruption: none; implementation continues, draft PR #301 incomplete until new head's relevant browser matrix and full repository gates pass. Active local processes: none. Next: secure these focused corrections, inspect new exact-head CI, resolve any open-picker mutation/focus regressions, then update final status and run final-commit gates.

## Connector continuation after environment disconnect (incomplete)

- Local execution failed before starting the next command: **409 environment_offline**, “Environment is not connected.” No new process/session was created. The planned strict UI parser follow-up was not executed locally. Last secured local/remote trees match at local 1f0e678 / remote 36e0767; **no current clean Git status is claimed**. Continuing through the GitHub connector against exact secured files.
- **36e0767 Browser 36954678429**: all three retained engine probes PASS **194 / 0 FAIL / 8 NOTE / 0 BLOCKED each**, including 24 open-picker exact DOM/zero-mutation cases, controlled value refresh/focus, wheel/key/synthetic-touch intent, one-write Cropshot, future schemas, restore and offline physical art. Firefox job 110674907732 and WebKit 110674907475 succeed. Chromium 110674907828 retained probe/overlay pass, strict sweep fails due one external market-history 400; all actual interaction variants report ok, nine areas PASS.
- Chromium overlay PASS exit 0: 120 actual main targets, 16 open overlays, zero findings/runtime errors. Synthetic pageerror control still returns 1. Extracted engine reports/CI IDs remain available; no workflow-level green substituted for individual failures.
- **36e0767 Validate 36954678457 / 110674907976 FAIL**: pre-startup gates PASS; first raw Dashboard Chrome dump exceeds its 45-second outer wall, no verdict; npm tests skipped. Three-engine runtime and empty-profile sweep bootstrap succeed at the same source, suggesting runner/native CLI startup latency rather than demonstrated renderer freeze (inference, not a pass). Diagnostic raises only process wall to 90 seconds and prints per-dump wall/exit; app virtual budget stays 5 seconds, strict DOM/negative/freeze gates unchanged.
- Rarefinder HTTP 400 is already handled by fetchMarketAverage as null quote + explicit error. No evidence supports changing its canonical item ID. New regression proves rejected history is not cached as zero and the acquisition remains UNKNOWN, including old manual-price counterexample. Only observed SkyCofl history HTTP 400 is recorded as an unavailable-price note; other/local 400 and all runtime/action errors remain failures. The live price source remains unavailable, not verified successful.
- Applied through the connector: existing Strength/Garden/level UI reads reuse finite-number.js so boolean/blank/array inputs cannot look known. No new mechanics or second data model.
- Current error/interruption: local environment offline; native startup and updated market-error classification need remote validation. All previous CI jobs completed; no duplicate or hanging process rerun. Changes in this checkpoint have **not** been tested locally.
- Next executable step: secure this connector checkpoint, inspect new exact-head Validate and three-engine runs; if startup still fails, diagnose its printed wall/DOM evidence instead of declaring success. Finish full final-head gates and ledger/PR update; no merge/deploy.
