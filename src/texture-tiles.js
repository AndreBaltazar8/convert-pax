import {mergeAxis,unfilterRows} from './textures.js';
export function expandPixels(pixels,width,height,outWidth,outHeight){const out=new Uint8Array(outWidth*outHeight*4);for(let y=0;y<outHeight;y++)for(let x=0;x<outWidth;x++){const a=(Math.floor(y*height/outHeight)*width+Math.floor(x*width/outWidth))*4;out.set(pixels.subarray(a,a+4),(y*outWidth+x)*4);}return out;}
export function refineTile(state,meta,filtered){
 const {tile,x,y,tileWidth,tileHeight,width,height,axis}=meta;
 if(!Number.isInteger(tile)||x<0||y<0||x+tileWidth>state.fullWidth||y+tileHeight>state.fullHeight||!['x','y'].includes(axis))throw new Error('Invalid tile bounds');
 let local=state.tiles.get(tile);
 if(!local){const stepX=state.fullWidth/state.baseWidth,stepY=state.fullHeight/state.baseHeight,w=tileWidth/stepX,h=tileHeight/stepY;if(!Number.isInteger(w)||!Number.isInteger(h))throw new Error('Invalid tile grid');const pixels=new Uint8Array(w*h*4);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=((y/stepY+j)*state.baseWidth+x/stepX+i)*4;pixels.set(state.basePixels.subarray(a,a+4),(j*w+i)*4);}local={width:w,height:h,pixels,level:0};state.tiles.set(tile,local);}
 if(meta.level!==local.level+1||width!==local.width*(axis==='x'?2:1)||height!==local.height*(axis==='y'?2:1))throw new Error('Out-of-order tile');
 local.pixels=mergeAxis(local.pixels,local.width,local.height,unfilterRows(filtered,local.width,local.height),axis);Object.assign(local,{width,height,level:meta.level});
 return expandPixels(local.pixels,width,height,tileWidth,tileHeight);
}
