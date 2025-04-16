import { VBufferGeometry } from './VBufferGeometry';
import { VLoadable } from './VFile';
import VMaterial from './VMaterial';
import { VObject3D } from './VObject3D';
import { VTexture } from './VTexture';

export interface VScene {
  referenceScene?: VLoadable<VScene>; //VScene; // 없으면 root scene

  // three.js
  objects?: VLoadable<VObject3D>[]; // THREE.Object3D임. Three.Mesh, Three.Group 포함
  materials?: VLoadable<VMaterial>[];
  textures?: VLoadable<VTexture>[];
  geometries?: VLoadable<VBufferGeometry>[];

  // scene custom
  probes?: {}[];
  actions?: {}[];
  files?: {}[];
  rooms?: {}[];
  walls?: {}[];
  hotspots?: {}[];
  postprocess?: {}[];
}
