import { COMPONENTS, WIDTHS } from '../src/format.js';
export function parseGLB(bytes) {
  if (bytes.length < 20) throw new Error('Truncated GLB');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length) throw new Error('Invalid GLB');
  let json, bin = new Uint8Array();
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error('Truncated GLB chunk');
    const n = view.getUint32(offset, true), type = view.getUint32(offset + 4, true); offset += 8;
    if (n % 4 || offset + n > bytes.length) throw new Error('Invalid GLB chunk length');
    if (type === 0x4e4f534a) { if (json) throw new Error('Duplicate GLB JSON'); json = JSON.parse(new TextDecoder().decode(bytes.subarray(offset, offset + n))); }
    if (type === 0x004e4942) bin = bytes.subarray(offset, offset + n);
    offset += n;
  }
  if (!json) throw new Error('Missing GLB JSON'); return { json, bin };
}
export function makeGLB(json, bin) {
  if(bin.length){json.buffers=[{...json.buffers?.[0],byteLength:bin.length}];delete json.buffers[0].uri;}
  else delete json.buffers;
  for(const key of ['accessors','bufferViews','meshes','materials','images','textures','samplers','skins','animations','cameras','nodes','scenes','extensionsUsed','extensionsRequired'])if(Array.isArray(json[key])&&!json[key].length)delete json[key];
  const j = Buffer.from(JSON.stringify(json)), jn = (j.length + 3) & ~3, bn = (bin.length + 3) & ~3;
  const out = Buffer.alloc((bin.length?28:20) + jn + bn); out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jn, 12); out.writeUInt32LE(0x4e4f534a, 16); out.fill(32, 20, 20 + jn); j.copy(out, 20);
  if(bin.length){out.writeUInt32LE(bn, 20 + jn); out.writeUInt32LE(0x004e4942, 24 + jn); Buffer.from(bin).copy(out, 28 + jn);}return out;
}
export function accessor(json, bin, id) {
  const a = json.accessors?.[id], Type = COMPONENTS[a?.componentType], width = WIDTHS[a?.type];
  if (!Type || !width) throw new Error('Unknown accessor');
  const size = Type.BYTES_PER_ELEMENT, dimension = a.type.startsWith('MAT') ? Number(a.type.slice(3)) : 0;
  const column = dimension ? Math.ceil(dimension * size / 4) * 4 : 0;
  const elementSize = dimension ? dimension * column : width * size;
  const result = new Type(a.count * width);
  const read = (viewID, byteOffset, count, stride, destination, indices) => {
    const v = json.bufferViews?.[viewID]; if (!v) throw new Error('Missing accessor bufferView');
    const start = (v.byteOffset || 0) + byteOffset, step = stride || elementSize;
    const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const method = { 5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32' }[a.componentType];
    for (let i = 0; i < count; i++) for (let j = 0; j < width; j++) {
      const relative = byteOffset + i * step + (dimension ? Math.floor(j / dimension) * column + j % dimension * size : j * size);
      if (relative + size > v.byteLength || start + i * step + elementSize > bin.byteLength) throw new Error('Accessor exceeds bufferView');
      destination[(indices ? indices[i] : i) * width + j] = view[method]((v.byteOffset || 0) + relative, true);
    }
  };
  if (a.bufferView !== undefined) read(a.bufferView, a.byteOffset || 0, a.count, json.bufferViews[a.bufferView].byteStride, result);
  if (a.sparse) {
    const sp = a.sparse, IndexType = COMPONENTS[sp.indices.componentType];
    if (![5121,5123,5125].includes(sp.indices.componentType) || sp.count > a.count) throw new Error('Invalid sparse indices');
    const v = json.bufferViews[sp.indices.bufferView], offset = sp.indices.byteOffset || 0;
    if (!v || offset + sp.count * IndexType.BYTES_PER_ELEMENT > v.byteLength) throw new Error('Truncated sparse indices');
    const ids = new IndexType(Uint8Array.from(bin.subarray((v.byteOffset || 0) + offset, (v.byteOffset || 0) + offset + sp.count * IndexType.BYTES_PER_ELEMENT)).buffer);
    for (let i = 0; i < ids.length; i++) if (ids[i] >= a.count || (i && ids[i] <= ids[i-1])) throw new Error('Invalid sparse index ordering');
    read(sp.values.bufferView, sp.values.byteOffset || 0, sp.count, elementSize, result, ids);
  }
  return result;
}
export class Builder {
  constructor(source) { this.json = structuredClone(source); this.json.bufferViews = []; this.json.accessors = []; this.parts = []; this.length = 0; }
  view(bytes) {
    const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), id = this.json.bufferViews.length;
    this.json.bufferViews.push({ buffer: 0, byteOffset: this.length, byteLength: data.length });
    this.parts.push(data); this.length += data.length;
    const pad = (4 - this.length % 4) % 4; if (pad) { this.parts.push(Buffer.alloc(pad)); this.length += pad; } return id;
  }
  attribute(bytes, original) {
    let encoded = bytes;
    const d = original.type.startsWith('MAT') ? Number(original.type.slice(3)) : 0, size = bytes.BYTES_PER_ELEMENT;
    if (d && d * size % 4) {
      const column = Math.ceil(d * size / 4) * 4, count = bytes.length / (d*d);
      encoded = new Uint8Array(count * d * column);
      const raw = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let i=0;i<count;i++) for(let c=0;c<d;c++) encoded.set(raw.subarray((i*d*d+c*d)*size,(i*d*d+c*d+d)*size), i*d*column+c*column);
    }
    const a = { ...original, bufferView: this.view(encoded), byteOffset: 0, count: bytes.length / WIDTHS[original.type] }; delete a.sparse;
    // Keep full bounds for consistent camera framing across both paths.
    this.json.accessors.push(a); return this.json.accessors.length - 1;
  }
  finish() { return makeGLB(this.json, Buffer.concat(this.parts)); }
}
