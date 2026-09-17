# Lessons

## Writing test files through a bash heredoc

**Mistake, made three times in one session:** writing `'` inside a
`<<'EOF'` heredoc to escape an apostrophe in a JavaScript string. A quoted
heredoc passes bytes through literally, so `'` is *not* interpreted — it
reaches the file as the two characters `\u` … and where I intended an escaped
quote inside a single-quoted JS string, the result was a syntax error:

    test('the setup editor's list shape', ...)   ->  broken

**Rule for myself:** in a quoted heredoc, never rely on `\u` escapes for
quoting. Either

- switch the JavaScript string to double quotes: `test("the editor's shape")`,
- or avoid the apostrophe in the test name entirely.

Reserve `\uXXXX` for characters that genuinely need it and cannot appear
literally (the section sign in Minecraft colour codes, `×`, `·`), where it is
inside a JS string that the *runtime* unescapes and the surrounding quoting is
already valid.

**Cheaper still:** `node --check <file>` immediately after writing any JS
through a heredoc catches this in one second, before a full test run. Do that
as part of the same command, not as a separate step after a failure.

## Always fetch before branching from origin/main

**Mistake, made twice in one session:** running
`git checkout -B <branch> origin/main` without a preceding `git fetch`. The
local `origin/main` ref is only as fresh as the last fetch, and merging a PR
through the GitHub API does **not** update it. Both times the branch was cut
from a commit behind real main, which showed up as a test count that had
silently gone backwards (222 -> 220).

**Rule for myself:** `git fetch origin` and `git checkout -B <branch>
origin/main` belong in the *same* command, always. A dropping test count after
branching is the tell.

**And:** `git stash -u` + `git stash pop` across that rebase silently lost the
version bumps in files that had no other change. Prefer committing on the wrong
branch and cherry-picking, or re-apply and verify the version numbers by
grepping them afterwards, which is what caught it.

## `'` inside a quoted bash heredoc (4th occurrence)

Writing `game's` inside `<<'EOF'` emits the six literal characters, not an
apostrophe, and the file fails to parse. The escape only means something to a
JS string literal, and a quoted heredoc passes bytes through untouched.

Rule: never reach for `'` in a heredoc. Either write the file with a Python
script (where the escaping is explicit and visible), or rewrite the sentence so
it needs no apostrophe. Always run `node --check` on the file in the same
command that writes it, so the failure surfaces immediately instead of inside a
test-runner summary that only says "test failed".

## An observer that watches for its own insertions (3rd occurrence)

`item-art-ui.js` runs on a MutationObserver and inserts nodes. Its guard asked
"does this card already contain a pack texture?" — so when the inserted node was
a head instead, the guard never matched, the insertion triggered the observer,
and the loop pegged the browser. The page rendered, then froze. Identical in
shape to the `catalogRequested` loop and the `ensureItemCatalog` one before it.

Rule: an observer-driven writer must guard on a mark it sets on the **container**
and sets unconditionally, never on the presence of one particular kind of child.
The guard has to be true after any successful pass, including passes that insert
something new.

Second rule from the same change: when selecting insertion points, never select
both an element and its own descendant. `'.slot-card[data-slot], .slot-portrait'`
matched a card and the portrait inside it, so each slot got two pictures. Select
the innermost container only, and resolve the id by walking up.

Both were found by running the real page in a browser, not by reading the diff.

## Local green that CI could not reproduce

`npm test` ran only the Node tests. CI also ran `python3 -m unittest
tests/test_resource_pack_sync.py`, so a change to the sync script passed locally
and failed on the pull request. I had even seen the file in the test listing and
still did not run it.

Rule: the command the repo documents as "run the tests" must run everything CI
runs. `npm test` now chains `test:node` and `test:python`, so local green and CI
green mean the same thing. Before changing a script or a config file, check which
workflow steps touch it rather than assuming one test runner covers the repo.

## An observer writing into the subtree it watches (4th occurrence)

`tool-presentation-ui.js` observed `#app` with `{childList: true, subtree: true}`
and its callback wrote into that same subtree on every run:

    goals.innerHTML = markup;      // every call, even when markup was identical
    badge.textContent = label;     // every call

`innerHTML` and `textContent` replace the child nodes even when the new value
equals the old one. The observer cannot tell the difference: it reports a
mutation, the callback runs again, it writes again. The page wedged within a
second of the Tools page rendering, which reads to a user as "everything
freezes as soon as I click".

It hid on load because the function returns early unless the active page is
Tools, so the first click was what started it.

Rules:
1. Never assign `innerHTML`/`textContent`/an attribute from an observer callback
   without first comparing against the current value. Equal values must not be
   written.
2. Add the structural guard too: `disconnect()`, write, `takeRecords()`,
   `observe()` again. Idempotence relies on every future writer remembering;
   pausing does not.
3. Coalescing with a `scheduled` flag plus `queueMicrotask` is **not** a fix for
   this. It limits the loop to one callback per microtask; the loop still never
   ends.

This property is not checkable by pattern matching. Two attempts produced false
alarms on correct code (writing into a not-yet-appended node; per-module marker
names), so the family is covered by audit, not by a test. The audit of the other
twelve observer modules: each either returns early on a marker, compares before
writing, or records what it already painted.

Also: a hotfix series that cuts modules out of `index.html` to isolate a fault
has to be undone once the fault is found. This one left 39 of 56 modules
unreferenced -- Settings, the API sync, the scanner and all item art among them.
Bisect forward from the minimal core instead: add one module, run the click
sweep, repeat. The ninth addition crashed the renderer and named the culprit,
and the module the hotfixes had blamed passed cleanly at step eight.


## Two observers fighting over the same node (0.26.0)

A variant of the feedback loop above that idempotent writes do **not** cover.
`skyblock-redesign.js` removed `.tool-context-addon` because its own panel
replaced it; `enhancements.js` owns that node and recreates it whenever it is
missing. Neither module wrote a duplicate value, so the "compare before you
write" rule was satisfied -- and the page still hung, because one module's
create was the other's mutation record forever.

Rules:
1. Never remove a node another module creates. Hide it (`display:none` via a
   class) and leave it in the DOM. Removal is a write that the owner is
   guaranteed to undo.
2. A panel that replaces something must replace **itself** on re-entry. Find
   the existing panel first and only fall back to the neighbour when there is
   none -- `querySelector('.item-editor-section:not(.sb-reforge-panel)')` looks
   like it does that and does not: once the panel exists, the selector picks
   the *next* section and starts eating the editor.
3. A signature on the node (`dataset.sbSignature`) makes re-entry cheap and
   provable: same inputs, no DOM touch at all.

Both bugs were found by the verification run hanging, not by a test. The test
that exists now pins the two invariants: the panel replaces itself, and nothing
removes a node another module recreates.

## Exclusive choices are not levers

Levers (on/off toggles) are right for things that stack -- enchantments, gems,
recombobulated. They are wrong for a set where picking one unpicks the others:
a reforge, a tool tier. Those need a radiogroup with an explicit "none" option
first, so "no reforge" is a state the user can select rather than the absence
of any selection. A lever list for an exclusive set also invites the duplicate
that started this: the same choice offered twice, in two shapes, on one page.


## A sweep that hangs forever is a sweep with no deadline (0.26.0)

The click sweep kept running past any patience, and the reason was structural:
one process walked every page, and a frozen renderer makes *each* Playwright
call wait out its own timeout. Hundreds of clicks times a few seconds each is
an afternoon. Per-click timeouts do not bound a run; only a clock does.

What fixed it:
1. **Shard by area.** One process per page, each with its own deadline and its
   own browser. A hang costs that area and nothing else, and the fifteen areas
   that work still report.
2. **Budget in time, not in clicks.** Each variant stops when its wall clock
   runs out and says how far it got, instead of promising to finish.
3. **A hard outer `timeout`** on every worker, so a wedged browser cannot
   outlive its shard.

## Three ways a sweep lies about passing

All three of these reported "ok" while testing nothing, which is worse than
failing:

- **Clicking hidden elements.** Below 780px the sidebar is `display:none`, so
  every `[data-page]` button is invisible; the clicks went nowhere and the run
  swept the dashboard sixteen times while reporting a pass for each page.
  Phone navigation is the `.mobile-page-select-addon` in the topbar.
- **Not checking where you landed.** The fix for the above is not "click the
  select" but "click it, then read the stored page back and fail if it is not
  the one asked for."
- **Counting timeouts as work.** The planner keeps its old list in the DOM as
  `.planner-v1-source` with `display:none`. Twenty 0x0 nodes ate 3s each in
  click timeouts, exhausted the budget, and the page's actual UI -- 30 revenue
  rows and 7 mode tabs -- was never touched. A drawer that takes exactly
  6002ms to open is not slow, it is two stacked timeouts.

Rule: only click elements with a layout box (`boundingBox()` with non-zero
width and height), and assert the state you expected to reach. An identical
click count across viewports is a smell, not a reassurance -- it usually means
navigation silently did nothing.


## pgrep -f finds the process that is running pgrep (0.26.1)

Four background waiters sat at 16+ minutes each, and there was nothing left to
wait for -- the sweeps they watched had finished long before. The loop was:

    until [ "$(pgrep -c -f sweep-area.mjs)" -eq 0 ]; do sleep 5; done

`pgrep -f` matches against the full command line of every process, and the
waiting shell's own command line contains the string `sweep-area.mjs`. So it
counts itself, the count never reaches zero, and the loop runs until something
kills it. The condition is unsatisfiable by construction.

Two rules, and the second matters more:

1. If a self-matching pattern is unavoidable, break it so the literal does not
   appear in the command line: `pgrep -f "[s]weep-area.mjs"`. Better, match on
   something the watcher cannot contain, or use `pgrep -x node` plus a check of
   the actual argv.
2. **Do not write the watcher at all.** A backgrounded command already reports
   its own completion; polling for it adds a second process that can fail on
   its own, and this one did. The results were sitting in the finished runner's
   output the whole time. Reach for a poll loop only for state nothing reports
   -- an external CI run, a remote queue -- never for a local job already being
   tracked.

The symptom to recognise: a waiter that outlives the thing it waits for, with
its target nowhere in the process list.


## position: relative is not a stacking context (0.26.2)

The tool icon painted over the sticky topbar while scrolling the Tools page.
The icon had `z-index: 2` and the topbar had `z-index: 2`; on a tie, document
order decides, and the icon comes later.

The tempting read is "the icon's z-index is too high". It is not. The real
fault is one box up: `.sb-tool-art` is `position: relative` with no `z-index`,
which does **not** create a stacking context. Its children's z-indexes therefore
compete against the entire page instead of against each other. The icon's 2 was
only ever meant to beat the letter fallback's 1 inside that 52x52 box.

Fix the container, not the number: `isolation: isolate` on the art box and on
`.item-portrait` (which holds a tier badge at z-index 4). The inner layering
keeps working and can no longer reach the page.

Rule: any box whose children use z-index must establish a stacking context --
`isolation: isolate` is the cheapest way and does not change layout. Tuning the
child's number instead only moves the collision to whatever chrome sits at the
next value up.

Verifying this needs a hit test, not a property read: scroll until the two
overlap and call `elementFromPoint` on the overlapping strip. Reading the
element's own z-index tells you nothing once a stacking context exists -- my
first check reported the bug as still present after it was fixed, because it
was looking at the number rather than at what actually paints on top. Prove the
check fails without the fix before trusting it: 8 of 8 samples wrong before,
0 of 8 after.
