import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function source(name) {
  return readFileSync(new URL(`src/${name}`, root), 'utf8');
}

function imports(name) {
  return [...source(name).matchAll(/from ['"]\.\/([^'"]+\.js)['"]/g)]
    .map(match => match[1]);
}

function assertImports(name, expected) {
  const actual = imports(name);
  for (const dependency of expected) {
    assert.ok(
      actual.includes(dependency),
      `${name} must consume the canonical ${dependency} layer`,
    );
  }
}

function assertDoesNotImport(name, forbidden) {
  const actual = imports(name);
  for (const dependency of forbidden) {
    assert.ok(
      !actual.includes(dependency),
      `${name} must not bypass canonical ownership by importing ${dependency}`,
    );
  }
}

test('pricing consumers share the central market-average layers', () => {
  assertImports('average-crop-price.js', ['market-average-prices.js']);
  assertImports('upgrade-market-routes.js', ['market-average-prices.js']);
  assertImports('revenue-planner.js', ['average-crop-price.js']);
  assertImports('planner-max-summary.js', [
    'planner-activity-context.js',
    'upgrade-price-summary.js',
  ]);

  // The planner may format timestamps, but it must not fetch or build a second
  // market history model. Price acquisition belongs to the price services.
  const planner = source('revenue-planner.js');
  assert.doesNotMatch(planner, /sky\.coflnet\.com\/api\//i);
  assert.doesNotMatch(planner, /api\.hypixel\.net\/v2\/skyblock\/bazaar/i);
});

test('activity, setup and computed stats keep one ownership chain', () => {
  assertImports('planner-activity-context.js', [
    'activity-mode.js',
    'computed-stats.js',
  ]);
  assertImports('computed-stats.js', [
    'activity-mode.js',
    'setups.js',
  ]);
  assertImports('snapshot-apply.js', ['setups.js']);

  // No planner-local activity enum or setup implementation may fork the model.
  const plannerContext = source('planner-activity-context.js');
  assert.doesNotMatch(plannerContext, /export\s+const\s+ACTIVITY_MODE\s*=/);
  assert.doesNotMatch(plannerContext, /function\s+createSetup\s*\(/);
});

test('vacuum capability and physical-state logic share canonical item data', () => {
  assertImports('vacuum-state.js', [
    'item-capabilities.js',
    'exact-farming-items.js',
  ]);

  const vacuum = source('vacuum-state.js');
  assert.doesNotMatch(vacuum, /export\s+const\s+FARMING_REFORGES_BY_FAMILY\s*=/);
  assert.doesNotMatch(vacuum, /function\s+itemCapabilities\s*\(/);
});

test('global search stays a pure matcher while app owns navigation/index assembly', () => {
  assertImports('app.js', ['global-search.js']);
  assert.deepEqual(
    imports('global-search.js'),
    [],
    'global-search.js must remain independent of app state and catalog ownership',
  );

  const matcher = source('global-search.js');
  assert.doesNotMatch(matcher, /document\./);
  assert.doesNotMatch(matcher, /localStorage/);
});

test('dashboard economics, once present, consumes injected canonical stats and prices', () => {
  const dashboardUrl = new URL('src/dashboard-economics.js', root);
  if (!existsSync(dashboardUrl)) return;

  assertImports('dashboard-economics.js', [
    'activity-mode.js',
    'farming-context.js',
    'measured-baseline.js',
  ]);
  assertDoesNotImport('dashboard-economics.js', [
    'computed-stats.js',
    'market-average-prices.js',
    'average-crop-price.js',
    'data.js',
  ]);

  const dashboard = source('dashboard-economics.js');
  assert.match(dashboard, /cropUnitValueCoins/);
  assert.match(dashboard, /stats\s*=\s*\{\}/);
  assert.doesNotMatch(dashboard, /sky\.coflnet\.com|api\.hypixel\.net/i);
});
