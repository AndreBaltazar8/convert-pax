import {MeshoptSimplifier} from 'meshoptimizer';
export function chooseGeometryStages(indices,positions,attributes,indexWidth,ratios,{adaptive=true,initialQuality='balanced',splat=false}={}){
 const tupleBytes=attributes.reduce((n,a)=>n+a.data.BYTES_PER_ELEMENT*a.data.length/(positions.length/3),0),features=attributes.filter(a=>a.morph===undefined&&/^(NORMAL|TEXCOORD_0|COLOR_0)$/.test(a.semantic));
 const widths=features.map(a=>a.definition.type==='VEC2'?2:a.definition.type==='VEC4'?4:3),stride=widths.reduce((n,v)=>n+v,0),values=new Float32Array((positions.length/3)*stride),weights=[];
 features.forEach((a,k)=>{const width=widths[k],offset=widths.slice(0,k).reduce((n,v)=>n+v,0),bits=a.data.BYTES_PER_ELEMENT*8,signed=[5120,5122].includes(a.definition.componentType),divisor=a.definition.normalized?2**(bits-(signed?1:0))-1:1;for(let i=0;i<positions.length/3;i++)for(let j=0;j<width;j++)values[i*stride+offset+j]=a.data[i*width+j]/divisor;for(let j=0;j<width;j++)weights.push(a.semantic==='NORMAL'?.2:a.semantic==='COLOR_0'?.3:.1);});
 const prefix=splat?Uint32Array.from(Array.from(indices).sort((a,b)=>reverseBits(a)-reverseBits(b))):indices;
 const effectiveRatios=ratios.filter(r=>initialQuality!=='sharp'||r>=.04);if(initialQuality==='sharp'&&!effectiveRatios.length)effectiveRatios.push(1);
 const candidates=effectiveRatios.map(r=>{if(r===1)return {indices,error:0,ratio:1};const target=Math.min(indices.length,Math.max(indexWidth*12,Math.floor(indices.length*r/indexWidth)*indexWidth));const [selected,error]=indexWidth===3?(stride?MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,values,stride,weights,null,target,1,[]):MeshoptSimplifier.simplify(indices,positions,3,target,1,[])):[prefix.slice(0,target),1-r];return {indices:selected,error,ratio:r};});
 const kept=[candidates[0]];
 for(let i=1;i<candidates.length-1;i++){const c=candidates[i],last=kept.at(-1);if(c.indices.length===last.indices.length)continue;const growth=c.indices.length/Math.max(1,last.indices.length),gain=(last.error-c.error)/Math.max(1e-12,last.error),byteEstimate=c.indices.length*4+new Set(c.indices).size*tupleBytes;
  c.estimatedBytes=byteEstimate;c.errorGain=gain;
  // Zero-error surfaces need no intermediate geometry. Other stages must reduce
  // geometric/attribute error meaningfully and avoid near-identical redraws.
  if(!adaptive||(growth>=1.6&&gain>=.18&&gain/Math.max(1,byteEstimate)>=.05/Math.max(1,indices.length*4+positions.length/3*tupleBytes)&&c.indices.length<indices.length*.9))kept.push(c);
 }
 if(candidates.length>1)kept.push(candidates.at(-1));
 return kept;
}
function reverseBits(n){n=((n>>>1)&0x55555555)|((n&0x55555555)<<1);n=((n>>>2)&0x33333333)|((n&0x33333333)<<2);n=((n>>>4)&0x0f0f0f0f)|((n&0x0f0f0f0f)<<4);n=((n>>>8)&0x00ff00ff)|((n&0x00ff00ff)<<8);return ((n>>>16)|(n<<16))>>>0;}
export function textureImportance(json,image){let importance=1,roles=[];const sources=(json.textures||[]).map(t=>t.source??t.extensions?.KHR_texture_basisu?.source);const visit=(v,key='')=>{if(!v||typeof v!=='object')return;if(Number.isInteger(v.index)&&sources[v.index]===image){roles.push(key);if(/baseColor|emissive|diffuseTransmissionColor/i.test(key))importance=Math.max(importance,3);if(/normal/i.test(key))importance=Math.max(importance,1.5);}for(const [k,value]of Object.entries(v))visit(value,k);};for(const material of json.materials||[])visit(material);return {importance,roles:[...new Set(roles)]};}
export function chooseTextureStep(raw,width,height,maxSize,importance,quality){
 let step=1;while(Math.max(width/step,height/step)>maxSize&&width%(step*2)===0&&height%(step*2)===0)step*=2;
 if(quality==='sharp')return {step,error:sampleError(raw,width,height,step)};
 let candidate=step,error=sampleError(raw,width,height,step),threshold=(quality==='fast'?.18:.025)/Math.sqrt(importance);
 while(Math.max(width/(candidate*2),height/(candidate*2))>=16&&width%(candidate*2)===0&&height%(candidate*2)===0){const next=sampleError(raw,width,height,candidate*2);if(next>threshold)break;candidate*=2;error=next;}
 return {step:candidate,error};
}
function sampleError(raw,width,height,step){let error=0,count=0,seed=0x12345678;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<4096;i++){const x=Math.floor(rand()*width),y=Math.floor(rand()*height),a=(y*width+x)*4,b=(Math.floor(y/step)*step*width+Math.floor(x/step)*step)*4;for(let c=0;c<4;c++){error+=Math.abs(raw[a+c]-raw[b+c]);count++;}}return error/(count*255);}
