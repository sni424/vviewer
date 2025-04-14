import { VAssetType } from './AssetTypes';
import Loadable from './Loadable';

interface VObject3DData {}

export default class VObject3D extends Loadable<VObject3DData> {
  type = 'VObject3D' as VAssetType;
  parse() {
    return Promise.resolve({} as VObject3DData);
  }
}
