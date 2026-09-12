import fs from 'node:fs/promises';
import {SphereGeometry} from 'three';
import sharp from 'sharp';
import {Builder} from '../scripts/gltf.mjs';
import {convert} from '../scripts/convert.mjs';
let seed=7341;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
export const interactionGraph={types:[{signature:'float3'},{signature:'ref'},{signature:'int'},{signature:'float'},{signature:'bool'}],variables:[],events:[],declarations:[{op:'event/onStart'},{op:'pointer/set'},{op:'event/onSelect'}],nodes:[{declaration:0,flows:{out:{node:1,socket:'in'}}},{declaration:1,configuration:{pointer:{value:['/nodes/0/scale']},type:{value:[0]}},values:{value:{type:0,value:[.8,.8,.8]}}},{declaration:2,configuration:{nodeIndex:{value:[0]}},flows:{out:{node:3,socket:'in'}}},{declaration:1,configuration:{pointer:{value:['/nodes/0/translation']},type:{value:[0]}},values:{value:{type:0,value:[.5,0,0]}}}]};
export async function makeRemainingFixtures(){
 const results=[];
 for(const name of ['TestDiffuseTransmission','TestInteractivity']){
  const g=new SphereGeometry(1,48,32),b=new Builder({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{},material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.05,.1,.2,1],metallicFactor:0,roughnessFactor:.65}}]});
  const p=b.json.meshes[0].primitives[0];for(const [semantic,key]of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'})){const a=g.attributes[key];p.attributes[semantic]=b.attribute(a.array,{componentType:5126,type:a.itemSize===3?'VEC3':'VEC2',...(semantic==='POSITION'?{min:[-1,-1,-1],max:[1,1,1]}:{})});}p.indices=b.attribute(Uint32Array.from(g.index.array),{componentType:5125,type:'SCALAR'});
  const pixels=Buffer.from(Array.from({length:256*256*4},(_,i)=>i%4===3?Math.round(128+127*random()):Math.round(random()*255)));const png=await sharp(pixels,{raw:{width:256,height:256,channels:4}}).png().toBuffer();b.json.images=[{bufferView:b.view(png),mimeType:'image/png'}];b.json.textures=[{source:0}];
  if(name==='TestDiffuseTransmission'){b.json.extensionsUsed=b.json.extensionsRequired=['KHR_materials_diffuse_transmission','KHR_materials_volume'];b.json.materials[0].extensions={KHR_materials_diffuse_transmission:{diffuseTransmissionFactor:.9,diffuseTransmissionColorFactor:[1,.5,.1],diffuseTransmissionTexture:{index:0},diffuseTransmissionColorTexture:{index:0}},KHR_materials_volume:{thicknessFactor:.1,attenuationDistance:1,attenuationColor:[.8,1,1]}};}
  else{const input=b.attribute(new Float32Array([0,1]),{componentType:5126,type:'SCALAR',min:[0],max:[1]}),output=b.attribute(new Float32Array([0,0,0,0,1,0]),{componentType:5126,type:'VEC3'});b.json.animations=[{name:'Graph-controlled lift',samplers:[{input,output}],channels:[{sampler:0,target:{node:0,path:'translation'}}]}];b.json.materials[0].pbrMetallicRoughness.baseColorTexture={index:0};b.json.extensionsUsed=b.json.extensionsRequired=['KHR_interactivity'];b.json.extensions={KHR_interactivity:{graph:0,graphs:[interactionGraph]}};}
  await fs.writeFile(`public/assets/${name}.glb`,b.finish());results.push(await convert(`public/assets/${name}.glb`,`public/assets/${name}.pax`,{textureBaseSize:16,tileSize:128}));
 }
 const count=8192,b=new Builder({asset:{version:'2.0'},extensionsUsed:['KHR_gaussian_splatting'],extensionsRequired:['KHR_gaussian_splatting'],scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{mode:0,attributes:{},extensions:{KHR_gaussian_splatting:{kernel:'ellipse',colorSpace:'srgb_rec709_display',projection:'perspective',sortingMethod:'cameraDistance'}}}]}]});
 const p=b.json.meshes[0].primitives[0];const add=(key,width,values)=>p.attributes[key]=b.attribute(Float32Array.from(values),{componentType:5126,type:{1:'SCALAR',3:'VEC3',4:'VEC4'}[width],...(key==='POSITION'?{min:[-1,-1,-1],max:[1,1,1]}:{})});
 add('POSITION',3,Array.from({length:count*3},()=>random()*2-1));add('KHR_gaussian_splatting:SCALE',3,Array.from({length:count*3},()=>.01+random()*.025));add('KHR_gaussian_splatting:ROTATION',4,Array.from({length:count},()=>{const q=Array.from({length:4},()=>random()*2-1),n=Math.hypot(...q);return q.map(x=>x/n);}).flat());add('KHR_gaussian_splatting:OPACITY',1,Array.from({length:count},()=>.2+random()*.7));
 for(let d=0;d<=3;d++)for(let c=0;c<2*d+1;c++)add(`KHR_gaussian_splatting:SH_DEGREE_${d}_COEF_${c}`,3,Array.from({length:count*3},()=>d===0?(random()-.5)*3.2:(random()-.5)*.1));
 await fs.writeFile('public/assets/TestGaussianSplats.glb',b.finish());results.push(await convert('public/assets/TestGaussianSplats.glb','public/assets/TestGaussianSplats.pax'));
 return results;
}
if(process.argv[1]?.endsWith('remaining-extensions-fixture.mjs'))console.log((await makeRemainingFixtures()).map(s=>({name:s.name,source:s.sourceBytes,pax:s.paxBytes})));
