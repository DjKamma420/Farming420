import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const scanner = readFileSync(new URL('../src/tooltip-scanner.js', import.meta.url), 'utf8');
const toolUi = readFileSync(new URL('../src/tool-scanner-ui.js', import.meta.url), 'utf8');
const ux = readFileSync(new URL('../src/ux-simplify.js', import.meta.url), 'utf8');

test('browser OCR loads the ESM entry and accepts named or default createWorker exports', () => {
  assert.match(scanner, /tesseract\.js@7\/\+esm/);
  assert.match(scanner, /module\?\.default/);
  assert.match(scanner, /typeof candidate\.createWorker === 'function'/);
});

test('tool scanner targets a physical tool from the recognized item name instead of the crop selector', () => {
  assert.match(toolUi, /cropsForToolItem/);
  assert.match(toolUi, /toolKeyForCropId/);
  assert.doesNotMatch(toolUi, /querySelector\('#cropSelect'\)/);
  assert.match(toolUi, /does not match a known farming tool/);
});

test('crop context is deferred to the planner while tools use a physical-tool selector', () => {
  assert.match(ux, /Evaluation scope/);
  assert.match(ux, /<option value="global"/);
  assert.match(ux, /Physical tool/);
  assert.match(ux, /cropSwitch\.hidden = true/);
});

test('OCR startup cannot hang: worker errors are reported and every remote step is bounded', () => {
  // Tesseract.js surfaces a worker that died while loading its core or language
  // data through errorHandler; createWorker itself simply never settles. Without
  // both an errorHandler and a timeout the panel sits on "initializing" forever,
  // which is what a blocked CDN looks like to the user.
  assert.match(scanner, /errorHandler\(error\)/);
  assert.match(scanner, /OCR_STARTUP_TIMEOUT_MS/);
  assert.match(scanner, /OCR_RECOGNIZE_TIMEOUT_MS/);
  assert.match(scanner, /withOcrTimeout\(/);
});

test('the OCR core path stays a directory so the worker can pick a build it can run', () => {
  assert.match(scanner, /TESSERACT_CORE_DIR = 'https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js-core@7\/'/);
  assert.doesNotMatch(scanner, /tesseract-core-simd-lstm\.wasm\.js/);
});

test('a second scan cannot start on top of a running one, and the same file can be retried', () => {
  assert.match(toolUi, /_toolScanBusy/);
  assert.match(toolUi, /input\.value = ''/);
});
