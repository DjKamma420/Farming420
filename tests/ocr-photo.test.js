import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENCHANT_VOCABULARY,
  OCR_MAX_PIXELS,
  OCR_TARGET_LONG_SIDE,
  closestVocabularyMatch,
  contrastLut,
  findTooltipRegion,
  ocrCanvasScale,
  parseSkyBlockTooltip,
  romanLevel,
} from '../src/tooltip-scanner.js';
import { PHOTOGRAPHED_TOOLTIP_OCR } from './ocr-fixture.js';

const TOOL_REFORGES = ['blessed', 'bountiful'];

test('a large photograph is scaled down, which is what stops the scanner hanging', () => {
  // The failing case, measured: a 2160x3840 phone photo. The previous rule could
  // only ever magnify, so it handed Tesseract 8.3 megapixels, which took twelve
  // seconds of native Tesseract and minutes in the browser build.
  const scale = ocrCanvasScale(2160, 3840);
  assert.ok(scale < 1, `an 8 MP photo must be reduced, got scale ${scale}`);
  assert.equal(Math.round(3840 * scale), OCR_TARGET_LONG_SIDE);
  assert.ok(2160 * 3840 * scale * scale <= OCR_MAX_PIXELS);
});

test('a small crop is still magnified, but never past the point of adding detail', () => {
  assert.equal(ocrCanvasScale(400, 300), 4);
  assert.equal(ocrCanvasScale(800, 600), 2);
  // Whatever the input, the result stays inside the budget.
  for (const [w, h] of [[6000, 4000], [2160, 3840], [1920, 1080], [120, 90]]) {
    const scale = ocrCanvasScale(w, h);
    assert.ok(w * h * scale * scale <= OCR_MAX_PIXELS + 1, `${w}x${h} exceeded the pixel budget`);
    assert.ok(Math.max(w, h) * scale <= OCR_TARGET_LONG_SIDE + 1, `${w}x${h} exceeded the long side`);
  }
});

function frame(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

test('the tooltip panel is found inside a larger frame', () => {
  // The measured colours: the panel photographs as roughly (53, 106, 174) and
  // the surrounding screen as a warm grey.
  const width = 480;
  const height = 640;
  const panel = { x: 120, y: 200, width: 240, height: 320 };
  const data = frame(width, height, (x, y) => {
    const inside = x >= panel.x && x < panel.x + panel.width
      && y >= panel.y && y < panel.y + panel.height;
    return inside ? [53, 106, 174] : [106, 81, 84];
  });

  const found = findTooltipRegion(data, width, height);
  assert.ok(found, 'no panel was found');
  // Block sampling means the edges land on a multiple of the block size.
  assert.ok(Math.abs(found.x - panel.x) <= 8, `x was ${found.x}`);
  assert.ok(Math.abs(found.y - panel.y) <= 8, `y was ${found.y}`);
  assert.ok(Math.abs(found.width - panel.width) <= 16, `width was ${found.width}`);
  assert.ok(Math.abs(found.height - panel.height) <= 16, `height was ${found.height}`);
});

test('a frame with no panel yields no crop, so the whole image is scanned instead', () => {
  const data = frame(160, 160, () => [106, 81, 84]);
  assert.equal(findTooltipRegion(data, 160, 160), null);
  // A few stray blue pixels are not a panel either.
  const speckled = frame(160, 160, (x, y) => (x === 3 && y === 3 ? [20, 60, 200] : [106, 81, 84]));
  assert.equal(findTooltipRegion(speckled, 160, 160), null);
});

test('the contrast table stretches the used range and inverts it', () => {
  // Inverting is the point: a tooltip is light text on a dark panel, and
  // Tesseract is trained on dark text on light paper.
  const histogram = new Uint32Array(256);
  histogram[90] = 1000;
  histogram[200] = 1000;
  const lut = contrastLut(histogram);
  assert.ok(lut, 'no table was built');
  assert.ok(lut[90] > lut[200], 'the darker input must become the lighter output');
  assert.equal(lut[255], 0);
  assert.equal(contrastLut(new Uint32Array(256)), null);
});

test('roman numerals survive the confusions this pixel font actually produces', () => {
  // Measured, not guessed: the font's V reads back as U and its I as l or T.
  assert.equal(romanLevel('III'), 3);
  assert.equal(romanLevel('Il'), 2);
  assert.equal(romanLevel('UI'), 6);
  assert.equal(romanLevel('U'), 5);
  assert.equal(romanLevel('X'), 10);
  assert.equal(romanLevel('IU'), 4);
  // OCR welds a fragment of the next glyph on: "Delicate V" arrives as "UW".
  assert.equal(romanLevel('UW'), 5);
  assert.equal(romanLevel('Il...'), 2);
  assert.equal(romanLevel(''), null);
  assert.equal(romanLevel('zzz'), null);
});

test('fuzzy matching stays inside the closed vocabulary', () => {
  // Guessing is only safe because the set is closed. A word that is not a near
  // miss for anything in it must still fail.
  assert.equal(closestVocabularyMatch('Turbo-Helon', ENCHANT_VOCABULARY), 'turbo melon');
  assert.equal(closestVocabularyMatch('Cultivatng', ENCHANT_VOCABULARY), 'cultivating');
  assert.equal(closestVocabularyMatch('something else entirely', ENCHANT_VOCABULARY), null);
  assert.equal(closestVocabularyMatch('Efficiency', ENCHANT_VOCABULARY), null);
  assert.equal(closestVocabularyMatch('', ENCHANT_VOCABULARY), null);
});

test('the real photographed tooltip parses into the item it actually is', () => {
  const scan = parseSkyBlockTooltip(PHOTOGRAPHED_TOOLTIP_OCR, { reforgeCandidates: TOOL_REFORGES });

  assert.equal(scan.reforge, 'bountiful', 'the reforge read back as "BOUNTIFUL" and must still resolve');
  assert.equal(scan.rarity, 'LEGENDARY', 'the rarity line is framed with decoration and must still be found');
  assert.deepEqual(scan.enchantments, {
    crop_fever: 2,
    cultivating: 10,
    dedication: 3,
    delicate: 5,
    harvesting: 6,
    turbo_melon: 6,
  });
  // Efficiency is on the item but is not a farming enchantment, so it is not
  // invented into the result.
  assert.ok(!('efficiency' in scan.enchantments));
});

test('the truncated title is reported as it was read, not repaired into a guess', () => {
  // OCR cut the title to "Melon |". The scanner does not invent the rest of the
  // name; identifying the tool from other evidence is the caller's job.
  const scan = parseSkyBlockTooltip(PHOTOGRAPHED_TOOLTIP_OCR, { reforgeCandidates: TOOL_REFORGES });
  assert.ok(scan.displayName.startsWith('Melon'));
  assert.ok(!scan.displayName.toLowerCase().includes('dicer'));
});
