import fs from 'node:fs/promises';
import { SphereGeometry } from 'three';
import { Builder } from '../scripts/gltf.mjs';
import { convert } from '../scripts/convert.mjs';
export async function makeMorphFixture() {
  const geometry = new SphereGeometry(1, 32, 24), b = new Builder({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ weights: [0], primitives: [{ attributes: {}, targets: [{}], material: 0 }] }], materials: [{ pbrMetallicRoughness: { baseColorFactor: [.35, .7, .45, 1], metallicFactor: .2, roughnessFactor: .6 } }] });
  const p = b.json.meshes[0].primitives[0];
  for (const [semantic, name] of Object.entries({ POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv' })) {
    const attr = geometry.attributes[name]; p.attributes[semantic] = b.attribute(attr.array, { componentType: 5126, type: attr.itemSize === 3 ? 'VEC3' : 'VEC2', ...(semantic === 'POSITION' ? { min: [-1, -1, -1], max: [1, 1, 1] } : {}) });
  }
  p.indices = b.attribute(Uint32Array.from(geometry.index.array), { componentType: 5125, type: 'SCALAR' });
  const delta = Float32Array.from(geometry.attributes.position.array, (v, i) => v * (i % 3 === 1 ? .65 : -.2));
  p.targets[0].POSITION = b.attribute(delta, { componentType: 5126, type: 'VEC3', min: [-.2, -.65, -.2], max: [.2, .65, .2] });
  const input = b.attribute(new Float32Array([0, 1, 2]), { componentType: 5126, type: 'SCALAR', min: [0], max: [2] }), output = b.attribute(new Float32Array([0, 1, 0]), { componentType: 5126, type: 'SCALAR' });
  b.json.animations = [{ name: 'stretch', samplers: [{ input, output, interpolation: 'LINEAR' }], channels: [{ sampler: 0, target: { node: 0, path: 'weights' } }] }];
  const root = new URL('../public/assets/', import.meta.url); await fs.mkdir(root, { recursive: true }); await fs.writeFile(new URL('TestMorph.glb', root), b.finish());
  const stats = await convert(new URL('TestMorph.glb', root).pathname, new URL('TestMorph.pax', root).pathname);
  return { id: 'TestMorph', name: 'Morph test fixture', kind: 'Synthetic validation only', ...stats, triangles: stats.primitives.reduce((n, p) => n + p.finalTriangles, 0), sourcePage: '#' };
}
