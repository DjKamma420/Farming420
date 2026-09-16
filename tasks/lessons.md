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
