import { VAssetType } from './AssetTypes';
import Loadable from './Loadable';
import VBufferGeometry from './VBufferGeometry';
import VMaterial from './VMaterial';
import VObject3D from './VObject3D';
import VTexture from './VTexture';

interface VSceneData {
  referenceScene?: VScene; // 없으면 root scene

  // three.js
  objects?: VObject3D[]; // THREE.Object3D임. Three.Mesh, Three.Group 포함
  materials?: VMaterial[];
  textures?: VTexture[];
  geometries?: VBufferGeometry[];

  // scene custom
  probes?: {}[];
  actions?: {}[];
  files?: {}[];
  rooms?: {}[];
  walls?: {}[];
  hotspots?: {}[];
  postprocess?: {}[];
}

export default class VScene extends Loadable<VSceneData> {
  type = 'VScene' as VAssetType;
  parse(): Promise<VSceneData> {
    return Promise.resolve({} as VSceneData);
  }
}
