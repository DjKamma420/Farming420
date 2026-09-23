import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/app.js');
const planner = read('src/revenue-planner.js');
const resolver = read('src/upgrade-cost-resolution.js');
const index = read('index.html');

test('no visible UI accepts a manual coin price or Coins per hour value', () => {
  assert.doesNotMatch(app, /data-cost=/);
  assert.doesNotMatch(app, /data-dashboard-estimate="coinsPerUnit"/);
  assert.doesNotMatch(app, /data-dashboard-estimate="feastMaterialCoins"/);
  assert.doesNotMatch(planner, /data-revenue-input=/);
  assert.doesNotMatch(planner, /data-measured="coinsPerUnit"/);
  assert.doesNotMatch(planner, /data-measured="feastMaterialCoins"/);
});

test('legacy stored coin fields are ignored instead of deleted from backups', () => {
  assert.match(app, /delete values\.coinsPerUnit/);
  assert.match(app, /delete values\.feastMaterialCoins/);
  assert.match(planner, /delete priced\.coinsPerUnit/);
  assert.match(planner, /delete priced\.feastMaterialCoins/);
  assert.doesNotMatch(resolver, /store\?\.costs/);
  assert.doesNotMatch(resolver, /origin: 'recorded'/);
});

test('the app boots the 90-day source and permits only its additional network origin', () => {
  assert.match(index, /src\/market-average-refresh\.js/);
  assert.doesNotMatch(index, /src\/live-price-refresh\.js/);
  assert.match(index, /connect-src 'self' https:\/\/api\.hypixel\.net https:\/\/sky\.coflnet\.com/);
});
