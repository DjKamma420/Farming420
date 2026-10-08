# Phillip validation continuation — October 8, 2026

Scope: package 12 only. Current live rate, Fortune cap, Pest cost and default duration remain unknown. Alpha preview and live exclusion are unchanged; no mechanics verification date is advanced by this validation fix.

## Reproduced defects

At starting head `f2a9c61e84d6ebac3450ec4542008c9dd4634b25`, count conversion accepts `1.0000000000000001` as 1, `1e-324` as 0 and `9007199254740993` as 9007199254740992. The public preview, activation effect and count owner accept the lossy conversion. A finite positive observed duration `1e308` overflows when multiplied into seconds/milliseconds. The actual activation handler overwrites an existing record; JSON serialization stores its expiry and duration as null.

The new handler regressions executed against the original source reject both former behaviors with exit 1. The failures retain the count mutation and the existing timer replaced by null duration/expiry. These are application validation defects independent of the unverified live curve.

## Correction

A shared parser accepts only exact, non-negative, safe whole decimal counts. It examines decimal mantissa/exponent before accepting Number conversion, so rounded fractions and nonzero underflow cannot become whole Pests. Exact integral scientific notation remains valid. Preview, saved-record effect and owning count handler use the same parser. Explicit zero is valid; blank count remains unknown. Unsafe counts and nondecimal strings remain invalid.

The pure observed-timing helper checks positive finite duration, derived seconds, a safe whole future millisecond expiry and JavaScript Date representability before any activation or ownership mutation. Overflow, underflow, a rounded non-future expiry and an invalid Date range cannot replace an existing record. This is a storage/timer representation bound, not a claimed game duration limit. Valid observed durations, including representable fractional minutes, replace one activation and preserve its count/provenance. Invalid handlers do not compute, save or render; valid recovery clears custom validity.

Seven new functional tests cover public consumers and the actual owning handlers, plus existing expiry/provenance tests: **25 targeted PASS**. Full local `npm test`: **1,405 Node + 8 Python PASS**, using a writable workspace TMPDIR. Syntax/diff checks pass. The initial targeted attempt had two test-harness errors (undefined now invokes the helper's default; an imported function does not inherit the VM clock); correcting those test assumptions yielded the recorded pass without changing the implementation.

The retained native browser fixture tests invalid raw count/duration inputs against byte-identical persisted state and unchanged write counts, then corrects both inputs through real controls. It checks a finite future replacement timer and unchanged count. All eight existing viewports in each of Chromium, Firefox and WebKit must pass; Info preview adds precise fraction, underflow, unsafe integer and exact integral exponent cases. Existing startup, keyboard/focus, no-op, overlays, sweep and negative controls remain mandatory. Native acceptance is pending until this source is committed and its exact-head jobs complete. No local browser success is claimed.

## Current source investigation

Read the official patch-note index and these new first-party release bodies on October 8:

- October 6 release: https://hypixel.net/threads/hypixel-skyblock-0-27-2-the-minister-update-greenhouse-qol-and-more.6159904/
- October 5 patch notes: https://hypixel.net/threads/october-5-skyblock-patch-notes.6159925/

Neither retrieved body supplies Phillip's current live numeric curve, Pest consumption or duration. Date-window search results also returned older Alpha/player posts; their actual publication dates were checked and they were not promoted to current live evidence. The community wiki history request at `https://hypixelskyblock.minecraft.wiki/w/Pesthunter_Phillip?action=history` failed with **Internal Error** / **URL is not accessible via this tool**. No successful history access, unchanged revision, HTTP status or authentication cause is inferred from that failure. Previous dated source reviews remain evidence of their own checks.

## Next step

Verify this implementation's exact-head Validate and all three browser jobs; diagnose any actual failure before accepting it. Once validation is accepted, package 12 still needs dated current live lore or a first-party live statement covering rate, Fortune cap, Pest cost and duration/expiry. Do not close that source block or start packages 14/15/17 without new authorization. Main, other PRs and the original four dirty files are preserved. No merge/deployment.
