import { gzipSync } from 'node:zlib';

const enc = new TextEncoder();

function concat(...parts) {
  const arrays = parts.flat().map(part => part instanceof Uint8Array ? part : Uint8Array.from(part));
  const length = arrays.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of arrays) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function byte(value) {
  return Uint8Array.from([value & 0xff]);
}

function int16(value) {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, value, false);
  return new Uint8Array(buffer);
}

function uint16(value) {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setUint16(0, value, false);
  return new Uint8Array(buffer);
}

function int32(value) {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setInt32(0, value, false);
  return new Uint8Array(buffer);
}

function int64(value) {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigInt64(0, BigInt(value), false);
  return new Uint8Array(buffer);
}

function stringPayload(value) {
  const bytes = enc.encode(value);
  return concat(uint16(bytes.length), bytes);
}

function named(type, name, payload) {
  return concat(byte(type), stringPayload(name), payload);
}

function compound(entries) {
  return concat(entries, byte(0));
}

function list(type, payloads) {
  return concat(byte(type), int32(payloads.length), payloads);
}

export function farmingInventoryNbt() {
  const enchantments = compound([
    named(3, 'cultivating', int32(10)),
    named(3, 'harvesting', int32(6)),
    named(3, 'turbo_wheat', int32(5)),
  ]);
  const gems = compound([
    named(8, 'PERIDOT_0', stringPayload('PERFECT')),
  ]);
  const attributes = compound([
    named(3, 'example_attribute', int32(7)),
  ]);
  const extra = compound([
    named(8, 'id', stringPayload('THEORETICAL_HOE_WHEAT_3')),
    named(8, 'uuid', stringPayload('item-uuid-1')),
    named(8, 'modifier', stringPayload('blessed')),
    named(10, 'enchantments', enchantments),
    named(10, 'gems', gems),
    named(10, 'attributes', attributes),
    named(3, 'farming_for_dummies_count', int32(5)),
    named(3, 'rarity_upgrades', int32(1)),
    named(4, 'farmed_cultivating', int64(12_345_678)),
    named(3, 'levelable_overclocks', int32(3)),
    named(3, 'item_tier', int32(3)),
  ]);
  const display = compound([
    named(8, 'Name', stringPayload('§6Euclid\'s Wheat Sickle')),
  ]);
  const item = compound([
    named(1, 'Count', byte(1)),
    named(2, 'Damage', int16(0)),
    named(2, 'id', int16(290)),
    named(10, 'tag', compound([
      named(10, 'ExtraAttributes', extra),
      named(10, 'display', display),
    ])),
  ]);
  const empty = compound([]);
  return named(10, '', compound([
    named(9, 'i', list(10, [item, empty])),
  ]));
}

export function farmingInventoryBase64() {
  return Buffer.from(gzipSync(farmingInventoryNbt())).toString('base64');
}
