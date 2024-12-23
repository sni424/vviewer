import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
// @ts-ignore
import { get } from 'idb-keyval';
import {
  type GLTF,
  GLTFLoader,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { Layer } from '../Constants.ts';
import * as THREE from '../scripts/VTHREE.ts';
import VTextureLoader from './VTextureLoader.ts';
import { getAtomValue, threeExportsAtom } from './atoms.ts';

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

  parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void,
  ): void {
    const gl = getAtomValue(threeExportsAtom)?.gl;
    function customOnLoad(gltf: GLTF) {
      gltf.scene.traverseAll((object: THREE.Object3D) => {
        object.layers.enable(Layer.Model);
        updateLightMapFromEmissive(object);
        getGainmap(object, gl);
      });

      onLoad(gltf);
    }
    super.parse(data, path, customOnLoad, onError);
  }
}

function updateLightMapFromEmissive(object: THREE.Object3D) {
  if ('isMesh' in object) {
    const mesh = object as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material.userData.isEmissiveLightMap) {
      const emissiveMap = material.emissiveMap;
      if (emissiveMap) {
        if (emissiveMap.channel !== 1) {
          emissiveMap.channel = 1;
        }
        emissiveMap.colorSpace = '';
        material.lightMap = emissiveMap.clone();
        material.lightMapIntensity = material.userData.lightMapIntensity;
        material.emissiveMap = null;
        material.needsUpdate = true;
      }
      // userData 초기화
      delete material.userData.isEmissiveLightMap;
      delete material.userData.lightMapIntensity;
    }
  }
}

async function getGainmap(object: THREE.Object3D, gl?: THREE.WebGLRenderer) {
  if ((object as THREE.Mesh).isMesh) {
    const mesh = object as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat) {
      const cacheKey = mat.userData.gainMap;
      return get(cacheKey).then(jpg => {
        const source =
          jpg ??
          `https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/${cacheKey}`;
        return VTextureLoader.load(source, { gl }).then(texture => {
          mat.lightMap = texture;
        });
      });
    }
  }
}
