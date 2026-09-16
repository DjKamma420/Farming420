#!/usr/bin/env node
/**
 * The service worker must cache the application as one coherent unit: a file
 * that ships but is not listed in `APP_FILES` would be fetched from the network
 * after an update and could mix an old and a new application version.
 */
import { readdirSync, readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const listed = new Set([...sw.matchAll(/'(\.\/[^']+)'/g)].map(match => match[1]));

/**
 * Generated asset trees that are deliberately *not* precached.
 *
 * `assets/hypixel-pack/` is Hypixel's official resource pack, written by
 * `scripts/sync-hypixel-pack.py`. It is around a thousand textures that the app
 * only ever fetches for items the player actually owns, so precaching it would
 * make every install download the whole pack to show at most a dozen pictures.
 * The item art degrades to a placeholder when a texture is not in the cache,
 * which is exactly the intended offline behaviour.
 */
const NOT_PRECACHED = Object.freeze(['hypixel-pack']);

function assetFiles() {
  // `withFileTypes` matters: a generated subdirectory would otherwise be
  // reported as an uncached "file" and fail this check the first time anyone
  // runs the pack sync.
  return readdirSync(new URL('../assets', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isFile() && !NOT_PRECACHED.includes(entry.name))
    .map(entry => `./assets/${entry.name}`);
}

const shipped = [
  './index.html',
  './manifest.webmanifest',
  ...readdirSync(new URL('../src', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => `./src/${entry.name}`),
  ...assetFiles(),
];

const missing = shipped.filter(path => !listed.has(path));
if (missing.length) {
  console.error(`sw.js does not cache: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`sw.js caches all ${shipped.length} shipped app files.`);
