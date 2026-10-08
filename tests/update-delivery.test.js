import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  addBuildParam,
  addModuleBuildParam,
  buildVersionDocument,
  stampIndexHtml,
  stampModuleImports,
} from '../scripts/prepare-pages-deploy.js';

const BUILD = 'abcdef1234567890abcdef1234567890abcdef12';

test('deployment stamping uses the Git commit as the only cache-busting build id', () => {
  const source = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="src/app.css?v=old" />
  <link rel="manifest" href="manifest.webmanifest" />
</head>
<body>
  <script type="module" src="src/app.js"></script>
</body>
</html>`;

  const stamped = stampIndexHtml(source, BUILD);
  assert.match(stamped, new RegExp(`<meta name="app-build" content="${BUILD}"`));
  assert.match(stamped, new RegExp(`src/app\\.css\\?v=old&build=${BUILD}`));
  assert.match(stamped, new RegExp(`manifest\\.webmanifest\\?build=${BUILD}`));
  assert.match(stamped, new RegExp(`src/app\\.js\\?build=${BUILD}`));
});

test('build query replacement is idempotent for repeated deployment preparation', () => {
  assert.equal(
    addBuildParam(`src/app.js?build=1111111`, BUILD),
    `src/app.js?build=${BUILD}`,
  );
});

test('transitive ES module imports receive the same immutable build id', () => {
  assert.equal(
    addModuleBuildParam('./computed-stats.js?v=old', BUILD),
    `./computed-stats.js?v=old&build=${BUILD}`,
  );

  const source = `import { computeStatTotals } from './computed-stats.js';
import './side-effect.js';
export { helper } from './helper.js?v=old';
const lazy = () => import('./lazy.js');`;

  const stamped = stampModuleImports(source, BUILD);
  assert.match(stamped, new RegExp(`\\./computed-stats\\.js\\?build=${BUILD}`));
  assert.match(stamped, new RegExp(`\\./side-effect\\.js\\?build=${BUILD}`));
  assert.match(stamped, new RegExp(`\\./helper\\.js\\?v=old&build=${BUILD}`));
  assert.match(stamped, new RegExp(`\\./lazy\\.js\\?build=${BUILD}`));
});

test('dashboard tolerates an older cached computed-stats module during rollout', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /values\.sourceCount\.(?:globalFortune|cropFortune|overbloom|bonusPestChance)/);
  assert.match(app, /values\.sourceCount\?\.globalFortune/);
});

test('deployment version file contains the exact immutable build id', () => {
  assert.deepEqual(JSON.parse(buildVersionDocument(BUILD)), {
    format: 1,
    build: BUILD,
  });
});

test('Pages publishes only a successful main push validation and stamps its exact SHA', () => {
  const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/workflows: \["Validate Farming420"\]/);
  assert.match(workflow,/conclusion == 'success'/);
  assert.match(workflow,/event == 'push'/);
  assert.match(workflow,/head_branch == 'main'/);
  assert.match(workflow,/head_repository.full_name == github.repository/);
  assert.match(workflow,/ref: \$\{\{ github.event.workflow_run.head_sha \}\}/);
  assert.match(workflow,/BUILD_ID: \$\{\{ github.event.workflow_run.head_sha \}\}/);
  assert.match(workflow,/node scripts\/prepare-pages-deploy\.js/);
  assert.doesNotMatch(workflow,/sleep 70|workflow_dispatch:/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin main/);
  assert.match(workflow,/git rev-parse FETCH_HEAD/);
  assert.equal((workflow.match(/if: steps.validated.outputs.current == 'true'/g)||[]).length,4);
});

test('raw branch Pages output also cache-busts the accessory art entrypoints', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const coverage = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');

  assert.match(index, /src\/item-art-coverage\.css\?v=20260930-5/);
  assert.match(index, /src\/item-art-coverage\.js\?v=20260930-5/);
  assert.match(index, /src\/update-manager\.js\?v=20260930-2/);
  assert.match(coverage, /\.\/skull-art\.js\?v=20260930-flat-accessories-2/);
});

test('runtime update path is versionless and retires the old service worker', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const manager = readFileSync(new URL('../src/update-manager.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(index, /src\/update-manager\.js/);
  assert.match(manager, /deploy-version\.json/);
  assert.match(manager, /getRegistrations\(\)/);
  assert.match(manager, /location\.replace/);
  assert.match(manager, /const UPDATE_POLL_MS = 30_000/);
  assert.match(manager, /setInterval\(\(\) => \{[\s\S]*?visibilityState === 'visible'[\s\S]*?checkForUpdate\(\)[\s\S]*?UPDATE_POLL_MS\)/);
  assert.doesNotMatch(sw, /\b(?:const|let|var)\s+VERSION\b/);
  assert.doesNotMatch(sw, /addEventListener\(['"]fetch['"]/);
  assert.match(sw, /self\.registration\.unregister\(\)/);
});


test('Settings lives in the collapsible navigation and keeps safe force reload inside Settings', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const foundation = readFileSync(new URL('../src/foundation.js', import.meta.url), 'utf8');

  assert.match(app, /data-nav-toggle/);
  assert.match(app, /data-nav-id="settings" data-open-settings/);
  assert.doesNotMatch(app, /data-force-reload/);
  assert.match(foundation, /async function forceReloadApp\(\)/);
  assert.match(foundation, /name\.startsWith\('farming420-'\)/);
  assert.match(foundation, /url\.searchParams\.set\('reload'/);
  assert.match(foundation, /window\.location\.replace/);
  assert.doesNotMatch(
    /async function forceReloadApp\(\) \{([\s\S]*?)\n\}/.exec(foundation)?.[1] || '',
    /localStorage\.(?:clear|removeItem)/,
  );
});

test('foundation no longer re-registers the retired service worker', () => {
  const foundation = readFileSync(new URL('../src/foundation.js', import.meta.url), 'utf8');
  assert.doesNotMatch(foundation, /navigator\.serviceWorker\.register/);
  assert.doesNotMatch(foundation, /serviceWorkerRegistration\.update/);
});
