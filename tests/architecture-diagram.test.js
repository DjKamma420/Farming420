import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

/**
 * The architecture diagram, checked against the code it describes.
 *
 * A hand-drawn version of this diagram had 12 of its 20 edges wrong -- arrows
 * reversed, hops missing, one box pointing at itself, and a whole external
 * service that does not exist. None of it was caught, because a picture in a
 * README is the one artifact nothing verifies.
 *
 * So the node ids in `docs/ARCHITECTURE.md` are the module filenames, and this
 * reads them back:
 *
 *   A --> B    A imports B. Asserted.
 *   A -.-> B   A deliberately does NOT import B. Also asserted, so the
 *              distinction between "calls" and "observes" cannot quietly rot.
 *   A ==> ext  a network or asset fetch. Not an import; not checked here.
 */

const root = new URL('../', import.meta.url);
const doc = readFileSync(new URL('docs/ARCHITECTURE.md', root), 'utf8');

/** `revenue_planner_js` -> `revenue-planner.js` */
function moduleFor(nodeId) {
  if (!nodeId.endsWith('_js')) return null;
  return `${nodeId.slice(0, -3).replace(/_/g, '-')}.js`;
}

function sourceOf(file) {
  return readFileSync(new URL(`src/${file}`, root), 'utf8');
}

function importsOf(file) {
  return [...sourceOf(file).matchAll(/from '\.\/([a-z0-9.-]+\.js)'/g)].map(match => match[1]);
}

/** Every edge in the diagram, with the arrow that drew it. */
function edges() {
  const rows = [];
  const pattern = /^\s*([a-z0-9_]+)\s*(-->|-\.->|==>)\s*([a-z0-9_]+)\s*$/gm;
  let match;
  while ((match = pattern.exec(doc))) {
    rows.push({ from: match[1], arrow: match[2], to: match[3] });
  }
  return rows;
}

/** Every node the diagram declares. */
function declaredNodes() {
  return [...doc.matchAll(/^\s*([a-z0-9_]+)(\[\[?)/gm)].map(match => match[1]);
}

test('the diagram actually contains edges', () => {
  // A parser that silently matches nothing would make every test below pass.
  const rows = edges();
  assert.ok(rows.length >= 25, `only parsed ${rows.length} edges`);
  assert.ok(rows.some(row => row.arrow === '-->'));
  assert.ok(rows.some(row => row.arrow === '-.->'));
  assert.ok(rows.some(row => row.arrow === '==>'));
});

test('every module the diagram names exists', () => {
  for (const node of declaredNodes()) {
    const file = moduleFor(node);
    if (!file) continue;
    assert.ok(existsSync(new URL(`src/${file}`, root)), `${node} names a missing src/${file}`);
  }
});

test('every solid arrow is a real import', () => {
  const wrong = [];
  for (const { from, arrow, to } of edges()) {
    if (arrow !== '-->') continue;
    const a = moduleFor(from);
    const b = moduleFor(to);
    if (!a || !b) continue;
    if (!importsOf(a).includes(b)) wrong.push(`${a} --> ${b}`);
  }
  assert.deepEqual(wrong, [], `the diagram claims imports that do not exist:\n${wrong.join('\n')}`);
});

test('every dotted arrow is a real non-import', () => {
  // The dotted arrows are the interesting ones: an enhancer observing the core
  // it must not depend on, and a price refresher handing over through a cache.
  // If one of them ever becomes a plain import, the diagram is telling a story
  // the code stopped living by.
  const wrong = [];
  for (const { from, arrow, to } of edges()) {
    if (arrow !== '-.->') continue;
    const a = moduleFor(from);
    const b = moduleFor(to);
    if (!a || !b) continue;
    if (importsOf(a).includes(b)) wrong.push(`${a} -.-> ${b} is drawn as a non-import but is one`);
  }
  assert.deepEqual(wrong, [], wrong.join('\n'));
});

test('a thick arrow ends at an external, never at a module', () => {
  for (const { from, arrow, to } of edges()) {
    if (arrow !== '==>') continue;
    assert.match(to, /^ext_/, `${from} ==> ${to} should point at an external`);
  }
});

test('the enhancement count in the prose is the real one', () => {
  // "Twenty-four independent modules watch what it rendered" is a number, and
  // numbers in prose rot faster than anything else in a document.
  const stated = doc.match(/(\d+) MutationObserver modules/);
  assert.ok(stated, 'the diagram no longer states how many observer modules there are');
  const actual = readdirSync(new URL('src/', root))
    .filter(name => name.endsWith('.js'))
    .filter(name => /new MutationObserver/.test(sourceOf(name)))
    .length;
  assert.equal(Number(stated[1]), actual, `the diagram says ${stated[1]} observer modules; there are ${actual}`);
});

test('the core still imports none of its enhancers', () => {
  // This is the claim the whole diagram is built around, so it is worth
  // asserting directly rather than only through the dotted arrows.
  const coreImports = importsOf('app.js');
  const enhancers = readdirSync(new URL('src/', root))
    .filter(name => name.endsWith('.js'))
    .filter(name => /new MutationObserver/.test(sourceOf(name)));
  const leaked = enhancers.filter(name => coreImports.includes(name));
  assert.deepEqual(leaked, [], `app.js now imports an enhancement module: ${leaked.join(', ')}`);
});

test('the corrections table names only real modules', () => {
  // The table exists so the same twelve mistakes are not made again. A module
  // name that stopped existing would make it read as history rather than a
  // warning.
  const table = doc.slice(doc.indexOf('## Corrections this diagram makes'));
  for (const [, name] of table.matchAll(/`([a-z0-9-]+\.js)`/g)) {
    assert.ok(existsSync(new URL(`src/${name}`, root)), `the corrections table names a missing src/${name}`);
  }
});
