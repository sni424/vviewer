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

// traverse때문에 먼저 임포트
import './Object3D.ts';

// 구현체 임포트
import './Camera.ts';
import './Matrix4.ts';
import './Shader.ts';
import './Vector3.ts';

// 하위 개념부터 임포트 - texture
import './Texture.ts';

// material
import './Material.ts';

// geometry
import './BufferGeometry.ts';

//mesh
import './Mesh.ts';

export * from 'three';
export { THREE };
