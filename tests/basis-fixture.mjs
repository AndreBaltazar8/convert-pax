import fs from 'node:fs/promises';
import { Builder } from '../scripts/gltf.mjs';
import { convert } from '../scripts/convert.mjs';
export async function makeBasisFixture(){
  const file='artifacts/test-basis.ktx2';
  try{await fs.access(file);}catch{
    try{await fs.mkdir('artifacts',{recursive:true});await fs.copyFile(new URL('../fixtures/test-basis.ktx2',import.meta.url),file);}catch{}
    const url='https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/90d7ede14c7e280af263824604b427a1ca02cb66/Models/FlightHelmet/glTF-KTX-BasisU/FlightHelmet_Materials_LensesMat_BaseColor.ktx2';
    let cached=false;try{await fs.access(file);cached=true;}catch{}
    const r=cached?{ok:true,arrayBuffer:async()=>fs.readFile(file)}:await fetch(url);if(!r.ok)throw new Error(`Basis fixture HTTP ${r.status}`);await fs.mkdir('artifacts',{recursive:true});await fs.writeFile(file,new Uint8Array(await r.arrayBuffer()));
    await fs.writeFile('artifacts/test-basis-source.txt',url+'\nCC0-1.0; FlightHelmet sample asset.\n');
  }
  const b=new Builder({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{},material:0}]}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0}}}],textures:[{extensions:{KHR_texture_basisu:{source:0}}}],images:[],extensionsUsed:['KHR_texture_basisu'],extensionsRequired:['KHR_texture_basisu']});
  const p=b.json.meshes[0].primitives[0];
  p.attributes.POSITION=b.attribute(new Float32Array([-1,-1,0,1,-1,0,0,1,0]),{componentType:5126,type:'VEC3',min:[-1,-1,0],max:[1,1,0]});
  p.attributes.TEXCOORD_0=b.attribute(new Float32Array([0,0,1,0,.5,1]),{componentType:5126,type:'VEC2'});
  b.json.images.push({bufferView:b.view(await fs.readFile(file)),mimeType:'image/ktx2'});
  await fs.writeFile('public/assets/TestBasis.glb',b.finish());return convert('public/assets/TestBasis.glb','public/assets/TestBasis.pax',{textureBaseSize:16});
}
