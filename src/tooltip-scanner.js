import { CROP_TURBO_IDS } from './tool-scan-apply.js';

const TESSERACT_ESM = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/+esm';
const TESSERACT_WORKER = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js';
// A directory, not a file. Tesseract.js picks between the SIMD and non-SIMD
// builds inside the worker; naming one build removes that choice, and a browser
// without SIMD then loads a core it cannot run. Upstream calls pinning a single
// core file "strongly discouraged" for exactly this reason.
const TESSERACT_CORE_DIR = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7/';
const TESSDATA = 'https://tessdata.projectnaptha.com/4.0.0';

// Every network step here reaches a third-party CDN, so each one can stall
// rather than fail: a blocked host, a captive portal or an offline device
// leaves the request hanging. Without these bounds the panel sits on
// "initializing" forever, which is indistinguishable from a frozen app.
export const OCR_STARTUP_TIMEOUT_MS = 45000;
export const OCR_RECOGNIZE_TIMEOUT_MS = 120000;

// OCR wants readable glyphs, not raw megapixels, and Tesseract's cost grows with
// the pixel count. A phone photograph of a monitor arrives at eight megapixels or
// more; measured against a real one, feeding it whole took twelve seconds of
// native Tesseract and produced nothing usable, while the same photo cropped to
// its tooltip and fitted to this long side took half a second and read cleanly.
export const OCR_TARGET_LONG_SIDE = 1600;
export const OCR_MAX_PIXELS = 4000000;
/** Never magnify a small crop beyond this: it adds pixels, not detail. */
export const OCR_MAX_UPSCALE = 4;

const ENCHANT_ALIASES = Object.freeze({
  cultivating: 'cultivating',
  dedication: 'dedication',
  harvesting: 'harvesting',
  pesterminator: 'pesterminator',
  'green thumb': 'green_thumb',
  sunset: 'sunset',
  delicate: 'delicate',
  replenish: 'replenish',
  feast: 'feast',
  'crop fever': 'crop_fever',
  'bug blender': 'bug_blender',
});

/**
 * Characters this pixel font is reliably misread as, measured against a real
 * photograph of a tooltip on a monitor rather than guessed: the font's V comes
 * back as U, and its I comes back as l, 1, T or a bracket.
 */
const NUMERAL_CONFUSIONS = Object.freeze({
  U: 'V', W: 'V', L: 'I', '|': 'I', '1': 'I', T: 'I', '!': 'I', ']': 'I', '[': 'I', J: 'I',
});

const ROMAN_PATTERN = /^(X{0,3})(IX|IV|V?I{0,3})$/;

/**
 * Reads a level written in roman numerals, tolerating the confusions above.
 *
 * Characters that survive neither the mapping nor the roman alphabet are
 * dropped rather than failing the whole line: OCR regularly welds a fragment of
 * the next glyph onto the numeral, and "Delicate V" arrives as "Delicate UW".
 */
export function romanLevel(value) {
  const cleaned = String(value || '')
    .toUpperCase()
    .split('')
    .map(character => NUMERAL_CONFUSIONS[character] ?? character)
    .filter(character => 'IVXLCDM'.includes(character))
    .join('');
  for (let end = cleaned.length; end > 0; end -= 1) {
    const candidate = cleaned.slice(0, end);
    if (!ROMAN_PATTERN.test(candidate)) continue;
    const parsed = romanToInt(candidate);
    if (parsed) return parsed;
  }
  return null;
}

/** Levenshtein distance, capped so a hopeless comparison stops early. */
function editDistance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      best = Math.min(best, current[j]);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

/**
 * Matches OCR text against a closed vocabulary.
 *
 * Fuzzy matching is only safe because the set is closed: the app knows every
 * enchantment and reforge it cares about, so "Turbo-Helon" can only have been
 * Turbo-Melon. The tolerance scales with the word length and never exceeds two,
 * so a genuinely different word still fails to match.
 */
export function closestVocabularyMatch(value, vocabulary) {
  const needle = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!needle) return null;
  let best = null;
  for (const entry of vocabulary) {
    const candidate = String(entry).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!candidate) continue;
    if (candidate === needle) return entry;
    const limit = candidate.length >= 8 ? 2 : candidate.length >= 5 ? 1 : 0;
    if (!limit) continue;
    const distance = editDistance(needle, candidate, limit);
    if (distance > limit) continue;
    if (!best || distance < best.distance) best = { entry, distance };
  }
  return best?.entry ?? null;
}

const RARITIES = Object.freeze([
  'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'DIVINE', 'SPECIAL', 'VERY SPECIAL',
]);

function cleanLine(value) {
  return String(value || '')
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function romanToInt(value) {
  const roman = String(value || '').toUpperCase();
  if (!/^[IVXLCDM]+$/.test(roman)) return null;
  const digits = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i += 1) {
    const current = digits[roman[i]];
    const next = digits[roman[i + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total > 0 ? total : null;
}

function normalizeEnchantName(value) {
  return cleanLine(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Every enchantment name the app can recognise, including the Turbo variants. */
export const ENCHANT_VOCABULARY = Object.freeze([
  ...Object.keys(ENCHANT_ALIASES),
  ...Object.values(CROP_TURBO_IDS).map(id => id.replace(/^turbo_/, 'turbo ')),
]);

function enchantIdForName(rawName) {
  const direct = ENCHANT_ALIASES[rawName];
  if (direct) return direct;
  if (rawName.startsWith('turbo ')) return `turbo_${rawName.slice(6).replace(/\s+/g, '_')}`;
  // Only now guess, and only inside the closed vocabulary: "Turbo-Helon" can
  // have been nothing but Turbo-Melon, but an unrelated line still matches
  // nothing and is left alone.
  const matched = closestVocabularyMatch(rawName, ENCHANT_VOCABULARY);
  if (!matched) return null;
  if (matched.startsWith('turbo ')) return `turbo_${matched.slice(6).replace(/\s+/g, '_')}`;
  return ENCHANT_ALIASES[matched] || null;
}

function enchantFromLine(line) {
  // Split by trying the longest name first rather than with one regex.
  // "Crop Fever Il..." has to resolve as the two-word name plus a numeral, and a
  // pattern that takes the first token would read it as "Crop" and give up.
  const tokens = cleanLine(line).split(' ').filter(Boolean);
  for (let split = Math.min(tokens.length - 1, 4); split >= 1; split -= 1) {
    const name = tokens.slice(0, split).join(' ');
    if (!/^[A-Za-z][A-Za-z' -]*$/.test(name)) continue;
    const id = enchantIdForName(normalizeEnchantName(name));
    if (!id) continue;
    const token = tokens[split];
    const level = /^\d{1,2}$/.test(token) ? Number(token) : romanLevel(token);
    if (!Number.isFinite(level) || level <= 0) continue;
    return { id, level, label: name };
  }
  return null;
}

function rarityFromLines(lines) {
  // The rarity footer is read as a standalone word anywhere in the line, not
  // only at its start: the game frames it with decoration, and a photograph adds
  // more, so "~ LEGENDARY FARMING TOOL <" has to still count.
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const upper = lines[index].toUpperCase();
    const rarity = RARITIES.find(entry => new RegExp(`(?:^|[^A-Z])${entry}(?:[^A-Z]|$)`).test(upper));
    if (rarity) return rarity;
  }
  return null;
}

function titleLine(lines) {
  return lines.find(line => {
    if (!line) return false;
    if (/^(Gear Score|Damage|Strength|Health|Defense|Speed|Intelligence|Farming Fortune|Farming Wisdom|Breaking Power)\b/i.test(line)) return false;
    if (/^[+\-]?\d/.test(line)) return false;
    if (RARITIES.some(rarity => line.toUpperCase().startsWith(rarity))) return false;
    return true;
  }) || '';
}

function findReforge(title, candidates) {
  const cleanTitle = cleanLine(title);
  const sorted = [...new Set((candidates || []).map(cleanLine).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  const found = sorted.find(candidate => cleanTitle.toLowerCase().startsWith(`${candidate.toLowerCase()} `));
  if (found) return { reforge: found.toLowerCase(), baseName: cleanTitle.slice(found.length).trim() };

  // A reforge sits at the front of the name, so only the first word is a
  // candidate, and it is matched inside the caller's closed list.
  const [firstWord, ...rest] = cleanTitle.split(' ');
  const fuzzy = firstWord ? closestVocabularyMatch(firstWord, sorted) : null;
  if (!fuzzy) return { reforge: null, baseName: cleanTitle };
  return { reforge: fuzzy.toLowerCase(), baseName: rest.join(' ').trim() };
}

function gemsFromLines(lines) {
  const qualities = '(ROUGH|FLAWED|FINE|FLAWLESS|PERFECT)';
  const types = '(PERIDOT|CITRINE|ONYX|AQUAMARINE|JASPER|RUBY|AMBER|TOPAZ|SAPPHIRE|AMETHYST|JADE|OPAL)';
  const pattern = new RegExp(`\\b${qualities}\\s+${types}\\b`, 'gi');
  const found = [];
  for (const line of lines) {
    for (const match of line.matchAll(pattern)) found.push(`${match[1].toUpperCase()} ${match[2].toUpperCase()}`);
  }
  return [...new Set(found)];
}

export function parseSkyBlockTooltip(rawText, { reforgeCandidates = [] } = {}) {
  const lines = String(rawText || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
  const title = titleLine(lines);
  const { reforge, baseName } = findReforge(title, reforgeCandidates);
  const enchantments = {};
  const recognizedLines = [];

  for (const line of lines) {
    const enchant = enchantFromLine(line);
    if (!enchant) continue;
    enchantments[enchant.id] = Math.max(enchantments[enchant.id] || 0, enchant.level);
    recognizedLines.push(line);
  }

  const rarity = rarityFromLines(lines);
  const gems = gemsFromLines(lines);
  const recombobulated = lines.some(line => /\brecombobulat(?:ed|or)\b/i.test(line)) ? true : null;
  const farmingForDummies = (() => {
    const line = lines.find(entry => /farming for dummies/i.test(entry));
    if (!line) return null;
    const number = Number(line.match(/(\d+)/)?.[1]);
    return Number.isFinite(number) ? number : null;
  })();

  const warnings = [];
  if (!baseName) warnings.push('Item name was not recognized.');
  if (!lines.length) warnings.push('No tooltip text was recognized.');
  if (recombobulated === null) warnings.push('Recombobulator status is not visible with enough certainty and was left unchanged.');

  return {
    rawText: String(rawText || ''),
    lines,
    displayName: baseName || null,
    title: title || null,
    rarity,
    reforge,
    enchantments,
    gems,
    recombobulated,
    farmingForDummies,
    recognizedLines,
    warnings,
  };
}

export function mergeScanIntoItem(item, scan, { catalog = [] } = {}) {
  const next = { ...(item || {}) };
  if (scan.displayName) {
    next.displayName = scan.displayName;
    const exact = catalog.find(entry => cleanLine(entry.name).toLowerCase() === scan.displayName.toLowerCase());
    if (exact) next.skyblockId = exact.id;
  }
  if (scan.rarity) next.rarity = scan.rarity;
  if (scan.reforge) next.reforge = scan.reforge;
  if (Object.keys(scan.enchantments || {}).length) next.enchantments = { ...(next.enchantments || {}), ...scan.enchantments };
  if (scan.gems?.length) next.gems = [...new Set([...(next.gems || []), ...scan.gems])];
  if (scan.recombobulated !== null) next.recombobulated = scan.recombobulated;
  return next;
}

/**
 * Fits an image to a size Tesseract can read quickly.
 *
 * Both directions matter. A small crop is magnified so the glyphs are legible,
 * and a large photograph is reduced so it does not cost minutes; the earlier
 * rule only ever magnified, which is why a full-resolution photo looked like a
 * freeze rather than a slow scan.
 */
export function ocrCanvasScale(width, height) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  let scale = Math.min(OCR_MAX_UPSCALE, OCR_TARGET_LONG_SIDE / Math.max(w, h));
  const pixels = w * h * scale * scale;
  if (pixels > OCR_MAX_PIXELS) scale *= Math.sqrt(OCR_MAX_PIXELS / pixels);
  return scale;
}

/**
 * Finds the tooltip panel inside a larger frame.
 *
 * A Minecraft tooltip is a strongly blue panel, and nothing else on a farming
 * HUD is: photographed off a monitor it measures about (53, 106, 174), against a
 * warm grey surround. Cropping to it before OCR is what turns an eight-megapixel
 * photograph into a page of text, because the rest of the frame is inventory,
 * chat and monitor bezel that Tesseract would otherwise try to read.
 *
 * Returns null when no panel stands out, and the caller then scans the whole
 * image rather than cropping to a guess.
 */
export function findTooltipRegion(data, width, height, block = 8) {
  if (!data || width <= 0 || height <= 0) return null;
  const columns = Math.ceil(width / block);
  const rows = Math.ceil(height / block);
  const columnHits = new Uint32Array(columns);
  const rowHits = new Uint32Array(rows);
  let total = 0;

  for (let y = 0; y < height; y += block) {
    for (let x = 0; x < width; x += block) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const blue = data[index + 2];
      if (blue - red < 40 || blue < 80) continue;
      columnHits[Math.floor(x / block)] += 1;
      rowHits[Math.floor(y / block)] += 1;
      total += 1;
    }
  }

  // A handful of stray blue pixels is not a panel.
  if (total < (columns * rows) / 50) return null;

  // Half the peak, so the solid panel is kept and scattered blue HUD text is not.
  const span = counts => {
    let peak = 0;
    for (const value of counts) if (value > peak) peak = value;
    if (!peak) return null;
    const threshold = peak / 2;
    let first = -1;
    let last = -1;
    for (let i = 0; i < counts.length; i += 1) {
      if (counts[i] < threshold) continue;
      if (first < 0) first = i;
      last = i;
    }
    return first < 0 ? null : [first, last];
  };

  const horizontal = span(columnHits);
  const vertical = span(rowHits);
  if (!horizontal || !vertical) return null;

  const x = horizontal[0] * block;
  const y = vertical[0] * block;
  const right = Math.min(width, (horizontal[1] + 1) * block);
  const bottom = Math.min(height, (vertical[1] + 1) * block);
  if (right - x < 40 || bottom - y < 40) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Builds a lookup table that stretches the used part of the histogram across the
 * full range and then inverts it.
 *
 * Inverting matters: a tooltip is light text on a dark panel, and Tesseract is
 * trained on dark text on light paper. The earlier fixed threshold mapped
 * anything brighter than a constant to white, which on a photograph turned the
 * whole panel white and erased the text with it.
 */
export function contrastLut(histogram, cutoff = 0.02) {
  let total = 0;
  for (const count of histogram) total += count;
  if (!total) return null;
  const drop = Math.floor(total * cutoff);

  let low = 0;
  for (let seen = 0; low < 255; low += 1) {
    seen += histogram[low];
    if (seen > drop) break;
  }
  let high = 255;
  for (let seen = 0; high > 0; high -= 1) {
    seen += histogram[high];
    if (seen > drop) break;
  }
  if (high <= low) return null;

  const lut = new Uint8Array(256);
  const range = high - low;
  for (let value = 0; value < 256; value += 1) {
    const stretched = Math.max(0, Math.min(255, Math.round(((value - low) * 255) / range)));
    lut[value] = 255 - stretched;
  }
  return lut;
}

/**
 * Turns a screenshot, or a photograph of one, into the image Tesseract reads.
 *
 * Crop to the tooltip, fit it to a readable size, then stretch the contrast and
 * invert. Each step was chosen by measuring against a real phone photograph of a
 * monitor rather than by reasoning about what ought to help.
 */
async function imageToCanvas(file) {
  const bitmap = await createImageBitmap(file);
  const source = document.createElement('canvas');
  source.width = bitmap.width;
  source.height = bitmap.height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(bitmap, 0, 0);
  const full = sourceContext.getImageData(0, 0, source.width, source.height);
  const region = findTooltipRegion(full.data, source.width, source.height)
    || { x: 0, y: 0, width: source.width, height: source.height };

  const scale = ocrCanvasScale(region.width, region.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(region.width * scale));
  canvas.height = Math.max(1, Math.round(region.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  // Smoothing on, unlike before: this is usually a reduction now, and nearest
  // neighbour on a photograph keeps the sensor noise and drops the strokes.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    region.x, region.y, region.width, region.height,
    0, 0, canvas.width, canvas.height,
  );
  bitmap.close?.();

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const grey = new Uint8Array(image.data.length / 4);
  const histogram = new Uint32Array(256);
  for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
    // Rec. 601 luma. The tooltip's own colours -- white, yellow, aqua, pink --
    // all sit far above the panel behind them on this scale.
    const value = (image.data[i] * 299 + image.data[i + 1] * 587 + image.data[i + 2] * 114) / 1000;
    const level = value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
    grey[p] = level;
    histogram[level] += 1;
  }

  const lut = contrastLut(histogram);
  for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
    const level = lut ? lut[grey[p]] : 255 - grey[p];
    image.data[i] = level;
    image.data[i + 1] = level;
    image.data[i + 2] = level;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function tesseractApi(module) {
  const candidates = [module, module?.default, globalThis.Tesseract].filter(Boolean);
  const api = candidates.find(candidate => typeof candidate.createWorker === 'function');
  if (!api) throw new Error('OCR engine loaded, but its browser API was not available. Reload the app and try again.');
  return api;
}

/** Turns a stalled third-party request into a message the panel can show. */
export function withOcrTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

export async function recognizeSkyBlockTooltip(file, { onProgress } = {}) {
  if (!(file instanceof Blob)) throw new Error('Choose a screenshot first.');
  onProgress?.({ status: 'preparing', progress: 0.05 });
  const canvas = await imageToCanvas(file);
  onProgress?.({ status: 'loading OCR', progress: 0.1 });

  let loaded;
  try {
    loaded = await withOcrTimeout(
      import(TESSERACT_ESM),
      OCR_STARTUP_TIMEOUT_MS,
      'The OCR engine did not load. It is fetched from a public CDN, so check your connection or any blocker and try again.',
    );
  } catch (error) {
    throw new Error(`Could not load the local OCR engine: ${error?.message || error}`);
  }
  const Tesseract = tesseractApi(loaded);

  // A worker that dies while loading its core or language data never answers.
  // Tesseract.js reports that through errorHandler rather than by rejecting the
  // createWorker promise, so without this the promise is simply never settled.
  let reportWorkerError;
  const workerFailed = new Promise((_, reject) => { reportWorkerError = reject; });
  workerFailed.catch(() => {});

  let worker;
  try {
    worker = await withOcrTimeout(
      Promise.race([
        Tesseract.createWorker('eng', 1, {
          workerPath: TESSERACT_WORKER,
          corePath: TESSERACT_CORE_DIR,
          langPath: TESSDATA,
          logger(message) {
            if (Number.isFinite(message.progress)) onProgress?.({ status: message.status || 'recognizing', progress: message.progress });
          },
          errorHandler(error) {
            reportWorkerError(new Error(`The OCR engine failed to start: ${error?.message || error}`));
          },
        }),
        workerFailed,
      ]),
      OCR_STARTUP_TIMEOUT_MS,
      'The OCR engine did not finish starting up. Its runtime and language data come from public CDNs, so check your connection or any blocker and try again.',
    );
  } catch (error) {
    throw new Error(error?.message || String(error));
  }

  try {
    await worker.setParameters({
      // One column of text at varying sizes, which is what a tooltip is. Measured
      // against a real photograph it read every enchantment line, where
      // SINGLE_BLOCK lost some of them.
      tessedit_pageseg_mode: Tesseract.PSM?.SINGLE_COLUMN ?? '4',
      preserve_interword_spaces: '1',
    });
    const result = await withOcrTimeout(
      Promise.race([worker.recognize(canvas), workerFailed]),
      OCR_RECOGNIZE_TIMEOUT_MS,
      'Reading the screenshot took too long and was stopped. Try a tighter crop that shows only the item tooltip.',
    );
    return String(result?.data?.text || '').trim();
  } finally {
    await worker.terminate().catch(() => {});
  }
}
