import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {packet} from '../scripts/packets.mjs';
import {encodeContainer,parseHeader,parseDirectory, MAGIC, packPayload, unpackPayload, ByteQueue, readPackets } from '../src/format.js';
function framed(raw=Buffer.from('test')){return encodeContainer([packet(1,raw),packet(2,raw),packet(255,raw)]);}
function stream(bytes, size = 1) { let offset = 0; return new ReadableStream({ pull(controller) { if (offset === bytes.length) controller.close(); else { controller.enqueue(bytes.subarray(offset, offset + size)); offset = Math.min(bytes.length, offset + size); } } }); }
test('framed stream tolerates single-byte splits, empty reads, and multi-packet chunks', async () => {
  const bytes = framed(Buffer.from('test'));
  for (const size of [1, 7, bytes.length]) { const results = []; for await (const packet of readPackets(stream(bytes, size))) results.push([packet.type, new TextDecoder().decode(packet.data)]); assert.deepEqual(results, [[1,'test'],[2,'test'],[255,'test']]); }
});
test('truncation, bad magic and corrupt gzip reject', async () => {
  const valid = framed();
  for (const invalid of [valid.subarray(0, 3), valid.subarray(0, 11), valid.subarray(0, valid.length - 1), Buffer.from('NOPE')]) await assert.rejects(async () => { for await (const unused of readPackets(stream(invalid))) void unused; });
  const corrupt = Buffer.from(valid); corrupt[corrupt.length - 8] ^= 1; await assert.rejects(async () => { for await (const unused of readPackets(stream(corrupt))) void unused; });
});
test('packet metadata preserves typed attributes and aligned arrays', () => {
  const p = unpackPayload(packPayload({ item: 'position' }, [new Uint8Array([1, 2, 3]), new Float32Array([.5, 2.25])]));
  assert.equal(p.meta.item, 'position'); assert.deepEqual(p.take(Uint8Array, 3), new Uint8Array([1, 2, 3])); assert.deepEqual(p.take(Float32Array, 2), new Float32Array([.5, 2.25])); assert.throws(() => p.take(Uint32Array, 10));
});
test('texture lattice retains old pixels through both axes, including non-square grids', async () => {
  const { mergeAxis, unfilterRows } = await import('../src/textures.js');
  const { filteredRows } = await import('../scripts/texture-codec.mjs');
  const previous = Uint8Array.from({ length: 2 * 3 * 4 }, (_, i) => i * 10 % 256), missing = Uint8Array.from(previous, v => 255 - v);
  for (const axis of ['x', 'y']) {
    const filtered = await filteredRows(missing, 2, 3), decoded = unfilterRows(filtered, 2, 3); assert.deepEqual(decoded, missing);
    const result = mergeAxis(previous, 2, 3, decoded, axis), w = axis === 'x' ? 4 : 2;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) {
      const a = (y * 2 + x) * 4, b = ((axis === 'y' ? y * 2 : y) * w + (axis === 'x' ? x * 2 : x)) * 4;
      assert.deepEqual(result.subarray(b, b + 4), previous.subarray(a, a + 4));
      const n = b + (axis === 'x' ? 4 : w * 4); assert.deepEqual(result.subarray(n, n + 4), missing.subarray(a, a + 4));
    }
  }
  assert.throws(() => mergeAxis(previous, 2, 3, new Uint8Array(1), 'x'));
});
test('queue consumes chunks without losing or repeating bytes', () => { const q = new ByteQueue(); q.push(new Uint8Array([1, 2])); q.push(new Uint8Array([3, 4])); assert.equal(q.take(5), null); assert.deepEqual(q.take(3), new Uint8Array([1, 2, 3])); assert.equal(q.length, 1); assert.deepEqual(q.take(1), new Uint8Array([4])); });

test('numeric version and directory validation reject incompatible or unsafe input',async()=>{const bytes=framed();assert.equal(parseHeader(bytes).version,0);const next=bytes.slice();new DataView(next.buffer).setUint32(4,1,true);assert.throws(()=>parseHeader(next),/version 1/);const header=parseHeader(bytes);assert.equal(parseDirectory(bytes.subarray(32,header.dataOffset),header).length,3);const invalid=bytes.slice(32,header.dataOffset);new DataView(invalid.buffer).setUint32(16,0,true);assert.throws(()=>parseDirectory(invalid,header));});
