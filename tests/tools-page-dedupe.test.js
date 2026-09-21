import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('the physical tool is chosen in exactly one place', () => {
  // Three controls picked the same tool on one page: the card grid, a native
  // select, and a list of levers built on top of that select. The grid is the
  // one that also shows the item art and the tier, so it is the one that stays.
  const picker = read('workspace-direct-picker.js');
  assert.doesNotMatch(picker, /workspace-tool-button/);
  assert.match(picker, /workspace-tool-picker-hidden/);
  // The select itself stays in the DOM: the workspace listens to its change event.
  assert.match(picker, /#workspaceToolSelect/);
  assert.match(read('workspace-direct-picker.css'), /\.workspace-tool-picker-hidden/);
});

test('a reforge is a single choice with an explicit "none"', () => {
  // A lever per reforge implied you could hold several. You hold one or none,
  // and "none" is an answer the player can give rather than an empty state.
  const redesign = read('skyblock-redesign.js');
  assert.match(redesign, /role="radiogroup"/);
  assert.match(redesign, /sb-reforge-none/);
  assert.match(redesign, /No reforge/);
  assert.match(redesign, /aria-checked="\$\{chosen \? 'false' : 'true'\}"/);
  // Choosing none clears the stored value instead of writing an empty string.
  assert.match(redesign, /if \(reforgeId\) state\.profile\.toolReforges\[key\] = reforgeId;/);
  assert.match(redesign, /else delete state\.profile\.toolReforges\[key\];/);
});

test('the reforge panel replaces itself, never the section next to it', () => {
  // Taking the first section that is not the panel picks Enchantments once the
  // panel exists, and every pass then eats another section of the editor.
  const redesign = read('skyblock-redesign.js');
  assert.match(redesign, /const existingPanel = editor\.querySelector\('\.sb-reforge-panel'\)/);
  assert.match(redesign, /const target = existingPanel \|\| editor\.querySelector\('\[data-tool-section="reforge"\]'\)/);
  assert.match(redesign, /existingPanel\?\.dataset\.sbSignature === signature/);
});

test('nothing removes a node another module recreates', () => {
  // enhancements.js rebuilds .tool-context-addon whenever it is missing, so
  // removing it makes the two observers fight until the tab dies. Hide it.
  const redesign = read('skyblock-redesign.js');
  assert.match(redesign, /tool-context-addon'\)\?\.classList\.add\('sb-hidden-context'\)/);
  assert.doesNotMatch(redesign, /tool-context-addon'\)\?\.remove\(\)/);
});


test('tool tier is shown before reforge because it selects the physical Mk item first', () => {
  const itemEditor = read('item-editor.js');
  const upgrades = itemEditor.indexOf("id: 'upgrades'");
  const reforge = itemEditor.indexOf("id: 'reforge'");
  assert.ok(upgrades >= 0 && reforge > upgrades, 'Tool upgrades/Mk tier must precede Reforge');

  const app = read('app.js');
  assert.match(app, /data-tool-section="\$\{esc\(group\.id\)\}"/);

  const workspace = read('workspace-ui.js');
  assert.match(workspace, /data-tool-section="upgrades"/);
  assert.match(workspace, /data-tool-section="reforge"/);
});
