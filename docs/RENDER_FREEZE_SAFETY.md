# Render / Freeze Safety

This document records UI freeze regressions and the rules that prevent them from returning.

## Why this exists

Farming420 has several runtime enhancement modules that patch DOM produced by `src/app.js`. A small DOM patch can freeze the entire app if it observes the same subtree it mutates and is not idempotent. These bugs can pass syntax checks and ordinary unit tests while still locking the browser event loop.

Any future freeze or runaway-render incident must be added to the incident log below with the exact cause and permanent regression guard.

## Hard rules for runtime UI patches

1. **Observed DOM writes must be idempotent.** If code runs from a `MutationObserver`, it must compare the current DOM value before changing `textContent`, attributes, classes, children or node position.
2. **Never unconditionally write `textContent` inside an observed subtree.** Setting the same text can still replace text nodes and emit a `childList` mutation.
3. **Never create observer feedback loops.** A callback must reach a stable DOM state after at most one corrective pass. Re-running the same enhancer against unchanged state must produce zero DOM mutations.
4. **Prefer explicit render hooks over broad observers.** If a feature can be called immediately after `render()`, do that instead of observing all descendants of `#app`.
5. **Do not combine DOM mutation and state-dispatch loops.** Runtime enhancers may write storage or dispatch `farming420:state-changed` only in direct response to a user action, not merely because an observer fired.
6. **Do not clone interactive editors.** Move the existing node when docking UI so event listeners are preserved and duplicate handlers are not created.
7. **One writer per concern.** Avoid multiple enhancement modules continuously rewriting the same node or presentation field.
8. **Repeated application is a required test case.** Every runtime enhancer that mutates DOM must have a regression test proving that applying the same state twice does not perform another write for values already correct.
9. **Freeze fixes are release blockers.** If a new UI patch can produce an observer/render loop, revert or fix it before merging unrelated work.
10. **Core boot must not depend on optional DOM enhancers.** Experimental or corrective UI patches must stay out of `index.html` until they have a browser-level startup smoke test. If a runtime enhancer causes a startup regression, remove it from the boot path first and re-integrate the feature directly into the owning render/bind code.

## Review checklist for DOM enhancer changes

Before merging a change that adds `MutationObserver`, `queueMicrotask`, `requestAnimationFrame`, repeated timers, custom state-change events, or post-render DOM patching, verify all of the following:

- What wakes the code up?
- What DOM/state does it mutate?
- Can that mutation wake the same code up again?
- What exact condition makes the second pass a no-op?
- Is that no-op behavior covered by a test?
- Could the same user action install duplicate listeners or observers after another render?
- Does the code write storage or dispatch a render-causing event from anything other than a user action?
- Can the app still reach its first `src/app.js` render if the enhancer is removed or fails?

If any answer is unclear, the change is not ready to merge.

## The invariant is checked, not just reviewed

`scripts/browser-idempotence-smoke.html` drives every page in real headless
Chrome, re-announces the **same** state three times per page, and compares the
exact `innerHTML` and every observed attribute, child or text mutation in `#app` before and after. Nothing changed, so
nothing may change. `scripts/browser-startup-smoke.sh` runs it in CI and fails
the build on any difference.

Until this existed the rule above was enforced by review and by hand-driving a
browser. That is how `dashboard-guide.js` stayed silently dead for four days
after a render rewrite dropped the element it anchored to: nothing crashed, so
nothing complained.

Both failure modes are covered, and each was proven by deliberately introducing
it before this was merged:

| Violation | How it surfaces |
|---|---|
| an observer writes unconditionally into the subtree it watches | the harness never finishes; the existing freeze timeout fires |
| a listener appends on every state change without a guard | `IDEMPOTENCE_DRIFT`, naming the page, exact equality and mutation count |

The harness reports the number of pages it actually drove, and the shell rejects
a verdict carrying fewer than five. A check that quietly tests nothing is worse
than no check, because it reads as a pass.

## Incident log

### 2026-09-17 — PR #90 setup selection freeze

**Symptom**

The app became unresponsive after the setup-selection update.

**Trigger**

`src/setup-selection-ui.js` installed a `MutationObserver` on `#app` with `{ childList: true, subtree: true }` so the setup editor could be re-docked after `src/app.js` re-rendered.

**Cause**

`applyRarityPresentation()` unconditionally assigned `rarity.textContent` every time the observer callback ran. A `textContent` assignment can replace the existing text node and emit another `childList` mutation even when the visible string is unchanged. That produced this feedback loop:

```text
MutationObserver fires
  -> schedule() queues applySetupSelectionUi()
  -> applyRarityPresentation() assigns textContent
  -> childList mutation is emitted
  -> MutationObserver fires again
  -> repeat without yielding
```

The existing `scheduled` boolean only coalesced mutations before one microtask. It did not stop the next mutation created by the callback itself, so it could not break the loop.

**Permanent fix**

- `setTextIfChanged(node, value)` now checks the current text before writing.
- `applyRarityPresentation()` uses that helper instead of unconditional assignment.
- `tests/setup-selection-ui.test.js` verifies that applying identical text performs zero writes and that a second application remains mutation-free.

**General lesson**

A mutation observer is safe only when the DOM transform it runs converges to a stable no-op state. A scheduling/debounce flag is not sufficient protection against self-generated mutations.

### 2026-09-17 — startup still unreliable after PR #91

**Symptom**

After the observer loop was fixed, the deployed app still did not reliably reach a usable startup state for the user.

**Recovery action**

The entire `setup-selection-ui.js` runtime enhancer and its stylesheet were removed from the automatic `index.html` startup path. The implementation remains source-controlled for reference/tests, but it is dormant in production.

**Rule added**

Restore availability first. A feature that needs a broad post-render DOM observer must not be re-enabled merely because unit tests are green. Rebuild the behavior in the owning `src/app.js` render/bind path and add a browser-level startup smoke test before putting it back into production boot.

### 2026-10-02 — strict same-state mutation failures

The final audit's node/markup-length comparison missed repeated navigation,
header/rarity attribute writes and tool-art replacement. Strict browser evidence
at fix commits 1e5b65c and 2ccba15 detected those writes and equal-length core
repaints. Core rendering normalized its in-memory projection after saving; a
later unchanged storage announcement compared against that projection and
repainted it again. Tool art also had competing tier/fallback owners.

The fix compares state announcements against the last persisted input, retains
single canonical Dicer tier keys, leaves unverified-family fallbacks to their
existing owner, guards unchanged hidden/class/rarity attributes, and preserves
the attempted identity through every image-fallback route. The strict probe
observes three identical announcements after startup settles; injected redundant
writes and equal-length attribute changes must fail the same acceptance gate.
Browser acceptance passed at `7d6be52cd837e055271f1573c41f563a74e5fd2e`:
Validate run 36959294035 checks exact DOM and zero mutations across ten pages,
and rejects both redundant writes and equal-length changes. Browser run
36959294051 also passes 24 open-picker idempotence cases in each of Chromium,
Firefox and WebKit. These are repository/emulated-browser checks, not a
deployment or physical-device claim; see `tasks/fix-progress-2026-10-02.md`.

### 2026-10-04 — late value refresh after closing a picker menu

The documentation-only 4e28995 repeat exposed a Firefox 320px Pet Item case
with identical final HTML but 106 transient DOM mutations. The old price guard
protected an open dropdown or its focused descendant, but permitted replacing
the full app while the editor remained open and the menu/focus had moved on.
The original mutation count alone does not prove which writer ran; it remains
retained as a failure rather than reclassified.

Price-only core repaint now waits until the Setups/Tools item editor closes;
ordinary state renders consume the same cache. Browser regressions dispatch a
controlled late value event after each of the three menus closes, preserve the
real editor/picker nodes and focus, and reject a disposable routed module with
only this guard removed. Reapply diagnostics retain mutation targets and render
events without weakening exact DOM/zero-mutation requirements. Browser
verification passes at `002e86e243eec926c16850f1c3664dc824a9c41d`:
Validate 37215640986 succeeds; Browser 37215640933 reports 221 PASS, zero FAIL
and zero BLOCKED in each engine. All 24 late-refresh/editor-reapply cases pass;
the removed-guard module emits one render, disconnects its editor/picker and is
rejected with regression exit 1 in every engine. Full overlays/sweep also pass.

### 2026-10-04 — unfinished icon fallback wakes a redundant workspace writer

The b2997a4 repeat fails Chromium's 320px helmet reapply with three recorded
mutations and changed HTML, while Firefox/WebKit and the Chromium sweep pass.
No core render/value event occurs. A pending icon error removes its failed image,
the fallback removes an absent class, and the resulting child-list observation
makes workspace UI add an already-present crop-switch class. The image removal
is a legitimate one-time transition; the two unchanged class writes violate
the no-op invariant. The failed run remains retained, not reclassified.

Workspace UI now tests class membership before adding. Pet Item/armor fallback
owners also test membership before removing. A functional regression invokes
the actual workspace apply function, counts one initial write, zero repeated
writes and one correction after a genuinely missing class. The browser reapply
fixture finishes only the editor icon load/error owners before taking its
baseline, with an explicit settlement deadline. Every later DOM mutation still
fails; there is no whitelist or excluded target. Browser acceptance passes at
`7ac0f976b41a2ad52579bd79b1f2bc36dbf2eec5`: Validate 37217577368 succeeds
with 1,385 Node + 8 Python tests, startup/ten-page no-op checks and both injected
DOM countercontrols. Browser 37217577257 reports 221 PASS / zero FAIL / zero
BLOCKED in each engine; all 24 editor measurements have identical HTML and zero
mutations after icon settlement. Strict Chromium overlays/sweep pass. See
`docs/audits/fix-browser-7ac0f97-2026-10-04.json` and the progress ledger.

### 2026-10-05 — late physical Tool price repaint after anchor expiry

The required trusted-touch test failed twice (01941a8 and 8acf8de) with
20px card/scroll drift after selected Melon's delayed value event. Diagnostic
5b7c135 has zero final displacement, but records the actual
`requestPriceRender -> flushPriceRender -> render` stack: the event replaces
the entire app, disconnects the physical Tool card/editor/main and restores
scroll before asynchronous docking finishes. Instrumented layout reads may
affect that timing; the earlier failures remain failures. See
`docs/audits/tool-scroll-diagnostic-2026-10-05.json` for retained evidence.

The existing price guard recognized `[data-item-editor]` but missed Tools'
`[data-tool-editor]` and `[data-vacuum-panel]`. It now defers price-only core
repaint on those physical surfaces; ordinary state renders still consume the
same cache. No observer, restore timer or persistent click anchor was added.
The trusted regression keeps its 4px bounds and additionally rejects editor,
card or main replacement. All eight emulated viewports receive a late-refresh
fixture in each engine; a disposable module with only the Tool guard removed
must fail the same identity/position acceptance function. Five functional
tests execute the actual price owner, including coalesced deferral, one flush
after editor removal, unchanged Setups protection and immediate safe-page
refresh. Acceptance at `c32ce937fa8c63f7a037e0d1b57d062f68fdea33`: Validate
37272745150 succeeds with 1,392 Node + 8 Python tests, zero late drift and
identical physical nodes. Browser 37272745171 reports 239 PASS / zero FAIL /
zero BLOCKED in each engine; all 24 new late Tool cases and all three removed-
guard countercontrols pass (regression exit 1). Chromium overlays/sweep pass.
See `docs/audits/tool-scroll-acceptance-c32ce93-2026-10-05.json`.
