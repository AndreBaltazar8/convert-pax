import {filteredRows} from './texture-codec.mjs';
import {packPayload,TYPES} from '../src/format.js';
import {packet} from './packets.mjs';
export async function encodeTiles(full,width,height,step,image,requestedSize){
 const size=Math.max(step,requestedSize),packets=[];let tile=0;
 for(let y=0;y<height;y+=size)for(let x=0;x<width;x+=size,tile++){
  const tileWidth=Math.min(size,width-x),tileHeight=Math.min(size,height-y);let pw=tileWidth/step,ph=tileHeight/step,level=0;
  for(let scale=step/2;scale>=1;scale/=2)for(const axis of ['x','y']){
   const missing=new Uint8Array(pw*ph*4);
   for(let j=0;j<ph;j++)for(let i=0;i<pw;i++){const sx=x+(axis==='x'?i*2+1:i)*scale,sy=y+(axis==='x'?j*2:j*2+1)*scale,a=(sy*width+sx)*4;missing.set(full.subarray(a,a+4),(j*pw+i)*4);}
   const filtered=await filteredRows(missing,pw,ph);pw*=axis==='x'?2:1;ph*=axis==='y'?2:1;level++;
   packets.push({tile,level,packet:packet(TYPES.texture,packPayload({codec:'tile-lattice',image,tile,x,y,tileWidth,tileHeight,width:pw,height:ph,axis,level,final:scale===1&&axis==='y',filteredLength:filtered.length},[filtered]),{tile,flags:scale===1&&axis==='y'?1:0})});
  }
 }
 return {packets:packets.sort((a,b)=>a.level-b.level||a.tile-b.tile),tileSize:size,tileCount:tile};
}
