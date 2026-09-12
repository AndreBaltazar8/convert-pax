export const materialFields = {
  'pbrMetallicRoughness/baseColorFactor': 'colorAlpha',
  'pbrMetallicRoughness/metallicFactor': 'metalness', 'pbrMetallicRoughness/roughnessFactor': 'roughness',
  emissiveFactor:'emissive', alphaCutoff:'alphaTest', 'normalTexture/scale':'normalScale', 'occlusionTexture/strength':'aoMapIntensity',
  'extensions/KHR_materials_clearcoat/clearcoatFactor':'clearcoat', 'extensions/KHR_materials_clearcoat/clearcoatRoughnessFactor':'clearcoatRoughness',
  'extensions/KHR_materials_clearcoat/clearcoatNormalTexture/scale':'clearcoatNormalScale',
  'extensions/KHR_materials_transmission/transmissionFactor':'transmission',
  'extensions/KHR_materials_diffuse_transmission/diffuseTransmissionFactor':'diffuseTransmission', 'extensions/KHR_materials_diffuse_transmission/diffuseTransmissionColorFactor':'diffuseTransmissionColor',
  'extensions/KHR_materials_volume/thicknessFactor':'thickness', 'extensions/KHR_materials_volume/attenuationDistance':'attenuationDistance', 'extensions/KHR_materials_volume/attenuationColor':'attenuationColor',
  'extensions/KHR_materials_ior/ior':'ior',
  'extensions/KHR_materials_specular/specularFactor':'specularIntensity', 'extensions/KHR_materials_specular/specularColorFactor':'specularColor',
  'extensions/KHR_materials_sheen/sheenColorFactor':'sheenColor', 'extensions/KHR_materials_sheen/sheenRoughnessFactor':'sheenRoughness',
  'extensions/KHR_materials_iridescence/iridescenceFactor':'iridescence', 'extensions/KHR_materials_iridescence/iridescenceIor':'iridescenceIOR',
  'extensions/KHR_materials_iridescence/iridescenceThicknessMinimum':'iridescenceThicknessMinimum', 'extensions/KHR_materials_iridescence/iridescenceThicknessMaximum':'iridescenceThicknessMaximum',
  'extensions/KHR_materials_anisotropy/anisotropyStrength':'anisotropy', 'extensions/KHR_materials_anisotropy/anisotropyRotation':'anisotropyRotation',
  'extensions/KHR_materials_emissive_strength/emissiveStrength':'emissiveIntensity', 'extensions/KHR_materials_dispersion/dispersion':'dispersion',
};
export const textureSlots = { diffuseTransmissionTexture:'diffuseTransmissionMap', diffuseTransmissionColorTexture:'diffuseTransmissionColorMap', baseColorTexture:'map', metallicRoughnessTexture:'metalnessMap', normalTexture:'normalMap', occlusionTexture:'aoMap', emissiveTexture:'emissiveMap', clearcoatTexture:'clearcoatMap', clearcoatRoughnessTexture:'clearcoatRoughnessMap', clearcoatNormalTexture:'clearcoatNormalMap', transmissionTexture:'transmissionMap', thicknessTexture:'thicknessMap', specularTexture:'specularIntensityMap', specularColorTexture:'specularColorMap', sheenColorTexture:'sheenColorMap', sheenRoughnessTexture:'sheenRoughnessMap', iridescenceTexture:'iridescenceMap', iridescenceThicknessTexture:'iridescenceThicknessMap', anisotropyTexture:'anisotropyMap' };
export function pointerDescription(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) throw new Error('Invalid animation pointer');
  const parts = pointer.slice(1).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~'));
  const [kind,id,...rest] = parts;
  if (kind === 'materials' && /^\d+$/.test(id)) {
    const path = rest.join('/');
    if (materialFields[path]) return { kind, id:+id, property:materialFields[path] };
    const i=rest.indexOf('KHR_texture_transform');
    if (i>=2 && textureSlots[rest[i-2]] && ['offset','scale','rotation'].includes(rest[i+1]) && i+2===rest.length) return {kind,id:+id,property:rest[i+1],texture:textureSlots[rest[i-2]]};
  }
  if(kind==='nodes' && /^\d+$/.test(id) && rest.length===3 && rest[0]==='extensions' && {KHR_node_visibility:'visible',KHR_node_selectability:'selectable',KHR_node_hoverability:'hoverable'}[rest[1]]===rest[2])return {kind:'nodeFlags',id:+id,property:rest[2]};
  if (kind==='nodes' && /^\d+$/.test(id) && rest.length===1 && ['translation','rotation','scale','weights'].includes(rest[0])) return {kind,id:+id,property:rest[0]};
  if (kind==='cameras' && /^\d+$/.test(id) && rest.length===2 && ['perspective','orthographic'].includes(rest[0]) && ['yfov','znear','zfar','aspectRatio','xmag','ymag'].includes(rest[1])) return {kind,id:+id,property:rest[1]};
  if(kind==='extensions' && id==='KHR_lights_punctual' && rest[0]==='lights' && /^\d+$/.test(rest[1]) && ['color','intensity','range','spot/innerConeAngle','spot/outerConeAngle'].includes(rest.slice(2).join('/'))) return {kind:'lights',id:+rest[1],property:rest.slice(2).join('/')};
  throw new Error(`No progressive animation binding for ${pointer}`);
}
