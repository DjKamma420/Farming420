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
