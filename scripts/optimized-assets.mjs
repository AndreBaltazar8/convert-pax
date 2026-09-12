// Lossless meshopt entropy coding, plus the publisher's already-compressed KTX2 variant.
// PAX and GLB use exactly the same optimized input; no new texture quantization here.
import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {readAsset} from './input.mjs';
import {makeGLB} from './gltf.mjs';
import {convert} from './convert.mjs';
const revision='90d7ede14c7e280af263824604b427a1ca02cb66';
const prefix=`https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${revision}/Models/FlightHelmet/glTF-KTX-BasisU/`;
const file='public/assets/FlightHelmetOptimized.glb';
await fs.mkdir('artifacts/optimized-input',{recursive:true});
try{await fs.access(file);}catch{
 const response=await fetch(prefix+'FlightHelmet.gltf');if(!response.ok)throw new Error(`HTTP ${response.status}`);const json=await response.json();
 for(const resource of [...json.buffers,...json.images])if(resource.uri)resource.uri=new URL(resource.uri,prefix).href;
 const input='artifacts/optimized-input/FlightHelmet.gltf';await fs.writeFile(input,JSON.stringify(json));const asset=await readAsset(input);
 await MeshoptEncoder.ready;await MeshoptDecoder.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
 const doc=await io.readBinary(makeGLB(asset.json,asset.bin));
 // QUANTIZE selects the raw encoder pathway; no quantize transform is invoked.
 doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
 await io.write(file,doc);
}
const stats=await convert(file,file.replace('.glb','.pax'),{textureBaseSize:16});
const catalog=JSON.parse(await fs.readFile('public/assets/catalog.json','utf8'));const item={id:'FlightHelmetOptimized',name:'Flight helmet · meshopt + KTX2',kind:'Optimized glTF baseline',license:'CC0-1.0',author:'Public; conversion by Gary Hsu',sourcePage:`https://github.com/KhronosGroup/glTF-Sample-Assets/tree/${revision}/Models/FlightHelmet`,sourceBytes:stats.sourceBytes,streamBytes:stats.streamBytes,bootstrapBytes:stats.bootstrapBytes,triangles:stats.primitives.reduce((n,p)=>n+p.finalTriangles,0),vertices:stats.primitives.reduce((n,p)=>n+p.finalVertices,0),textures:stats.textures.length,animations:stats.animations,latticeTextures:stats.latticeTextures,sourceTextures:stats.sourceTextures,overheadPercent:stats.overheadPercent};
const old=catalog.findIndex(a=>a.id===item.id);if(old<0)catalog.push(item);else catalog[old]=item;await fs.writeFile('public/assets/catalog.json',JSON.stringify(catalog,null,2));
