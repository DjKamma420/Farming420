import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('index cache-busts the chip/card layout stylesheet', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /item-art-coverage\.css\?v=20260917-3/);
});
