import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import * as THREE from 'VTHREE';
import { MaxFile } from 'src/pages/max/maxAtoms.ts';
import { BufferGeometry } from 'three';

class VRGLoader implements MaxLoader<THREE.BufferGeometry> {
  constructor() {}

  load(maxFile: MaxFile): Promise<BufferGeometry> {
    return Promise.resolve(undefined);
  }
}

export default VRGLoader;
