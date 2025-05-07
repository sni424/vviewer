import type * as THREE from 'three';
import { isVFile, VLoadable } from './VFile';
import { type VTexture } from './VTexture';
// MaterialJSON
export default interface VMaterial {
  version: number; // 우리가 부여하는 버전. toAsset()을 다시 불러야되는지 판단하기 위함
  uuid: string;
  type: string;

  name?: string;

  color?: number;
  roughness?: number;
  metalness?: number;

  sheen?: number;
  sheenColor?: number;
  sheenRoughness?: number;
  emissive?: number;
  emissiveIntensity?: number;

  specular?: number;
  specularIntensity?: number;
  specularColor?: number;
  shininess?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  clearcoatMap?: VLoadable<VTexture>;
  clearcoatRoughnessMap?: VLoadable<VTexture>;
  clearcoatNormalMap?: VLoadable<VTexture>;
  clearcoatNormalScale?: THREE.Vector2Tuple;

  dispersion?: number;

  iridescence?: number;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: number;
  iridescenceMap?: VLoadable<VTexture>;
  iridescenceThicknessMap?: VLoadable<VTexture>;

  anisotropy?: number;
  anisotropyRotation?: number;
  anisotropyMap?: VLoadable<VTexture>;

  map?: VLoadable<VTexture>;
  matcap?: VLoadable<VTexture>;
  alphaMap?: VLoadable<VTexture>;

  lightMap?: VLoadable<VTexture>;
  lightMapIntensity?: number;

  aoMap?: VLoadable<VTexture>;
  aoMapIntensity?: number;

  bumpMap?: VLoadable<VTexture>;
  bumpScale?: number;

  normalMap?: VLoadable<VTexture>;
  normalMapType?: THREE.NormalMapTypes;
  normalScale?: THREE.Vector2Tuple;

  displacementMap?: VLoadable<VTexture>;
  displacementScale?: number;
  displacementBias?: number;

  roughnessMap?: VLoadable<VTexture>;
  metalnessMap?: VLoadable<VTexture>;

  emissiveMap?: VLoadable<VTexture>;
  specularMap?: VLoadable<VTexture>;
  specularIntensityMap?: VLoadable<VTexture>;
  specularColorMap?: VLoadable<VTexture>;

  envMap?: VLoadable<VTexture>;
  combine?: THREE.Combine;

  envMapRotation?: THREE.EulerTuple;
  envMapIntensity?: number;
  reflectivity?: number;
  refractionRatio?: number;

  gradientMap?: VLoadable<VTexture>;

  transmission?: number;
  transmissionMap?: VLoadable<VTexture>;
  thickness?: number;
  thicknessMap?: VLoadable<VTexture>;
  attenuationDistance?: number;
  attenuationColor?: number;

  size?: number;
  shadowSide?: number;
  sizeAttenuation?: boolean;

  blending?: THREE.Blending;
  side?: THREE.Side;
  vertexColors?: boolean;

  opacity?: number;
  transparent?: boolean;

  blendSrc?: THREE.BlendingSrcFactor;
  blendDst?: THREE.BlendingDstFactor;
  blendEquation?: THREE.BlendingEquation;
  blendSrcAlpha?: number | null;
  blendDstAlpha?: number | null;
  blendEquationAlpha?: number | null;
  blendColor?: number;
  blendAlpha?: number;

  depthFunc?: THREE.DepthModes;
  depthTest?: boolean;
  depthWrite?: boolean;
  colorWrite?: boolean;

  stencilWriteMask?: number;
  stencilFunc?: THREE.StencilFunc;
  stencilRef?: number;
  stencilFuncMask?: number;
  stencilFail?: THREE.StencilOp;
  stencilZFail?: THREE.StencilOp;
  stencilZPass?: THREE.StencilOp;
  stencilWrite?: boolean;

  rotation?: number;

  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;

  linewidth?: number;
  dashSize?: number;
  gapSize?: number;
  scale?: number;

  dithering?: boolean;

  alphaTest?: number;
  alphaHash?: boolean;
  alphaToCoverage?: boolean;
  premultipliedAlpha?: boolean;
  forceSinglePass?: boolean;

  wireframe?: boolean;
  wireframeLinewidth?: number;
  wireframeLinecap?: string;
  wireframeLinejoin?: string;

  flatShading?: boolean;

  visible?: boolean;

  toneMapped?: boolean;

  fog?: boolean;

  userData?: Record<string, unknown>;
}

export const isVMaterialFile = (file?: any): boolean => {
  return isVFile(file) && file.type === 'VMaterial';
};
