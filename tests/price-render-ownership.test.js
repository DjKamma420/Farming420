import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Execute the real price owner without booting the application or substituting
// a duplicate guard. Browser tests cover its actual DOM and event integration.
const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function priceRenderBlockedByInteraction()');
const end = source.indexOf("for (const event of ['focusin', 'toggle'])", start);
assert.ok(start >= 0 && end > start, 'price render owner must be present');
const ownerSource = source.slice(start, end);

function harness(page, nodes = []) {
  const visible = new Set(nodes);
  const calls = [];
  // Real render consumes the same lexical pending flag.
  const runtime = runInNewContext(`let pendingPriceRender = false;\n${ownerSource}\n({
    requestPriceRender, flushPriceRender,
    consume() { pendingPriceRender = false; },
    get pending() { return pendingPriceRender; }
  })`, {
    state: {page},
    document: {activeElement: null, querySelector: selector =>
      selector.split(',').some(part => visible.has(part.trim())) ? {} : null},
    captureInteraction: () => { calls.push('capture'); return 'current-interaction'; },
    render: () => { calls.push('render'); runtime.consume(); },
    restoreInteraction: interaction => { assert.equal(interaction, 'current-interaction'); calls.push('restore'); },
  });
  return {runtime, visible, calls};
}

for (const editor of ['[data-tool-editor]', '[data-vacuum-panel]', '[data-item-editor]']) {
  test(`late prices preserve ${editor} even without a focused menu or click anchor`, () => {
    const {runtime, visible, calls} = harness('tools', [editor]);
    for (let i = 0; i < 3; i++) { runtime.requestPriceRender(); runtime.flushPriceRender(); }
    assert.deepEqual(calls, []);
    assert.equal(runtime.pending, true);
    visible.clear();
    runtime.flushPriceRender();
    assert.deepEqual(calls, ['capture', 'render', 'restore']);
    assert.equal(runtime.pending, false);
    runtime.flushPriceRender();
    assert.equal(calls.length, 3, 'consumed prices must not cause a second render');
  });
}

test('closed Setups editor retains the existing late price protection', () => {
  const {runtime, calls} = harness('setups', ['[data-item-editor]']);
  runtime.requestPriceRender();
  assert.deepEqual(calls, []);
  assert.equal(runtime.pending, true);
});

test('a page without a physical editor immediately consumes prices once', () => {
  const {runtime, calls} = harness('dashboard', ['[data-tool-editor]']);
  runtime.requestPriceRender();
  runtime.flushPriceRender();
  assert.deepEqual(calls, ['capture', 'render', 'restore']);
  assert.equal(runtime.pending, false);
});
