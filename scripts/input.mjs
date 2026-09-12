import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGLB, makeGLB } from './gltf.mjs';

// Resolve glTF resources before conversion. Retain the original document and
// resource bytes separately so extension-owned indices never need guessing.
export async function readAsset(input) {
  const filename = input instanceof URL ? fileURLToPath(input) : path.resolve(input);
  const source = await fs.readFile(filename);
  const isGLB = source.length >= 4 && source.readUInt32LE(0) === 0x46546c67;
  const parsed = isGLB ? parseGLB(source) : { json: JSON.parse(source.toString()), bin: null };
  const original = structuredClone(parsed.json);
  if (original.asset?.version !== '2.0') throw new Error('Only glTF 2.0 is supported');
  const resources = new Map();
  const resolve = async uri => {
    if (resources.has(uri)) return resources.get(uri);
    let bytes;
    if (uri.startsWith('data:')) {
      const comma = uri.indexOf(','); if (comma < 0) throw new Error('Malformed data URI');
      bytes = /;base64$/i.test(uri.slice(0, comma)) ? Buffer.from(uri.slice(comma + 1), 'base64') : Buffer.from(decodeURIComponent(uri.slice(comma + 1)));
    } else if (/^https?:/i.test(uri)) {
      const r = await fetch(uri); if (!r.ok) throw new Error(`Resource HTTP ${r.status}: ${uri}`); bytes = Buffer.from(await r.arrayBuffer());
    } else {
      if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) throw new Error(`Unsupported resource URI scheme: ${uri}`);
      bytes = await fs.readFile(path.resolve(path.dirname(filename), decodeURIComponent(uri)));
    }
    resources.set(uri, bytes); return bytes;
  };
  const buffers = [];
  for (let i = 0; i < (original.buffers || []).length; i++) {
    const b = original.buffers[i], virtual = b.extensions?.EXT_meshopt_compression?.fallback || b.extensions?.KHR_meshopt_compression?.fallback;
    const bytes = b.uri !== undefined ? await resolve(b.uri) : virtual ? Buffer.alloc(b.byteLength) : i === 0 ? parsed.bin : null;
    if (!bytes || bytes.length < b.byteLength) throw new Error(`Missing or truncated buffer ${i}`);
    buffers.push(bytes.subarray(0, b.byteLength));
  }
  for (const image of original.images || []) if (image.uri !== undefined) await resolve(image.uri);
  const json = structuredClone(original), parts = [], offsets = []; let length = 0;
  const append = bytes => { const start = length; parts.push(bytes); length += bytes.length; const pad = (4 - length % 4) % 4; if (pad) { parts.push(Buffer.alloc(pad)); length += pad; } return start; };
  buffers.forEach(b => offsets.push(append(b)));
  for (const v of json.bufferViews || []) { v.byteOffset = (v.byteOffset || 0) + offsets[v.buffer]; v.buffer = 0; }
  json.bufferViews ||= [];
  for (const image of json.images || []) if (image.uri !== undefined) {
    const bytes = resources.get(image.uri);
    image.mimeType ||= image.uri.startsWith('data:') ? image.uri.slice(5, image.uri.indexOf(';')) : ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ktx2': 'image/ktx2' })[path.extname(image.uri).toLowerCase()];
    if (!image.mimeType) throw new Error(`Unknown image MIME type: ${image.uri}`);
    image.bufferView = json.bufferViews.length; json.bufferViews.push({ buffer: 0, byteOffset: append(bytes), byteLength: bytes.length }); delete image.uri;
  }
  const bin = Buffer.concat(parts), glb = makeGLB(json, bin);
  // The baseline for multi-file input includes each external resource once.
  const sourceBytes = source.length + [...resources].filter(([uri]) => !uri.startsWith('data:')).reduce((n, [,b]) => n+b.length, 0);
  return { source, sourceBytes, original, buffers, resources, json, bin, glb, isGLB };
}
