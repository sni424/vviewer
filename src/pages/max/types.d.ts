import * as THREE from 'VTHREE';

export type ColorJSON = { r: number; g: number; b: number }

export type MaxMaterialJSON = {
  name: string;
  color: ColorJSON;
  baseColorMap: string | null;
  metalnessMap: string | null;
  roughnessMap: string | null;
  metalness: number;
  roughness: number;
  ior: number;
  reflectivity: number;
  reflectionMap: string | null;
  refractionMap: string | null;
  glossinessMap: string | null;
  emissive: ColorJSON;
  emissiveMap: string | null;
  normalMap: string | null;
  bumpMap: string | null;
  bumpScale: number;
  lightMap: string | null;
  lightMapIntensity: number;
  anisotropyMap: string | null;
  displacementMap: string | null;
  opacity: number;
  alphaMap: string | null;
  transparent: boolean;
  depthWrite: boolean;
  depthTest: boolean;
  transmission: number;
  transmissionMap: string | null;
  sheenColor: ColorJSON;
  sheenColorMap: string | null;
  sheenRoughness: number;
  sheenRoughnessMap: string | null;
  clearcoat: number;
  clearcoatMap: string | null;
  clearcoatRoughnessMap: string | null;
  clearcoatRoughness: number;
  clearcoatNormalMap: string | null;
  clearcoatNormalScale: [number, number];
  iridescenceMap: string | null;
  iridescenceIOR: number;
  iridescenceThickness: [number, number];
  iridescenceThicknessMap: string | null;
  side: number;
};

export type MaxTextureJSON = {
  "image": ImageInfoJSON,
  "wrapS": THREE.Wrapping,
  "wrapT": THREE.Wrapping,
  "repeat": [number, number],
  "offset": [number, number],
  "rotation": number,
  "flipY": boolean,
  "colorSpace": "srgb",
  "channel": number,
  "name": string | null
}

export type ImageInfoJSON = {
  "filename": string | null,
  "vri": string,
  "width": number,
  "height": number,
  "format": "KTX2" | string;
}

export type MaxObjectJSON = {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
  geometry: string | null;
  material: string | null;
}