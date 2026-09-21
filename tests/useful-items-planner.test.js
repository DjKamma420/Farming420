import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('QoL has its own detailed page and stays out of the upgrade ranking', () => {
  const revenue = read('revenue-planner.js');
  const app = read('app.js');
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
    assert.ok(revenue.includes(name), `missing useful item: ${name}`);
  }

  assert.match(app, /\['qol', 'QoL'\]/, 'QoL needs a dedicated navigation destination');
  assert.match(app, /class="qol-list"/, 'QoL page needs its own render host');
  assert.match(revenue, /function enhanceQol\(\)/);
  assert.match(revenue, /data-useful-item=/, 'useful items must be directly trackable');
  assert.match(revenue, /profile\.usefulItems/, 'owned state must live in the profile');
  assert.match(revenue, /Why it helps/);
  assert.match(revenue, /How to use it/);
  assert.match(
    revenue,
    /stay outside the Farming Fortune \/ profit ranking/,
    'QoL items must not be presented as comparable FF/profit upgrades',
  );

  const planner = revenue.slice(revenue.indexOf('function enhancePlanner()'), revenue.indexOf('function apply()'));
  assert.doesNotMatch(planner, /usefulItemsPanel\(raw\)/, 'Upgrade Planner must not render the QoL checklist');
});

test('dashboard shows the in-game farm reference command', () => {
  const src = read('app.js');
  assert.match(src, /Farm layout reference/);
  assert.match(src, /\/v Dj_Kamma420/);
});
