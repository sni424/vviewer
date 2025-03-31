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

import { GLTF } from 'three/examples/jsm/Addons.js';

export type FileInfo = {
  filename: string;
  fileType: null;
  fileSize: number;
  fileUrl: string;
  uploadDate: string;
};

export type ModelFileSaved = {
  file: FileInfo;
  // gltfEncoded: string;
  blob: Blob;
  elapsed: number;
  hash: string;
};

export type ModelFile = {
  file: FileInfo;
  gltf: GLTF['scene'];
  elapsed: number;
  hash: string;
};

import { Properties } from '@react-three/fiber';
import { Pathfinding } from 'three-pathfinding';
// import { THREE } from 'VTHREE';
import { THREE } from 'VTHREE';
export declare type GLProps = Partial<Properties<THREE.WebGLRenderer>> &
  Partial<THREE.WebGLRendererParameters> & {
    toneMapping?: THREE.ToneMapping;
    toneMappingExposure?: number;

    // WebGLRenderer.d.ts
    /**
     * default is false.
     */
    alpha?: boolean | undefined;

    /**
     * default is true.
     */
    premultipliedAlpha?: boolean | undefined;

    /**
     * default is false.
     */
    antialias?: boolean | undefined;

    /**
     * default is false.
     */
    stencil?: boolean | undefined;

    /**
     * default is false.
     */
    preserveDrawingBuffer?: boolean | undefined;

    /**
     * Can be "high-performance", "low-power" or "default"
     */
    powerPreference?: WebGLPowerPreference | undefined;

    /**
     * default is true.
     */
    depth?: boolean | undefined;

    /**
     * default is false.
     */
    failIfMajorPerformanceCaveat?: boolean | undefined;
  };

// Layer로 켜고끄기
export enum View {
  Shared = 0, // 기본 Scene에 존재하는 모든 값
  Main = 1, // Main Scene에만 존재
  Top = 2, // Top Scene에만 존재
  Front = 3,
  Right = 4,
  Back = 5,
  Left = 6,
  Bottom = 7,
}

export type GridOption = {
  size?: number;
  divisions?: number;
  colorCenterLine?: number;
  colorGrid?: number;
};

export type ViewportOption = {
  show?: boolean;
  grid?: boolean;
};

export interface MoveActionOptions {
  pathFinding?: {
    stopAnimation?: boolean; //애니메이션 중지
    matrix?: number[];
    pathfinder?: Pathfinding;
  };
  isoView?: {
    speed: number; // 애니메이션 속도
    model: THREE.Object3D; //바라볼 모델 (중앙 값을 구하기 위해)
  };
  walkView?: {
    target: THREE.Vector3; // 이동할 경로 (Pathfinding)
    direction: THREE.Vector3; //도착했을때 카메라가 바라볼 방향
    speed: number; // 애니메이션 속도
  };
  linear?: {
    matrix: number[];
    duration: number; // 애니메이션 시간
    fov?: number; //카메라 fov값
  };
  teleport?: {
    matrix: number[];
  };
  onComplete?: () => any;
} // 타입 정의

// export type MoveToActions = {
//   pathfinding: {
//     target?: THREE.Vector3; // 이동할 경로 (Pathfinding)
//     direction?: THREE.Vector3; //도착했을때 카메라가 바라볼 방향
//     speed?: number; // 애니메이션 속도
//     model?: THREE.Object3D; //바닥 모델
//     stopAnimtaion?: boolean //애니메이션 중지
//   }
// } & {
//   isoView: {
//     speed: number; // 애니메이션 속도
//     model: THREE.Object3D; //바라볼 모델 (중앙 값을 구하기 위해)
//   } & {
//     walkView?: {
//       target: THREE.Vector3; // 이동할 경로 (Pathfinding)
//       direction: THREE.Vector3; //도착했을때 카메라가 바라볼 방향
//       speed: number; // 애니메이션 속도
//     }
//   } & {
//     linear?: {
//       target: THREE.Vector3; // 목표 좌표 (Linear)
//       direction: THREE.Vector3 // 목표 방향
//       duration: number; // 애니메이션 시간
//       fov?: number //카메라 fov값
//     };
//   } & {
//     teleport?: {
//       target: THREE.Vector3; // 목표 좌표 (Teleport)
//       direction: THREE.Vector3; //방향
//     };
//   }
//   onComplete?: () => any
// }

// type tt = {
//   linear: {
//     target: THREE.Vector3; // 목표 좌표 (Linear)
//     direction: THREE.Vector3 // 목표 방향
//     duration: number; // 애니메이션 시간
//     fov?: number //카메라 fov값
//   };
// } & {
//   linear: {
//     matrix:THREE.Matrix4;
//     duration: number; // 애니메이션 시간
//     fov?: number //카메라 fov값
//   };
// }

// 최종 json으로 내보낼 정보
export type Walls = {
  probes: string[]; // [probeId]
  points: [number, number][]; // [x,z]
  walls: [number, number, number][]; // [startIndex, endIndex, probeIndex]
};


export type WallPoint = {
  point: THREE.Vector2;
  id: string;
};
export type WallPointView = WallPoint & {
  show?: boolean;
  color?: number;
};

export type Wall = {
  start: number | string; // index or id
  end: number | string; // index
  id: string;
  probeName?: string;
  probeId?: string;
}

// 최종 결과에 내보내거나 읽어올 정보
export type WallMeta = {
  points: WallPointView[];
  walls: WallView[];
};

export type WallView = Wall & {
  show?: boolean;
  color?: number;
};

export type WallCreateOption = WallMeta & {
  autoCreateWall: boolean;
  creating?: {
    cmd: "end"; // 새로운 점을 points가장 마지막에 추가
    mouse?: { x: number; y: number; rect: DOMRect };
    axisSnap?: boolean; // 시프트 누르면 xz축에 스냅
  } | {
    cmd: "middle";
    mouse?: { x: number; y: number; rect: DOMRect };
    axisSnap?: boolean;
    index: number; // 이를테면 index=1이면 기존 1을 뒤로 한 칸 미루고 새로운 점이 1이 된다. 즉 0과 1사이에 들어간다
  } | {
    cmd: "adjust"; // 기존 점 위치조정
    id: string;
    mouse?: { x: number; y: number; rect: DOMRect };
    axisSnap?: boolean;
  }
};

export type ProbeTypes = "multi" | "multiWall";