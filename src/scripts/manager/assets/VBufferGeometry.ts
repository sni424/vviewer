import { VAssetType } from './AssetTypes';
import Loadable from './Loadable';

interface VBufferGeometryData {}

export default class VBufferGeometry extends Loadable<VBufferGeometryData> {
  type = 'VBufferGeometry' as VAssetType;
  parse() {
    return Promise.resolve({} as VBufferGeometryData);
  }
}
