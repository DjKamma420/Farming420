import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * One tool picture per portrait, and a tier badge that is allowed to leave the
 * square.
 *
 * Two modules draw into the tool editor's portrait. `item-art-ui` resolves the
 * tool's base item id, which is always the Mk. I texture, and places it
 * absolutely at 60x60; the redesign draws the tier the profile actually owns at
 * 50x50, five pixels further in. Both painted, so a Mk. III tool wore a Mk. I
 * underneath it, offset by exactly those five pixels.
 */

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

function declarationsFor(css, selectorPart) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(source))) {
    const selectors = match[1].split(',').map(s => s.trim().replace(/\s+/g, ' '));
    if (selectors.some(selector => selector.includes(selectorPart))) found.push({ selectors, body: match[2] });
  }
  return found;
}

test('the base-tier picture is hidden when the tier-correct one is present', () => {
  const rules = declarationsFor(read('skyblock-redesign.css'), '.official-item-art');
  const hiding = rules.filter(rule => /display\s*:\s*none/.test(rule.body));
  assert.ok(hiding.length, 'no rule hides the duplicate .official-item-art layer');
  const guarded = hiding.some(rule => rule.selectors.some(selector => selector.includes(':has(> .sb-pack-icon)')));
  assert.ok(
    guarded,
    'the rule must only hide it where a tier-correct icon exists, or portraits '
      + 'that rely on .official-item-art alone would lose their art',
  );
});

test('the duplicate is hidden, never removed', () => {
  // Removing a node another module recreates is how this app has hung before.
  const redesign = read('skyblock-redesign.js');
  assert.ok(
    !/official-item-art'\s*\)\s*\?\.\s*remove\(\)/.test(redesign)
      && !/\.official-item-art[^\n]*\.remove\(\)/.test(redesign),
    'nothing may remove .official-item-art; the module that creates it puts it straight back',
  );
});

test('the tool editor portrait lets its tier badge break out', () => {
  const rules = declarationsFor(read('farming-tool-art-ui.css'), '[data-tool-editor="1"] .item-portrait');
  assert.ok(rules.length, 'no rule found for the tool editor portrait');
  const body = rules.map(rule => rule.body).join(' ');
  assert.ok(
    !/overflow\s*:\s*hidden/.test(body),
    'overflow: hidden slices the corner off the tier badge, which sits at -7px',
  );
});
