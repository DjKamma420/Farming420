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
  assert.match(redesign, /\.sb-reforge-card \{[^}]*min-height:\s*58px/);
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
    /if \(activeToolSurface === 'tool' && clickedKey === selectedKey\) \{[\s\S]*collapsedToolKey = collapsedToolKey === selectedKey \? null : selectedKey;[\s\S]*dockToolEditor\(\);/,
  );
  assert.match(
    css,
    /\.sb-tool-grid > \.sb-docked-editor\.sb-tool-editor-collapsed \{[^}]*display:\s*none/,
  );
  assert.match(src, /getAttribute\('aria-expanded'\) !== nextValue/);
});


test('reforge state dots stay in a dedicated far-right grid column', () => {
  const css = read('skyblock-redesign.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.sb-reforge-card \{[^}]*grid-template-columns:\s*32px minmax\(0,1fr\) 14px/s);
  assert.match(
    css,
    /\.sb-reforge-card > \.sb-state-dot \{[^}]*position:\s*static;[^}]*transform:\s*none;[^}]*justify-self:\s*end;[^}]*align-self:\s*center/s,
  );
  assert.doesNotMatch(css, /\.sb-reforge-card em ~ \.sb-state-dot/);
});

test('the open tool and its editor render as one connected accordion frame', () => {
  const css = read('skyblock-redesign.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.sb-tool-card\.selected\[aria-expanded="true"\] \{[^}]*grid-column:\s*1 \/ -1;[^}]*margin-bottom:\s*-7px;[^}]*border-bottom:\s*0/s);
  assert.match(css, /\.sb-tool-grid > \.sb-docked-editor \{[^}]*margin:\s*-7px 0 8px;[^}]*border-top:\s*0;[^}]*border-radius:\s*0 0 6px 6px/s);
  assert.match(css, /\.sb-tool-grid > \.sb-docked-editor::before \{[^}]*content:\s*none/s);
  assert.match(css, /\.sb-reforge-panel \{[^}]*margin:\s*0;[^}]*padding:\s*0;[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none/s);
});


test('rarity styling cannot redraw a seam between an expanded tool and its editor', () => {
  const css = read('rarity-background-ui.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(
    css,
    /\.sb-tool-card\.rarity-surface\.selected\[aria-expanded="true"\] \{[^}]*outline:\s*0;[^}]*box-shadow:\s*none/s,
  );
  assert.match(
    css,
    /\.sb-tool-grid > \.sb-docked-editor\.rarity-surface \{[^}]*box-shadow:\s*0 10px 24px rgba\(0, 0, 0, \.18\)/s,
  );
});


test('Vacuum is a first-class card in the same Tools accordion', () => {
  const src = read('skyblock-redesign.js');
  assert.match(src, /data-sb-vacuum="1"/);
  assert.match(src, /<strong>Pest Vacuum<\/strong>/);
  assert.match(src, /let activeToolSurface = 'tool'/);
  assert.match(src, /function handleVacuumCardClick\(\)/);
  assert.match(src, /activeToolSurface = 'vacuum'/);
});

test('Vacuum and crop tools share the same docked-editor behavior', () => {
  const src = read('skyblock-redesign.js');
  const body = src.slice(src.indexOf('function dockToolEditor()'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  assert.match(fn, /const vacuumEditor = document\.querySelector\('\[data-vacuum-panel\]'\)/);
  assert.match(fn, /const editor = vacuumSelected \? vacuumEditor : toolEditor/);
  assert.match(fn, /const inactiveEditor = vacuumSelected \? toolEditor : vacuumEditor/);
  assert.match(fn, /vacuumSelected \? vacuumCollapsed : collapsedToolKey === selectedKey/);
  assert.match(fn, /selected\.insertAdjacentElement\('afterend', editor\)/);
  assert.doesNotMatch(fn, /cloneNode/);
});
