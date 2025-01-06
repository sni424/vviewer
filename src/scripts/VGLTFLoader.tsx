import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
// @ts-ignore
import { get } from 'idb-keyval';
import {
  type GLTF,
  GLTFLoader,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { ENV, Layer } from '../Constants.ts';
import * as THREE from '../scripts/VTHREE.ts';
import { threes } from './atomUtils.ts';
import GainmapLoader from './GainmapLoader.ts';
import VTextureLoader from './VTextureLoader.ts';

export default class VGLTFLoader extends GLTFLoader {
  dispoableUrls: string[] = [];
  dispose() {
    for (const url of this.dispoableUrls) {
      URL.revokeObjectURL(url);
    }
    GainmapLoader.dispose();
  }
  static dracoLoader: DRACOLoader;
  static ktx2Loader: KTX2Loader;
  static meshOptDecoder = MeshoptDecoder;
  static instance = new VGLTFLoader();

  constructor(manager?: THREE.LoadingManager) {
    super(manager);

    //DRACO
    if (!VGLTFLoader.dracoLoader) {
      VGLTFLoader.dracoLoader = new DRACOLoader();
      VGLTFLoader.dracoLoader.setDecoderPath(
        'https://www.gstatic.com/draco/v1/decoders/',
      );
    }

    this.setDRACOLoader(VGLTFLoader.dracoLoader);

    //KTX2
    if (!VGLTFLoader.ktx2Loader) {
      VGLTFLoader.ktx2Loader = new KTX2Loader();
      VGLTFLoader.ktx2Loader.setTranscoderPath(
        'https://unpkg.com/three@0.168.0/examples/jsm/libs/basis/',
      );
    }
    this.setKTX2Loader(VGLTFLoader.ktx2Loader);

    // MeshOptimizer
    this.setMeshoptDecoder(VGLTFLoader.meshOptDecoder);
    return this;
  }

  parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void,
  ): void {
    const gl = threes()?.gl;
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

  async loadAsync(fileOrUrl: File | string) {
    let url: string;
    if (typeof fileOrUrl === 'string') {
      url = fileOrUrl;
    } else {
      url = URL.createObjectURL(fileOrUrl);
      this.dispoableUrls.push(url);
    }
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

        const imageUrl =
          jpg.length > 0
            ? (jpg[0] as File)
            : cacheKey.startsWith('http')
              ? cacheKey
              : encodeURI(ENV.base + cacheKey);

        return VTextureLoader.load(imageUrl, { gl, flipY: true }).then(
          texture => {
            mat.lightMap = texture;

            if (mat.vUserData.gainMapIntensity !== undefined) {
              mat.lightMapIntensity = mat.vUserData.gainMapIntensity;
            }
            mat.needsUpdate = true;
          },
        );
      }
    }
  }
}
