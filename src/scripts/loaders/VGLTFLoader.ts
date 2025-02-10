import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
// @ts-ignore
import { get } from 'idb-keyval';
import {
  type GLTF,
  GLTFLoader,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { ENV, Layer } from '../../Constants.ts';
import GainmapLoader from '../GainmapLoader.ts';
import * as THREE from '../VTHREE.ts';
import { getVKTX2Loader } from './VKTX2Loader.ts';
import VTextureLoader from './VTextureLoader.ts';

export default class VGLTFLoader extends GLTFLoader {
  dispoableUrls: string[] = [];

  dispose() {
    for (const url of this.dispoableUrls) {
      URL.revokeObjectURL(url);
    }
    GainmapLoader.dispose();
  }

  static gl: THREE.WebGLRenderer;
  static dracoLoader: DRACOLoader;
  static ktx2Loader: KTX2Loader;
  static meshOptDecoder = MeshoptDecoder;
  static instance: VGLTFLoader;

  constructor(gl?: THREE.WebGLRenderer, manager?: THREE.LoadingManager) {
    if (gl) {
      VGLTFLoader.gl = gl;
    }

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
      VGLTFLoader.ktx2Loader = getVKTX2Loader(VGLTFLoader.gl);
    }
    this.setKTX2Loader(VGLTFLoader.ktx2Loader);

    // MeshOptimizer
    this.setMeshoptDecoder(VGLTFLoader.meshOptDecoder);

    if (!VGLTFLoader.instance) {
      VGLTFLoader.instance = this;
    }
    return this;
  }

  parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void,
  ): void {
    // const gl = threes()?.gl;

    async function customOnLoad(gltf: GLTF) {
      const lightMapSet = new Set<string>([]);

      gltf.scene.traverseAll((object: THREE.Object3D) => {
        object.layers.enable(Layer.Model);
        getLightmap(object, lightMapSet);
      });

      const lmMap = new Map();
      for (const url1 of lightMapSet) {
        const texture = await VGLTFLoader.ktx2Loader.loadAsync(url1);
        texture.channel = 1;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        lmMap.set(url1, texture);
      }

      console.log(lmMap);

      gltf.scene.traverse(ob => {
        if (ob.type === 'Mesh') {
          const mesh = ob as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.vUserData.lightMap) {
            const lmKey = getVUserDataLightMapURL(mat.vUserData.lightMap);
            if (lmMap.has(lmKey)) {
              const texture = lmMap.get(lmKey);
              mat.lightMap = texture;
              mat.lightMapIntensity = mat.userData.lightMapIntensity;
            }
          }
        }
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

function getLightmap(object: THREE.Object3D, lightMapSet: Set<string>) {
  if ((object as THREE.Mesh).isMesh) {
    const mesh = object as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat) {
      // DP 는 항상 dpOnTextureFile, Base 는 dpOnTextureFile / dpOffTextureFile 둘 다 있거나 없음.
      // 텍스쳐 적용 기준 =>
      // BASE: dpOff 기준 / DP : dpOn 기준
      const textures: string[] = [];
      const modelType = mesh.vUserData.modelType;
      let applyKey: string | null = null;
      if (modelType) {
        // DP / Base 로 업로드 했다면?
        if (modelType === 'DP') {
          // DP 라면
          const target = mat.vUserData.dpOnTextureFile;
          if (target) {
            textures.push(getVUserDataLightMapURL(target));
            applyKey = getVUserDataLightMapURL(target);
          } else {
            console.warn(
              'getLightMap() => type DP : dpOnTextureFile 없음 ! ',
              mat,
            );
          }
        } else {
          // Base 라면
          const offT = mat.vUserData.dpOffTextureFile;
          const onT = mat.vUserData.dpOnTextureFile;

          if (offT && onT) {
            applyKey = getVUserDataLightMapURL(offT);
            textures.push(
              getVUserDataLightMapURL(offT),
              getVUserDataLightMapURL(onT),
            );
          } else {
            console.log('No LightMap with Base Model : ', mesh);
          }
        }
      } else if (mat.vUserData.lightMap) {
        // EXR 을 그냥 넣어서 업로드 한 경우
        applyKey = getVUserDataLightMapURL(mat.vUserData.lightMap);
        textures.push(getVUserDataLightMapURL(mat.vUserData.lightMap));
      }

      if (textures.length > 0) {
        textures.forEach(texture => lightMapSet.add(texture));
      }

      console.log('applyKey', applyKey);

      /**
       * Texture Call 분류
       * 1. dpOnTexture / dpOffTexture
       * 2. dpOnTexture 및 raw LightMap
       * -> 추후
       * 3. Option 용 라이트맵 ?
       * **/
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

function getVUserDataLightMapURL(lightMap: string) {
  return lightMap.startsWith('http') ? lightMap : ENV.base + lightMap;
}
