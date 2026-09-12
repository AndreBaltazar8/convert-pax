import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { accessor, Builder, parseGLB, makeGLB } from '../scripts/gltf.mjs';
import { readAsset } from '../scripts/input.mjs';
import { makeCompatibilityFixture } from './compatibility-fixture.mjs';
import { convert } from '../scripts/convert.mjs';
import { readPackets, TYPES, unpackPayload } from '../src/format.js';

test('sparse accessors overlay zero or strided bases and preserve padded matrices', () => {
  const b=new Builder({asset:{version:'2.0'}});
  const base=b.view(new Float32Array([1,2,3,99,4,5,6,99]));b.json.bufferViews[base].byteStride=16;
  const indices=b.view(new Uint8Array([1])),values=b.view(new Float32Array([7,8,9]));
  b.json.accessors.push({bufferView:base,count:2,type:'VEC3',componentType:5126,sparse:{count:1,indices:{bufferView:indices,componentType:5121},values:{bufferView:values}}});
  const id=b.attribute(new Uint8Array([1,2,3,4,5,6,7,8,9]),{componentType:5121,type:'MAT3'});
  const {json,bin}=parseGLB(b.finish());
  assert.deepEqual([...accessor(json,bin,0)],[1,2,3,7,8,9]);delete json.accessors[0].bufferView;
  assert.deepEqual([...accessor(json,bin,0)],[0,0,0,7,8,9]);
  assert.deepEqual([...accessor(json,bin,id)],[1,2,3,4,5,6,7,8,9]);
  json.accessors[0].sparse.count=3;assert.throws(()=>accessor(json,bin,0),/sparse/);
});

test('JSON-only GLB and multi-buffer .gltf inputs resolve external and data resources', async () => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pax-input-'));
  try {
    const glb=makeGLB({asset:{version:'2.0'},scenes:[{}]},new Uint8Array());assert.equal(parseGLB(glb).bin.length,0);
    const a=new Float32Array([1,2,3]),b=new Float32Array([4,5,6]);await fs.writeFile(path.join(dir,'a b.bin'),new Uint8Array(a.buffer));
    const json={asset:{version:'2.0'},buffers:[{uri:'a%20b.bin',byteLength:12},{uri:`data:application/octet-stream;base64,${Buffer.from(b.buffer).toString('base64')}`,byteLength:12}],bufferViews:[{buffer:0,byteLength:12},{buffer:1,byteLength:12}],accessors:[{bufferView:1,componentType:5126,type:'VEC3',count:1}]};
    await fs.writeFile(path.join(dir,'test.gltf'),JSON.stringify(json));const asset=await readAsset(path.join(dir,'test.gltf'));
    assert.deepEqual([...accessor(asset.json,asset.bin,0)],[4,5,6]);assert.equal(asset.resources.size,2);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test('combined core and extension features produce real refinement packets within the cap', async () => {
  const stats=await makeCompatibilityFixture();assert.ok(stats.streamBytes<=stats.sourceBytes*1.05);
  assert.ok(stats.extensionStrategies.some(e=>e.name==='EXT_mesh_gpu_instancing'));
  const data=await fs.readFile('public/assets/TestCompatibility.pax');let base,patches=0;
  for await(const p of readPackets(new Blob([data]).stream())) {
    if(p.type===TYPES.base){const v=unpackPayload(p.data);base=parseGLB(v.take(Uint8Array,v.meta.glbLength));}
    if(p.type===TYPES.geometry)patches++;
  }
  assert.equal(patches,stats.primitives.reduce((n,p)=>n+p.levels-1,0));assert.equal(base.json.scenes.length,2);assert.equal(base.json.cameras.length,2);
  assert.deepEqual(base.json.meshes[1].primitives.map(p=>p.mode),[0,1,1,1,4,4,4]);
  assert.equal(base.json.extras.retained,'root');
  const id=base.json.nodes[5].extensions.EXT_mesh_gpu_instancing.attributes.TRANSLATION;
  assert.deepEqual([...accessor(base.json,base.bin,id)],[0,0,0,0,2,0]);
});

test('unknown extensions fail explicitly instead of being stripped or passed through as supported', async () => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pax-extension-'));
  try {
    await fs.writeFile(path.join(dir,'unknown.glb'),makeGLB({asset:{version:'2.0'},extensionsUsed:['TEST_unknown'],extensions:{TEST_unknown:{bufferView:0}}},new Uint8Array()));
    await assert.rejects(convert(path.join(dir,'unknown.glb'),path.join(dir,'out.pax')),/No progressive adapter for TEST_unknown/);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
