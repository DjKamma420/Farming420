import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * A pack icon once painted over the sticky topbar while scrolling the Tools
 * page. The cause was not the icon's z-index on its own but the box around it:
 * `position: relative` without a z-index does NOT create a stacking context, so
 * the icon's z-index 2 competed with the whole page, tied with the topbar's
 * z-index 2, and won the tie on document order.
 *
 * These tests pin the containment rather than the numbers, because the numbers
 * are free to change as long as they stay inside their own box.
 */

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

/** Declarations of one rule, by exact selector text, across a stylesheet. */
function declarationsFor(css, selector) {
  // Comments first: a block comment before a rule is otherwise swallowed into
  // the selector text and nothing matches.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(source))) {
    const selectors = match[1].split(',').map(s => s.trim().replace(/\s+/g, ' '));
    if (selectors.includes(selector)) found.push(match[2]);
  }
  return found;
}

test('the art boxes create their own stacking context', () => {
  const css = read('skyblock-redesign.css');
  for (const selector of ['.skyblock-redesign .sb-tool-art', '.skyblock-redesign .sb-reforge-art']) {
    const blocks = declarationsFor(css, selector);
    assert.ok(blocks.length, `no rule found for ${selector}`);
    assert.ok(
      blocks.some(block => /isolation\s*:\s*isolate/.test(block)),
      `${selector} must isolate, or its inner z-indexes escape onto the page`,
    );
  }
});

test('the item portrait creates its own stacking context', () => {
  const blocks = declarationsFor(read('item-editor.css'), '.item-portrait');
  assert.ok(blocks.length, 'no .item-portrait rule found');
  assert.ok(
    blocks.some(block => /isolation\s*:\s*isolate/.test(block)),
    '.item-portrait holds a tier badge at z-index 4 and must isolate it',
  );
});

test('the sticky topbar is still the element the fix reasons about', () => {
  const blocks = declarationsFor(read('styles.css'), '.topbar');
  assert.ok(blocks.length, 'no .topbar rule found');
  const topbar = blocks.join(' ');
  assert.match(topbar, /position\s*:\s*sticky/, 'the overlap only happens because the bar is sticky');
  assert.match(topbar, /z-index\s*:\s*\d+/, 'the bar needs an explicit z-index to sit above content');
});
