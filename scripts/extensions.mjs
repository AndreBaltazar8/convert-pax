import { validateInteractivity } from '../src/interactivity-validation.js';
import { validateSplatPrimitive } from '../src/splat-validation.js';
import { pointerDescription } from '../src/pointer-description.js';
import draco from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';
import { COMPONENTS, WIDTHS } from '../src/format.js';

// These adapters know that their payloads refer only to stable node/material/
// texture indices, or explicitly remap accessor references below. Unknown
// extensions must register an adapter; guessing their references is unsafe.
export const MATERIAL_EXTENSIONS = [
  'KHR_materials_diffuse_transmission', 'KHR_materials_unlit', 'KHR_materials_clearcoat', 'KHR_materials_sheen',
  'KHR_materials_transmission', 'KHR_materials_volume', 'KHR_materials_ior',
  'KHR_materials_specular', 'KHR_materials_iridescence', 'KHR_materials_anisotropy',
  'KHR_materials_emissive_strength', 'KHR_materials_dispersion', 'EXT_materials_bump',
];
export const progressiveAdapters = new Map([
  ['KHR_interactivity',{name:'KHR_interactivity',strategy:'validated execution graph in bootstrap; persistent state bound to refining objects',prepare({json}){validateInteractivity(json);}}],
  ['KHR_gaussian_splatting',{name:'KHR_gaussian_splatting',strategy:'spatially distributed reusable splat prefixes; exact covariance, opacity and SH attribute refinement',prepare({json}){for(const m of json.meshes||[])for(const p of m.primitives)validateSplatPrimitive(p,json);}}],
  ...MATERIAL_EXTENSIONS.map(name => [name, { name, strategy: 'material with refining texture slots' }]),
  ...['KHR_texture_transform', 'KHR_lights_punctual', 'KHR_materials_variants', 'KHR_xmp_json_ld', 'KHR_node_visibility', 'KHR_node_selectability', 'KHR_node_hoverability'].map(name => [name, { name, strategy: 'stable scene and material references' }]),
  ['KHR_animation_pointer', {name:'KHR_animation_pointer',strategy:'bootstrap animation tracks bound to live refining objects and materials', prepare({json}) {
    for(const animation of json.animations || []) for(const channel of animation.channels) { const pointer=channel.target.extensions?.KHR_animation_pointer?.pointer; if(pointer)pointerDescription(pointer); }
  }}],
  ['KHR_texture_basisu', { name: 'KHR_texture_basisu', strategy: 'RGBA bootstrap preview; original GPU mip levels streamed with a shared codebook, exact source fallback', prepare({json}) {
    for (const t of json.textures || []) if (t.extensions?.KHR_texture_basisu) { t.source=t.extensions.KHR_texture_basisu.source; delete t.extensions.KHR_texture_basisu; }
    for(const key of ['extensionsUsed','extensionsRequired']) if(json[key]) json[key]=json[key].filter(x=>x!=='KHR_texture_basisu');
  } }],
  ['KHR_mesh_quantization', { name: 'KHR_mesh_quantization', strategy: 'preserve integer attributes; floating-point simplification positions' }],
  ['EXT_mesh_gpu_instancing', { name: 'EXT_mesh_gpu_instancing', strategy: 'instance transforms in bootstrap; shared geometry refinements', remap({ json, copyAccessor }) {
    for (const node of json.nodes || []) for (const [name, id] of Object.entries(node.extensions?.EXT_mesh_gpu_instancing?.attributes || {})) node.extensions.EXT_mesh_gpu_instancing.attributes[name] = copyAccessor(id);
  } }],
  ...['EXT_texture_webp', 'EXT_texture_avif'].map(name => [name, { name, strategy: 'decode RGBA and refine; source-image fallback', prepare({ json }) {
    for (const t of json.textures || []) if (t.extensions?.[name]) { t.source = t.extensions[name].source; delete t.extensions[name]; }
    for (const key of ['extensionsUsed','extensionsRequired']) if (json[key]) json[key] = json[key].filter(x => x !== name);
  } }]),
]);
export function registerProgressiveExtension(name, adapter) {
  if (!name || !adapter?.strategy) throw new Error('Extension adapter needs a name and strategy');
  progressiveAdapters.set(name, { ...adapter, name });
}
export async function decodeGeometryCompression(asset) {
  const { json } = asset; let bin = asset.bin; const applied = [];
  const append = bytes => {
    const pad = (4 - bin.length % 4) % 4, start = bin.length + pad;
    bin = Buffer.concat([bin, Buffer.alloc(pad), Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)]);
    const id = (json.bufferViews ||= []).length; json.bufferViews.push({ buffer: 0, byteOffset: start, byteLength: bytes.byteLength }); return id;
  };
  for (const name of ['EXT_meshopt_compression','KHR_meshopt_compression']) {
    if (!(json.extensionsUsed || []).includes(name)) continue;
    await MeshoptDecoder.ready;
    for (const view of json.bufferViews || []) {
      const ext = view.extensions?.[name]; if (!ext) continue;
      const source = asset.buffers[ext.buffer]?.subarray(ext.byteOffset || 0, (ext.byteOffset || 0) + ext.byteLength);
      if (!source || source.length !== ext.byteLength) throw new Error('Truncated meshopt payload');
      const decoded = await MeshoptDecoder.decodeGltfBufferAsync(ext.count, ext.byteStride, source, ext.mode, ext.filter);
      const id = append(decoded); Object.assign(view, json.bufferViews[id]); delete view.extensions[name];
    }
    applied.push(name);
  }
  if ((json.extensionsUsed || []).includes('KHR_draco_mesh_compression')) {
    const module = await draco.createDecoderModule();
    for (const mesh of json.meshes || []) for (const primitive of mesh.primitives) {
      const ext = primitive.extensions?.KHR_draco_mesh_compression; if (!ext) continue;
      const v = json.bufferViews[ext.bufferView], payload = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
      const decoder = new module.Decoder(), buffer = new module.DecoderBuffer(); buffer.Init(new Int8Array(payload), payload.length);
      const isMesh = decoder.GetEncodedGeometryType(buffer) === module.TRIANGULAR_MESH;
      const geometry = isMesh ? new module.Mesh() : new module.PointCloud();
      try {
        const status = isMesh ? decoder.DecodeBufferToMesh(buffer, geometry) : decoder.DecodeBufferToPointCloud(buffer, geometry);
        if (!status.ok()) throw new Error(`Draco decode: ${status.error_msg()}`);
        for (const [semantic, uniqueID] of Object.entries(ext.attributes)) {
          const definition = json.accessors[primitive.attributes[semantic]], Type = COMPONENTS[definition.componentType];
          const attribute = decoder.GetAttributeByUniqueId(geometry, uniqueID), count = geometry.num_points() * WIDTHS[definition.type];
          const int = definition.componentType !== 5126, values = int ? new module.DracoInt32Array() : new module.DracoFloat32Array();
          try {
            const ok = int ? decoder.GetAttributeInt32ForAllPoints(geometry, attribute, values) : decoder.GetAttributeFloatForAllPoints(geometry, attribute, values);
            if (!ok || values.size() !== count) throw new Error('Invalid Draco attribute');
            const array = Type.from({ length: count }, (_,i) => values.GetValue(i));
            Object.assign(definition, { bufferView: append(array), byteOffset: 0, count: geometry.num_points() }); delete definition.sparse;
          } finally { module.destroy(values); }
        }
        if (isMesh) {
          const values = new module.DracoInt32Array(), indices = new Uint32Array(geometry.num_faces()*3);
          try { for(let i=0;i<geometry.num_faces();i++) { decoder.GetFaceFromMesh(geometry,i,values); for(let j=0;j<3;j++) indices[i*3+j]=values.GetValue(j); } } finally { module.destroy(values); }
          if (primitive.indices === undefined) { primitive.indices=json.accessors.length; json.accessors.push({}); }
          Object.assign(json.accessors[primitive.indices], { bufferView: append(indices), byteOffset: 0, componentType: 5125, type: 'SCALAR', count: indices.length });
        }
        delete primitive.extensions.KHR_draco_mesh_compression;
      } finally { module.destroy(geometry); module.destroy(buffer); module.destroy(decoder); }
    }
    applied.push('KHR_draco_mesh_compression');
  }
  for (const key of ['extensionsUsed','extensionsRequired']) if (json[key]) json[key] = json[key].filter(name => !applied.includes(name));
  for(const buffer of json.buffers || [])for(const name of applied)if(buffer.extensions)delete buffer.extensions[name];
  asset.bin = bin; return applied;
}
