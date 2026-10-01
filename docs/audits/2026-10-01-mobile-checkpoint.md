# Farming420 audit continuation — mobile, CONT12+

Date: 2026-10-01. Scope: audit and precise fix planning only. No application source changes or deployment. Documentation checkpoint commits were authorized by the user on 2026-10-01.

## Continuity and evidence boundary

This is a new continuation checkpoint, not a replacement for the full original audit. The original report has 94 planning IDs; those IDs are not a count of confirmed bugs. Original report: `Farming420-Auditplan-2026-09-30.md`, retained file ID `libfile_b1ec09b6a9208191b84996315608f42a`, version 109. Previous continuation through CONT11: `Farming420-Audit-CONT04-plus-2026-10-01.md`, retained file ID `libfile_8a5dc307684c8191af5ba04d43209ded`, version 7. Their local copies were unavailable after the workspace reset, and neither was fetched or overwritten in this turn. Prior findings below are carried from visible conversation context, not fresh reruns.

Important retained corrections: CONT11 confirmed the current Vacuum damage table already uses 100/150/200/300/400 and Bookworm +20. Do not plan a redundant numeric fix. All 53 Greenhouse coefficients matched the official August 20 table; this does not prove complete growth or revenue calculations. CONT03 confirmed blank Add Set cancellation is blocked by required-input validation. CONT07 confirmed nested button structure in Cropshot controls. CONT10 observed Escape failing to close several menus and a pet list extending below the desktop viewport. CONT04/B07 still needs deliberate manual-scroll interruption and phone-width tests.

## CONT12 — current source and mobile CSS cascade

Status: source review completed; real phone rendering remains untested.

Current main was fetched read-only and pinned to `bda761d81deb0be37af9fad31f5469efb992df82` (2026-09-30, PR #300). AGENTS.md was read. All 21 CSS files linked by index.html were fetched at this commit in their actual cascade order. No local checkout or git-status validation is claimed.

The browser measures 1363 × 936 CSS pixels, DPR 1. The available browser API exposes no device emulation or viewport resize. F12, Ctrl+Shift+M, and Ctrl+plus did not change those measurements. They are failed environment attempts, not successful mobile tests. Do not mark 390/412 pixel acceptance as passed.

| Topic | Current effective source | Conclusion |
|---|---|---|
| Viewport | index.html: width=device-width, initial-scale=1.0 | Correct basic viewport declaration |
| Closed mobile rail | mobile-taskbar.css: width 40px at ≤650px; main width calc(100% - 40px), margin-left 40px | Earlier 108px rail and bottom-bar declarations are superseded |
| Open mobile rail | mobile-taskbar.css: width min(138px, calc(100vw - 14px)) | Overlay-style expanded navigation; runtime phone check pending |
| Scroll owner | skyblock-redesign.css: app shell 100dvh, main overflow-y auto and overflow-x hidden | Main is the scroll owner; hidden overflow can conceal clipping |
| Content | skyblock-redesign.css:1019–1021, padding 16px 8px 36px at ≤650px | Use final 8px padding when calculating available editor width |
| Header | activity-mode-ui.css:94–124, title/control grid plus search row at ≤780px | Existing two-row mobile layout; not a missing responsive layout |
| Physical sets | activity-mode-ui.css:235–261, nonwrapping tabs and fixed-size Add/Remove action at ≤760px | Narrow widths and three-set names need explicit acceptance tests |
| Reforge choices | skyblock-redesign.css:646–653, one-column choices at ≤650px | Existing mobile fix; do not propose another two-column-to-one-column change |

Source blob IDs: index.html `33946e5a6709dc474fb36322a4e0f22e5eedadf1`; skyblock-redesign.css `ccb459b7dc5ec96c8aea29a517c78a842b38c363`; mobile-taskbar.css `d09818f631adb61e956806cb98a037da857516b1`; activity-mode-ui.css `d09ff68dc003207920fcb528bced06f14d3f376a`.

No safe-area CSS was found, but that absence alone does not establish a notch/home-indicator defect: viewport behavior and real devices remain untested.

## CONT13 — Pet Item minimum-width incompatibility

Status: new source-confirmed narrow-width conflict; visual reproduction at 320px pending. Ordinary 390/412px widths are not proven broken by this rule.

setup-selection-ui.css:143–145 sets `.sb-pet-item-editor > .item-editor-grid { grid-template-columns: minmax(240px, 1fr); }` without a narrower-width override. The editor has 14px padding and a 1px border on each side; the visible desktop DOM confirmed those computed values and the actual class/child relationship. The parent slot grid becomes one column at phone widths.

At a 320px viewport, even with no reserved scrollbar width, the maximum inner track budget is `320 - 40 rail - 16 content padding - 30 editor padding/border = 234px`. A 240px minimum exceeds this by at least 6px. A reserved scrollbar reduces the budget further. Whether the surplus expands an intrinsic parent or spills from the child, main's horizontal overflow hiding makes it a clipping risk. This is a source incompatibility, not a captured 320px screenshot.

Planned smallest fix: make this single visible-selector column `minmax(0, 1fr)` and ensure the editor/grid and descendants can shrink. Do not add a page-wide horizontal scrollbar or duplicate the picker. Verify wrapping of the recommendation text and that the trigger's icon, item name, and chevron still fit. The general editor's 210px minimum is a separate rule; do not blindly rewrite all grids based on this 240px finding.

Acceptance: open an empty and a populated Pet Item slot at 320, 360, 390, and 412px; every trigger edge and option must be visible and operable, no content clipped behind main, no document-wide horizontal overflow. Include full item names, None, and all four catalog choices; keyboard and touch must select the same canonical item ID.

Source blobs: setup-selection-ui.css `4672b7cdc0c1a45f99c1acc67faa46912dbee473`; item-editor.css `536e2940d9ce3dc6c8b916bff3bde400df6de1c8`.

## Desktop checks performed in this continuation

A fresh, empty local browser profile was used. Dashboard → navigation → Loadouts → empty Pet Item editor → Add Set dialog were opened through normal controls. No inventory items, effects, physical sets, or persisted numerical settings were changed. Empty slots and unknown throughput are a baseline, not calculation failures.

The Add Set dialog's computed Cancel background was rgb(16,30,23), text rgb(238,248,241); Add Set background rgb(85,255,85), text rgb(7,16,9). The html element has skyblock-redesign class. A white primary button was not reproduced in this dialog on the current desktop build. This does not clear every Save button in the app, mobile rendering, or native input-validation behavior.

## CONT14 — menu reachability and keyboard behavior

Status: desktop live behavior checked; phone placement and touch remain pending. Extension of CONT10, not five new independent bugs.

Opening the empty Pet Item selector initially produced a menu at top 859.14, bottom 1153.14 in a 936px-high viewport; main scrollTop was 883. The menu is absolutely positioned below its trigger, with max-height 340px (390px for armor), rather than constrained to the remaining viewport space. setup-selection-ui.css:60–72 and 189 owns this placement.

After one normal downward scroll and a settled observation, main scrollTop reached 1100. Menu bounds were 642.14–936.14, and every option button was fully within the viewport: None, Brown Bandana, Green Bandana, Poignant Lucky Clover, Yellow Bandana. The menu contributes to main's scrollable extent. Therefore this desktop case does NOT establish unreachable options. An immediate post-scroll measurement had still shown the previous position; use settled observations, not that stale sample.

Escape left the selector open. Tab moved focus from the summary to the None option. Down left focus on None; no item was selected. The menu declares role=listbox and its buttons role=option, but the owning setup-selection-ui.js builders have click handlers without a corresponding arrow-key/dismissal pattern. Tab-based reachability was partially checked; full screen-reader behavior is not established by the automation accessibility tree. Closing via the summary worked.

Planned fix: one shared picker behavior for armor, pets, and pet items, with Escape returning focus to the trigger; consistent keyboard movement/selection; outside-click dismissal; and placement that fits the available scroll viewport. On a short phone viewport or when the keyboard is open, either flip the list or constrain its height to actual available space and retain internal scrolling. Recompute when the viewport/scroll position changes. Preserve canonical selections, do not clone the bound editor, and do not introduce another observer to repair positioning after the fact.

Source: setup-selection-ui.js blob `1872c5fbfe1ea84346ba1bff16f4b45c0fc67260` at the pinned commit.

Add Set cancellation was freshly rechecked: clicking Cancel with an empty required name displayed "Please fill out this field" and left the dialog open; Escape closed it and returned focus to Add Set. Owning activity-mode-ui.js:184–204 emits a submit Cancel button without formnovalidate. Minimal planned fix remains formnovalidate on Cancel; keep required validation for Add Set and create no set on cancellation.

Screenshot evidence was checked against the settled DOM and the saved local image. No application rendering defect is claimed from transient capture inconsistencies.

## CONT15 — header, touch controls, responsive coverage, and scroll cancellation

Status: source audit completed for these paths; real phone acceptance remains open.

### Header and controls

The physical-set switch inherits the phase switch's styling. At ≤760px it hides the Sets label, uses shrinking nonwrapping tabs, and keeps Add Set/Remove Set as a fixed-size action. The containing header uses a max-content Farming420 title column plus a shrinking selector column and a full-width search row at ≤780px. No claim is made that 390/412px headers overflow. The priority acceptance case is 320px with three sets and the maximum 48-character custom name, including full selected-set identity without dependence on hover title tooltips.

If that case truncates every useful tab label, adapt the single owning header layout: let the title span its own row at the narrowest breakpoint, or use one compact canonical set selector with its action. Pick one pattern after visual verification. Do not layer duplicate phase/set controls over the current switch. Preserve the distinct semantics: Loadouts selects physical sets; calculation pages select Farming/Spawning/Killing phases; shared pages remove the phase control.

The direct-control tier strip is intentionally internally scrollable: direct-controls.css:97–105. Stages are 26 × 29px at ≤650px, with 4px gaps (112–131). A 21-stage chain needs 626px before surrounding controls and exceeds ordinary phone card width; internal scrolling is not itself a page overflow defect. Combined with CONT07's already-confirmed nested buttons, this warrants a simpler tier selection pattern with comfortable tap areas and an explicit card opener. Do not assert a standards violation merely from those sizes. A native select or compact stepper should preserve all valid tiers and IDs without making the entire card a button containing other buttons.

### Available Pet Item inner width

These are source-derived maximum budgets, not live measurements. A reserved scrollbar subtracts more.

| Viewport width | Rail | Content padding | Editor padding/border | Maximum inner budget | 240px minimum |
|---|---:|---:|---:|---:|---|
| 320px | 40px | 16px | 30px | 234px | Exceeds budget by ≥6px |
| 360px | 40px | 16px | 30px | 274px | Fits this budget |
| 390px | 40px | 16px | 30px | 304px | Fits this budget |
| 412px | 40px | 16px | 30px | 326px | Fits this budget |

### Existing responsive coverage

The revenue planner already collapses its principal row/form grids at ≤650px and measured inputs to one column. Pest side panels, pipelines, vacuum inputs/pulls, and phase-guide rows also have mobile adaptations. Effect card grid styling has a ≤700px one-column override. Computed source inputs reset minimum width at ≤780px. These are source checks, not a blanket visual pass for every card, chart, label, or long value. Base minmax declarations must be checked with their later media overrides before being filed as bugs.

### B07 — intentional scroll must cancel pending restoration

The current core app.js still retains an interaction anchor for 1800ms (229–231). Capturing click/change/input schedules microtask and animation-frame restores (364–407), while an app-root MutationObserver reschedules restoration on subtree/attribute changes (409–415). restoreRelativeScrollAnchor adjusts main.scrollTop by the anchor's viewport displacement (341–360). That owner has no corresponding wheel, touch movement, keyboard-scroll, or deliberate-scroll invalidation path in the reviewed source. This is the retained source concern from B07, not a newly reproduced live snapback in this turn.

Planned fix: attach a generation/cancellation token to the single scroll-preservation owner. Invalidate a captured anchor on deliberate user scroll intent, page navigation, or superseding interaction; all delayed callbacks must check the token. Distinguish restoration's own programmatic scroll from user action. Avoid treating every scroll event as intentional, which would cancel valid restoration. Keep the existing relative card identity and clamp behavior; do not try to preserve an impossible negative scroll position. Prefer bounded render settlement over letting unrelated late mutations reuse a still-young anchor.

Required regression: open/replace an editor, immediately scroll away by touch, wheel, or keyboard, then allow delayed art/enhancer work to settle. The user-chosen position must remain. Run above zero and near each scroll boundary, with FF/BPC/custom-set slot cards and all 13 tools. The browser API cannot reliably induce a real slow-device resource delay inside the 1800ms window without altering the app; no fabricated delayed event or hidden-state mutation was used, and this acceptance remains open.

Source blobs: app.js `b07a116952e0083a21671f049fbdc4349b9d1d1d`; activity-mode-ui.js `bc04dc756bcf34b0ba0d4d4d66a9c7065b8198f4`. Other CSS blobs are recorded in the evidence ledger below.

## Phone acceptance matrix — all live rows still pending

| Area | Cases | Pass condition |
|---|---|---|
| Viewport/reflow | 320, 360, 390, 412px portrait; corresponding landscape; 200% text zoom | No concealed clipping or page-wide horizontal scroll; controls and selected identity readable |
| Header | Dashboard/calculation phase pages, Loadouts, shared pages; 2 and 3 sets; 48-character name | Correct semantics, useful labels, search accessible; no overlapping or duplicated controls |
| Navigation | Closed/open rail; short landscape height; top/bottom nav links | All destinations reachable through nav's own scroll; content and modal stacking correct |
| Item selectors | Armor, pet, pet item; None, first/last option, current unknown item | Trigger and list fit; touch and keyboard yield the same canonical selection |
| Menus | Open near bottom/top; scroll page; rotate; open software keyboard | Available-space placement; usable internal scroll; dismissal and focus return consistent |
| Dialogs | Empty Cancel, Escape, backdrop; valid/blank/whitespace Add Set; keyboard open | Cancel never validates or creates; Add retains validation; submit/close controls reachable |
| Controls | Long tier chains, reforges, rarity, enchantment ranges, gemstone selectors | Comfortable operation; no nested interactive card structure; no accidental parent action |
| Scroll | Nonzero main scroll, editor changes, manual interruption, delayed work, page navigation | Stable relative card context where possible; intentional scroll wins; no stale restoration |
| Presentation | Long names/values, loaded/missing art, rarity surfaces, normal/unknown stats | Text visible, art fallback explicit, no mechanic invented from a missing field |
| PWA/device viewport | Browser address bar expansion, keyboard, standalone mode, safe-area device | 100dvh layout and controls remain usable without obstructed bottom/top content |

## CONT16 — deployed build and Clover-art correction

Status: live desktop verified.

The live DOM's `meta[name=app-build]` is `bda761d81deb0be37af9fad31f5469efb992df82`, matching the source pin. The live page URL is https://djkamma420.github.io/Farming420/ and the viewport is still 1363 × 936. This identifies the deployed build stamp; it is not a byte-by-byte validation of every runtime resource.

The Poignant Lucky Clover option's actual img loaded a 64 × 64 asset, rendered at 32 × 32 with display:block, visibility:visible and opacity:1. Its PL fallback is intentionally hidden. After scrolling, image bounds were y=829.14–861.14 inside the viewport; the saved screenshot visibly confirms the white Clover icon and all five choices. This fresh evidence supersedes the earlier hidden-Clover observation for this current option. Do not create a missing-art fix for this picker. It does not clear the separately retained Tater/Pesthunter art findings or prove the art on every selected slot/card.

Evidence: `Farming420-Pet-Item-Auswahl-Beleg-2026-10-01.jpg` (saved in the audit conversation). No item option was selected.

## Evidence ledger and delivery state

Pinned read-only repository: DjKamma420/Farming420, commit `bda761d81deb0be37af9fad31f5469efb992df82`. Source files were read through the GitHub connector. No repository files were edited or downloaded into a working checkout. No automated app test suite or deployment was run.

The 21 linked CSS files were examined in their load order; targeted JS owner paths were additionally fetched. Exact blob ledger is appended below. The current screenshot `Farming420-Pet-Item-Auswahl-Beleg-2026-10-01.jpg` shows the verified desktop empty Pet Item editor with all options visible. The earlier `Farming420-Pet-Item-Pruefbeleg-2026-10-01.jpg` shows menu closure. These are desktop evidence images, not mobile screenshots or proof that the 320px conflict has been fixed.

Completed checkpoints: CONT12 current baseline/cascade, CONT13 320px Pet Item conflict and fix plan, CONT14 reachable options/keyboard/dialog checks, CONT15 header/control/scroll plans and mobile acceptance matrix, CONT16 live build and Clover-art correction. The complete original exhaustive audit remains broader than these checkpoints. Implementation remains frozen.

| CSS source | Blob SHA |
|---|---|
| src/styles.css | cdae954f23fa5cce5ae1261f12485c44f8ecaa18 |
| src/item-editor.css | 536e2940d9ce3dc6c8b916bff3bde400df6de1c8 |
| src/enhancements.css | 38dec62d376b3fbf630b9e101a6ca517cdfe8eb4 |
| src/ux-simplify.css | 4e7d7576dd56ef3b73b01a6bf2b55709dcbc4a63 |
| src/foundation.css | 9c11368d0bd6f35b712669d22675f8d7d3e1f446 |
| src/item-art-ui.css | 2ece14ca32ed3cad1f2b9bb1dfa8bcb2a7822feb |
| src/workspace-ui.css | 7a4db506b608baf5ba248bc04e79341f4bcb296b |
| src/workspace-direct-picker.css | ef4e416f9e8f2060316480b3b2da4b0c887ebf9f |
| src/farming-tool-art-ui.css | 143566577d2d752570b4e55f742f402ac456c640 |
| src/tool-presentation-ui.css | 80086cf69f0a4a68d68dcf77ca55d500c1d3af0f |
| src/skyblock-redesign.css | ccb459b7dc5ec96c8aea29a517c78a842b38c363 |
| src/setup-selection-ui.css | 4672b7cdc0c1a45f99c1acc67faa46912dbee473 |
| src/direct-controls.css | 92d34128661b1bdb3506ba1293e15e2f3e1406e6 |
| src/revenue-planner.css | 2fd15b224ecc1f164d12ab5fa53b9216576ac81d |
| src/mobile-taskbar.css | d09818f631adb61e956806cb98a037da857516b1 |
| src/computed-stats-ui.css | 184ff31829ccc1bfe670375ed11cd5247db5f3c6 |
| src/activity-mode-ui.css | d09ff68dc003207920fcb528bced06f14d3f376a |
| src/pest-ui.css | c5d8762669dc9892980a2b03bb617a0f0dcd4d06 |
| src/phase-loadout-guide.css | f5e20b138660321dc36edcc165b4b39bd76b734b |
| src/item-art-coverage.css | bafd142dff3156558255835255dc90f3ed0f733a |
| src/rarity-background-ui.css | 1c16d6f5061fe932ecb1ed7da9a22b20d230f988 |
