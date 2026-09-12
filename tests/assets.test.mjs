import {expandPixels,refineTile} from '../src/texture-tiles.js';
import test from 'node:test';
import sharp from 'sharp';
import { mergeAxis, unfilterRows } from '../src/textures.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseGLB, accessor } from '../scripts/gltf.mjs';
import { readPackets, unpackPayload, TYPES, COMPONENTS } from '../src/format.js';
const hash = data => createHash('sha256').update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).digest('hex');
for (const id of ['FlightHelmet', 'BoomBox', 'BrainStem']) test(`${id}: full stream reconstructs attributes, topology, textures, animation and skins`, async () => {
  const directory = new URL('../public/assets/', import.meta.url), stats = JSON.parse(await fs.readFile(new URL(`${id}.stats.json`, directory), 'utf8'));
  const source = parseGLB(await fs.readFile(new URL(`${id}.glb`, directory)));
  const bytes = await fs.readFile(new URL(`${id}.pax`, directory));
  let manifest, base, states, images, ended = false, geometryStages = 0;
  for await (const { type, data } of readPackets(new Blob([bytes]).stream())) {
    if (type === TYPES.manifest) manifest = JSON.parse(new TextDecoder().decode(data));
    if (type === TYPES.base) {
      const p = unpackPayload(data); base = parseGLB(p.take(Uint8Array, p.meta.glbLength));
      images = p.meta.textures.map(t => ({ width: t.width, height: t.height, pixels: p.take(Uint8Array, t.width * t.height * 4) }));
      states = manifest.primitives.map(m => {
        const primitive = base.json.meshes[m.mesh].primitives[m.primitive];
        const arrays = m.attributes.map(a => { const index = a.morph !== undefined ? primitive.targets[a.morph][a.semantic] : primitive.attributes[a.semantic]; const initial = accessor(base.json, base.bin, index); const full = new COMPONENTS[a.componentType](m.finalVertices * a.itemSize); full.set(initial); return { full, initial }; });
        const initialIndices = accessor(base.json, base.bin, primitive.indices), triangles = new Map();
        for (let i = 0; i < initialIndices.length; i += 3) triangles.set(i / 3, [...initialIndices.subarray(i, i + 3)]);
        return { arrays, triangles, count: m.baseVertices };
      });
    }
    if (type === TYPES.geometry) {
      geometryStages++;
      const p = unpackPayload(data);
      for (const m of p.meta.primitives) {
        const description = manifest.primitives[m.id], state = states[m.id]; assert.equal(m.start, state.count);
        description.attributes.forEach((a, i) => { const data = p.take(COMPONENTS[a.componentType], m.count * a.itemSize); state.arrays[i].full.set(data, m.start * a.itemSize); assert.deepEqual(state.arrays[i].full.subarray(0, state.arrays[i].initial.length), state.arrays[i].initial, 'early vertices must never be replaced'); });
        const removed = p.take(Uint32Array, m.removed), added = p.take(Uint32Array, m.added), order=p.take(Uint32Array,m.order||0);
        for (const id of removed) assert.ok(state.triangles.delete(id));
        for (let i = 0; i < added.length; i += 4) { assert.ok(!state.triangles.has(added[i])); assert.ok([...added.subarray(i + 1, i + 4)].every(v => v < m.start + m.count)); state.triangles.set(added[i], [...added.subarray(i + 1, i + 4)]); }
        if(order.length){assert.equal(order.length,state.triangles.size);state.triangles=new Map(Array.from(order,id=>[id,state.triangles.get(id)]));}
        assert.equal(state.triangles.size, m.triangles); state.count += m.count;
      }
    }
    if (type === TYPES.texture) {
      const p = unpackPayload(data), t = p.meta, old = images[t.image]; let pixels;
      if(t.codec==='tile-lattice'){
        if(!old.tiles){const desc=manifest.textures[t.image];Object.assign(old,{fullWidth:desc.width,fullHeight:desc.height,baseWidth:old.width,baseHeight:old.height,basePixels:old.pixels,tiles:new Map()});old.pixels=expandPixels(old.pixels,old.width,old.height,desc.width,desc.height);}
        const patch=refineTile(old,t,p.take(Uint8Array,t.filteredLength));for(let y=0;y<t.tileHeight;y++)old.pixels.set(patch.subarray(y*t.tileWidth*4,(y+1)*t.tileWidth*4),((t.y+y)*old.fullWidth+t.x)*4);continue;
      }else if (t.codec === 'lattice') {
        pixels = mergeAxis(old.pixels, old.width, old.height, unfilterRows(p.take(Uint8Array, t.filteredLength), old.width, old.height), t.axis);
        for (let y = 0; y < old.height; y++) for (let x = 0; x < old.width; x++) for (let c = 0; c < 4; c++) assert.equal(pixels[((t.axis === 'y' ? y * 2 : y) * t.width + (t.axis === 'x' ? x * 2 : x)) * 4 + c], old.pixels[(y * old.width + x) * 4 + c], 'earlier texture samples reused exactly');
      } else {
        const encoded = p.take(Uint8Array, t.byteLength), v = source.json.bufferViews[source.json.images[t.image].bufferView];
        assert.equal(hash(encoded), hash(source.bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)), 'fallback source image is transmitted unchanged');
        pixels = await sharp(encoded).ensureAlpha().raw().toBuffer();
      }
      images[t.image] = { width: t.width, height: t.height, pixels };
    }
    if (type === TYPES.end) ended = true;
  }
  assert.ok(bytes.length <= stats.sourceBytes * 1.05, "strict 5% file size budget");
  assert.ok(ended); assert.equal(geometryStages, manifest.primitives.reduce((n,p)=>n+p.levels-1,0));
  for (let i = 0; i < states.length; i++) {
    const s = states[i], proof = stats.verification.primitives[i], desc = manifest.primitives[i];
    assert.equal(s.count, proof.originalVertices); assert.equal(s.triangles.size, proof.originalTriangles);
    s.arrays.forEach((a, j) => assert.equal(hash(a.full), proof.attributes[j].hash));
    // Match full vertex tuples to the original GLB, then compare oriented triangle multisets.
    const originalPrimitive = source.json.meshes[desc.mesh].primitives[desc.primitive];
    const originalArrays = desc.attributes.map(a => accessor(source.json, source.bin, a.morph !== undefined ? originalPrimitive.targets[a.morph][a.semantic] : originalPrimitive.attributes[a.semantic]));
    const signature = (arrays, v) => arrays.map((arr, k) => { const size = desc.attributes[k].itemSize; return [...arr.subarray(v * size, (v + 1) * size)].join(','); }).join('|');
    const sourceSignatures = Array.from({ length: s.count }, (_, v) => signature(originalArrays, v));
    const finalSignatures = Array.from({ length: s.count }, (_, v) => signature(s.arrays.map(a => a.full), v));
    assert.deepEqual([...finalSignatures].sort(), [...sourceSignatures].sort(), 'original vertex multiset preserved');
    const originalIndices = originalPrimitive.indices === undefined ? Uint32Array.from({ length: s.count }, (_, v) => v) : accessor(source.json, source.bin, originalPrimitive.indices);
    const triangles = []; for (let j = 0; j < originalIndices.length; j += 3) triangles.push([...originalIndices.subarray(j, j + 3)].map(v => sourceSignatures[v]).join(';'));
    const finalTriangles=[...s.triangles.values()].map(t=>t.map(v=>finalSignatures[v]).join(';'));
    if(manifest.features?.includes('final-order'))assert.deepEqual(finalTriangles,triangles,'final primitive order preserved');
    assert.deepEqual(finalTriangles.sort(),triangles.sort(),'all oriented source triangles preserved');
  }
  images.forEach((image, i) => assert.equal(hash(image.pixels), stats.verification.textures[i].hash));
  assert.equal((base.json.animations || []).length, (source.json.animations || []).length);
  for (let i = 0; i < (source.json.animations || []).length; i++) {
    assert.deepEqual(base.json.animations[i].channels, source.json.animations[i].channels);
    source.json.animations[i].samplers.forEach((s, j) => { const b = base.json.animations[i].samplers[j]; for (const k of ['input', 'output']) assert.deepEqual(accessor(base.json, base.bin, b[k]), accessor(source.json, source.bin, s[k])); assert.equal(b.interpolation, s.interpolation); });
  }
  for (let i = 0; i < (source.json.skins || []).length; i++) { const s = source.json.skins[i], b = base.json.skins[i]; assert.deepEqual(b.joints, s.joints); if (s.inverseBindMatrices !== undefined) assert.deepEqual(accessor(base.json, base.bin, b.inverseBindMatrices), accessor(source.json, source.bin, s.inverseBindMatrices)); }
  assert.deepEqual(base.json.materials, source.json.materials); assert.equal(JSON.stringify(base.json.nodes), JSON.stringify(source.json.nodes));
});
