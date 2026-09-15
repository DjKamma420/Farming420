#!/usr/bin/env node
/**
 * The service worker must cache the application as one coherent unit: a file
 * that ships but is not listed in `APP_FILES` would be fetched from the network
 * after an update and could mix an old and a new application version.
 */
import { readdirSync, readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const listed = new Set([...sw.matchAll(/'(\.\/[^']+)'/g)].map(match => match[1]));

const shipped = [
  './index.html',
  './manifest.webmanifest',
  ...readdirSync(new URL('../src', import.meta.url)).map(name => `./src/${name}`),
  ...readdirSync(new URL('../assets', import.meta.url)).map(name => `./assets/${name}`),
];

const missing = shipped.filter(path => !listed.has(path));
if (missing.length) {
  console.error(`sw.js does not cache: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`sw.js caches all ${shipped.length} shipped app files.`);
