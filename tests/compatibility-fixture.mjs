import fs from 'node:fs/promises';
import { SphereGeometry } from 'three';
import sharp from 'sharp';
import { Builder } from '../scripts/gltf.mjs';
import { convert } from '../scripts/convert.mjs';
export async function makeCompatibilityFixture() {
  const geometry=new SphereGeometry(1,32,24);
  const b=new Builder({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0,2,3,4,5]},{nodes:[1]}],nodes:[{mesh:0},{mesh:1},{camera:0},{camera:1},{extensions:{KHR_lights_punctual:{light:0}}},{mesh:2,translation:[3,0,0],extensions:{EXT_mesh_gpu_instancing:{attributes:{}}}}],cameras:[{type:'perspective',perspective:{yfov:.7,znear:.1}},{type:'orthographic',orthographic:{xmag:2,ymag:2,znear:.1,zfar:10}}],meshes:[{primitives:[]},{primitives:[]},{primitives:[]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[1,.2,.1,.75],baseColorTexture:{index:0,extensions:{KHR_texture_transform:{offset:[.1,.2],scale:[.5,.5]}}},metallicFactor:.1,roughnessFactor:.7},alphaMode:'BLEND',doubleSided:true,extensions:{KHR_materials_clearcoat:{clearcoatFactor:.6},KHR_materials_sheen:{sheenColorFactor:[.2,.1,.3]},KHR_materials_specular:{specularFactor:.7},KHR_materials_ior:{ior:1.4},KHR_materials_transmission:{transmissionFactor:.1},KHR_materials_volume:{thicknessFactor:.2},KHR_materials_iridescence:{iridescenceFactor:.1},KHR_materials_anisotropy:{anisotropyStrength:.2},KHR_materials_emissive_strength:{emissiveStrength:2},KHR_materials_dispersion:{dispersion:.1}}},{pbrMetallicRoughness:{baseColorTexture:{index:0},baseColorFactor:[.1,1,.2,1]},extensions:{KHR_materials_unlit:{}}}],textures:[{source:0,sampler:0}],samplers:[{magFilter:9728,minFilter:9987,wrapS:33071,wrapT:33648}],images:[],extensionsUsed:['KHR_texture_transform','KHR_materials_variants','KHR_materials_unlit','KHR_materials_clearcoat','KHR_materials_sheen','KHR_materials_specular','KHR_materials_ior','KHR_materials_transmission','KHR_materials_volume','KHR_materials_iridescence','KHR_materials_anisotropy','KHR_materials_emissive_strength','KHR_materials_dispersion','KHR_lights_punctual','EXT_mesh_gpu_instancing','KHR_animation_pointer'],extensionsRequired:['EXT_mesh_gpu_instancing','KHR_animation_pointer'],extensions:{KHR_lights_punctual:{lights:[{type:'point',intensity:5,color:[1,.8,.7]}]},KHR_materials_variants:{variants:[{name:'Green'}]}}});
  const attrs={};
  for(const [semantic,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'})) {
    const a=geometry.attributes[name];attrs[semantic]=b.attribute(a.array,{componentType:5126,type:a.itemSize===3?'VEC3':'VEC2',...(semantic==='POSITION'?{min:[-1,-1,-1],max:[1,1,1]}:{})});
  }
  const colors=Uint8Array.from({length:geometry.attributes.position.count*4},(_,i)=>i%4===3?200:255);
  attrs.COLOR_0=b.attribute(colors,{componentType:5121,type:'VEC4',normalized:true});
  attrs._CUSTOM=b.attribute(new Float32Array(geometry.attributes.position.count).fill(.5),{componentType:5126,type:'SCALAR'});
  const indices=b.attribute(Uint32Array.from(geometry.index.array),{componentType:5125,type:'SCALAR'});
  b.json.meshes[0].primitives.push({attributes:attrs,indices,material:0,extras:{retained:'primitive'},extensions:{KHR_materials_variants:{mappings:[{material:1,variants:[0]}]}}});
  // Exercise every core topology, including non-indexed POINTS.
  for(let mode=0;mode<=6;mode++) {
    const own={...attrs};
    for(const [semantic,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}))own[semantic]=b.attribute(geometry.attributes[name].array,b.json.accessors[attrs[semantic]]);
    b.json.meshes[1].primitives.push({attributes:own,...(mode?{indices}:{}),mode,material:1});
  }
  b.json.meshes[2].primitives.push({attributes:attrs,indices,material:1});
  b.json.nodes[5].extensions.EXT_mesh_gpu_instancing.attributes.TRANSLATION=b.attribute(new Float32Array([0,0,0,0,2,0]),{componentType:5126,type:'VEC3'});
  const image=await sharp({create:{width:256,height:256,channels:4,background:{r:200,g:180,b:160,alpha:.8}}}).png().toBuffer();
  b.json.images.push({bufferView:b.view(image),mimeType:'image/png'});
  const time=b.attribute(new Float32Array([0,1,2]),{componentType:5126,type:'SCALAR',min:[0],max:[2]});
  const values=b.attribute(new Float32Array([.1,.9,.1]),{componentType:5126,type:'SCALAR'});
  b.json.animations=[{name:'roughness',samplers:[{input:time,output:values,interpolation:'LINEAR'}],channels:[{sampler:0,target:{path:'pointer',extensions:{KHR_animation_pointer:{pointer:'/materials/0/pbrMetallicRoughness/roughnessFactor'}}}}]}];
  b.json.extras={retained:'root'};
  await fs.writeFile('public/assets/TestCompatibility.glb',b.finish());
  return convert('public/assets/TestCompatibility.glb','public/assets/TestCompatibility.pax');
}
