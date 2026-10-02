# Farming420 audit continuation — 2026-10-02

This continues the October 1 audit under the user's request to keep working where possible and save interim evidence. Application source remains bda761d81deb0be37af9fad31f5469efb992df82, freshly checked as current main. Only audit documentation, probes and isolated audit CI are changed. The previously prepared implementation plan is not silently converted into application changes.

## CONT26 — reopen measurable menu stability

The retained October 1 matrix proves point-in-time menu hit targets, but post-wheel screenshots can disagree with the recorded scroll position. A follow-up therefore records immediate geometry, geometry after screenshot capture, geometry after 2.1 seconds, and an actual touchscreen.tap at measured coordinates. The selection case disables locator autoscroll by using the coordinate tap directly. If initial scrolling is unstable, a second recovery scroll after anchor expiry is recorded separately; recovery success must not clear the original stability failure.

The new isolated workflow tests Chromium, Firefox and WebKit through Playwright 1.63.0 in disposable full-checkout CI contexts at 320×568, 390×844 and 800×360. It verifies source identity before execution. Browser engines run with independent test profiles; no real user data or API key is used. It also checks Escape and declared-listbox arrow focus. Linux WebKit is not a physical iOS/Safari device, and hasTouch with coordinate taps/wheel does not establish real OS keyboard/notch/finger-pan behavior.

Workflow: .github/workflows/audit-browser-followup-2026-10-02.yml. Probe: docs/audits/2026-10-02-browser-followup.mjs. Trigger commit 28a3c74a1a035a1892312807208d6b4ebc33ed21; run 36943884775. Results are pending. Unlike the earlier evidence-preserving job, each new engine job propagates the probe's nonzero exit and uploads evidence with always(); red can be the expected record of an app defect, not a failed evidence upload.

## CONT27 — Rarefinder lower helper and source chronology

Official live 0.26.1, July 22, 2026, specifies Rarefinder +1.5/+2/+2.5 Overbloom per level and maximum +50. The visible src/data.js entry already uses max=20, stepGain=2.5 and notes the +50 maximum. However src/farming-modifiers-data.js still exports +2/+2.5/+3 and gardenChipEffect returns maxima 20/37.5/60 for RARE/EPIC/LEGENDARY instead of 15/30/50 at the current caps. All three independent comparison cases FAIL. This is a confirmed stale helper/canonical-source mismatch; it is not a claim that the current Dashboard directly consumes this helper. profile-farming-autodetect.js currently imports the table for chip lookup, and test imports exercise other helpers. Evidence: 2026-10-02-rarefinder-evidence.json.

Fix plan: derive Rarefinder helper and visible entry from one rarity-aware canonical source, update its provenance to the live July patch, and test each rarity/cap, intermediate level and unknown input independently. Preserve the current correct visible Legendary +50 entry. Audit other repeated rate tables for the same drift without bulk-redating them.

Primary source: https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/

The currently cited November 13, 2024 Pesthunter's Wares thread explicitly opens the Alpha Network and includes several superseded tables; Day 3's final-in-thread divisors match the exported 35/17.5/12/10.5/7 constants. That is proof of where the constants came from, not current live acceptance. The official live April 28, 2026 0.24.4 release states that Fortune-derived Pest crops were halved while base quantities were retained. May 14 switches non-guaranteed drops to Overbloom; it does not independently publish a complete guaranteed-drop table. Thus the source chronology supports NEW04's stale-confidence concern and rejects treating an unchanged 2024 table as VERIFIED today. Do not multiply/divide every current divisor and mark it verified without a current live formula/table, including rounding and later changes.

Primary sources:
- https://hypixel.net/threads/nov-13th-pesthunters-wares-chocolate-factory-additions-crimson-qol-and-more.5801731/
- https://hypixel.net/threads/hypixel-skyblock-0-24-4-harvest-feast-event-fossil-essence-shop-and-more.6089392/
- https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/

The July 22 patch confirms Cow perk changes and a base-Fortune scaling change, but does not specify every exact rarity/level/Farming-Strength curve. That remaining acceptance still needs suitable current live evidence; no missing coefficient is invented. All findings are audit-only.

## CONT28 — first cross-browser evidence and harness correction

Run 36943884775 completed in all three installed engines with uploaded evidence. Chromium 320×568, WebKit 390×844 and WebKit 800×360 each independently show the last option reachable immediately, then out of view after capture/settlement. Main scrollTop moves 2826→2565, 2303→2062 and 1846→1629 respectively, without an injected DOM mutation. The measured coordinate touch selects and persists YELLOW_BANDANA after recovery in all three. Thus a point-in-time hit is not stable acceptance; the manual-scroll/anchor cancellation work package remains required. Chromium 320 and WebKit 390 also reproduce Escape remaining open and ArrowDown leaving focus on SUMMARY.

Six viewport fixtures were blocked at navigation during startup DOM replacement, and WebKit landscape's post-selection keyboard continuation waited for an editor that had been removed/rebuilt. These are retained as probe limitations, not new proven browser incompatibilities. Probe correction commit 520cc38a966f935e5b711e002eb78abc2a31d0da allows startup hydration, conditionally opens navigation through normal taps, records bounded retries, and reopens a removed editor through its normal card. It does not force hidden controls, rewrite route state, or change app code. Follow-up run 36944520331 is pending.

Initial artifacts expire November 1, 2026; raw JSON remains retained locally and will be committed alongside final evidence. Artifact ZIP identity:
- Chromium: 11201621297, SHA256 adb207620c5ecfbd93ee7deec6be2a6e5d99b5e00f4601a810ef448bd8a72de5.
- WebKit: 11201596514, SHA256 e258ca800518ca2318d60e7544ea6985ef840794c264e2157f2900e9b091bc41.
- Firefox: 11200892542, SHA256 d0b30d8dda2ba8f472e10f53823eba4ece54995513b16b8f7eaa7f17bd52f001.

The Rarefinder mismatch is additionally encoded in tests/farming-modifiers-data.test.js:19, which asserts maxGardenChipEffect('rarefinder') === 60. A green existing test therefore cannot establish current mechanical correctness. The fix acceptance must replace that stale expected value using the cited live source and independently cover the rarity-specific caps. No source/test fix is included in this audit branch.

## CONT29 — nine-engine/viewport stability and helper boundaries

Corrected run 36944520331 completed all three engines. Each engine has 12 PASS, 3 FAIL and 3 BLOCKED cases: all nine normal navigation and no-retry checks PASS; all nine immediate last-option hits PASS; all nine stable-after-capture/anchor-expiry checks FAIL; all nine measured-coordinate touch selections after recovery PASS. Keyboard continuation alone remained BLOCKED because its visibility check raced editor reconstruction and a card tap toggled the still-current slot closed. Final probe commit 788792e7fb103822214d36f2ee8526904889f2e5 isolates keyboard checks before selection changes the editor, followed by a fresh anchor-expiry wait and actual touch recovery. Run 36944792468 is pending. The initial/revised raw evidence is not reclassified as all-green.

Raw second-run evidence: 2026-10-02-browser-evidence-CONT29.json. Artifact ZIPs, expiry November 1:
- Chromium 11201064873: c59712d483e1594b63a087b5dc7da96678efdb5bb48be9eb8251aec0585babc4.
- Firefox 11201314485: 242c7aca08648f092418c25e959167dbdf55a38315043a486c6191dcb3072467.
- WebKit 11201413507: f66b24b8b6e90773fdbaf08ec76c4e75ec5cf914900373a019be5f499fa89d64.

Independent pure helper boundaries add 21 cases, 5 PASS / 16 FAIL. gardenChipEffect and hyperchargedFarmingFortune accept explicit null, blank/whitespace strings, false and [] through Number(), producing known 0 or unamplified 100. temporaryModifierEffect likewise treats an explicit unknown Hypercharge percent as zero. The required unknown-versus-known-zero contract is docs/MATH_MODEL.md:45–47. Explicit numeric zero and the temporary helper's intentional omitted-option default are PASS controls; the default is not silently removed from the fix plan. These are exported lower-helper failures, without asserting an active UI input route. Evidence: 2026-10-02-helper-boundary-CONT29.json.

Extend work packages 5–6 to shared absence/type validation for these helpers: preserve explicit unknown input, reject nonnumeric boolean/array coercion, and accept explicit finite zero. Retain documented optional defaults only at the caller/API boundary. No new live coefficient is needed for this data-contract fix. Rarefinder's separately sourced stale-rate mismatch remains the canonical-table fix described in CONT27.

## CONT30 — completed supplemental audit

Final run 36944792468, trigger commit 788792e7fb103822214d36f2ee8526904889f2e5, completes all 81 cases: 45 PASS / 27 FAIL / 9 NOTE / zero BLOCKED. Every engine independently yields 15 PASS / 9 FAIL / 3 NOTE. All three jobs are correctly red because known application failures affect the gate; installation, source-identity verification and artifact upload succeed. Full results: 2026-10-02-browser-evidence-CONT30.json.

Across Chromium, Firefox and WebKit at 320×568, 390×844 and 800×360:
- Normal tap navigation after hydration, no-retry navigation, immediate last-option hit, actual coordinate-touch selection after recovery, and empty pageerror checks all PASS.
- Stable last-option visibility after capture/2.1s settlement, Escape-close and declared-listbox ArrowDown focus each FAIL in every context. These are three repeated behavior categories, not 27 independent bugs.
- Main scroll retreats between 217 and 287px; the option is no longer hit-test reachable until manually scrolled back. The probe contains no injected DOM mutation in this scenario. Keyboard is checked before selection changes the editor lifecycle, so no continuation is blocked.
- HTTP NOTES retain external API 429 responses, one external 400 response, and the expected /deploy-version.json 404 in an unstamped local CI checkout. They do not establish a broken production deployment or missing canonical art. Online service availability is separate from local runtime correctness.

Final artifact ZIP digests, expires November 1, 2026:
- Chromium 11200778763: 8a0637f7c4feaf5bc08ff76112bc26f2dabb91bc3298344a3b0d6f175c86b349.
- Firefox 11201717431: 1fe7cf1a79f48f7488b8677d7d1b48cb4421f3716f5ed6a168be09e5c6ac41ed.
- WebKit 11201374565: e1992c46e9863da7d79d1bec5d6b2a63f7ecf7c434e6a7f8c663016b8d354598.

A full ten-family duplicate-chip comparison finds seven matching flat Legendary maxima, one deliberately different Hypercharge formula, the independently sourced Rarefinder rate mismatch, and one unresolved Cropshot confidence contradiction. Lower Cropshot reports VERIFY_0_27 and no Legendary rate, while visible data is ACTIVE +5/level, +100 maximum with a verification date. This is a confirmed cross-table confidence conflict, not independent proof that the reported +60 is the correct live replacement. Acceptance requires coherent confidence across all consumers and a current authoritative/lore curve before active numeric ranking. Matching duplicate tables alone do not verify live mechanics. Evidence: 2026-10-02-chip-consistency-CONT30.json.

Final source recheck: main still bda761d81deb0be37af9fad31f5469efb992df82. Accessible follow-up checks are complete. Physical devices/OS behavior, safe authenticated live sync, exact remaining live mechanics, Pages account configuration and original report bytes remain dependent on unavailable evidence as recorded in the October 1 review. No app fix, test-expected-value change, PR, merge or deployment was made. Update the consolidated review with canonical-chip and lower-helper acceptance; keep all raw earlier blocked results immutable.
