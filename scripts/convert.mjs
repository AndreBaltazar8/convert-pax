import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {splitMips} from '../src/ktx-mips.js';
import {encodeTiles} from './texture-tiles.mjs';
import {packet} from './packets.mjs';
import {encodeGeometry} from './geometry-codec.mjs';
import {chooseGeometryStages,textureImportance,chooseTextureStep} from './quality.mjs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { MeshoptSimplifier } from 'meshoptimizer';
import { VERSION, HEADER_BYTES, NO_RESOURCE, encodeContainer, TYPES, WIDTHS, packPayload } from '../src/format.js';
import { filteredRows, sample } from './texture-codec.mjs';
import { mergeAxis, unfilterRows } from '../src/textures.js';
import { accessor, Builder } from './gltf.mjs';
import { decodeBasis } from './basis.mjs';
import { readAsset } from './input.mjs';
import { progressiveAdapters, decodeGeometryCompression } from './extensions.mjs';
const defaultRatios = [0.015, 0.025, 0.04, 0.065, 0.10, 0.16, 0.24, 0.35, 0.50, 0.68, 0.84, 1];
const hash = data => createHash('sha256').update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).digest('hex');
function select(array, width, vertices) {
  const out = new array.constructor(vertices.length * width);
  vertices.forEach((v, i) => out.set(array.subarray(v * width, (v + 1) * width), i * width)); return out;
}
export function conversionOptions({ textureBaseSize = 128, geometryBaseRatio = 0.015, adaptive = true, initialQuality = 'balanced', geometryCodec = 'auto', textureTiles = true, tileSize = 256 } = {}) {
  if (!Number.isInteger(textureBaseSize) || textureBaseSize < 16 || textureBaseSize > 1024 || (textureBaseSize & (textureBaseSize - 1))) throw new Error('textureBaseSize must be a power of two from 16 to 1024');
  if (!Number.isFinite(geometryBaseRatio) || geometryBaseRatio <= 0 || geometryBaseRatio > 1) throw new Error('geometryBaseRatio must be greater than 0 and at most 1');
  if(!['fast','balanced','sharp'].includes(initialQuality)||!['auto','gzip'].includes(geometryCodec)||typeof adaptive!=='boolean'||typeof textureTiles!=='boolean'||![128,256,512].includes(tileSize))throw new Error('Invalid optimization options');
  return { textureBaseSize, geometryBaseRatio, adaptive, initialQuality, geometryCodec, textureTiles, tileSize };
}
export async function convert(input, output, options = {}) {
  if(typeof output!=='string'||!output.endsWith('.pax'))throw new Error('Output filename must end in .pax');
  const settings = conversionOptions(options);
  const ratios = [settings.geometryBaseRatio, ...defaultRatios.filter(r => r > settings.geometryBaseRatio)];
  await MeshoptSimplifier.ready;
  const asset = await readAsset(input);
  const adapted = await decodeGeometryCompression(asset);
  const { source, sourceBytes } = asset;
  let { json, bin } = asset;
  const adapters = (json.extensionsUsed || []).map(name => {
    const adapter = progressiveAdapters.get(name);
    if (!adapter) throw new Error(`No progressive adapter for ${name}; registerProgressiveExtension() before conversion`);
    return adapter;
  });
  for (const adapter of adapters) {const result=await adapter.prepare?.({ json, bin, asset });if(result){json=result.json??json;bin=result.bin??bin;}}
  const builder = new Builder(json), primitives = [], verification = { primitives: [], textures: [] };
  const copied = new Map(), geometryCache = new Map();
  const copyAccessor = id => { if (!copied.has(id)) copied.set(id, builder.attribute(accessor(json, bin, id), json.accessors[id])); return copied.get(id); };
  const views=new Map();
  const copyBufferView=id=>{if(!views.has(id)){const v=json.bufferViews[id];if(!v)throw new Error('Unknown extension bufferView');const target=builder.view(bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));Object.assign(builder.json.bufferViews[target],{...v,...builder.json.bufferViews[target]});views.set(id,target);}return views.get(id);};
  for (const adapter of adapters) await adapter.remap?.({ json: builder.json, source: json, bin, builder, copyAccessor, copyBufferView });
  // Small animation and skin dependencies are in the bootstrap, retained for the entire stream.
  for (const skin of builder.json.skins || []) if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = copyAccessor(skin.inverseBindMatrices);
  for (const animation of builder.json.animations || []) for (const s of animation.samplers) { s.input = copyAccessor(s.input); s.output = copyAccessor(s.output); }
  for (let m = 0; m < (json.meshes || []).length; m++) for (let p = 0; p < json.meshes[m].primitives.length; p++) {
    const original = json.meshes[m].primitives[p], target = builder.json.meshes[m].primitives[p];
    const geometryKey = JSON.stringify({attributes:original.attributes,indices:original.indices,mode:original.mode??4,targets:original.targets});
    const reused = geometryCache.get(geometryKey);
    if (reused) {
      target.attributes=structuredClone(reused.target.attributes);target.indices=reused.target.indices;target.mode=reused.target.mode;
      if(reused.target.targets)target.targets=structuredClone(reused.target.targets);
      reused.description.instances.push({mesh:m,primitive:p});continue;
    }
    const originalMode = original.mode ?? 4;
    if (!Number.isInteger(originalMode) || originalMode < 0 || originalMode > 6) throw new Error('Invalid primitive mode');
    const count = json.accessors[original.attributes.POSITION].count;
    let indices = original.indices !== undefined ? Uint32Array.from(accessor(json, bin, original.indices)) : Uint32Array.from({ length: count }, (_, i) => i);
    const indexWidth = originalMode === 0 ? 1 : originalMode < 4 ? 2 : 3;
    if ([2,3,5,6].includes(originalMode)) {
      const expanded = [];
      if (originalMode === 2 || originalMode === 3) {
        for (let i=1;i<indices.length;i++) expanded.push(indices[i-1],indices[i]);
        if (originalMode === 2 && indices.length > 1) expanded.push(indices.at(-1),indices[0]);
      } else for (let i=2;i<indices.length;i++) {
        if (originalMode === 6) expanded.push(indices[0],indices[i-1],indices[i]);
        else if (i%2) expanded.push(indices[i-1],indices[i-2],indices[i]);
        else expanded.push(indices[i-2],indices[i-1],indices[i]);
      }
      indices = Uint32Array.from(expanded);
    }
    target.mode = indexWidth === 1 ? 0 : indexWidth === 2 ? 1 : 4;
    const positionDefinition = json.accessors[original.attributes.POSITION];
    const rawPositions = accessor(json, bin, original.attributes.POSITION);
    const positions = Float32Array.from(rawPositions, v => {
      if (!positionDefinition.normalized || rawPositions instanceof Float32Array) return v;
      const signed = [5120,5122].includes(positionDefinition.componentType), bits = rawPositions.BYTES_PER_ELEMENT*8;
      return Math.max(signed ? -1 : 0, v/(2**(bits-(signed?1:0))-1));
    });
    const attributes = Object.entries(original.attributes).map(([semantic, id]) => ({ semantic, definition: json.accessors[id], data: accessor(json, bin, id) }));
    for (let t = 0; t < (original.targets || []).length; t++) for (const [semantic, id] of Object.entries(original.targets[t])) attributes.push({ semantic, morph: t, definition: json.accessors[id], data: accessor(json, bin, id) });
    // Missing morph semantics are zero deltas. Supply zero POSITION targets
    // too, so normal/tangent-only morphs have a complete GPU influence layout.
    const morphSemantics = new Set(attributes.filter(a=>a.morph!==undefined).map(a=>a.semantic));
    if ((original.targets || []).length) morphSemantics.add('POSITION');
    for(let t=0;t<(original.targets || []).length;t++) for(const semantic of morphSemantics) {
      if(attributes.some(a=>a.morph===t&&a.semantic===semantic))continue;
      const reference=attributes.find(a=>a.morph!==undefined&&a.semantic===semantic);
      const definition=reference?.definition || {componentType:5126,type:'VEC3',min:[0,0,0],max:[0,0,0]};
      const Type=reference?.data.constructor || Float32Array;
      attributes.push({semantic,morph:t,definition:{...definition,min:Array(WIDTHS[definition.type]).fill(0),max:Array(WIDTHS[definition.type]).fill(0)},data:new Type(count*WIDTHS[definition.type])});
    }
    const selectedStages=chooseGeometryStages(indices,positions,attributes,indexWidth,ratios,{...settings,splat:!!original.extensions?.KHR_gaussian_splatting});
    const levels=selectedStages.map(s=>s.indices);
    const order = [], remap = new Int32Array(count).fill(-1), stages = [];
    let previous = new Map(), nextTriangle = 0;
    for (let level = 0; level < levels.length; level++) {
      const start = order.length, inds = levels[level];
      for (const v of inds) if (remap[v] === -1) { remap[v] = order.length; order.push(v); }
      if (level === levels.length - 1) for (let v = 0; v < count; v++) if (remap[v] === -1) { remap[v] = order.length; order.push(v); }
      const active = new Map(), added = [];
      // Occurrence suffix preserves duplicate triangles too.
      const occurrences = new Map();
      for (let i = 0; i < inds.length; i += indexWidth) {
        const tri = Array.from(inds.subarray(i,i+indexWidth), v => remap[v]);
        const key0 = tri.join(','), occurrence = occurrences.get(key0) || 0; occurrences.set(key0, occurrence + 1);
        const key = `${key0}:${occurrence}`;
        const id = previous.has(key) ? previous.get(key) : nextTriangle++;
        if (!previous.has(key)) added.push(id, ...tri);
        active.set(key, id);
      }
      const removed = Uint32Array.from([...previous].filter(([key]) => !active.has(key)).map(([, id]) => id));
      const vertices = order.slice(start), arrays = attributes.map(a => select(a.data, WIDTHS[a.definition.type], vertices));
      stages.push({ start, count: vertices.length, arrays, removed, added: Uint32Array.from(added), active: inds.length / indexWidth, order:Uint32Array.from(active.values()), indices: Uint32Array.from(inds, v => remap[v]) }); previous = active;
    }
    const first = stages[0];
    for (let a = 0; a < attributes.length; a++) {
      const attr = attributes[a], id = builder.attribute(first.arrays[a], attr.definition);
      if (attr.morph !== undefined) target.targets[attr.morph][attr.semantic] = id; else target.attributes[attr.semantic] = id;
    }
    target.indices = builder.attribute(first.indices, { componentType: 5125, type: 'SCALAR' });
    primitives.push({ mesh: m, primitive: p, instances:[{mesh:m,primitive:p}], indexWidth, originalMode, count, stages, attributes, nextTriangle, quality:selectedStages.map(({indices,...quality})=>({...quality,primitives:indices.length/indexWidth})) });
    geometryCache.set(geometryKey,{target,description:primitives.at(-1)});
    verification.primitives.push({ mesh: m, primitive: p, attributes: attributes.map(a => ({ semantic: a.semantic, morph: a.morph, hash: hash(select(a.data, WIDTHS[a.definition.type], order)) })), finalIndicesHash: hash(stages.at(-1).indices), originalVertices: count, originalTriangles: indices.length / 3 });
  }
  const textures = [], textureCandidates = [];
  for (let i = 0; i < (json.images || []).length; i++) {
    const img = json.images[i]; if (img.bufferView === undefined) throw new Error('Embed image URIs before conversion');
    const bv = json.bufferViews[img.bufferView], bytes = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    const isBasis = img.mimeType === 'image/ktx2';
    const decoded = isBasis ? await decodeBasis(bytes) : await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = decoded.info; if (channels !== 4) throw new Error('Only RGBA8 images supported');
    const full = decoded.data;
    const importance=textureImportance(json,i),quality=chooseTextureStep(full,width,height,settings.textureBaseSize,importance.importance,settings.initialQuality);
    const step=quality.step;
    const baseWidth = width / step, baseHeight = height / step;
    // Non-power-of-two images use a bounded preview and exact source-image fallback.
    const canLattice = !isBasis && Math.max(baseWidth, baseHeight) <= settings.textureBaseSize;
    const bw = canLattice ? baseWidth : Math.max(1, Math.round(width * settings.textureBaseSize / Math.max(width, height)));
    const bh = canLattice ? baseHeight : Math.max(1, Math.round(height * settings.textureBaseSize / Math.max(width, height)));
    const baseRaw = canLattice ? sample(full, width, height, step) : new Uint8Array(await sharp(full, { raw: { width, height, channels: 4 } }).resize(bw, bh).raw().toBuffer());
    const png = await sharp(baseRaw, { raw: { width: bw, height: bh, channels: 4 } }).png().toBuffer();
    builder.json.images[i] = { ...img, bufferView: builder.view(png), mimeType: 'image/png' }; delete builder.json.images[i].uri;
    const texture = { importance:importance.importance, roles:importance.roles, previewError:quality.error, image: i, width, height, baseWidth: bw, baseHeight: bh, raw: baseRaw, levels: Math.log2(step) + 1, codec: 'lattice' };
    textures.push(texture);
    const lattice = []; let level = 0, previous = baseRaw, pw = bw, ph = bh;
    if (canLattice) for (let scale = step / 2; scale >= 1; scale /= 2) {
      const w = width / scale, h = height / scale, raw = sample(full, width, height, scale);
      for (const axis of ['x', 'y']) {
        const missing = new Uint8Array(pw * ph * 4);
        for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
          const a = ((axis === 'x' ? y * 2 : y * 2 + 1) * w + (axis === 'x' ? x * 2 + 1 : x)) * 4;
          missing.set(raw.subarray(a, a + 4), (y * pw + x) * 4);
        }
        const filtered = await filteredRows(missing, pw, ph);
        const merged = mergeAxis(previous, pw, ph, unfilterRows(filtered, pw, ph), axis);
        const tw = axis === 'x' ? pw * 2 : pw, th = axis === 'y' ? ph * 2 : ph;
        if (axis === 'y' && hash(merged) !== hash(raw)) throw new Error('Lattice round trip failed');
        level++;
        lattice.push({ level, packet: packet(TYPES.texture, packPayload({ codec: 'lattice', axis, image: i, width: tw, height: th, level, final: scale === 1 && axis === 'y', filteredLength: filtered.length }, [filtered])) });
        previous = merged; pw = tw; ph = th;
      }
    }
    texture.levels = lattice.length + 1;
    let tileEncoding;
    if(canLattice&&settings.textureTiles&&step>1){tileEncoding=await encodeTiles(full,width,height,step,i,settings.tileSize);texture.codec='tile-lattice';texture.tileSize=tileEncoding.tileSize;texture.tileCount=tileEncoding.tileCount;}
    const progressive=tileEncoding?.packets??lattice;
    const originalPacket = { codec:isBasis?'ktx2':'source', level: 1, packet: packet(TYPES.texture, packPayload({ codec: isBasis ? 'ktx2' : 'source', image: i, width, height, level: 1, final: true, mimeType: img.mimeType, byteLength: bytes.length }, [bytes])) };
    let mipPackets;
    if(isBasis){const split=splitMips(bytes);if(split){mipPackets=[];for(let mip=split.levels.length-1;mip>=0;mip--){const first=mip===split.levels.length-1,level=split.levels.length-mip,encoded=split.levels[mip].levelData;mipPackets.push({level,packet:packet(TYPES.texture,packPayload({codec:'ktx2-mip',image:i,mip,level,width:Math.max(1,width>>mip),height:Math.max(1,height>>mip),final:mip===0,templateLength:first?split.template.length:0,byteLength:encoded.length},[...(first?[split.template]:[]),encoded]),{flags:mip===0?1:0})});}}}
    textureCandidates.push({ lattice: canLattice ? progressive : null, source: [originalPacket], selected: mipPackets??(canLattice ? progressive : [originalPacket]), texture });
    if (!canLattice) { texture.codec = mipPackets?'ktx2-mip':isBasis?'ktx2':'source'; texture.levels = mipPackets?mipPackets.length+1:2; }
    verification.textures.push({ image: i, width, height, hash: hash(full) });
    console.log(`  texture ${i + 1}/${json.images.length}: ${width}×${height}, lattice ${canLattice ? (lattice.reduce((n, p) => n + p.packet.length, 0) / 1e6).toFixed(2) : 'n/a'} MB, original ${(originalPacket.packet.length / 1e6).toFixed(2)} MB`);
  }
  const stageCount=Math.max(1,...primitives.map(p=>p.stages.length));
  const manifest = { version: VERSION, features:['primitive-modes','final-order'], conversionSettings: settings, name: path.basename(input, '.glb'), levels: stageCount, sourceBytes, sourceSHA256: hash(source), animations: (json.animations || []).length, extensionStrategies: [...adapted.map(name => ({ name, strategy: "decoded before progressive encoding" })), ...adapters.map(({name,strategy}) => ({name,strategy}))], primitives: primitives.map(p => ({ mesh: p.mesh, primitive: p.primitive, indexWidth: p.indexWidth, originalMode: p.originalMode, instances:p.instances, finalVertices: p.count, finalTriangles: p.stages.at(-1).active, baseVertices: p.stages[0].count, baseTriangles: p.stages[0].active, levels:p.stages.length, quality:p.quality, bounds:{min:json.accessors[json.meshes[p.mesh].primitives[p.primitive].attributes.POSITION].min,max:json.accessors[json.meshes[p.mesh].primitives[p.primitive].attributes.POSITION].max}, attributes: p.attributes.map(a => ({ semantic: a.semantic, morph: a.morph, componentType: a.definition.componentType, itemSize: WIDTHS[a.definition.type], normalized: a.definition.normalized || false })) })), textures: textures.map(({ raw, ...t }) => t), maxOverhead: 0.05, textureMode: 'budgeted lossless sample lattice; exact source image fallback', geometryMode: 'adaptive attribute-aware stages; lossless blocks and triangle patches', animationMode: 'complete original clips in bootstrap' };
  const base = builder.finish();
  const extensionPackets=[];
  for(let level=0;level<stageCount;level++)for(const adapter of adapters){
    const payload=await adapter.refine?.({level,levels:stageCount,primitives,json,bin});
    if(payload)extensionPackets.push({level,packet:packet(TYPES.extension,packPayload({extension:adapter.name,level,data:payload.meta??{}},payload.arrays??[]))});
  }
  if(extensionPackets.length)manifest.features.push('extension-packets');
  manifest.bootstrapExtensionPackets=extensionPackets.filter(p=>p.level===0).length;
  const geometryPackets = [],geometryCodecStats=[];
  for(let level=1;level<stageCount;level++)for(let id=0;id<primitives.length;id++){
    const p=primitives[id],s=p.stages[level];if(!s)continue;const final=level===p.stages.length-1;
    const meta={level,primitives:[{id,start:s.start,count:s.count,removed:s.removed.length,added:s.added.length,triangles:s.active,order:final?s.order.length:0}]};
    const arrays=s.arrays.map((array,i)=>({array,stride:WIDTHS[p.attributes[i].definition.type]*array.BYTES_PER_ELEMENT}));
    arrays.push({array:s.removed,index:true},{array:s.added,index:true});if(final)arrays.push({array:s.order,index:true});
    const encoded=await encodeGeometry(meta,arrays,{mode:settings.geometryCodec});geometryCodecStats.push({primitive:id,level,...encoded.stats});
    geometryPackets.push(packet(TYPES.geometry,encoded.payload,{level,resource:id,flags:final?1:0}));
  }
  const basePacket = packet(TYPES.base, packPayload({ glbLength: base.length, textures: textures.map(t => ({ image: t.image, width: t.baseWidth, height: t.baseHeight })) }, [base, ...textures.map(t => t.raw)]));
  const endPacket = packet(TYPES.end, Buffer.from(JSON.stringify({ complete: true })));
  const sum = packets => packets.reduce((n, p) => n + p.packet.length, 0);
  const refreshManifest = () => { manifest.textures = textures.map(({ raw, ...t }) => t); return packet(TYPES.manifest, Buffer.from(JSON.stringify(manifest))); };
  const projectedSize = () => HEADER_BYTES + refreshManifest().length + basePacket.length + endPacket.length + sum(extensionPackets) + geometryPackets.reduce((n, p) => n + p.length, 0) + textureCandidates.reduce((n, c) => n + sum(c.selected), 0);
  // Spend at most 5% overhead. Preserve genuinely reusable texture refinement where
  // it fits, and use original compressed images for the most expensive outliers.
  const cap = Math.floor(sourceBytes * 1.05);
  for (const candidate of [...textureCandidates].sort((a, b) => (sum(b.selected) - sum(b.source)) - (sum(a.selected) - sum(a.source)))) {
    if (projectedSize() <= cap) break;
    if (sum(candidate.source) < sum(candidate.selected)) { candidate.selected = candidate.source; candidate.texture.codec = candidate.source[0].codec || 'source'; candidate.texture.levels = 2; }
  }
  if (projectedSize() > cap) throw new Error(`Size budget cannot be met: ${projectedSize()} > ${cap} bytes. Refusing to write an oversized stream.`);
  const chunks = [refreshManifest(),basePacket];
  for(const item of extensionPackets)if(item.level===0)chunks.push({...item.packet,level:0});
  const bootstrapPacketCount=chunks.length;
  const orderedTextures=[...textureCandidates].sort((a,b)=>b.texture.importance-a.texture.importance);
  if(stageCount===1)for(const candidate of orderedTextures)for(const t of candidate.selected)chunks.push({...t.packet,level:1,resource:candidate.texture.image,tile:t.tile??NO_RESOURCE});
  for(let level=1;level<stageCount;level++){
    chunks.push(...geometryPackets.filter(p=>p.level===level));
    for(const item of extensionPackets)if(item.level===level)chunks.push({...item.packet,level});
    for(const candidate of orderedTextures)for(const t of candidate.selected)if(Math.min(stageCount-1,Math.ceil(t.level*(stageCount-1)/Math.max(1,candidate.texture.levels-1)))===level)chunks.push({...t.packet,level,resource:candidate.texture.image,tile:t.tile??NO_RESOURCE});
  }
  chunks.push(endPacket);
  const previous=new Map();
  chunks.forEach((p,id)=>{if(id<2)return;const key=`${p.type}/${p.resource??NO_RESOURCE}/${p.tile??NO_RESOURCE}`;p.dependency=previous.get(key)??1;previous.set(key,id);});
  const out=encodeContainer(chunks);if(out.length>cap)throw new Error(`Internal budget error ${out.length}>${cap}`);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,out);
  const bootstrapBytes=HEADER_BYTES+chunks.length*40+chunks.slice(0,bootstrapPacketCount).reduce((n,p)=>n+p.data.length,0);
  const stats = { ...manifest, streamBytes: out.length, bootstrapBytes, baseGLBBytes: base.length, geometryPatchBytes: geometryPackets.reduce((n, c) => n + c.length, 0), texturePayloadBytes: textureCandidates.reduce((n, c) => n + sum(c.selected), 0), latticeTextures: textures.filter(t => ['lattice','tile-lattice','ktx2-mip'].includes(t.codec)).length, sourceTextures: textures.filter(t => t.codec === 'source' || t.codec === 'ktx2').length, overheadPercent: (out.length / sourceBytes - 1) * 100, sizeBudgetBytes: cap, packets: chunks.length, directoryBytes:chunks.length*40, geometryCodecStats, verification };
  await fs.writeFile(output.replace(/\.pax$/, '.stats.json'), JSON.stringify(stats, null, 2));
  console.log(`${manifest.name}: ${(source.length / 1e6).toFixed(2)} MB GLB → ${(out.length / 1e6).toFixed(2)} MB PAX; bootstrap ${(bootstrapBytes / 1e3).toFixed(1)} KB`); return stats;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'texture-base-size': { type: 'string' }, 'geometry-base-ratio': { type: 'string' }, 'initial-quality':{type:'string'}, 'geometry-codec':{type:'string'}, 'tile-size':{type:'string'}, 'no-adaptive':{type:'boolean'}, 'no-texture-tiles':{type:'boolean'} } });
  if (positionals.length !== 2) throw new Error('Usage: npm run convert -- input.glb output.pax [--texture-base-size 128] [--geometry-base-ratio 0.015]');
  await convert(positionals[0], positionals[1], {
    ...(values['initial-quality']&&{initialQuality:values['initial-quality']}),...(values['geometry-codec']&&{geometryCodec:values['geometry-codec']}),...(values['tile-size']&&{tileSize:Number(values['tile-size'])}),adaptive:!values['no-adaptive'],textureTiles:!values['no-texture-tiles'],
    ...(values['texture-base-size'] !== undefined && { textureBaseSize: Number(values['texture-base-size']) }),
    ...(values['geometry-base-ratio'] !== undefined && { geometryBaseRatio: Number(values['geometry-base-ratio']) }),
  });
}
