import fs from 'node:fs/promises';
import { SphereGeometry } from 'three';
import { Builder } from '../scripts/gltf.mjs';
import { convert } from '../scripts/convert.mjs';
export async function makeSkinSetsFixture(){
  const g=new SphereGeometry(1,24,16),b=new Builder({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0,1,2]}],nodes:[{mesh:0,skin:0},{translation:[0,0,0]},{translation:[0,2,0]}],skins:[{joints:[1,2]}],meshes:[{primitives:[{attributes:{},material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.2,.5,.8,1],metallicFactor:0,roughnessFactor:.7}}]});
  const p=b.json.meshes[0].primitives[0],count=g.attributes.position.count;
  for(const [semantic,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_4:'uv'})){const a=g.attributes[name];p.attributes[semantic]=b.attribute(a.array,{componentType:5126,type:a.itemSize===3?'VEC3':'VEC2',...(semantic==='POSITION'?{min:[-1,-1,-1],max:[1,1,1]}:{})});}
  for(let set=0;set<2;set++){
    p.attributes[`JOINTS_${set}`]=b.attribute(Uint16Array.from({length:count*4},(_,i)=>i%4===0?set:0),{componentType:5123,type:'VEC4'});
    p.attributes[`WEIGHTS_${set}`]=b.attribute(Float32Array.from({length:count*4},(_,i)=>i%4===0?.5:0),{componentType:5126,type:'VEC4'});
  }
  p.indices=b.attribute(Uint32Array.from(g.index.array),{componentType:5125,type:'SCALAR'});
  await fs.writeFile('public/assets/TestSkinSets.glb',b.finish());return convert('public/assets/TestSkinSets.glb','public/assets/TestSkinSets.pax');
}
if(process.argv[1]?.endsWith('skin-sets-fixture.mjs'))console.log(await makeSkinSetsFixture());
