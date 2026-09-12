import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {makeRemainingFixtures} from './remaining-extensions-fixture.mjs';import {parseGLB,accessor} from '../scripts/gltf.mjs';import {readPackets,unpackPayload,TYPES,COMPONENTS} from '../src/format.js';import {validateInteractivity} from '../src/interactivity-validation.js';import {validateSplatPrimitive} from '../src/splat-validation.js';
test('remaining extensions fit the cap; all Gaussian tuples reconstruct exactly without quantization',async()=>{
 const results=await makeRemainingFixtures();for(const s of results)assert.ok(s.streamBytes<=s.sourceBytes*1.05);
 const {json,bin}=parseGLB(await fs.readFile('public/assets/TestGaussianSplats.glb'));let manifest,arrays,baseCount,patches=0;
 for await(const packet of readPackets(new Blob([await fs.readFile('public/assets/TestGaussianSplats.pax')]).stream())){
  if(packet.type===TYPES.manifest)manifest=JSON.parse(new TextDecoder().decode(packet.data));
  if(packet.type===TYPES.base){const p=unpackPayload(packet.data),base=parseGLB(p.take(Uint8Array,p.meta.glbLength)),d=manifest.primitives[0];baseCount=d.baseVertices;arrays=d.attributes.map(a=>{const data=new COMPONENTS[a.componentType](d.finalVertices*a.itemSize);data.set(accessor(base.json,base.bin,base.json.meshes[0].primitives[0].attributes[a.semantic]));return data;});}
  if(packet.type===TYPES.geometry){patches++;const p=unpackPayload(packet.data),part=p.meta.primitives[0];manifest.primitives[0].attributes.forEach((a,i)=>arrays[i].set(p.take(COMPONENTS[a.componentType],part.count*a.itemSize),part.start*a.itemSize));}
 }
 assert.ok(patches>0&&patches<=11);assert.ok(baseCount<json.accessors[0].count/10);
 const names=manifest.primitives[0].attributes,position=names.findIndex(a=>a.semantic==='POSITION'),sourcePositions=accessor(json,bin,json.meshes[0].primitives[0].attributes.POSITION),ids=new Map();for(let i=0;i<sourcePositions.length/3;i++)ids.set(Array.from(sourcePositions.slice(i*3,i*3+3)).join(','),i);
 const sourceArrays=names.map(a=>accessor(json,bin,json.meshes[0].primitives[0].attributes[a.semantic]));
 for(let v=0;v<sourcePositions.length/3;v++){const original=ids.get(Array.from(arrays[position].slice(v*3,v*3+3)).join(','));assert.notEqual(original,undefined);names.forEach((a,i)=>{const source=sourceArrays[i];assert.deepEqual(arrays[i].slice(v*a.itemSize,(v+1)*a.itemSize),source.slice(original*a.itemSize,(original+1)*a.itemSize));});}
});
test('unknown execution operations and future splat kernels fail explicitly',()=>{
 assert.throws(()=>validateInteractivity({extensions:{KHR_interactivity:{graphs:[{nodes:[],declarations:[{op:'vendor/doMagic'}]}]}}}),/No progressive interactivity operation adapter/);
 assert.throws(()=>validateSplatPrimitive({mode:0,extensions:{KHR_gaussian_splatting:{kernel:'future'}}},{accessors:[]}),/Unsupported Gaussian/);
});
