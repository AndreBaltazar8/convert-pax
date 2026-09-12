import fs from 'node:fs/promises';
import sharp from 'sharp';
import { parseGLB, makeGLB } from '../scripts/gltf.mjs';
import { convert } from '../scripts/convert.mjs';
import { makeMorphFixture } from './morph-fixture.mjs';
export async function makeTangentFixture(){
  await makeMorphFixture();let {json,bin}=parseGLB(await fs.readFile('public/assets/TestMorph.glb'));
  const view=bytes=>{const offset=(bin.length+3)&~3;bin=Buffer.concat([bin,Buffer.alloc(offset-bin.length),Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength)]);const id=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.byteLength});return id;};
  const attr=(array,type)=>{const id=json.accessors.length;json.accessors.push({bufferView:view(array),componentType:5126,type,count:array.length/({VEC3:3,VEC4:4,SCALAR:1}[type])});return id;};
  const p=json.meshes[0].primitives[0],count=json.accessors[p.attributes.POSITION].count;
  p.attributes.TANGENT=attr(Float32Array.from({length:count*4},(_,i)=>i%4===0||i%4===3?1:0),'VEC4');
  p.targets[0].TANGENT=attr(Float32Array.from({length:count*3},(_,i)=>i%3===1?.2:0),'VEC3');
  p.targets.push({NORMAL:attr(Float32Array.from({length:count*3},(_,i)=>i%3===0?.2:0),'VEC3')});json.meshes[0].weights=[0,0];
  json.animations[0].samplers[0].output=attr(new Float32Array([0,0,1,1,0,0]),'SCALAR');
  const png=await sharp({create:{width:2,height:2,channels:4,background:{r:180,g:128,b:240,alpha:1}}}).png().toBuffer();
  json.images=[{bufferView:view(png),mimeType:'image/png'}];json.textures=[{source:0}];json.materials[0].normalTexture={index:0};
  await fs.writeFile('public/assets/TestTangents.glb',makeGLB(json,bin));return convert('public/assets/TestTangents.glb','public/assets/TestTangents.pax');
}
if(process.argv[1]?.endsWith('tangent-fixture.mjs'))console.log(await makeTangentFixture());
