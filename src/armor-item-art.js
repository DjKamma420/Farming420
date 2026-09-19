const ARMOR_SLOTS = new Set(['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS']);

const MATERIAL_COLORS = Object.freeze([
  ['LEATHER_', [160, 101, 64]],
  ['CHAINMAIL_', [168, 176, 176]],
  ['IRON_', [214, 221, 221]],
  ['GOLD_', [255, 216, 74]],
  ['DIAMOND_', [86, 227, 230]],
  ['NETHERITE_', [73, 68, 71]],
]);

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex(rgb) {
  return `#${rgb.map(value => clampByte(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(rgb, target, amount) {
  return rgb.map((value, index) => value + (target[index] - value) * amount);
}

export function parseArmorColor(value) {
  const parts = String(value || '').split(',').map(part => Number(part.trim()));
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part) || part < 0 || part > 255)) return null;
  return parts.map(clampByte);
}

export function armorSlotForItem(item) {
  if (!item || typeof item !== 'object') return null;
  const category = String(item.category || '').trim().toUpperCase();
  if (ARMOR_SLOTS.has(category)) return category;

  const material = String(item.material || '').trim().toUpperCase();
  for (const slot of ARMOR_SLOTS) {
    if (material.endsWith(`_${slot}`)) return slot;
  }

  const id = String(item.id || '').trim().toUpperCase();
  for (const slot of ARMOR_SLOTS) {
    if (id.endsWith(`_${slot}`)) return slot;
  }
  return null;
}

export function isArmorItem(item) {
  return armorSlotForItem(item) !== null;
}

function baseRgbFor(item) {
  const custom = parseArmorColor(item?.color);
  if (custom) return custom;

  const material = String(item?.material || '').trim().toUpperCase();
  for (const [prefix, rgb] of MATERIAL_COLORS) {
    if (material.startsWith(prefix)) return rgb;
  }
  return [159, 184, 167];
}

export function armorPalette(item) {
  const baseRgb = baseRgbFor(item);
  return {
    base: rgbToHex(baseRgb),
    light: rgbToHex(mix(baseRgb, [255, 255, 255], 0.28)),
    shadow: rgbToHex(mix(baseRgb, [0, 0, 0], 0.34)),
    deep: rgbToHex(mix(baseRgb, [0, 0, 0], 0.55)),
  };
}

function helmetMarkup({ base, light, shadow, deep }) {
  return `
    <path fill="${deep}" d="M4 2h8v1h2v8h-3V7H5v4H2V3h2z"/>
    <path fill="${shadow}" d="M4 3h8v1h1v6h-2V6H5v4H3V4h1z"/>
    <path fill="${base}" d="M5 3h6v1h1v2H4V4h1zm-1 3h2v3H4zm6 0h2v3h-2z"/>
    <path fill="${light}" d="M5 3h5v1H5zM4 4h1v2H4z"/>
  `;
}

function chestplateMarkup({ base, light, shadow, deep }) {
  return `
    <path fill="${deep}" d="M2 3h4l2 2 2-2h4l1 4-3 2v5H4V9L1 7z"/>
    <path fill="${shadow}" d="M3 4h3l2 2 2-2h3l1 3-3 1v5H5V8L2 7z"/>
    <path fill="${base}" d="M4 4h2l2 2 2-2h2l1 2-3 1v5H6V7L3 6z"/>
    <path fill="${light}" d="M4 4h2l2 2v1L5 5H4zM6 8h1v4H6z"/>
  `;
}

function leggingsMarkup({ base, light, shadow, deep }) {
  return `
    <path fill="${deep}" d="M3 2h10v6h-2v6H8V9H7v5H4V8H2V3h1z"/>
    <path fill="${shadow}" d="M3 3h9v5h-2v5H9V8H6v5H5V8H3z"/>
    <path fill="${base}" d="M4 3h7v4H9v5H8V7H6v5H5V7H4z"/>
    <path fill="${light}" d="M4 3h5v1H4zM4 4h1v3H4z"/>
  `;
}

function bootsMarkup({ base, light, shadow, deep }) {
  return `
    <path fill="${deep}" d="M2 3h5v7H5v2h3v2H2zm7 0h5v11H8v-2h3v-2H9z"/>
    <path fill="${shadow}" d="M3 4h3v6H4v1h3v2H3zm7 0h3v9H9v-1h2V9h-1z"/>
    <path fill="${base}" d="M4 4h2v5H4zm7 0h2v8h-3v-1h2V9h-1z"/>
    <path fill="${light}" d="M4 4h1v4H4zm7 0h1v4h-1z"/>
  `;
}

export function armorItemSvgMarkup(item) {
  const slot = armorSlotForItem(item);
  if (!slot) return null;
  const palette = armorPalette(item);
  const body = {
    HELMET: helmetMarkup,
    CHESTPLATE: chestplateMarkup,
    LEGGINGS: leggingsMarkup,
    BOOTS: bootsMarkup,
  }[slot](palette);

  return `<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">${body}</svg>`;
}
