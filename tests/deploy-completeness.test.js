import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { listJavaScriptFiles } from '../scripts/prepare-pages-deploy.js';
import { auditStaticReferences } from '../scripts/check-static-references.js';

test('all committed runtime static references resolve', () => {
  const result = auditStaticReferences();
  assert.deepEqual(result.missing, []);
  assert.ok(result.checked > 30, `expected meaningful coverage, checked only ${result.checked} references`);
});

test('deployment stamping discovers JavaScript in nested src directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'farming420-deploy-'));
  try {
    mkdirSync(join(root, 'nested', 'deeper'), { recursive: true });
    writeFileSync(join(root, 'root.js'), 'export {};\n');
    writeFileSync(join(root, 'nested', 'child.js'), 'export {};\n');
    writeFileSync(join(root, 'nested', 'deeper', 'leaf.js'), 'export {};\n');
    writeFileSync(join(root, 'nested', 'ignore.css'), '.x {}\n');

    const directoryUrl = pathToFileURL(`${root}/`);
    const files = listJavaScriptFiles(directoryUrl)
      .map(url => fileURLToPath(url).slice(root.length + 1).replaceAll('\\\\', '/'))
      .sort();

    assert.deepEqual(files, ['nested/child.js', 'nested/deeper/leaf.js', 'root.js']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
