import type * as THREE from 'three';
import { type VFile } from './VFile';
import { type VTexture } from './VTexture';
// MaterialJSON
export default interface VMaterial {
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
  clearcoatMap?: VFile<VTexture>;
  clearcoatRoughnessMap?: VFile<VTexture>;
  clearcoatNormalMap?: VFile<VTexture>;
  clearcoatNormalScale?: THREE.Vector2Tuple;

  dispersion?: number;

  iridescence?: number;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: number;
  iridescenceMap?: VFile<VTexture>;
  iridescenceThicknessMap?: VFile<VTexture>;

  anisotropy?: number;
  anisotropyRotation?: number;
  anisotropyMap?: VFile<VTexture>;

  map?: VFile<VTexture>;
  matcap?: VFile<VTexture>;
  alphaMap?: VFile<VTexture>;

  lightMap?: VFile<VTexture>;
  lightMapIntensity?: number;

  aoMap?: VFile<VTexture>;
  aoMapIntensity?: number;

  bumpMap?: VFile<VTexture>;
  bumpScale?: number;

  normalMap?: VFile<VTexture>;
  normalMapType?: THREE.NormalMapTypes;
  normalScale?: THREE.Vector2Tuple;

  displacementMap?: VFile<VTexture>;
  displacementScale?: number;
  displacementBias?: number;

  roughnessMap?: VFile<VTexture>;
  metalnessMap?: VFile<VTexture>;

  emissiveMap?: VFile<VTexture>;
  specularMap?: VFile<VTexture>;
  specularIntensityMap?: VFile<VTexture>;
  specularColorMap?: VFile<VTexture>;

  envMap?: VFile<VTexture>;
  combine?: THREE.Combine;

  envMapRotation?: THREE.EulerTuple;
  envMapIntensity?: number;
  reflectivity?: number;
  refractionRatio?: number;

  gradientMap?: VFile<VTexture>;

  transmission?: number;
  transmissionMap?: VFile<VTexture>;
  thickness?: number;
  thicknessMap?: VFile<VTexture>;
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

  // textures?: Array<VFile<VTexture>>;
  // textures?: Array<Omit<TextureJSON, 'metadata'>>;
  // images?: SourceJSON[];
}
