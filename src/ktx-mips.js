import {read,write} from 'ktx-parse';
export function mipContainer(template,mip,bytes){
 const c=typeof template.levels==='undefined'?read(template):template;
 if(!Number.isInteger(mip)||mip<0||mip>=c.levels.length)throw new Error('Invalid KTX mip');
 return write({...c,pixelWidth:Math.max(1,c.pixelWidth>>mip),pixelHeight:Math.max(1,c.pixelHeight>>mip),levelCount:1,levels:[{...c.levels[mip],levelData:bytes}],globalData:c.globalData?{...c.globalData,imageDescs:[c.globalData.imageDescs[mip]]}:null},{keepWriter:true});
}
export function splitMips(bytes){const c=read(bytes);if(c.pixelDepth||c.layerCount>1||c.faceCount!==1||c.levels.length<2) return null;return {template:write({...c,levels:c.levels.map(l=>({...l,levelData:new Uint8Array()}))},{keepWriter:true}),levels:c.levels};}
