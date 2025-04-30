import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import * as THREE from 'VTHREE';
import { MaxFile } from '../maxAtoms';
import VRGLoader from 'src/pages/max/loaders/VRGLoader.ts';
import VRMLoader from 'src/pages/max/loaders/VRMLoader.ts';

class VROLoader implements MaxLoader<THREE.Object3D> {
  constructor() {}

  private geometryLoader = new VRGLoader();
  private materialLoader = new VRMLoader();

  load(maxFile: MaxFile): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
    throw new Error('Method not implemented.');
  }
}

export default VROLoader;
