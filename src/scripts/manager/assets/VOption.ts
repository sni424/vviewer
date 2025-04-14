import { VAssetType } from './AssetTypes';
import Loadable from './Loadable';
import VScene from './VScene';

interface VOptionData {
  scene: VScene; // 로드 -> VFile -> VScene
}

export default class VOption extends Loadable<VOptionData> {
  type = 'VOption' as VAssetType;
  parse(forceReload?: boolean) {
    return Promise.resolve({} as VOptionData);
  }
}
