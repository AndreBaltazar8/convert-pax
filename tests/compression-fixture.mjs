import fs from 'node:fs/promises';
import sharp from 'sharp';
import { SphereGeometry } from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, meshopt } from '@gltf-transform/functions';
import dracoModule from 'draco3dgltf';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { Builder } from '../scripts/gltf.mjs';
import { convert } from '../scripts/convert.mjs';
export async function makeCompressionFixtures() {
  const b=new Builder({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{},material:0}]}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0}}}],textures:[{source:0}],images:[]});
  const g=new SphereGeometry(1,24,16),p=b.json.meshes[0].primitives[0];
  for(const [semantic,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'})){const a=g.attributes[name];p.attributes[semantic]=b.attribute(a.array,{componentType:5126,type:a.itemSize===3?'VEC3':'VEC2',...(semantic==='POSITION'?{min:[-1,-1,-1],max:[1,1,1]}:{})});}
  p.indices=b.attribute(Uint32Array.from(g.index.array),{componentType:5125,type:'SCALAR'});
  let seed=12345;const pixels=Uint8Array.from({length:512*512*3},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24;});
  const png=await sharp(pixels,{raw:{width:512,height:512,channels:3}}).png().toBuffer();b.json.images.push({bufferView:b.view(png),mimeType:'image/png'});
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await dracoModule.createEncoderModule(),'draco3d.decoder':await dracoModule.createDecoderModule(),'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
  await MeshoptEncoder.ready;await MeshoptDecoder.ready;
  const stats=[];
  for(const [id,transform] of [['Draco',draco()],['Meshopt',meshopt({encoder:MeshoptEncoder})]]){
    const document=await io.readBinary(b.finish());await document.transform(transform);await io.write(`public/assets/Test${id}.glb`,document);
    stats.push(await convert(`public/assets/Test${id}.glb`,`public/assets/Test${id}.pax`,{textureBaseSize:16,geometryBaseRatio:.5}));
  }
  return stats;
}
if(process.argv[1]?.endsWith('compression-fixture.mjs'))console.log(await makeCompressionFixtures());
