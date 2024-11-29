
export interface ServerData {
  nodes: Record<string, ServerNode>;
  resources: PartsData;
}

export interface ServerNode {
  id: string;
  parentId: string | null;
  name: string;
  type: NodeType;
  data: ServerMesh;
  regDatetime: any;
  updateDatetime: any;
}
export interface ServerMesh {
  matrix: number[];
  layers: number;
  material?: string;
  geometry?: Geometry;
}

export interface PartsData {
  geometries?: Geometry[];
  materials: Record<string, MaterialData>;
  images?: Image[];
  textures: Record<string, Texture>;
}

export interface Geometry {
  data: string;
  uuid: string;
  type: string;
  hash?: string;
}

export interface Image {
  uuid: string;
  url: string;
}

export interface Texture {
  uuid: string;
  name: string;
  type: number;
  wrap: number[];
  center: number[];
  repeat: number[];
  offset: number[];
  format: number;
  channel: number;
  mapping: number;
  rotation: number;
  magFilter: number;
  minFilter: number;
  anisotropy: number;
  colorSpace: string;
  internalFormat: any;
  generateMipmaps: boolean;
  unpackAlignment: number;
  premultiplyAlpha: boolean;
  image: Image;
  flipY: boolean;
}

export interface ThreeJsObject {
  uuid: string;
  type: string;
  name: string;
  layers: number;
  matrix: number[];
  children: any[];
  up: number[];
  userData?: any;
  geometry?: string | Geometry;
  material?: string;
}

export interface MaterialData {
  opacity: number;
  side: number;
  alphaTest: number;
  map: string | null;
  color: number;
  roughnessMap: string | null;
  roughness: number;
  metalnessMap: string | null;
  metalness: number;
  normalMap: any;
  normalScaleX: number;
  normalScaleY: number;
  normalMapType: number;
  emissiveMap: any;
  emissive: number;
  emissiveIntensity: number;
  aoMap: any;
  aoMapIntensity: number;
  alphaMap: any;
  transmissionMap: any;
  transmission: number;
  anisotropyMap: any;
  anisotropy: number;
  anisotropyRotation: number;
  specularMap: any;
  specularColorMap: any;
  specularIntensityMap: any;
  specular: any;
  specularIntensity: number;
  reflectivity: number;
  specularColor: number;
  sheenColorMap: any;
  sheenRoughnessMap: any;
  sheen: number;
  sheenColor: number;
  sheenRoughness: number;
  clearcoatMap: any;
  clearcoatRoughnessMap: any;
  clearcoatNormalMap: any;
  clearcoat: number;
  clearcoatRoughness: number;
  clearcoatNormalScaleX: number;
  clearcoatNormalScaleY: number;
  lightMap: any;
  lightMapIntensity: number;
  bumpMap: any;
  bumpScale: number;
  type: string;
  name: string;
  uuid: string;
  normalScale: any;
  clearcoatNormalScale: any;
  depthTest: boolean;
  depthWrite: boolean;
  transparent: boolean;
  useMap: boolean;
  useRoughnessMap: boolean;
  useMetalnessMap: boolean;
  useNormalMap: boolean;
  useEmissiveMap: boolean;
  useAoMap: boolean;
  useAlphaMap: boolean;
  useTransmissionMap: boolean;
  useAnisotropyMap: boolean;
  useSpecularMap: boolean;
  useSpecularColorMap: boolean;
  useSpecularIntensityMap: boolean;
  useSheenColorMap: boolean;
  useSheenRoughnessMap: boolean;
  useClearcoatMap: boolean;
  useClearcoatRoughnessMap: boolean;
  useClearcoatNormalMap: boolean;
  useLightMap: boolean;
  useBumpMap: boolean;
}

export interface ThreeTreeData {
  geometries: Geometry[];
  materials: any[];
  images: Image[];
  textures: Texture[];
  metadata: {
    generator: string;
    type: string;
    version: number;
  };
  object: ThreeJsObject | null;
}

export interface ThreeGeometryData {
  uuid: string;
  type: 'BufferGeometry' | string;
  data: {
    arrayBuffers: { string: Array<number> };
    attributes: {
      normal: {
        isInterleavedBufferAttribute: boolean;
        itemSize: number;
        data: string;
      };
    };
  };
}
export interface ThreeObject {
  children: ThreeObject[];
}
// export interface ThreeObjectRoot {
//   geometries: Geometry[];
//   materials: Material[];
//   textures: Texture[];
//   images: Image[];
//   metaData: {
//     generator: 'Object3D.toJSON';
//     type: 'Object';
//     version: 4.6;
//   };
//   object: ThreeObject;
// }
export const ThreeJSNodeTypes = ['Mesh', 'Object3D', 'Group', 'Root'] as const;
export type ThreeJSNodeType = (typeof ThreeJSNodeTypes)[number];
export const VNodeTypes = ['ANCHOR'] as const;
export type VNodeType = (typeof VNodeTypes)[number];
export const NodeTypes = [...ThreeJSNodeTypes, ...VNodeTypes] as const;
export type NodeType = (typeof NodeTypes)[number];

export type Matrix4Array = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
