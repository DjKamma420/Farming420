import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNbt } from '../src/nbt.js';
import { farmingInventoryNbt } from './nbt-fixture.js';

/**
 * The NBT reader is the only parser in this app that consumes untrusted binary.
 * Everything else reads JSON the platform already validated; this walks
 * attacker-shaped bytes -- gzip-compressed blobs from a remote API, or a
 * hand-edited backup -- with its own offsets and its own length fields.
 *
 * A parser like that fails in three ways: it crashes on a truncated buffer, it
 * hangs or exhausts memory on a declared length that the input never has to
 * back, or it surfaces an internal error instead of an explanation. These
 * assert that none of the three happens, over random bytes and over systematic
 * corruptions of a real inventory.
 *
 * The reader already defends itself; nothing below found a defect. The point is
 * that the defences stay, because the amplification cases in particular are
 * quiet to remove and expensive to rediscover.
 */

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

/** Any outcome is fine except a crash, a hang or a leaked internal error. */
function mustFailCleanly(bytes, label) {
  const started = Date.now();
  try {
    parseNbt(bytes);
  } catch (error) {
    assert.ok(error instanceof Error, `${label} threw a non-Error`);
    assert.doesNotMatch(
      error.message,
      /Cannot read|undefined is not|is not a function|out of memory|Maximum call stack/i,
      `${label} surfaced an internal failure: ${error.message}`,
    );
  }
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 2000, `${label} took ${elapsed} ms; a parser must not stall on bad input`);
}

test('random bytes never crash or stall the reader', () => {
  const rand = lcg(20260923);
  for (let run = 0; run < 400; run++) {
    const length = 1 + Math.floor(rand() * 64);
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(rand() * 256);
    mustFailCleanly(bytes, `random#${run}`);
  }
});

test('every truncation of a real inventory fails cleanly', () => {
  // The realistic corruption: a blob that stops mid-tag because a write was
  // interrupted or a field was clipped in transit.
  const full = farmingInventoryNbt();
  for (let cut = 0; cut < full.length; cut++) {
    mustFailCleanly(full.slice(0, cut), `truncated to ${cut}`);
  }
});

test('every single-byte corruption of a real inventory fails cleanly', () => {
  const full = farmingInventoryNbt();
  const rand = lcg(7);
  for (let i = 0; i < full.length; i += Math.max(1, Math.floor(full.length / 300))) {
    const bytes = Uint8Array.from(full);
    bytes[i] = Math.floor(rand() * 256);
    mustFailCleanly(bytes, `byte ${i} corrupted`);
  }
});

test('a declared length the input cannot back is refused, not allocated', () => {
  // The amplification cases: a handful of bytes asking the reader to build
  // something enormous.
  //
  // These assert the observable contract -- rejected, cleanly, immediately --
  // and deliberately do not assert *which* guard rejected them, because they
  // cannot. Removing `MAX_COLLECTION_LENGTH` or the TAG_End list check leaves
  // every case here still rejected, by `ensure()` or by the unsupported-tag
  // branch instead; both mutations were tried and neither failed this suite.
  //
  // That is a fact about the reader, not a hole in the test: every NBT element
  // type except a TAG_End list costs at least one byte, so `ensure()` already
  // bounds any declaration by the size of the input, and TAG_End lists have
  // their own check. `MAX_COLLECTION_LENGTH` is defence in depth with no input
  // that requires it -- worth keeping, not worth claiming this pins it.
  const root = (tag, name, ...payload) => {
    const bytes = [10, 0, 0, tag, 0, name.length, ...[...name].map(c => c.charCodeAt(0)), ...payload, 0];
    return new Uint8Array(bytes);
  };
  const int32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

  const cases = [
    ['byte array of 1,000,000 from 12 bytes', root(7, 'B', ...int32(1_000_000))],
    ['int array of 1,000,000 from 12 bytes', root(11, 'I', ...int32(1_000_000))],
    ['long array of 1,000,000 from 12 bytes', root(12, 'L', ...int32(1_000_000))],
    ['string of 65,535 from 9 bytes', root(8, 'S', 255, 255)],
    // A list of TAG_End costs no bytes per element, so without an explicit
    // check a five-byte input would build a million-entry array.
    ['list of TAG_End x 1,000,000', root(9, 'L', 0, ...int32(1_000_000))],
    ['list length 2,147,483,647', root(9, 'L', 1, ...int32(2_147_483_647))],
    ['negative list length', root(9, 'L', 1, 255, 255, 255, 255)],
    ['negative byte-array length', root(7, 'B', 255, 255, 255, 255)],
  ];

  for (const [label, bytes] of cases) {
    assert.throws(() => parseNbt(bytes), Error, `${label} was accepted`);
    mustFailCleanly(bytes, label);
  }
});

test('deeply nested compounds are refused rather than overflowing the stack', () => {
  // 4,000 nested compounds: a recursive reader without a depth limit dies with
  // a RangeError, which is a crash, not a rejection. This is the one guard in
  // the reader that this suite pins uniquely -- raising `MAX_DEPTH` out of the
  // way fails it, and nothing else catches that.
  const bytes = [];
  for (let i = 0; i < 4000; i++) bytes.push(10, 0, 0);
  for (let i = 0; i < 4000; i++) bytes.push(0);
  mustFailCleanly(new Uint8Array(bytes), 'deep nesting');
  assert.throws(() => parseNbt(new Uint8Array(bytes)), /depth|nest/i);
});

test('a valid inventory still parses, so the guards did not close the door', () => {
  const root = parseNbt(farmingInventoryNbt());
  assert.equal(root.type, 10);
  assert.ok(Array.isArray(root.value?.i), 'the item list did not survive');
  assert.ok(root.value.i.length > 0, 'the fixture decoded to an empty inventory');
});
