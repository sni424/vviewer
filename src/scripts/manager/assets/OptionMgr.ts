import { THREE } from 'VTHREE';
import _Asset from '../_Asset';
import { _AssetMgr } from './_AssetMgr';
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
    _AssetMgr.setProject(pid);
    return _AssetMgr.load<VFile<VProject>>(pid).then(async vfile => {
      const project = _Asset.vfile(pid)!;
      if (!project) {
        throw new Error('Project not found');
      }

      const dstScene = await _AssetMgr
        .load<VOption>(vfile?.data.option.defaultOption)
        .then(option => {
          return _AssetMgr
            .load<VFile<VScene>>(option?.scene)
            .then(scene => _AssetMgr.load<THREE.Scene>(scene?.data.root));
        });
      if (options.setToScene) {
        // this.switchScene();
      }
    });
  }
}
