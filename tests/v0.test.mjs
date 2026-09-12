import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {encodeGeometry} from '../scripts/geometry-codec.mjs';import {decodeGeometryPayload} from '../src/geometry-codec.js';
import {unpackPayload,readPackets,TYPES} from '../src/format.js';import {splitMips,mipContainer} from '../src/ktx-mips.js';import {read} from 'ktx-parse';
test('lossless block codec preserves mixed signed, normalized and float bit patterns',async()=>{
 const arrays=[new Float32Array([-0,NaN,Infinity,-Infinity,.1,1e-30]),new Int16Array([-32768,-1,0,32767]),new Uint32Array([7,3,65535,0,3])];
 const {payload}=await encodeGeometry({test:true},arrays.map((array,i)=>({array,stride:i===0?12:4,index:i===2})));const decoded=unpackPayload(await decodeGeometryPayload(payload));

 const again=unpackPayload(await decodeGeometryPayload(payload));for(const a of arrays){const b=again.take(a.constructor,a.length);assert.deepEqual(new Uint8Array(b.buffer,b.byteOffset,b.byteLength),new Uint8Array(a.buffer,a.byteOffset,a.byteLength));}
});
test('KTX mip packets preserve every compressed level and shared codebook exactly',async()=>{
 const original=await fs.readFile('artifacts/test-basis.ktx2'),split=splitMips(original),source=read(original);assert.ok(split);
 for(let mip=0;mip<source.levels.length;mip++){const one=read(mipContainer(split.template,mip,split.levels[mip].levelData));assert.deepEqual(one.levels[0].levelData,source.levels[mip].levelData);assert.deepEqual(one.globalData.tablesData,source.globalData.tablesData);assert.equal(one.pixelWidth,Math.max(1,source.pixelWidth>>mip));}
 let templates=0,mips=0;for await(const {type,data}of readPackets(new Blob([await fs.readFile('public/assets/TestBasis.pax')]).stream()))if(type===TYPES.texture){const p=unpackPayload(data);assert.equal(p.meta.codec,'ktx2-mip');if(p.meta.templateLength){assert.deepEqual(p.take(Uint8Array,p.meta.templateLength),split.template);templates++;}assert.deepEqual(p.take(Uint8Array,p.meta.byteLength),source.levels[p.meta.mip].levelData);mips++;}assert.equal(templates,1);assert.equal(mips,source.levels.length);
});
