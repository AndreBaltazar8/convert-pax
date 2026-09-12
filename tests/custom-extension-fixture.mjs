import fs from 'node:fs/promises';
import {parseGLB,makeGLB} from '../scripts/gltf.mjs';
import {convert} from '../scripts/convert.mjs';
import {registerProgressiveExtension} from '../scripts/extensions.mjs';
export async function makeCustomExtensionFixture(){
  const {json,bin}=parseGLB(await fs.readFile('public/assets/TestMorph.glb'));
  json.extensionsUsed=['TEST_progressive'];json.extensionsRequired=['TEST_progressive'];json.extensions={TEST_progressive:{accessor:json.meshes[0].primitives[0].attributes.NORMAL}};
  registerProgressiveExtension('TEST_progressive',{strategy:'test extension with typed level payloads',remap({json,copyAccessor}){json.extensions.TEST_progressive.accessor=copyAccessor(json.extensions.TEST_progressive.accessor);},refine({level}){return {meta:{value:level},arrays:[new Uint32Array([level*7])]};}});
  await fs.writeFile('public/assets/TestExtension.glb',makeGLB(json,bin));return convert('public/assets/TestExtension.glb','public/assets/TestExtension.pax');
}
