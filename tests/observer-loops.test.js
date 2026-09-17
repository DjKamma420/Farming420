import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('the tool presentation layer cannot write into the subtree it is watching', () => {
  // This was the click freeze. The module observes #app, and its callback wrote
  // into that same subtree unconditionally. innerHTML and textContent replace
  // the children even when the value is identical, so every write scheduled the
  // next callback: the tab wedged the moment the Tools page rendered, which is
  // why it looked like "everything freezes as soon as I click".
  const source = read('tool-presentation-ui.js');

  // First line of defence: no write unless the value actually changed.
  assert.match(source, /if \(goals\.innerHTML !== markup\) goals\.innerHTML = markup;/);
  assert.match(source, /if\(badge\.textContent!==label\) badge\.textContent=label;/);

  // Second, structural: the observer is detached while the writes happen, and
  // whatever queued in the meantime is dropped before it is reattached, so a
  // future unconditional write cannot bring the freeze back.
  assert.match(source, /observer\.disconnect\(\)/);
  assert.match(source, /observer\.takeRecords\(\)/);
  assert.match(source, /withObserverPaused\(\(\) => \{/);
});

// Deliberately not tested by pattern matching: "does this module guard against
// re-entering itself". Two honest attempts at it produced false alarms on
// correct code -- a module may write into a node before appending it, or return
// early on a marker whose name differs per module -- and a check that fires on
// correct code teaches people to ignore it. The rule lives in tasks/lessons.md
// and is enforced by the audit recorded there, not by a regex.

test('every module the page loads actually exists', () => {
  // A hotfix series cut the module list down to a core and left 39 files
  // unreferenced. Whatever index.html lists has to be real, so the shell cannot
  // quietly ask for a file that is not there.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const present = new Set(readdirSync(new URL('../src', import.meta.url)));
  const referenced = [...html.matchAll(/src\/([\w.-]+\.(?:js|css))/g)].map(m => m[1]);
  assert.ok(referenced.length > 0, 'index.html references no modules at all');
  const missing = referenced.filter(name => !present.has(name));
  assert.deepEqual(missing, [], `index.html references files that do not exist: ${missing.join(', ')}`);
});
