#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

if (sw.includes('APP_FILES')) {
  console.error('sw.js must stay in retirement mode; APP_FILES would re-enable precaching.');
  process.exit(1);
}

const requiredRetirementSignals = [
  'self.registration.unregister()',
  "key.startsWith('farming420-')",
  'self.skipWaiting()',
];

const missing = requiredRetirementSignals.filter(signal => !sw.includes(signal));
if (missing.length) {
  console.error(`sw.js is missing retirement behavior: ${missing.join(', ')}`);
  process.exit(1);
}

if (/addEventListener\(['"]fetch['"]/.test(sw)) {
  console.error('sw.js must not intercept fetches while the legacy cache worker is being retired.');
  process.exit(1);
}

if (/\b(?:const|let|var)\s+VERSION\b/.test(sw)) {
  console.error('sw.js must not require a manually bumped VERSION constant.');
  process.exit(1);
}

console.log('sw.js is a versionless legacy-worker cleanup shim.');
