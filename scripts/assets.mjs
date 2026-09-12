import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { makeGLB } from './gltf.mjs';
import { convert } from './convert.mjs';
const root = new URL('../public/assets/', import.meta.url); await fs.mkdir(root, { recursive: true });
const revision = '90d7ede14c7e280af263824604b427a1ca02cb66';
const prefix = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${revision}/`;
const assets = [
  { id: 'FlightHelmet', name: 'Flight helmet', kind: 'Texture-heavy · PBR', file: 'glTF/FlightHelmet.gltf', license: 'CC0-1.0', author: 'Public; conversion by Gary Hsu' },
  { id: 'BoomBox', name: 'Boom box', kind: 'Emissive · Metallic / roughness', file: 'glTF-Binary/BoomBox.glb', license: 'CC0-1.0', author: 'Microsoft' },
  { id: 'BrainStem', name: 'Brain stem', kind: 'Skinned · Animated', file: 'glTF-Binary/BrainStem.glb', license: 'Poser EULA (see source license)', author: 'Smith Micro Software / Keith Hunter' },
];
async function download(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status}: ${url}`); return Buffer.from(await r.arrayBuffer()); }
let catalog=[];try{catalog=JSON.parse(await fs.readFile(new URL('catalog.json',root),'utf8'));}catch{}
for (const asset of assets) {
  const sourceURL = `${prefix}Models/${asset.id}/${asset.file}`, glbFile = new URL(`${asset.id}.glb`, root);
  let glb, provenance;
  try { glb = await fs.readFile(glbFile); provenance = JSON.parse(await fs.readFile(new URL(`${asset.id}.source.json`, root), 'utf8')); }
  catch {
    console.log(`Downloading ${asset.id} …`);
    const bytes = await download(sourceURL);
    if (asset.file.endsWith('.glb')) glb = bytes;
    else {
      const json = JSON.parse(bytes), parts = [], offsets = []; let size = 0;
      for (const b of json.buffers) { offsets.push(size); const bytes = await download(new URL(b.uri, sourceURL)); parts.push(bytes); size += bytes.length; const pad = (4 - size % 4) % 4; parts.push(Buffer.alloc(pad)); size += pad; }
      for (const v of json.bufferViews) { v.byteOffset = (v.byteOffset || 0) + offsets[v.buffer]; v.buffer = 0; }
      for (const img of json.images || []) if (img.uri) {
        const data = await download(new URL(img.uri, sourceURL));
        img.mimeType = img.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'; delete img.uri;
        img.bufferView = json.bufferViews.length; json.bufferViews.push({ buffer: 0, byteOffset: size, byteLength: data.length }); parts.push(data); size += data.length;
        const pad = (4 - size % 4) % 4; parts.push(Buffer.alloc(pad)); size += pad;
      }
      glb = makeGLB(json, Buffer.concat(parts));
    }
    await fs.writeFile(glbFile, glb);
    provenance = { revision, sourceURL, sha256: createHash('sha256').update(glb).digest('hex'), repacked: asset.file.endsWith('.gltf') };
    await fs.writeFile(new URL(`${asset.id}.source.json`, root), JSON.stringify(provenance, null, 2));
    await fs.writeFile(new URL(`${asset.id}.license.md`, root), await download(`${prefix}Models/${asset.id}/README.md`));
  }
  const stats = await convert(glbFile.pathname, new URL(`${asset.id}.pax`, root).pathname);
  const item={ ...asset, ...provenance, sourcePage: `https://github.com/KhronosGroup/glTF-Sample-Assets/tree/${provenance.revision}/Models/${asset.id}`, sourceBytes: stats.sourceBytes, streamBytes: stats.streamBytes, bootstrapBytes: stats.bootstrapBytes, triangles: stats.primitives.reduce((n, p) => n + p.finalTriangles, 0), vertices: stats.primitives.reduce((n, p) => n + p.finalVertices, 0), textures: stats.textures.length, animations: stats.animations, latticeTextures: stats.latticeTextures, sourceTextures: stats.sourceTextures, overheadPercent: stats.overheadPercent };const old=catalog.findIndex(c=>c.id===asset.id);if(old<0)catalog.push(item);else catalog[old]=item;
  await fs.writeFile(new URL('catalog.json', root), JSON.stringify(catalog, null, 2));
}
await fs.writeFile(new URL('Poser-EULA.txt', root), await download(`${prefix}LICENSES/LicenseRef-Poser-EULA.txt`));
