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
import { getAtomValue, threeExportsAtom } from './atoms.ts';
import GainmapLoader from './GainmapLoader.ts';
import VTextureLoader from './VTextureLoader.ts';

export default class VGLTFLoader extends GLTFLoader {
  dispose() {
    GainmapLoader.dispose();
  }
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

  async loadAsync(url: string) {
    return super.loadAsync(url).finally(() => {
      // this.dispose();
    });
  }
}

function updateLightMapFromEmissive(object: THREE.Object3D) {
  if ('isMesh' in object) {
    const mesh = object as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material.vUserData.isEmissiveLightMap) {
      const emissiveMap = material.emissiveMap;
      if (emissiveMap) {
        if (emissiveMap.channel !== 1) {
          emissiveMap.channel = 1;
        }
        emissiveMap.colorSpace = '';
        material.lightMap = emissiveMap.clone();
        material.lightMapIntensity = material.vUserData.lightMapIntensity ?? 1;
        material.emissiveMap = null;
        material.needsUpdate = true;
      }
      // vUserData 초기화
      delete material.vUserData.isEmissiveLightMap;
      delete material.vUserData.lightMapIntensity;
    }
  }
}

async function getGainmap(object: THREE.Object3D, gl?: THREE.WebGLRenderer) {
  if ((object as THREE.Mesh).isMesh) {
    const mesh = object as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat) {
      const cacheKey = (mat.vUserData.gainMap as string | undefined)?.replace(
        '.exr',
        '.jpg',
      );
      if (cacheKey) {
        const jpg = (
          await Promise.all([
            get(cacheKey),
            get(cacheKey.replace('.exr', '.jpg')),
          ])
        ).filter(Boolean);

        if (jpg.length > 0) {
          return VTextureLoader.load(jpg[0] as File, { gl }).then(texture => {
            mat.lightMap = texture;

            if (mat.vUserData.gainMapIntensity !== undefined) {
              mat.lightMapIntensity = mat.vUserData.gainMapIntensity;
            }
            mat.needsUpdate = true;
          });
        }

        const url = import.meta.env.VITE_MODELS_URL + cacheKey;

        return VTextureLoader.load(encodeURI(url), { gl }).then(texture => {
          mat.lightMap = texture;

          if (mat.vUserData.gainMapIntensity !== undefined) {
            mat.lightMapIntensity = mat.vUserData.gainMapIntensity;
          }
          mat.needsUpdate = true;
        });
      }
    }
  }
}
