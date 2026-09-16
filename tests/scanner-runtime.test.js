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
