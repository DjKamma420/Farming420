import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('upgrade planner exposes the farming and building QoL checklist', () => {
  const src = read('revenue-planner.js');
  for (const name of [
    'Squeaky Mousemat',
    'Sundial',
    "Builder's Wand",
    "Builder's Ruler",
    'InfiniDirt™ Wand',
    'Basket of Seeds',
    'Block Zapper',
    'Prismapump',
  ]) {
    assert.ok(src.includes(name), `missing useful item: ${name}`);
  }
  assert.match(src, /data-useful-item=/, 'useful items must be directly trackable');
  assert.match(src, /profile\.usefulItems/, 'owned state must live in the profile');
  assert.match(
    src,
    /stay outside the Farming Fortune \/ profit ranking/,
    'QoL items must not be presented as comparable FF/profit upgrades',
  );
});

test('dashboard shows the in-game farm reference command', () => {
  const src = read('app.js');
  assert.match(src, /Farm layout reference/);
  assert.match(src, /\/v Dj_Kamma420/);
});
