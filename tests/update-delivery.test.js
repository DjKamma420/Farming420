import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  addBuildParam,
  buildVersionDocument,
  stampIndexHtml,
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

test('deployment version file contains the exact immutable build id', () => {
  assert.deepEqual(JSON.parse(buildVersionDocument(BUILD)), {
    format: 1,
    build: BUILD,
  });
});

test('pages deployment runs automatically for main and prepares a build marker', () => {
  const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /push:\s*\n\s+branches: \["main"\]/);
  assert.match(workflow, /node scripts\/prepare-pages-deploy\.js/);
  assert.match(workflow, /BUILD_ID: \$\{\{ github\.sha \}\}/);
});

test('runtime update path is versionless and retires the old service worker', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const manager = readFileSync(new URL('../src/update-manager.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(index, /src\/update-manager\.js/);
  assert.match(manager, /deploy-version\.json/);
  assert.match(manager, /getRegistrations\(\)/);
  assert.match(manager, /location\.replace/);
  assert.doesNotMatch(sw, /\b(?:const|let|var)\s+VERSION\b/);
  assert.doesNotMatch(sw, /addEventListener\(['"]fetch['"]/);
  assert.match(sw, /self\.registration\.unregister\(\)/);
});
