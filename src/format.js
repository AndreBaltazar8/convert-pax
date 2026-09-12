// PAX container. Version is an explicit little-endian uint32, independent of magic.
export const VERSION=0, HEADER_BYTES=32, ENTRY_BYTES=40, NO_RESOURCE=0xffffffff;
export const MAGIC=new Uint8Array([80,65,88,0]);
export const TYPES = { manifest: 1, base: 2, geometry: 3, texture: 4, extension: 5, end: 255 };
export const COMPONENTS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
export const WIDTHS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
export function packPayload(meta, arrays = []) {
  const json = new TextEncoder().encode(JSON.stringify(meta));
  const offset = (4 + json.length + 3) & ~3;
  const out = new Uint8Array(offset + arrays.reduce((n, a) => n + ((a.byteLength + 3) & ~3), 0));
  new DataView(out.buffer).setUint32(0, json.length, true); out.set(json, 4);
  let cursor = offset;
  for (const a of arrays) { out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), cursor); cursor += (a.byteLength + 3) & ~3; }
  return out;
}
export function unpackPayload(bytes) {
  const n = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
  if (n > bytes.length - 4) throw new Error('Invalid packet metadata');
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + n)));
  let offset = (4 + n + 3) & ~3;
  return { meta, take(Type, count) {
    const size = count * Type.BYTES_PER_ELEMENT;
    if (!Number.isSafeInteger(size) || size < 0 || offset + size > bytes.length) throw new Error('Truncated packet array');
    const address=bytes.byteOffset+offset;
    const result = address % Type.BYTES_PER_ELEMENT === 0 ? new Type(bytes.buffer,address,count) : new Type(bytes.buffer.slice(address,address+size));
    offset += (size + 3) & ~3; return result;
  } };
}
// Byte queue avoids quadratic copying when a large packet arrives in tiny chunks.
export class ByteQueue {
  chunks = []; offset = 0; length = 0;
  push(bytes) { if (bytes.length) { this.chunks.push(bytes); this.length += bytes.length; } }
  take(n) {
    if (n > this.length) return null;
    const out = new Uint8Array(n); let p = 0;
    while (p < n) {
      const head = this.chunks[0], amount = Math.min(n - p, head.length - this.offset);
      out.set(head.subarray(this.offset, this.offset + amount), p); p += amount; this.offset += amount;
      if (this.offset === head.length) { this.chunks.shift(); this.offset = 0; }
    }
    this.length -= n; return out;
  }
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let b=0;b<8;b++)i=(i>>>1)^((i&1)?0xedb88320:0);return i>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++)crc=(crc>>>8)^crcTable[(crc^bytes[i])&255];return (crc^0xffffffff)>>>0;}
export function parseHeader(bytes){
  if(bytes.length<HEADER_BYTES)throw new Error('Truncated PAX header');
  if(!MAGIC.every((v,i)=>bytes[i]===v))throw new Error('Not a PAX versioned stream; reconvert legacy PAX1 files');
  const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),version=d.getUint32(4,true);if(version!==VERSION)throw new Error(`Unsupported PAX version ${version}`);
  const count=d.getUint32(8,true),stride=d.getUint32(12,true),fileBytes=Number(d.getBigUint64(16,true)),dataOffset=Number(d.getBigUint64(24,true));
  if(stride!==ENTRY_BYTES||count<3||count>500000||dataOffset!==HEADER_BYTES+count*ENTRY_BYTES||!Number.isSafeInteger(fileBytes)||fileBytes<dataOffset)throw new Error('Invalid PAX directory header');
  return {version,count,fileBytes,dataOffset,directoryBytes:count*ENTRY_BYTES};
}
export function parseDirectory(bytes,header){
  if(bytes.length!==header.directoryBytes)throw new Error('Truncated PAX directory');const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),entries=[];let next=header.dataOffset;
  for(let id=0;id<header.count;id++){const p=id*ENTRY_BYTES,e={id,type:d.getUint16(p,true),compression:d.getUint8(p+2),flags:d.getUint8(p+3),level:d.getUint16(p+4,true),resource:d.getUint32(p+8,true),tile:d.getUint32(p+12,true),dependency:d.getUint32(p+16,true),raw:d.getUint32(p+20,true),offset:Number(d.getBigUint64(p+24,true)),packed:d.getUint32(p+32,true),checksum:d.getUint32(p+36,true)};
    if(!Object.values(TYPES).includes(e.type)||e.compression>1||e.flags>1||d.getUint16(p+6,true)!==0||e.offset!==next||e.packed>256*1024**2||e.raw>512*1024**2||(e.dependency!==NO_RESOURCE&&e.dependency>=id)||e.offset+e.packed>header.fileBytes)throw new Error('Invalid PAX directory entry');
    if(e.compression===0&&e.packed!==e.raw)throw new Error('Invalid raw packet length');next+=e.packed;entries.push(e);
  }
  if(next!==header.fileBytes||entries[0].type!==TYPES.manifest||entries[1].type!==TYPES.base||entries.at(-1).type!==TYPES.end)throw new Error('Invalid PAX packet layout');
  return entries;
}
export function encodeContainer(packets){
  const size=HEADER_BYTES+packets.length*ENTRY_BYTES+packets.reduce((n,p)=>n+p.data.length,0),bytes=new Uint8Array(size),d=new DataView(bytes.buffer);bytes.set(MAGIC);d.setUint32(4,VERSION,true);d.setUint32(8,packets.length,true);d.setUint32(12,ENTRY_BYTES,true);d.setBigUint64(16,BigInt(size),true);let offset=HEADER_BYTES+packets.length*ENTRY_BYTES;d.setBigUint64(24,BigInt(offset),true);
  for(let id=0;id<packets.length;id++){const e=packets[id],p=HEADER_BYTES+id*ENTRY_BYTES;d.setUint16(p,e.type,true);d.setUint8(p+2,e.compression);d.setUint8(p+3,e.flags??0);d.setUint16(p+4,e.level??0,true);d.setUint32(p+8,e.resource??NO_RESOURCE,true);d.setUint32(p+12,e.tile??NO_RESOURCE,true);d.setUint32(p+16,e.dependency??NO_RESOURCE,true);d.setUint32(p+20,e.rawLength,true);d.setBigUint64(p+24,BigInt(offset),true);d.setUint32(p+32,e.data.length,true);d.setUint32(p+36,e.checksum,true);bytes.set(e.data,offset);offset+=e.data.length;}
  return bytes;
}
export async function decompressPacket(entry,bytes){
  if(bytes.length!==entry.packed)throw new Error('Packet size mismatch');
  const raw=entry.compression===0?bytes:new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if(raw.length!==entry.raw||crc32(raw)!==entry.checksum)throw new Error('Packet checksum or size mismatch');return raw;
}
export async function decodePacket(entry,bytes){
  const raw=await decompressPacket(entry,bytes);
  if(entry.type===TYPES.geometry){const {decodeGeometryPayload}=await import('./geometry-codec.js');return decodeGeometryPayload(raw);}
  return raw;
}
export async function* readPackets(stream,onBytes=()=>{},decode=decodePacket){
  const reader=stream.getReader(),q=new ByteQueue();let header,entries,index=0,done=false;
  const fill=async n=>{while(q.length<n&&!done){const item=await reader.read();done=item.done;if(item.value){q.push(item.value);onBytes(item.value.length);}}if(q.length<n)throw new Error('Truncated PAX stream');return q.take(n);};
  try{header=parseHeader(await fill(HEADER_BYTES));entries=parseDirectory(await fill(header.directoryBytes),header);for(const entry of entries){const bytes=await fill(entry.packed);yield {type:entry.type,data:await decode(entry,bytes),entry,header,entries};index++;}if(q.length)throw new Error('Trailing PAX bytes');if(!done){const item=await reader.read();if(!item.done)throw new Error('Trailing PAX bytes');}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
