import {MeshoptDecoder} from 'meshoptimizer';
import {packPayload,unpackPayload} from './format.js';
export function undoPrediction(bytes,stride){const out=bytes.slice();for(let i=stride;i<out.length;i++)out[i]=(out[i]+out[i-stride])&255;return out;}
export async function decodeGeometryPayload(raw){
  const payload=unpackPayload(raw);if(!payload.meta.blocks)return raw;await MeshoptDecoder.ready;const arrays=[];
  for(const b of payload.meta.blocks){if(!Number.isSafeInteger(b.raw)||b.raw<0||b.raw>512*1024**2||!Number.isInteger(b.stride)||b.stride<1||b.stride>256)throw new Error('Invalid geometry block');const data=payload.take(Uint8Array,b.bytes);let decoded;
    if(b.codec==='raw')decoded=data;else if(b.codec==='delta')decoded=undoPrediction(data,b.stride);else if(b.codec==='meshopt'){if(b.raw%b.stride)throw new Error('Invalid meshopt stride');decoded=new Uint8Array(b.raw);MeshoptDecoder.decodeVertexBuffer(decoded,b.raw/b.stride,b.stride,data);}else if(b.codec==='sequence'){if(b.raw%4)throw new Error('Invalid index sequence');decoded=new Uint8Array(b.raw);MeshoptDecoder.decodeIndexSequence(decoded,b.raw/4,4,data);}else throw new Error(`Unknown geometry codec ${b.codec}`);if(decoded.length!==b.raw)throw new Error('Geometry block length mismatch');arrays.push(decoded);
  }
  const {blocks,...meta}=payload.meta;return packPayload(meta,arrays);
}
