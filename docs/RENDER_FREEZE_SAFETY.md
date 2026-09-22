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
node count and markup length of `#app` before and after. Nothing changed, so
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
| a listener appends on every state change without a guard | `IDEMPOTENCE_DRIFT`, naming the page and the node delta |

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
