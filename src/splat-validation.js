export const SPLAT_EXTENSION='KHR_gaussian_splatting';
export function validateSplatPrimitive(p,json){
  const e=p.extensions?.[SPLAT_EXTENSION];if(!e)return;
  if(p.mode!==0||e.kernel!=='ellipse'||!['srgb_rec709_display','lin_rec709_display'].includes(e.colorSpace)||(e.projection??'perspective')!=='perspective'||(e.sortingMethod??'cameraDistance')!=='cameraDistance')throw new Error('Unsupported Gaussian splat kernel, projection, color space or sorting method');
  const count=json.accessors[p.attributes.POSITION]?.count;
  const requireAttr=(name,width)=>{const a=json.accessors[p.attributes[name]];if(!a||a.count!==count||a.type!==width)throw new Error(`Invalid Gaussian splat attribute ${name}`);};
  requireAttr('POSITION','VEC3');for(const [name,width] of [['SCALE','VEC3'],['ROTATION','VEC4'],['OPACITY','SCALAR'],['SH_DEGREE_0_COEF_0','VEC3']])requireAttr(`${SPLAT_EXTENSION}:${name}`,width);
  let missing=false;for(let d=1;d<=3;d++){const present=Array.from({length:2*d+1},(_,i)=>p.attributes[`${SPLAT_EXTENSION}:SH_DEGREE_${d}_COEF_${i}`]!==undefined);if(present.some(Boolean)){if(missing||!present.every(Boolean))throw new Error('Incomplete Gaussian spherical harmonics bands');for(let i=0;i<present.length;i++)requireAttr(`${SPLAT_EXTENSION}:SH_DEGREE_${d}_COEF_${i}`,'VEC3');}else missing=true;}
}
