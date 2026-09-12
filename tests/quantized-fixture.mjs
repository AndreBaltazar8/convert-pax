import fs from 'node:fs/promises';
import {parseGLB,makeGLB,accessor} from '../scripts/gltf.mjs';
import {convert} from '../scripts/convert.mjs';
export async function makeQuantizedFixture(){
  let {json,bin}=parseGLB(await fs.readFile('public/assets/TestSkinSets.glb'));
  const view=bytes=>{const start=(bin.length+3)&~3;bin=Buffer.concat([bin,Buffer.alloc(start-bin.length),Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength)]);const i=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:start,byteLength:bytes.byteLength});return i;};
  const p=json.meshes[0].primitives[0];delete json.nodes[0].skin;delete json.skins;
  for(const key of Object.keys(p.attributes))if(/JOINTS|WEIGHTS/.test(key))delete p.attributes[key];
  const a=json.accessors[p.attributes.POSITION],raw=accessor(json,bin,p.attributes.POSITION),values=Int16Array.from(raw,v=>Math.round(v*32767));
  Object.assign(a,{bufferView:view(values),byteOffset:0,componentType:5122,normalized:true,min:[-32767,-32767,-32767],max:[32767,32767,32767]});
  a.sparse={count:1,indices:{bufferView:view(new Uint16Array([10])),componentType:5123},values:{bufferView:view(new Int16Array([0,32767,0]))}};
  json.extensionsUsed=['KHR_mesh_quantization'];json.extensionsRequired=['KHR_mesh_quantization'];
  await fs.writeFile('public/assets/TestQuantized.glb',makeGLB(json,bin));return convert('public/assets/TestQuantized.glb','public/assets/TestQuantized.pax');
}
