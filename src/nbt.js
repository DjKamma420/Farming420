const TAG = Object.freeze({
  END: 0,
  BYTE: 1,
  SHORT: 2,
  INT: 3,
  LONG: 4,
  FLOAT: 5,
  DOUBLE: 6,
  BYTE_ARRAY: 7,
  STRING: 8,
  LIST: 9,
  COMPOUND: 10,
  INT_ARRAY: 11,
  LONG_ARRAY: 12,
});

const MAX_COLLECTION_LENGTH = 1_000_000;
const MAX_DEPTH = 64;
const utf8 = new TextDecoder('utf-8', { fatal: false });

class NbtReader {
  constructor(bytes) {
    this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.offset = 0;
  }

  ensure(length) {
    if (!Number.isInteger(length) || length < 0 || this.offset + length > this.bytes.byteLength) {
      throw new Error('NBT payload ended unexpectedly.');
    }
  }

  readUint8() {
    this.ensure(1);
    return this.view.getUint8(this.offset++);
  }

  readInt8() {
    this.ensure(1);
    return this.view.getInt8(this.offset++);
  }

  readInt16() {
    this.ensure(2);
    const value = this.view.getInt16(this.offset, false);
    this.offset += 2;
    return value;
  }

  readUint16() {
    this.ensure(2);
    const value = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return value;
  }

  readInt32() {
    this.ensure(4);
    const value = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readBigInt64() {
    this.ensure(8);
    const value = this.view.getBigInt64(this.offset, false);
    this.offset += 8;
    return value;
  }

  readFloat32() {
    this.ensure(4);
    const value = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readFloat64() {
    this.ensure(8);
    const value = this.view.getFloat64(this.offset, false);
    this.offset += 8;
    return value;
  }

  readBytes(length) {
    this.ensure(length);
    const value = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  readString() {
    const length = this.readUint16();
    return utf8.decode(this.readBytes(length));
  }
}

function checkedLength(reader) {
  const length = reader.readInt32();
  if (length < 0 || length > MAX_COLLECTION_LENGTH) {
    throw new Error(`Unsupported NBT collection length: ${length}.`);
  }
  return length;
}

function safeLong(value) {
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  return value >= min && value <= max ? Number(value) : value.toString();
}

function readPayload(reader, type, depth) {
  if (depth > MAX_DEPTH) throw new Error('NBT nesting is too deep.');

  switch (type) {
    case TAG.BYTE:
      return reader.readInt8();
    case TAG.SHORT:
      return reader.readInt16();
    case TAG.INT:
      return reader.readInt32();
    case TAG.LONG:
      return safeLong(reader.readBigInt64());
    case TAG.FLOAT:
      return reader.readFloat32();
    case TAG.DOUBLE:
      return reader.readFloat64();
    case TAG.BYTE_ARRAY: {
      const length = checkedLength(reader);
      return Array.from({ length }, () => reader.readInt8());
    }
    case TAG.STRING:
      return reader.readString();
    case TAG.LIST: {
      const childType = reader.readUint8();
      const length = checkedLength(reader);
      if (childType === TAG.END && length !== 0) throw new Error('NBT list uses TAG_End with a non-zero length.');
      return Array.from({ length }, () => readPayload(reader, childType, depth + 1));
    }
    case TAG.COMPOUND: {
      const result = {};
      while (true) {
        const childType = reader.readUint8();
        if (childType === TAG.END) break;
        const name = reader.readString();
        result[name] = readPayload(reader, childType, depth + 1);
      }
      return result;
    }
    case TAG.INT_ARRAY: {
      const length = checkedLength(reader);
      return Array.from({ length }, () => reader.readInt32());
    }
    case TAG.LONG_ARRAY: {
      const length = checkedLength(reader);
      return Array.from({ length }, () => safeLong(reader.readBigInt64()));
    }
    default:
      throw new Error(`Unsupported NBT tag type: ${type}.`);
  }
}

export function parseNbt(bytes) {
  const reader = new NbtReader(bytes);
  const rootType = reader.readUint8();
  if (rootType === TAG.END) throw new Error('NBT root cannot be TAG_End.');
  const name = reader.readString();
  const value = readPayload(reader, rootType, 0);
  if (reader.offset !== reader.bytes.byteLength) {
    throw new Error(`NBT payload has ${reader.bytes.byteLength - reader.offset} trailing byte(s).`);
  }
  return { type: rootType, name, value };
}

export function decodeBase64(value) {
  const text = String(value || '').trim();
  if (!text) return new Uint8Array();

  if (typeof atob === 'function') {
    let binary;
    try {
      binary = atob(text);
    } catch {
      throw new Error('Inventory data is not valid Base64.');
    }
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }

  if (typeof Buffer !== 'undefined') {
    try {
      return new Uint8Array(Buffer.from(text, 'base64'));
    } catch {
      throw new Error('Inventory data is not valid Base64.');
    }
  }

  throw new Error('This runtime cannot decode Base64 inventory data.');
}

export async function decompressGzip(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (input.length < 2 || input[0] !== 0x1f || input[1] !== 0x8b) {
    throw new Error('Inventory data is not gzip-compressed as expected by the Hypixel API format.');
  }
  if (typeof DecompressionStream !== 'function') {
    throw new Error('This browser cannot decompress Hypixel inventory data.');
  }

  try {
    const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (error) {
    throw new Error(`Inventory gzip decompression failed: ${error.message}`);
  }
}

export async function decodeHypixelNbtData(base64) {
  const compressed = decodeBase64(base64);
  if (!compressed.length) return null;
  const bytes = await decompressGzip(compressed);
  return parseNbt(bytes);
}

export async function decodeHypixelInventory(base64) {
  const root = await decodeHypixelNbtData(base64);
  if (!root) return [];
  if (root.type !== TAG.COMPOUND || !root.value || typeof root.value !== 'object') {
    throw new Error('Hypixel inventory NBT root is not a compound.');
  }
  const items = root.value.i;
  if (!Array.isArray(items)) {
    throw new Error('Hypixel inventory NBT does not contain the expected item list "i".');
  }
  return items;
}

export { TAG as NBT_TAG };
