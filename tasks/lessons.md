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
