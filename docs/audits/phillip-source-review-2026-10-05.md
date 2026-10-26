# Phillip package 12 — source review, 2026-10-05

Scope: only the first remaining open audit package, Phillip. Starting PR #301
head: `3f83b1f0585c9adff1a81775ff1cd63658102955`; its Validate and all three browser
jobs were rechecked as successful before this continuation. Existing package-7
acceptance and foreign/local work were preserved. No merge or deployment.

## Source boundary

| Source | Supported | Still unavailable |
|---|---|---|
| [August 3, 2026 staff Alpha changes](https://hypixel.net/threads/aug-3-0-27-alpha-changes-2.6134812/) | Alpha rate +5 Fortune per Pest, maximum +200 Fortune. | Current live curve, actual NPC currency consumption and duration. The 200/5 = 40 count is arithmetic, not a verified charge. |
| [August 4, 2026 staff live release](https://hypixel.net/threads/hypixel-skyblock-0-27-torrhus-canyon-critter-safari.6132090/) | The release excludes unspecified Alpha Farming changes. | The post does not establish Phillip's live rate, cap, cost or duration. |

Targeted searches with both Phillip/Philip spellings and recent live/patch
terms did not yield dated current live lore or a staff live statement covering
these fields. Older player/Alpha reports were not promoted to live facts.
October 5 is a source-check date, not `last_live_verified`.

## Concrete independent correction

The Info helper previously called the preview's 40-Pest threshold an actual
spend and showed a fixed 30-minute timer despite the source gap. Its canonical
table now separates `previewPestCountForCap: 40` from
`currentPestCostForFullBuff: null` and `durationSeconds: null`. The pure helper
returns an Alpha preview count with `spent: null`; unknown seconds remain null
minutes rather than coercing to zero. Initial and input-updated UI both say
that live cost and duration are unverified.

The observed Pest count, one activation, explicit observed duration and expiry
remain unchanged. The unverified preview still contributes no complete live
Fortune. No persistence schema, render owner, timer, other audit package or
acceptance threshold changed.

Regression covers zero, partial, exact threshold, 80 Pests, over-cap, fractional
and blank inputs; it retains the historical/Alpha provenance distinction.
Source `4c51f53ead77286986c1ab15f018c0e986e0bdc6` is accepted: 26 targeted tests and
1,393 Node + 8 Python pass locally; Validate 37277652522 / 111658158255 passes
startup, exact DOM/no-op and the retained trusted-scroll controls. Browser run
37277652525 passes Chromium 111658158252, Firefox 111658158470 and WebKit
111658158553, each 239 PASS / zero FAIL / 8 NOTE / zero BLOCKED. All 24 expanded
Phillip cases pass. Chromium strict overlay/sweep and injected-error controls
also pass. Actual evidence is retained in
[the acceptance JSON](phillip-acceptance-4c51f53-2026-10-05.json) and the
[progress ledger](../../tasks/fix-progress-2026-10-02.md). These tests validate
the unknown-value safeguards, not the unavailable live mechanics.

## Next step

Package 12 remains the first open package. Obtain dated current live lore or a
first-party live statement covering rate, Fortune cap, actual Pest cost and
duration/expiry conditions before promoting any numeric live value. Do not
repeat the accepted count/expiry or preview/cost corrections. Packages 14, 15
and 17 retain their earlier blocks.

## Follow-up from accepted efd868a — 10:45 CEST continuation

PR #301 still points to `efd868aeb96115cbc3cf2dcfc84cd7cec56ba3ac` at the start
of this continuation. Its Validate 37283844344 and Browser 37283844315 were
freshly rechecked as completed success. No new runtime defect was established;
this follow-up records only the remaining package-12 source investigation.

The maintained community wiki is reachable. Its
[pinned article revision 836519](https://hypixelskyblock.minecraft.wiki/w/Pesthunter_Phillip?oldid=836519)
is dated September 9, 2026. However, the
[July 24 to September 9 comparison](https://hypixelskyblock.minecraft.wiki/w/Pesthunter_Phillip?diff=836519&oldid=790018)
changes other sections, leaving the Bonus Farming Fortune section unchanged.
The duration text already appears in
[revision 510191, September 11, 2024](https://hypixelskyblock.minecraft.wiki/w/Pesthunter_Phillip?oldid=510191).
Inference: the recent whole-page edit date does not establish a new live
measurement of this mechanic. The article remains a community reference, not
the missing dated post-Alpha live lore. No numeric live fields were promoted.

The public item-resource URL
`https://api.hypixel.net/v2/resources/skyblock/items` failed through the web
reader with the actual result **Internal Error**. The cause and HTTP status
were not supplied; no successful payload or API verification is claimed.
[Official API documentation](https://api.hypixel.net/) was readable and describes
an item-resource endpoint, but that documentation alone does not prove the
NPC's current conversion, consumed currency or duration. Wiki history links
initially failed with **Unable to resolve click call due to invalid arguments**;
direct history URLs subsequently succeeded.

Pesthunter Phillip remains the first open package. To unblock it, retain a
dated live-server tooltip/turn-in observation showing the rate, Fortune cap,
actual consumed Pest currency and active-effect expiry, including any duration
condition; alternatively obtain an explicit first-party live statement covering
those fields. Public search, an unrelated wiki edit or the Alpha arithmetic
threshold cannot substitute for that evidence. Existing accepted code, tests,
and other packages are unchanged.
