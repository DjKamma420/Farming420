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
