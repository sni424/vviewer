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
import { splitExtension } from './utils.ts';
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
      VGLTFLoader.ktx2Loader = new KTX2Loader();
      VGLTFLoader.ktx2Loader.setTranscoderPath(
        'https://unpkg.com/three@0.168.0/examples/jsm/libs/basis/',
      );

      if (VGLTFLoader.gl) {
        VGLTFLoader.ktx2Loader.detectSupport(VGLTFLoader.gl);
      } else {
        throw new Error('VGLTFLoader.gl is not set');
      }
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
    const gl = threes()?.gl;

    function customOnLoad(gltf: GLTF) {
      gltf.scene.traverseAll(async (object: THREE.Object3D) => {
        object.layers.enable(Layer.Model);
        updateLightMapFromEmissive(object);
        await getGainmap(object, gl);
        await getLightmap(object);
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

async function getLightmap(object: THREE.Object3D) {
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

      /**
       * Texture Call 분류
       * 1. dpOnTexture / dpOffTexture
       * 2. dpOnTexture 및 raw LightMap
       * -> 추후
       * 3. Option 용 라이트맵 ?
       * **/

      if (applyKey) {
        const textureCache = new Map<string, THREE.Texture>();

        const loadTexture = async (url: string): Promise<THREE.Texture> => {
          const flipYMap: { [key: string]: boolean } = {
            exr: true,
            png: false,
            ktx: false,
          };

          const extension = splitExtension(url).ext;
          const flipY = flipYMap[extension];
          if (flipY === undefined) {
            throw new Error('FlipY Set Failed: ' + extension);
          }

          if (textureCache.has(url)) {
            return textureCache.get(url)!;
          }

          console.log('before load : ', url);

          const texture = (await VTextureLoader.load(url, {
            flipY,
            as: 'texture',
            gl: threes()?.gl,
          })) as THREE.Texture;

          textureCache.set(url, texture);
          return texture;
        };

        try {
          const texturesToLoad = [...new Set(textures)];
          await Promise.all(texturesToLoad.map(loadTexture));
          const texture = textureCache.get(applyKey);

          if (texture) {
            mat.lightMap = texture;
            mat.lightMapIntensity = mat.vUserData.lightMapIntensity ?? 1;
            mat.needsUpdate = true;
            if (modelType) {
              if (modelType === 'DP') {
                mat.vUserData.dpOnLightMap = texture;
              } else {
                mat.vUserData.dpOffLightMap = texture;
                textureCache.forEach((value, key) => {
                  if (key !== applyKey) {
                    mat.vUserData.dpOnLightMap = value;
                  }
                });
              }
            }
          } else {
            console.warn(`Texture 로드 실패 : `, applyKey, {
              textureCache,
              texture,
            });
          }
        } catch (error) {
          console.error('Error Loading Textures: ', error);
        }
      }
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
