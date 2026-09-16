const TESSERACT_ESM = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/+esm';
const TESSERACT_WORKER = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js';
const TESSERACT_CORE = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7/tesseract-core-simd-lstm.wasm.js';
const TESSDATA = 'https://tessdata.projectnaptha.com/4.0.0';

const ENCHANT_ALIASES = Object.freeze({
  cultivating: 'cultivating',
  dedication: 'dedication',
  harvesting: 'harvesting',
  pesterminator: 'pesterminator',
  'green thumb': 'green_thumb',
  sunset: 'sunset',
});

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

function enchantFromLine(line) {
  const match = cleanLine(line).match(/^(.+?)\s+([IVXLCDM]{1,8}|\d{1,2})$/i);
  if (!match) return null;
  const rawName = normalizeEnchantName(match[1]);
  let id = ENCHANT_ALIASES[rawName] || null;
  if (!id && rawName.startsWith('turbo ')) id = `turbo_${rawName.slice(6).replace(/\s+/g, '_')}`;
  if (!id) return null;
  const level = /^\d+$/.test(match[2]) ? Number(match[2]) : romanToInt(match[2]);
  if (!Number.isFinite(level) || level <= 0) return null;
  return { id, level, label: cleanLine(match[1]) };
}

function rarityFromLines(lines) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const upper = lines[index].toUpperCase();
    const rarity = RARITIES.find(entry => upper === entry || upper.startsWith(`${entry} `));
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
  if (!found) return { reforge: null, baseName: cleanTitle };
  return { reforge: found.toLowerCase(), baseName: cleanTitle.slice(found.length).trim() };
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

async function imageToCanvas(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(2, Math.min(4, 1600 / Math.max(bitmap.width, 1)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const r = image.data[i];
    const g = image.data[i + 1];
    const b = image.data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const value = max - min > 35 ? Math.max(175, max) : max;
    const boosted = value > 95 ? 255 : 0;
    image.data[i] = boosted;
    image.data[i + 1] = boosted;
    image.data[i + 2] = boosted;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  bitmap.close?.();
  return canvas;
}

function tesseractApi(module) {
  const candidates = [module, module?.default, globalThis.Tesseract].filter(Boolean);
  const api = candidates.find(candidate => typeof candidate.createWorker === 'function');
  if (!api) throw new Error('OCR engine loaded, but its browser API was not available. Reload the app and try again.');
  return api;
}

export async function recognizeSkyBlockTooltip(file, { onProgress } = {}) {
  if (!(file instanceof Blob)) throw new Error('Choose a screenshot first.');
  onProgress?.({ status: 'preparing', progress: 0.05 });
  const canvas = await imageToCanvas(file);
  onProgress?.({ status: 'loading OCR', progress: 0.1 });

  let loaded;
  try {
    loaded = await import(TESSERACT_ESM);
  } catch (error) {
    throw new Error(`Could not load the local OCR engine: ${error?.message || error}`);
  }
  const Tesseract = tesseractApi(loaded);

  const worker = await Tesseract.createWorker('eng', 1, {
    workerPath: TESSERACT_WORKER,
    corePath: TESSERACT_CORE,
    langPath: TESSDATA,
    logger(message) {
      if (Number.isFinite(message.progress)) onProgress?.({ status: message.status || 'recognizing', progress: message.progress });
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM?.SINGLE_BLOCK ?? '6',
      preserve_interword_spaces: '1',
    });
    const result = await worker.recognize(canvas);
    return String(result?.data?.text || '').trim();
  } finally {
    await worker.terminate();
  }
}
