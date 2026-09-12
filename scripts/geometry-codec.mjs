import {gzipSync} from 'node:zlib';import {MeshoptEncoder} from 'meshoptimizer';import {packPayload} from '../src/format.js';
export async function encodeGeometry(meta,arrays,{mode='auto'}={}){
 await MeshoptEncoder.ready;const blocks=[],encoded=[],totals={raw:0,selected:0,codecs:{}};
 for(const {array,stride=4,index=false}of arrays){const raw=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),choices=[{codec:'raw',data:raw}],delta=raw.slice();for(let i=raw.length-1;i>=stride;i--)delta[i]=(raw[i]-raw[i-stride])&255;
 if(raw.length&&mode!=='gzip'){choices.push({codec:'delta',data:delta});if(stride%4===0&&stride<=256&&raw.length%stride===0)choices.push({codec:'meshopt',data:MeshoptEncoder.encodeVertexBuffer(raw,raw.length/stride,stride)});if(index&&raw.length%4===0)choices.push({codec:'sequence',data:MeshoptEncoder.encodeIndexSequence(raw,raw.length/4,4)});}
 for(const c of choices)c.cost=Math.min(c.data.length,gzipSync(c.data,{level:6}).length);choices.sort((a,b)=>a.cost-b.cost);const choice=choices[0];blocks.push({codec:choice.codec,raw:raw.length,bytes:choice.data.length,stride});encoded.push(choice.data);totals.raw+=choices.find(c=>c.codec==='raw').cost;totals.selected+=choice.cost;totals.codecs[choice.codec]=(totals.codecs[choice.codec]||0)+1;
 }
 const optimized=packPayload({...meta,blocks},encoded),plain=packPayload(meta,arrays.map(a=>a.array));
 if(gzipSync(plain,{level:9}).length<=gzipSync(optimized,{level:9}).length)return {payload:plain,stats:{...totals,packetCodec:'gzip'}};
 return {payload:optimized,stats:{...totals,packetCodec:'blocks'}};
}
