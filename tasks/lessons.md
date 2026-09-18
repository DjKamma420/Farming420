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


## An override that does not name the property does not override it (0.27.0)

The phone taskbar had been written, shipped and never once displayed. A base
stylesheet said `.sidebar { display: none }` below 780px; the redesign restyled
that same element for phones -- position, width, height, padding, border, even
the flex direction of its nav -- and every one of those declarations applied.
The element stayed invisible, because none of them was `display`.

The trap is that the override *looks* complete: higher specificity, same
element, a whole block of properties taking effect. Only the one property that
matters is missing, and the result is indistinguishable from "the feature was
never built".

When restyling something another stylesheet hides, check `display`,
`visibility` and `opacity` explicitly, and verify against the rendered box
(`getBoundingClientRect` plus `getComputedStyle`) rather than by reading the
rule you just wrote.


## A container that reads well in one axis breaks in the other (0.27.1)

The nav is wrapped in titled groups. Down a 88px side rail that is a heading
over its items -- exactly right. Turned into a horizontal 68px bar, the same
markup makes each group a column of heading-over-buttons, which needs two rows
and gets clipped.

Nothing was wrong with either the grouping or the bar; they were written by
different modules for different axes and never seen together, because the bar
had never rendered at all (see 0.27.0). Re-laying a vertical grouping
horizontally needs `display: contents` on the wrapper so its children join the
parent's flex row, not a second copy of the markup.

Related, from the same bug: `groupSidebar` appends groups after whatever it did
not move, so a page missing from its table is **not** dropped -- it silently
leads the list. Three pages were missing and nobody noticed for as long as the
grouping only ever appeared in a scrollable side rail. Any function that
reorders a subset needs a test that the subset is the whole set.


## Check an icon as an image, not as a name (0.27.2)

Looking for crop art, the name `fine_flour` reads like the obvious wheat icon
and `deepfries` like the obvious potato one. Rendered, the first is a brown
sack and the second is a portion of chips -- neither says "wheat" or "potato"
to anyone glancing at a tile. Both were rejected only because the candidates
were rendered to a contact sheet and looked at.

Pack keys are written by someone naming an item, not an icon. Render the
candidates before wiring them up; it costs one script and settles the question
that reading names cannot.

Corollary: when nothing fits, say so. The Recombobulator has no texture in this
pack at all, and the honest result is that it keeps its placeholder.

## A detector that only looks where you already looked (0.27.2)

The overlay audit swept `.content` in four viewports and reported three
findings, one of which was a false positive. It never looked at the sidebar --
and the sidebar was where a heading was being cut mid-word on every desktop
page. I found that by eye, in a screenshot taken for a different reason.

Two rules from this:
1. A detector's scope is a claim about where bugs can be. Write the scope down
   and challenge it; "0 findings" means nothing about what was never scanned.
2. Exclude known-good cases explicitly. `.sr-only` text is clipped on purpose,
   and a finding that is always wrong teaches people to skim past the ones that
   are right.


## "It does not exist" is a claim about where you looked (0.27.3)

I searched the shipped resource pack for a Recombobulator texture, found none,
and reported that it has no design. It has one -- from the official SkyBlock
item resource, which is a different source that the app already uses, and where
player-head items live precisely because they have no pack texture.

The pack was one of at least three art sources in this codebase. Searching one
and reporting absence reads as a finding but is only a statement about the
drawer I opened. Before saying something does not exist, enumerate the sources
that could hold it and say which ones were checked.

The same error in miniature: four nav pages were left as bare letters because
no pack item is literally called "Mechanics" or "Coming Soon". An item that
*means* the thing was available the whole time -- a diagnostics tool, a
blueprint. "No literal match" is not "no match".


## A parser that knows one shape reports absence, not failure (0.27.4)

The head-texture reader understood a single NBT layout. Given any other, it
returned null -- which is also the correct answer for the thousands of items
that are not heads. So a total parsing failure and a perfectly ordinary
"not applicable" produced identical output, and the UI did what it was told:
fell back to silhouettes, silently, everywhere.

That is the dangerous shape of bug. There was no error to find, no log line,
nothing failing a test. It only became visible as "looks wrong" in a
screenshot, weeks later.

Rules:
1. When a reader's "no" and its "I did not understand" are the same value,
   enumerate the shapes you accept and test each one. Seven of ten known
   layouts failed here.
2. Work outward from the render, not inward from the complaint. Seeding a slot
   that *did* carry a texture proved the renderer was fine in one run and moved
   the search upstream immediately.
3. Say what the fix does not establish. The API is unreachable from here, so
   whether this is the cause of the reported screenshots is still unverified,
   and claiming otherwise would just be a guess wearing a commit message.


## Hook, do not rewrite, another agent's file (0.28.0)

The fallback art had to sit inside `itemArtNode`, in a file another agent was
actively editing. Rather than reworking that function, the whole table, lookup
and node went into a new file and the edit there became one import plus three
lines at the single decision point. Four added lines, nothing removed, so a
merge has almost no surface to conflict on.

The general shape: find the one function where the decision is made, put the
new behaviour behind a call, and keep every line of logic in a file you own.
It also makes the change trivially reviewable by whoever owns the other side.


## Two renderers, one box (0.28.1)

Two modules drew a tool picture into the same portrait. Neither was broken on
its own: one resolved the item's base id, the other the tier the profile owns.
Both were correct answers to different questions, painted on top of each other
five pixels apart.

The overlay audit did not catch it. It looks for a child escaping its parent or
text being clipped, and two images stacked inside their box violate neither.
What found it was a person looking at a zoomed screenshot and saying "there are
two". Worth remembering when a detector reports zero.

The rule that generalises: when more than one module can draw into a container,
one of them has to be authoritative and the others must stand aside by class,
not by removal. `:has(> .the-authoritative-one)` expresses exactly that and
costs no JavaScript -- and it must be scoped to where the authority actually
exists, or containers that legitimately rely on the other renderer go blank.


## Hiding a child leaves the parent painting (0.29.0)

Deduplicating a control by hiding it is right, but a hidden child does not
collapse its parent. The wrapper kept its border, background and padding and
became an empty bar that shipped for three versions without anyone naming it.

When hiding an element to remove a duplicate, look at what wraps it and decide
about that too -- and collapse the wrapper conditionally (`:only-child`), so it
comes back by itself the moment it has real content again. An unconditional
hide of the parent is a second bug waiting for whoever adds content there next.

Also: this was found by reading a screenshot, and named by walking
`elementFromPoint` down the page. Neither the overlay audit nor any test saw
it, because an empty box violates nothing.


## Look for the rule before writing it again (0.30.0)

I wrote a rarity ladder and a "Recombobulator is one rung" function, then found
both already in `exact-farming-items.js`, written for the vacuums. Nothing had
gone wrong yet -- but two tables stating the same game rule drift, and the one
that drifts is the one nobody is looking at.

Before adding a domain constant or rule, grep for the concept, not just the
name I would have chosen. `RARITY_ORDER` was there all along; I searched for
`RARITY_LADDER`.


## "Where applicable" is a per-item gate, not a footnote (0.30.1)

I implemented the Recombobulator as "+1 rarity", which is how it is described
everywhere in shorthand. The repo's own research said "+1 item rarity tier
where applicable" and "do not assign a fixed delta globally" -- and I had read
that file to find the rule in the first place.

The qualifier was the whole rule. Dropping it would have inflated every
rarity-scaled reforge and gemstone value on any item that cannot take the step.

When research states a rule with a condition attached, the condition is part of
the rule. And check whether the codebase already answers it: the per-item gate
existed in the same file, used two lines away to decide whether to show the
checkbox.


## Read the property that decides, not one that correlates (0.31.0)

Third time in this session. A box height does not decide whether something is
painted; a z-index does not decide what is on top once a stacking context
exists; an element's own class does not decide whether its parent collapsed.

Each time the measurement looked authoritative and was answering a different
question, and each time it cost a round trip -- once reporting a fixed bug as
still broken, once reporting a working collapse as broken.

The habit to keep: name the question first ("is this painted?"), then find the
API that answers exactly that (`checkVisibility`, `elementFromPoint`), rather
than reaching for the property that happens to be nearby. And prove the check
can fail: a check that cannot distinguish the broken state from the fixed one
is not a check.


## Tested is not wired (0.32.0)

Three modules -- the profit engine, the strategy layer, the item-model coverage
auditor -- had tests, careful documentation and a design document describing
them as "added in this pass". None was imported by any runtime path. Green
tests said the code worked; nothing said it ran.

`grep -rl <module> src/` minus the module itself, plus a check of the entry
point, answers in seconds what a test suite cannot: is this reachable at all.
Worth running on anything described as newly added, including my own.

## A generated document needs a test or it rots

The price gap list is generated from two moving data sets. Written once it
would be wrong within a week and still look authoritative. It states its own
numbers, and a test recomputes them and fails when they drift -- including a
check that every entry it names still exists.

Same rule as the coverage audit: the document is the readable form, the test is
what keeps it true.


## Key casing is not a detail (0.33.0)

Three priced entries shipped with no verification date because one research file
says `as_of` and another says `lastVerified`. Reading a single spelling returned
undefined, which looks exactly like "this record has no date".

Same shape as the head-texture reader two versions ago: a lookup that
understands one spelling reports absence rather than failure. When reading
data written by hand across several files, accept the spellings that exist and
let a test ask for the field rather than trusting that it arrived.

## An id table needs a guard, not care (0.33.0)

My first link table named three upgrade ids that do not exist -- I had derived
them from entry names instead of reading `src/data.js`. Nothing failed: they
simply counted as unlinked, which is indistinguishable from honest absence.

The generator now refuses to build if the table names an unknown id. Any
hand-written mapping into another data set wants that check, because a typo in
a mapping is silent by nature.

## A shared container has an owner (0.34.0)

`activity-mode-ui.js` did `document.querySelector('.planner-list')` and wrote
its own rows into it. That was correct until `revenue-planner.js` inserted a
second `.planner-list` *before* the first one. From then on the bare selector
matched the newer list, the later-loading module overwrote it, and the revenue
ranking was never once visible -- with no error, no duplicate node and nothing
in any log.

Rule: a selector that names only a class names whatever comes first in document
order. When several modules render into one page, each write says which element
it means -- `:not(.revenue-list)`, a data attribute, or an owner class -- and a
test pins that the qualifier is there. I also checked `ux-simplify.js` in the
same pass rather than fixing only the one that showed.

The general form: **the same mistake usually lives in more than one file.** Grep
for the pattern, not for the symptom.

## `hidden` is not a guarantee (0.34.0)

`planner-mode-ui.js` set `revenue.hidden = true` and the panel stayed on screen,
because `[hidden] { display: none }` is a UA rule and `.revenue-planner-v2
{ display: grid }` is an author rule with a class. The author rule wins every
time.

Rule: any component whose stylesheet sets `display` needs its own
`[hidden] { display: none }`, or `hidden` is decoration. And "I set hidden" is
not verification -- `checkVisibility()` is.

## Grep the repo before writing the module (0.37.0)

I wrote `src/pest-model.js` with a thirteen-row pest/crop table, and
`src/measured-baseline.js` with a hand-rolled profit-engine input. Both already
existed:

- `src/pest-mechanics-data.js` had every pest with its crop, its guaranteed
  drop item, that drop's base quantity and the Fortune each extra unit costs.
- `src/planner-profit-adapter.js` had `sourceDrivenCropInput`, which builds the
  same engine input *and* takes the crop's drop count from
  `farming-mechanics-data.js` together with the status of that figure.

That is the **third and fourth** duplicate of this kind after two rarity ladders
and two taskbar rules. What found them was not a search: it was listing every
module nothing imports, while waiting for CI. If I had run that list first I
would have found both before writing a line.

Rule: before creating a module, list what the repo already has on that subject.
`ls src/` is twelve seconds. Grepping for the name I have in mind is not
enough -- I searched for `RARITY_LADDER` and missed `RARITY_ORDER`, and here I
would have searched for "pest model" and missed "pest mechanics data". Read the
*file names* on the subject, then their exports.

Deduplicating both made the work better, not just smaller: the pests page gained
a guaranteed-drop column it did not have, and the measured panel lost a field
because the crop's drop count is data, not a measurement. A duplicate is not
only waste; it is a worse version of something that already works.

## A false negative in the harness costs more than a slow harness (0.37.0)

The full sweep reported `[crops] desktop-empty UNREACHABLE: page exists but no
visible way to open it`. I investigated it as an app bug: probed the nav link's
computed style, its box, its parent, and its visibility at six different delays.
It was visible every time. Re-running the area passed, twice.

The cause was in the harness. `sweep-all.sh` runs four areas at once, each with
three browser contexts, against one local server -- and `sweep-area.mjs` waited
a flat 900ms after `domcontentloaded` before looking for the nav. Under that
load the nav enhancements had not finished building the rail yet.

It now waits for `.sidebar [data-page]` to be visible, and gives a specific
page's link a bounded second chance before calling it unreachable.

Rule: **wait for the condition, not the clock.** A fixed delay in a harness that
runs things in parallel is a false-failure generator.

And the reason this mattered rather than being a shrug: the very same check had
just found a *genuine* unreachable page. A check that cries wolf is a check that
gets ignored the next time it is right. So I proved the guard still works by
hiding a nav link on purpose and confirming all three profiles failed again,
then restored the file.

## Do not import an enhancer for a utility (0.37.0)

I needed `setTextIfChanged`, saw it exported from `setup-selection-ui.js`, and
imported it from there -- pleased with myself for not writing a second copy.

But that module is a DOM enhancer with boot side effects: its body calls
`schedule()` and registers document listeners on evaluation. Importing it from
`revenue-planner.js` (index.html line 49) pulled its boot into that module's
graph and moved it ahead of its own `<script>` at line 52. That is rule 10 of
`docs/RENDER_FREEZE_SAFETY.md`: core boot must not depend on optional DOM
enhancers. It is also the module whose observer froze the app in PR #90.

`setTextIfChanged` now lives in `src/set-text.js`, which has no imports, no
listeners and no boot. The enhancer imports and re-exports it, so its own
callers and tests are untouched.

Two things this cost me on the way:

- A bare `export { x } from './y.js'` creates **no local binding**, so the
  enhancer's own eleven calls to it became a ReferenceError. `node --check`
  does not catch that; the import must be there too.
- I inserted the new import with "after the last line starting with `import `",
  which landed it *inside* a multi-line import block. Heuristics about source
  text need to be checked against the source text.

Rule: sharing a function is good; sharing a module's boot order is not. Before
importing from a module, look at what its body does when it is evaluated.

## An unwired module can be a regression, not a feature (0.39.0)

Listing modules nothing imports found ten. I assumed they were all unfinished
features waiting to be connected. One was not.

`workspace-capability-refresh.js` rewrote the gemstone copy at runtime, turning
"first at Farming Tool level 5" into "level 1". The verified value is **5**:
`gemstone-slots.js` sources it to the official item API data, records a
verification date, and pins it with ten assertions in
`tool-gemstone-thresholds.test.js`. So the module was not a fix waiting to be
wired -- it was a wrong number waiting to be shipped, and adding its script tag
would have made the app contradict its own test suite. It also wrote
`textContent` unconditionally from a `state-changed` handler, which is the PR
#90 freeze shape.

Rule: before wiring an orphan, ask what it *asserts*, and check that against
whatever the repo treats as the source of truth. "Someone wrote it" is not
evidence. Delete is a legitimate outcome of an orphan audit.

## `Number(null)` is 0, and that is how unknowns become answers (0.39.0)

`jacob-contest-model.js` guarded its inputs with:

```js
const number = Number(value);
return Number.isFinite(number) && number >= 0 ? number : null;
```

`Number(null)`, `Number(undefined)` and `Number('')` are all 0, and 0 is a
finite non-negative number -- so every absent input passed as a measured zero.
A contest estimate with no breaking speed came back **complete**, with a
collection of 0 and participation not reached. A confident wrong answer, in the
one place this repo has a written invariant against it.

`profit-engine.js` had the guard right all along: it checks for `null`,
`undefined` and `''` *before* calling `Number`. Two models, one convention,
one of them wrong.

Rule: a numeric guard must reject absence before it coerces. And when two
modules in the same repo do the same check, diff them -- the correct one is
already written.


## Fix the pattern, then audit its siblings (0.39.1)

The 0.39.0 contest bug was not unique to the contest model. Its exact failure
shape -- `Number(null) === 0` -- still existed in the generic strategy
metric reader, where it could turn a missing objective into a complete
zero-valued strategy.

The useful follow-up was not a blind replacement of every `Number()` call.
Some modules intentionally normalize optional economic inputs to zero, while
others require explicit values. The audit checked the semantic boundary:
Profit, Greenhouse and Mooshroom Cow already reject absence where unknown would
change correctness; the strategy objective reader did not.

Rule: after fixing a coercion bug, search for the coercion pattern repo-wide,
but change only helpers whose contract says absence is unknown. Preserve a
literal zero when zero is a valid explicit measurement.
