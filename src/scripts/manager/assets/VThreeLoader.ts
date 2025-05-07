import { THREE } from 'VTHREE';
import { VFile, VRemoteFile } from './VFile';

type VFileLike = VFile | VRemoteFile;

class VThreeLoader {
  static async object<T extends THREE.Object3D = any>(
    vfile: VFileLike,
  ): Promise<T> {
    AssetMgr;
  }
}
