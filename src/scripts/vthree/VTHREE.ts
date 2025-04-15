import { type RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { View } from '../../types.ts';

declare global {
  interface Window {
    getThree: (view: View) => RootState | undefined;
    setThree: (view: View, state: RootState) => RootState;
    threeStore: { [key in View]: RootState | undefined };
  }
}

export type VTextureMapKey = {
  [K in keyof THREE.MeshPhysicalMaterial]: THREE.MeshPhysicalMaterial[K] extends THREE.Texture | null
    ? K
    : never;
}[keyof THREE.MeshPhysicalMaterial];
export const VTextureTypes: VTextureMapKey[] = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
];
export type VTextureType = (typeof VTextureTypes)[number];

window.threeStore = {
  [View.Shared]: undefined,
  [View.Main]: undefined,
  [View.Top]: undefined,
  [View.Front]: undefined,
  [View.Right]: undefined,
  [View.Back]: undefined,
  [View.Left]: undefined,
  [View.Bottom]: undefined,
};

window.setThree = (view: View, state: RootState) => {
  window.threeStore[view] = state;
  return state;
};

window.getThree = (view: View = View.Shared) => {
  return window.threeStore[view];
};

// 구현체 임포트
import './Matrix4';
import './Shader';
import './Vector3';

// geometry
import './BufferAttribute';
import './BufferGeometry';

// 하위 개념부터 임포트 - texture
import './Source';
import './Texture';

// material
import './Material';

import './Camera';
import './Object3D';

//mesh
import './Mesh';

export * from 'three';
export { THREE };
