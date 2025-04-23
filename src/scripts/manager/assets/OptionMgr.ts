import { THREE } from 'VTHREE';
import Asset from '../Asset';
import { AssetMgr } from './AssetMgr';
import { VFile } from './VFile';
import { VOption } from './VOption';
import { VProject } from './VProject';
import { VScene } from './VScene';

export type OptionMgrLoadProjectOptions = {
  setToScene: boolean; // default : true
};
const defaultLoadProjectOptions: OptionMgrLoadProjectOptions = {
  setToScene: true,
};

export default class OptionMgr {
  static pid: string;
  static readonly scene: THREE.Scene = new THREE.Scene();

  static async loadProject(
    pid: string,
    options?: Partial<OptionMgrLoadProjectOptions>,
  ) {
    this.pid = pid;
    options = {
      ...defaultLoadProjectOptions,
      ...options,
    };
    AssetMgr.setProject(pid);
    return AssetMgr.load<VFile<VProject>>(pid).then(async vfile => {
      const project = Asset.vfile(pid)!;
      if (!project) {
        throw new Error('Project not found');
      }

      const dstScene = await AssetMgr.load<VOption>(
        vfile?.data.option.defaultOption,
      ).then(option => {
        return AssetMgr.load<VFile<VScene>>(option?.scene).then(scene =>
          AssetMgr.load<THREE.Scene>(scene?.data.object),
        );
      });
      if (options.setToScene) {
        // this.switchScene();
      }
    });
  }
}
