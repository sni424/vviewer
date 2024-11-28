import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export default class VGLTFLoader extends GLTFLoader {
  constructor(manager?: THREE.LoadingManager) {
    super(manager);

    //DRACO
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    this.setDRACOLoader(dracoLoader);

    //KTX2
    const ktx2loader = new KTX2Loader();
    ktx2loader.setTranscoderPath(
      'https://unpkg.com/three@0.168.0/examples/jsm/libs/basis/',
    );
    this.setKTX2Loader(ktx2loader);

    // MeshOptimizer
    this.setMeshoptDecoder(MeshoptDecoder);
    return this;
  }
}
