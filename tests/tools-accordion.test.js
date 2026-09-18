import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * The tool editor is docked under the tool it belongs to, and the wrapper left
 * behind by hiding the duplicate picker is collapsed.
 */
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('the editor is moved, not copied', () => {
  const src = read('skyblock-redesign.js');
  assert.match(src, /function dockToolEditor\(\)/, 'dockToolEditor is missing');
  const body = src.slice(src.indexOf('function dockToolEditor()'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  assert.match(fn, /insertAdjacentElement\('afterend', editor\)/, 'the editor must be relocated');
  assert.ok(
    !/cloneNode/.test(fn),
    'cloning would leave two editors and break "the other one closes"',
  );
});

test('docking is idempotent, because an observer re-enters it', () => {
  const src = read('skyblock-redesign.js');
  const body = src.slice(src.indexOf('function dockToolEditor()'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  assert.match(
    fn,
    /nextElementSibling === editor\)\s*return/,
    'without this early return, moving the node re-triggers the observer that moved it',
  );
});

test('dockToolEditor runs in the apply pass', () => {
  assert.match(read('skyblock-redesign.js'), /\n\s*dockToolEditor\(\);/, 'never called');
});

test('the expanded tool editor does not repeat the selected tool identity', () => {
  const app = read('app.js');
  const start = app.indexOf('function toolItemPanel()');
  const end = app.indexOf('\nfunction bindToolPanel()', start);
  assert.ok(start >= 0 && end > start, 'toolItemPanel block not found');
  const fn = app.slice(start, end);
  assert.doesNotMatch(fn, /item-editor-head/);
  assert.doesNotMatch(fn, /item-portrait/);
  assert.doesNotMatch(fn, /item-identity/);
});

test('the docked editor spans the whole card row', () => {
  const css = read('skyblock-redesign.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(
    css,
    /\.sb-tool-grid > \.sb-docked-editor \{[^}]*grid-column:\s*1 \/ -1/,
    'a docked editor in one grid column would squeeze into a card slot',
  );
});

test('the empty picker wrapper is collapsed, but only while it is empty', () => {
  const css = read('workspace-direct-picker.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.match(/\.workspace-context:has\([^)]*\)[^{]*\{[^}]*\}/);
  assert.ok(rule, 'no rule collapses the wrapper around the hidden picker');
  assert.match(
    rule[0],
    /:only-child/,
    'without :only-child this hides the wrapper even once it holds real content',
  );
  assert.match(rule[0], /display:\s*none/);
});


test('tool cards and shared item editors stay compact', () => {
  const redesign = read('skyblock-redesign.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const editor = read('item-editor.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(redesign, /\.sb-tool-card \{[^}]*min-height:\s*58px/);
  assert.match(redesign, /\.sb-reforge-card \{[^}]*min-height:\s*86px/);
  assert.match(editor, /\.item-editor \{[^}]*padding:\s*14px/);
  assert.match(editor, /\.item-portrait \{\s*width:\s*58px;\s*height:\s*58px/);
});


test('tools page keeps redundant copy hidden while the active tool remains tappable', () => {
  const src = read('skyblock-redesign.js');
  const css = read('skyblock-redesign.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(src, /content\.classList\.add\('sb-tools-page'\)/);
  assert.match(css, /\.sb-tools-page > \.page-head \{[^}]*display:\s*none/);
  assert.doesNotMatch(css, /\.sb-tools-page \.sb-tool-card\.selected \{[^}]*display:\s*none/);
  assert.doesNotMatch(
    src,
    /Every current Farming Tool reforge stays selectable\. The recommendation changes by goal instead of hiding non-meta choices\./,
  );
});

test('tapping the active tool toggles its docked editor closed and open', () => {
  const src = read('skyblock-redesign.js');
  const css = read('skyblock-redesign.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(src, /let collapsedToolKey = null/);
  assert.match(
    src,
    /if \(clickedKey === selectedKey\) \{[\s\S]*collapsedToolKey = collapsedToolKey === selectedKey \? null : selectedKey;[\s\S]*dockToolEditor\(\);/,
  );
  assert.match(
    css,
    /\.sb-tool-grid > \.sb-docked-editor\.sb-tool-editor-collapsed \{[^}]*display:\s*none/,
  );
  assert.match(src, /getAttribute\('aria-expanded'\) !== nextValue/);
});
