import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HIDDEN_INTERACTIONS } from '../src/data.js';

/**
 * Two pages were walls of prose.
 *
 * The Mechanics page rendered thirty-six rules at four paragraphs each, and
 * "what to enter" rendered every manual entry at once. Measured in a browser
 * at 1280px they were 10,887px and 12,715px of scroll, against 3,290px for the
 * next tallest page -- so each one buried its own headline. They now open to
 * something readable and fold the rest away rather than cutting it.
 *
 * These tests pin the mechanism, not the pixel counts, because the counts move
 * whenever a rule or an entry is added.
 */

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const app = read('src/app.js');
const css = read('src/page-length.css').replace(/\/\*[\s\S]*?\*\//g, '');

test('the stylesheet is wired in', () => {
  assert.match(read('index.html'), /src\/page-length\.css/);
});

test('a mechanics rule is a real disclosure, not a styled div', () => {
  assert.match(app, /<details class="research-card"/);
  // The <summary> must be the element's first child, or it is not the
  // disclosure summary at all.
  assert.match(app, /<details class="research-card"[^>]*>\s*<summary>/);
});

test('neither summary is given display: flex', () => {
  // A <summary> given `display: flex` stops counting as the disclosure summary
  // in Chromium: the <details> is left without one and every child renders as
  // if permanently open. That is the exact regression these pages replace, and
  // it has already cost this repo one round on the planner panel.
  for (const selector of [/\.research-card\s*>\s*summary \{([^}]*)\}/, /\.find-rest\s*>\s*summary \{([^}]*)\}/]) {
    const match = css.match(selector);
    assert.ok(match, `no rule for ${selector}`);
    assert.doesNotMatch(match[1], /display:\s*flex/);
  }
  // The flex rows live on inner divs instead.
  assert.match(app, /<summary>\s*<div class="research-head">/);
  assert.match(app, /<summary><div class="find-rest-head">/);
});

test('what the page is scanned for stays outside the fold', () => {
  // The rule's name, status and effect are the scannable part; why it is
  // modeled separately and what the app does about it are what you read when
  // you care.
  const summary = app.match(/<summary>\s*<div class="research-head">[\s\S]*?<\/summary>/)?.[0] || '';
  assert.match(summary, /entry\.name/);
  assert.match(summary, /entry\.effect/);
  assert.doesNotMatch(summary, /entry\.why|entry\.handling/);

  const body = app.match(/<div class="research-body">[\s\S]*?<\/div>/)?.[0] || '';
  assert.match(body, /entry\.why/);
  assert.match(body, /entry\.handling/);
  assert.match(body, /entry\.source/);
});

test('a rule that needs verifying opens itself', () => {
  // Three of the thirty-six are marked VERIFY. Folding those away would hide
  // the only ones that want a human to look at them.
  assert.match(app, /const needsAttention = entry\.status === 'VERIFY';/);
  assert.match(app, /\$\{needsAttention \? 'open' : ''\}/);
  const verify = HIDDEN_INTERACTIONS.filter(entry => entry.status === 'VERIFY');
  assert.ok(verify.length > 0 && verify.length < HIDDEN_INTERACTIONS.length,
    'if every rule or no rule needs verifying, opening them is not a filter');
});

test('"what to enter" keeps its most valuable entries fully open', () => {
  // The page is ordered most-valuable-first, and "where do I find this" is the
  // question it exists to answer -- so the top slice keeps its notes and
  // in-game location rather than being collapsed to titles.
  assert.match(app, /const FIND_ROWS_VISIBLE = 12;/);
  assert.match(app, /findRows\(rows\.slice\(0, visibleFindRows\)\)/);
  assert.match(app, /findRows\(rows\.slice\(visibleFindRows\)\)/);
  assert.match(app, /find-where|find-warn/);
});

test('the folded tail is folded, never dropped', () => {
  // Cutting the list would lose entries. The count in the label is what tells
  // the reader nothing was lost.
  assert.match(app, /\$\{rows\.length - visibleFindRows\} more entries/);
  assert.match(app, /rows\.length > visibleFindRows \?/);
});

test('a search shows every match', () => {
  // A search result is already a narrowed set; folding it again would hide
  // matches behind a disclosure the reader did not ask for.
  assert.match(app, /const visibleFindRows = state\.search\.trim\(\) \? rows\.length : FIND_ROWS_VISIBLE;/);
});

test('the disclosure state is readable at a glance', () => {
  for (const marker of [/\.research-card\[open\] \.research-head::after/, /\.find-rest\[open\] \.find-rest-head::after/]) {
    assert.match(css, marker);
  }
});
