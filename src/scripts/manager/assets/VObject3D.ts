import { type THREE } from 'VTHREE';
import { VBufferAttribute } from './VBufferGeometry';
import { VFile, VRemoteFile } from './VFile';

type VLoadable = VFile | VRemoteFile;

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

  children?: VLoadable[];

  animations?: string[];

  //mesh
  geometry?: VLoadable;
  material?: VLoadable;

  // instanced
  count?: number;
  instanceMatrix?: VBufferAttribute;
  instanceColor?: VBufferAttribute;

  // batched
  // perObjectFrustumCulled?: boolean;
  // sortObjects?: boolean;
}
