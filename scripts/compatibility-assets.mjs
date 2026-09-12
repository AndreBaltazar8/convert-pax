import {makeRemainingFixtures} from '../tests/remaining-extensions-fixture.mjs';
import {makeQuantizedFixture} from '../tests/quantized-fixture.mjs';
import { makeCustomExtensionFixture } from '../tests/custom-extension-fixture.mjs';
import fs from 'node:fs/promises';
import { makeCompatibilityFixture } from '../tests/compatibility-fixture.mjs';
import { makeCompressionFixtures } from '../tests/compression-fixture.mjs';
import { makeSkinSetsFixture } from '../tests/skin-sets-fixture.mjs';
import { makeTangentFixture } from '../tests/tangent-fixture.mjs';
import { makeBasisFixture } from '../tests/basis-fixture.mjs';
await fs.mkdir('public/assets',{recursive:true});await fs.mkdir('artifacts',{recursive:true});
const results=[await makeCompatibilityFixture(),...await makeCompressionFixtures(),await makeSkinSetsFixture(),await makeQuantizedFixture(),await makeTangentFixture(),await makeBasisFixture(),...await makeRemainingFixtures()];
await makeCustomExtensionFixture();
await fs.writeFile('artifacts/compatibility-conversions.json',JSON.stringify(results,null,2));
if(process.argv.includes('--catalog')){
  const catalog=JSON.parse(await fs.readFile('public/assets/catalog.json','utf8'));
  for(const stats of results){
    const id=stats.name,item={...stats,id,name:({TestDiffuseTransmission:'Diffuse transmission',TestInteractivity:'Interactive streaming',TestGaussianSplats:'Progressive Gaussian splats',TestCompatibility:'Scenes, materials & instances',TestDraco:'Draco geometry',TestMeshopt:'Meshopt geometry',TestQuantized:'Sparse quantized geometry',TestSkinSets:'Eight-weight skinning',TestTangents:'Mixed morph targets',TestBasis:'Basis GPU texture'})[id],kind:'Compatibility fixture',sourcePage:'/assets/'+id+'.stats.json',triangles:stats.primitives.reduce((n,p)=>n+(p.indexWidth===3?p.finalTriangles:0),0),vertices:stats.primitives.reduce((n,p)=>n+p.finalVertices,0),textures:stats.textures.length};
    const index=catalog.findIndex(a=>a.id===id);if(index<0)catalog.push(item);else catalog[index]=item;
  }
  await fs.writeFile('public/assets/catalog.json',JSON.stringify(catalog,null,2));
}
