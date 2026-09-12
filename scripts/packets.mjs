import {gzipSync} from 'node:zlib';
import {crc32,ENTRY_BYTES} from '../src/format.js';
export function packet(type,raw,info={}){const gzip=gzipSync(raw,{level:9}),compressed=gzip.length<raw.length,data=compressed?gzip:Buffer.from(raw);return {...info,type,data,compression:compressed?1:0,rawLength:raw.length,checksum:crc32(raw),length:ENTRY_BYTES+data.length};}
