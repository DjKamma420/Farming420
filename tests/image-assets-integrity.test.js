import assert from 'node:assert/strict';
import test from 'node:test';
import {
  existsSync,
  openSync,
  closeSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ASSETS = join(ROOT, 'assets');
const PACK_ROOT = join(ASSETS, 'hypixel-pack');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function filesUnder(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function assertPng(path, label) {
  const fd = openSync(path, 'r');
  try {
    const header = Buffer.alloc(8);
    const read = readSync(fd, header, 0, header.length, 0);
    assert.equal(read, 8, `${label} is truncated`);
    assert.ok(header.equals(PNG_SIGNATURE), `${label} is not a valid PNG`);
  } finally {
    closeSync(fd);
  }
}

test('every texture named by the shipped pack manifest exists and is a real PNG', () => {
  const manifest = JSON.parse(readFileSync(join(PACK_ROOT, 'manifest.json'), 'utf8'));
  const missing = [];
  const invalid = [];
  const records = Object.entries(manifest.items || {});
  assert.ok(records.length > 100, 'pack manifest is suspiciously small');

  for (const [key, record] of records) {
    const texture = record?.texture;
    if (typeof texture !== 'string' || texture.startsWith('/') || texture.includes('..') || !texture.endsWith('.png')) {
      invalid.push(`${key} -> ${String(texture)}`);
      continue;
    }
    const path = join(PACK_ROOT, texture);
    if (!existsSync(path)) {
      missing.push(`${key} -> ${texture}`);
      continue;
    }
    assertPng(path, `${key} -> ${texture}`);
  }

  assert.deepEqual(invalid, [], `invalid manifest texture paths: ${invalid.join(', ')}`);
  assert.deepEqual(missing, [], `manifest points at missing pictures: ${missing.join(', ')}`);
});

test('every shipped local image is non-empty and structurally valid', () => {
  const imageFiles = filesUnder(ASSETS).filter(path => ['.png', '.svg', '.webp', '.jpg', '.jpeg'].includes(extname(path).toLowerCase()));
  assert.ok(imageFiles.length > 100, 'image tree is suspiciously small');

  for (const path of imageFiles) {
    const label = relative(ROOT, path);
    assert.ok(statSync(path).size > 0, `${label} is empty`);
    const ext = extname(path).toLowerCase();
    if (ext === '.png') assertPng(path, label);
    if (ext === '.svg') {
      const text = readFileSync(path, 'utf8');
      assert.match(text, /<svg\b/i, `${label} is not an SVG document`);
    }
  }
});

test('every static local image path used by the app resolves to a shipped file', () => {
  const runtimeFiles = [
    join(ROOT, 'index.html'),
    join(ROOT, 'manifest.webmanifest'),
    ...filesUnder(join(ROOT, 'src')).filter(path => ['.js', '.css'].includes(extname(path).toLowerCase())),
  ];
  const missing = [];
  const imageRef = /(?:\.\/)?assets\/[A-Za-z0-9_./-]+\.(?:png|svg|webp|jpe?g)/gi;

  for (const sourcePath of runtimeFiles) {
    const source = readFileSync(sourcePath, 'utf8');
    for (const match of source.matchAll(imageRef)) {
      const relativePath = match[0].replace(/^\.\//, '');
      const target = join(ROOT, relativePath);
      if (!existsSync(target)) missing.push(`${relative(ROOT, sourcePath)} -> ${relativePath}`);
    }
  }

  const webManifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const icon of webManifest.icons || []) {
    const target = join(ROOT, String(icon.src || '').replace(/^\.\//, ''));
    if (!icon.src || !existsSync(target)) missing.push(`manifest.webmanifest -> ${String(icon.src)}`);
  }

  assert.deepEqual(missing, [], `broken local image references: ${missing.join(', ')}`);
});
