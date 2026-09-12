import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { convert, conversionOptions } from '../scripts/convert.mjs';

test('conversion settings reject invalid quality requests', () => {
  for (const textureBaseSize of [0, 31, 2048, NaN]) assert.throws(() => conversionOptions({ textureBaseSize }), /textureBaseSize/);
  for (const geometryBaseRatio of [0, -1, 1.1, NaN]) assert.throws(() => conversionOptions({ geometryBaseRatio }), /geometryBaseRatio/);
});

test('custom initial geometry quality preserves final topology and size cap', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pax-options-'));
  try {
    const input = 'public/assets/BrainStem.glb';
    const original = JSON.parse(await fs.readFile('public/assets/BrainStem.stats.json', 'utf8'));
    const result = await convert(input, path.join(dir, 'custom.pax'), { textureBaseSize: 256, geometryBaseRatio: .1 });
    assert.deepEqual(result.conversionSettings, conversionOptions({ textureBaseSize: 256, geometryBaseRatio: .1 }));
    assert.ok(result.levels>=2&&result.levels<=8);
    assert.ok(result.streamBytes <= result.sourceBytes * 1.05);
    assert.deepEqual(result.primitives.map(p => p.finalTriangles), original.primitives.map(p => p.finalTriangles));
    assert.ok(result.primitives.reduce((n,p) => n+p.baseTriangles,0) > original.primitives.reduce((n,p) => n+p.baseTriangles,0));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
