# Farming420 audit review — 2026-10-01

Application source: bda761d81deb0be37af9fad31f5469efb992df82 (current main checked again). Audit branch: audit/final-verification-2026-10-01-cont17. This review records audit evidence and implementation plans. Application fixes, deployment, merge and PR creation are outside this completed audit work.

## Executed evidence

| Check | Result and scope |
|---|---|
| Immutable source snapshot | 461 text files, each Git blob hash verified; local binary limitation cleared by CI full checkout |
| Current repository validation | 1,360 Node tests and 8 Python tests pass; syntax, static-reference and SW-retirement gates pass |
| Browser startup | Dashboard/Loadouts/rarity/art smoke passes; eleven tested portraits, not every catalog image |
| Same-state rendering | Ten pages pass three reapplies by node-count/markup-length metrics; strict zero-mutation equality remains a harness gap |
| Repository sweep | All ten areas PASS; external 403/429 requests and swallowed interaction failures limit the claim |
| Existing overlay audit | Zero reported findings; wrong scroll owner/default-overlay scope limits acceptance |
| Phone/landscape runtime | Eight viewport contexts, hasTouch and normal tap navigation; controls, Pet Item editor/menu and all twelve physical tools executed |
| Manual scroll cancellation | FAIL in all eight controlled late-mutation cases; point-in-time menu hit geometry is not stable post-capture reachability acceptance |
| Future-schema preservation | FAIL in pure writer and real browser startup fixtures |
| Economics/state boundaries | 30 pure cases: 17 PASS, 13 FAIL, plus separate competing-reforge case; case counts are not distinct-bug counts |
| Backup export/restore | Export bytes/state equality PASS; invalid JSON preserves bytes PASS; valid UI restore PASS; future inner/current envelope incorrectly accepted FAIL |
| Manual origin and rarity | Automatic sync preserves manual helmet while filling boots; explicit overwrite works; RARE+recomb→EPIC PASS |
| Current item model resolver | Official resource resolves 152/152 IDs: 43 direct, 109 fallback; semantic art accuracy remains separate |
| Catalog completeness | 98 upgrade rows, zero duplicate IDs, zero missing source URLs; 85 ACTIVE, 13 VERIFY; 25 shard cards |
| Greenhouse source table | 53 coefficients previously independently matched; no invented Coins/h model |
| Application source delta | Audit branch comparison contains audit documentation/probes and one isolated audit workflow only |

Full chronological evidence and corrections: [execution ledger](2026-10-01-execution-ledger.md). Raw durable fixtures: boundary-evidence.json, legacy-reforge-evidence.json, identity-positive-evidence.json and mobile-evidence-CONT22/CONT24/CONT25.json. Source/catalog inventories are included in the same directory. CI screenshots expire after 30 days; the probes and extracted geometry/results remain committed.

Final supplemental result: 125 cases, 86 PASS / 31 FAIL / 8 NOTE / zero BLOCKED. Run 36899139361. Physical/external dependencies below remain BLOCKED. These case totals include repeated known defects across viewports and must not be read as 31 distinct bugs. Complete documented fix plans are ready for implementation; no release acceptance is asserted.

## Prioritized implementation work

| Order | Problem and owner | Concrete change | Required acceptance |
|---|---|---|---|
| 1 | B01: independent storage writers modify newer schema; app.js guard does not protect startup adapters | Centralize main-state reads/writes with a future-version guard; preserve raw bytes; disable dependent mutations when unsupported | Seed schema 11 against supported 10; zero writes across startup/navigation/editors/settings/sync; retain every unknown field |
| 2 | B01: backup envelope/state schema disagreement bypasses newer rejection; backup.js | Validate both versions and consistency before migration; reject either newer value; never restamp unsupported state | Current envelope + future inner state rejected without a successful restore message or write; valid old migrations and current restores pass |
| 3 | B02: explicit Bountiful plus stale Blessed flags contributes both; computed-stats.js/item capabilities | Read one physical tool/reforge authority; reconcile obsolete flags while preserving manual origin and acquisition metadata | One reforge contribution per tool; both flag orders, absent/current selection, shared Eclipse crops and rarity/recomb cases |
| 4 | NEW06: first same-species Cow supplies another physical copy's XP; mooshroom-cow.js and analogous resolvers | Resolve physical UUID before species; explicit local level wins; unresolved copy remains incomplete | Selected level-100 second Cow never becomes level 1; both snapshot orders, missing UUID and manual level |
| 5 | NEW01: null/blank Pest inputs become known zero/base loot; pest-mechanics-data.js | Guard absence before numeric conversion; propagate missing inputs through economic adapters | null/undefined/blank remain unknown; explicit zero valid; no complete revenue from unknown stats |
| 6 | Contest adapter defaults missing Fortune to zero; contest-estimate.js | Preserve explicit stat absence; retain only the documented legitimate contest-bonus default | Missing/null/blank Fortune incomplete, known zero complete; no medal inference from score alone |
| 7 | B07: manual wheel overridden by later observer restore; app.js plus overlay anchors | Cancel active anchor/queued restores on user scroll intent and navigation; maintain clear scroll ownership | Normal changes stay anchored; wheel/touch/key movement survives delayed DOM/image changes; actual clamps remain allowed |
| 8 | Mobile header: activity/set labels overlap and shrink; topbar activity/physical-set layout | Put control groups on a dedicated narrow-screen row or deliberate internal scroller; keep action controls separate | Readable role labels, no obscured tab centers, 2/3 sets and 48-character custom names at 320/360/390/412 and landscape |
| 9 | R06: blank Add Set Cancel invokes required-field validation | Make Cancel an explicit non-submit action that closes the dialog; maintain Escape | Blank/valid cancel closes without creating a set, all eight viewports, focus returns to trigger |
| 10 | Pet/gear menus and Effects drawer keyboard semantics | Implement Escape/focus return and complete declared listbox/dialog behavior through one owner | Tab/arrow/Home/End selection as appropriate; Escape/outside-close; last option reachable; focus not lost |
| 11 | Cropshot nested buttons and duplicate binding/observer risk | Use valid sibling controls and one logical action pipeline; make repeated enhancement idempotent | No nested interactive button tree; one state write/action; no mutation churn on identical reapply |
| 12 | Phillip binary +200 approximation and temporary effects | Represent Pest count, calculated +5 per Pest cap, active duration and expiry separately from price/marginal value | Partial count, cap, expiry, activation and permanent/temporary distinction; no invented effect stacking |
| 13 | Exported legacy Vacuum table disagrees with current research; pest-mechanics-data.js | Reuse canonical current source or remove obsolete helper; distinguish damage/pull from real elapsed handling | Five tier values agree; books/reforges legal; no throughput derived from unsourced pull frequency |
| 14 | Numerical confidence: Pest divisors, pet rarity/perk curves, Alpha/community shard values | Require live first-party/lore provenance; keep unverifiable rows visible but unranked/incomplete | Active metadata cannot turn unresolved mechanics into complete Coins/h; explicit source date and confidence |
| 15 | Tater/Pesthunter fallback artwork and inconsistent art ownership | Use canonical physical asset resolver; retain truthful fallback when missing; remove forced fallback-only styling | Correct item identity, no broken image leaks; Clover current live image must not be “fixed” as missing |
| 16 | B08: Pages publisher race and validation-independent deploy | One publishing authority, validated immutable SHA, stamped complete artifact; remove sleep ordering | Current account settings verified, validation precedes deploy, deployed marker/assets match exact SHA |
| 17 | Audit gate weakness: overlay owner, swallowed sweep errors, approximate idempotence | Scroll actual main; open representative overlays; assert nav/action outcomes; fail on findings/errors; compare stable DOM/mutations | Inject a known error and prove nonzero exit; nonzero main scrolling covered; no false acceptance by node/length equality |

Implementation must follow this order where dependencies apply. This is a fix plan, not authorization to implement or publish.

## Corrected or cleared findings

- Current source-driven profit accepts explicit zero throughput and keeps an active Feast with unknown price incomplete. Historical contrary adapter claims are superseded for this pin.
- Current Vacuum UI/research uses 100/150/200/300/400 and Bookworm +20; the remaining failure is the separately exported legacy helper.
- There are twelve physical tool cards for thirteen logical crops; the shared Sunflower/Moonflower tool is intentional.
- At 320px the Pet Item grid fits the expanded editor. Main has 7px internal excess; the earlier CSS-only 6px clipping prediction is not a proven control-clipping bug.
- All five Pet Item options can be reached after scrolling in the tested contexts. Initial below-viewport placement alone is not unreachable-option proof.
- Clover art was visible in the current live picker; CI network fallback text is not proof that its canonical asset is missing.
- Current prefill protects manual items and current basic recomb normalization is correct.
- Resolver fallback coverage is not the same as a missing item, and no unknown gameplay mechanic was repaired by assumption.

## Dependencies and completion boundary

Every currently executable queued check has an outcome. This is not a claim that every real device or live game mechanic has passed.

The following remain BLOCKED by evidence/capability availability: real Android/iOS touch-pan and keyboard, notch/inset behavior, actual OS rotation and accessibility zoom; authenticated safe live profile sync; exact authoritative remaining Pest/shard/pet mechanics; account Pages settings; the original version-109 report bytes. The original historical 94 planning IDs remain retained coverage, not 94 newly executed bugs or reconstructed report content. Original user data has not been overwritten to run fixtures.

The audit branch may have a green evidence-preserving workflow even when mobile-probes returns exit 1. Review case statuses and the ledger. No all-green release verdict is issued.
