import { VBufferGeometry } from './VBufferGeometry';
import { VLoadable } from './VFile';
import VMaterial from './VMaterial';
import { VObject3D } from './VObject3D';
import { VTexture } from './VTexture';

export interface VScene {
  id: string;

  // three.js Object3D, 트리구조를 포함할 수도 있음
  root: VLoadable<VObject3D>; // THREE.Object3D임. Three.Mesh, Three.Group 포함

  textures: VLoadable<VTexture>[];
  materials: VLoadable<VMaterial>[];
  geometries: VLoadable<VBufferGeometry>[];
  objects: VLoadable<VObject3D>; // 종단의 children

  // scene custom
  probes?: {}[];
  actions?: {}[];
  files?: {}[];
  rooms?: {}[];
  walls?: {}[];
  hotspots?: {}[];
  postprocess?: {}[];
}
