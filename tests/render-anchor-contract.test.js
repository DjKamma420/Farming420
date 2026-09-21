import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * A module that anchors to markup nobody renders is silently dead.
 *
 * The dashboard rewrite exposed this failure mode: several enhancement modules
 * kept querying classes that the core app no longer produced, so their code
 * quietly stopped running. The dashboard is intentionally results-only now,
 * therefore stale dashboard mutators are removed rather than revived.
 *
 * This check guards the actual contract: literal class anchors and data-*
 * attributes queried through querySelector/querySelectorAll must also be
 * produced somewhere in the current source tree. Template-literal selectors
 * count too. There is deliberately no known-orphan allowlist.
 */

const SRC = new URL('../src/', import.meta.url);
const files = readdirSync(SRC).filter(name => name.endsWith('.js'));
const sources = new Map(files.map(name => [name, readFileSync(new URL(name, SRC), 'utf8')]));

/**
 * Class names any module writes into the DOM, however it writes them.
 *
 * A class list is read token by token rather than whole, because most of them
 * are template literals: `class="item-card ${selected}"` writes `item-card`
 * for certain, and whatever `selected` holds is none of this check's business.
 * Discarding the whole attribute over the interpolation in it reported a third
 * of the app as orphaned on the first run.
 */
function producedClasses() {
  const produced = new Set();
  const addList = list => {
    for (const name of list.split(/\s+/)) {
      // Literal identifiers only: a token carrying `${`, a quote or a brace is
      // a computed fragment, not a class name this file can vouch for.
      if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) produced.add(name);
    }
  };
  for (const source of sources.values()) {
    for (const [, list] of source.matchAll(/class=["']([^"'`]*)["']/g)) addList(list);
    for (const [, list] of source.matchAll(/className\s*[=:]\s*['"`]([^'"`]*)['"`]/g)) addList(list);
    for (const [, args] of source.matchAll(/classList\.(?:add|toggle|remove|replace)\(([^)]*)\)/g)) {
      for (const [, name] of args.matchAll(/['"`]([A-Za-z][A-Za-z0-9_-]*)['"`]/g)) produced.add(name);
    }
  }
  return produced;
}

/**
 * The class each query anchors on, with the module it came from.
 *
 * Only the first class of a selector. `.sb-tool-card.selected` exists or does
 * not exist because of `sb-tool-card`; `selected` is a state this file cannot
 * see, because it is written as `${chosen ? 'selected' : ''}`. Checking every
 * class in the selector reported those state classes as missing markup, which
 * is noise that would have buried the real finding.
 */
function queriedSelectors() {
  const queries = [];
  for (const [name, source] of sources) {
    for (const line of source.split('\n')) {
      // A query whose line also removes what it found is cleanup, not a live
      // render dependency.
      if (/\.remove\(\)/.test(line)) continue;
      for (const match of line.matchAll(/querySelector(?:All)?\(\s*(['"`])(.+?)\1/g)) {
        queries.push({ module: name, selector: match[2] });
      }
    }
  }
  return queries;
}

function queriedAnchors() {
  const anchors = [];
  for (const { module, selector } of queriedSelectors()) {
    const first = selector.match(/^\s*[^,]*?\.([A-Za-z][A-Za-z0-9_-]*)/);
    if (first) anchors.push({ module, selector, cls: first[1] });
  }
  return anchors;
}

function toDataAttribute(datasetKey) {
  return `data-${datasetKey.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
}

function producedDataAttributes() {
  const produced = new Set();
  for (const source of sources.values()) {
    // Literal markup emitted by template strings / HTML snippets.
    for (const [, tag] of source.matchAll(/<([\s\S]*?)>/g)) {
      for (const [, attr] of tag.matchAll(/\b(data-[A-Za-z0-9_-]+)(?=\s*=|\s|$)/g)) produced.add(attr);
    }
    // Programmatic writes.
    for (const [, key] of source.matchAll(/\.dataset\.([A-Za-z][A-Za-z0-9]*)\s*=/g)) produced.add(toDataAttribute(key));
    for (const [, attr] of source.matchAll(/\.setAttribute\(\s*['"](data-[A-Za-z0-9_-]+)['"]/g)) produced.add(attr);
    // Shared HTML helpers whose attribute name is supplied as an argument.
    for (const [, attr] of source.matchAll(/\bleverInput\(\s*['"](data-[A-Za-z0-9_-]+)['"]/g)) produced.add(attr);
  }
  return produced;
}

function orphanedDataAttributes() {
  const produced = producedDataAttributes();
  const seen = new Map();
  for (const { module, selector } of queriedSelectors()) {
    for (const [, attr] of selector.matchAll(/\[(data-[A-Za-z0-9_-]+)/g)) {
      if (produced.has(attr)) continue;
      seen.set(`${module} [${attr}]`, { module, selector, attr });
    }
  }
  return seen;
}

function orphanedAnchors() {
  const produced = producedClasses();
  const seen = new Map();
  for (const entry of queriedAnchors()) {
    if (produced.has(entry.cls)) continue;
    seen.set(`${entry.module} .${entry.cls}`, entry);
  }
  return seen;
}

test('no module anchors to markup nobody renders', () => {
  const unexpected = [...orphanedAnchors()]
    .map(([key, entry]) => `${key} - looks for "${entry.selector}"`);
  assert.deepEqual(unexpected, [], `orphaned anchors:\n${unexpected.join('\n')}`);
});

test('no module queries a data attribute nobody renders', () => {
  const unexpected = [...orphanedDataAttributes()]
    .map(([key, entry]) => `${key} - looks for "${entry.selector}"`);
  assert.deepEqual(unexpected, [], `orphaned data attributes:\n${unexpected.join('\n')}`);
});
