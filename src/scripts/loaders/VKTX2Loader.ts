import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as THREE from 'VTHREE';

export default class VKTX2Loader extends KTX2Loader {
  static instance: VKTX2Loader;
  constructor(gl?: THREE.WebGLRenderer, manager?: THREE.LoadingManager) {
    super(manager);
    super.setTranscoderPath(
      'https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/static/basis/',
    );
    const maxWorkers = navigator.hardwareConcurrency ?? 4;
    super.setWorkerLimit(maxWorkers);
    if (gl) {
      super.detectSupport(gl);
    }
    if (!VKTX2Loader.instance) {
      VKTX2Loader.instance = this;
    }

    return this;
  }
}

export function getVKTX2Loader(gl?: THREE.WebGLRenderer) {
  if (!VKTX2Loader.instance) {
    new VKTX2Loader(gl);
  }
  return VKTX2Loader.instance;
}
