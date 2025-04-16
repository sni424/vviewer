import { type THREE } from 'VTHREE';
import { VAssetType } from './AssetTypes';
import { VBufferAttribute, VBufferGeometry } from './VBufferGeometry';
import { isVFile, VLoadable } from './VFile';
import VMaterial from './VMaterial';
import { VTexture } from './VTexture';

export interface VObject3D {
  uuid: string;
  type: string;

  name?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  visible?: boolean;
  frustumCulled?: boolean;
  renderOrder?: number;
  userData?: Record<string, unknown>;

  layers: number;
  matrix: THREE.Matrix4Tuple;
  up: THREE.Vector3Tuple;

  matrixAutoUpdate?: boolean;

  children?: VLoadable<VObject3D>[];

  animations?: string[];

  // scene
  environment?: VLoadable<VTexture>;

  //mesh
  geometry?: VLoadable<VBufferGeometry>;
  material?: VLoadable<VMaterial>;

  // instanced
  count?: number;
  instanceMatrix?: VLoadable<VBufferAttribute>;
  instanceColor?: VLoadable<VBufferAttribute>;

  // batched
  // perObjectFrustumCulled?: boolean;
  // sortObjects?: boolean;
}

export const VObject3DTypes: VAssetType[] = ['VObject3D', 'VMesh'] as const;
export type VObject3DType = (typeof VObject3DTypes)[number];

export const isVObject3DFile = (file?: any): boolean => {
  return isVFile(file) && VObject3DTypes.includes(file.type);
};

export const isVMeshFile = (file?: any): boolean => {
  return isVFile(file) && file.type === 'VMesh';
};
