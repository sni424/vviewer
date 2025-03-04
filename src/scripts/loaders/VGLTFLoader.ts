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
import { lightMapAtom, setAtomValue } from '../atoms.ts';
import GainmapLoader from '../GainmapLoader.ts';
import * as THREE from '../VTHREE.ts';
import { getVKTX2Loader } from './VKTX2Loader.ts';
import VTextureLoader from './VTextureLoader.ts';

export default class VGLTFLoader extends GLTFLoader {
  disposableURL: string[] = [];

  dispose() {
    for (const url of this.disposableURL) {
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

      const isCreateLightMapCache = true;

      gltf.scene.traverseAll(async (object: THREE.Object3D) => {
        object.layers.enable(Layer.Model);
        if (object.type === 'Mesh') {
          const mat = (object as THREE.Mesh).material as THREE.Material;
          mat.vUserData.originalOpacity = mat.opacity;
          if (object.name === '프레임') {
            mat.side = THREE.DoubleSide;
          }
        }
        getLightmap(object, lightMapSet);
      });

      const lmMap = new Map<string, THREE.Texture>();

      const arr = [...lightMapSet];
      const promises = arr.map(async lmUrl => {
        const texture = await VGLTFLoader.ktx2Loader.loadAsync(lmUrl);
        texture.channel = 1;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.vUserData.mimeType = 'image/ktx2';
        lmMap.set(lmUrl, texture);
      });

      await Promise.all(promises);

      gltf.scene.traverse(ob => {
        if (ob.type === 'Mesh') {
          const mesh = ob as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.vUserData.lightMap) {
            const lmKey = getVUserDataLightMapURL(mat.vUserData.lightMap);
            if (lmMap.has(lmKey)) {
              const texture = lmMap.get(lmKey);
              if (texture) {
                mat.lightMap = texture;
                mat.lightMapIntensity = mat.userData.lightMapIntensity;
                mat.needsUpdate = true;
              } else {
                console.warn('No Texture Found : ', lmKey);
              }
            }
          }
        }
      });

      // TODO 외부에서 isCreateLightMapCache 조정하기
      if (isCreateLightMapCache) {
        const toLightMapObj = await createLightmapCache(lmMap);
        setAtomValue(lightMapAtom, toLightMapObj);
      }

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
      this.disposableURL.push(url);
    }
    return super.loadAsync(url).finally(() => {
      // this.dispose();
    });
  }
}

export async function createLightmapCache(lmMap: Map<string, THREE.Texture>) {
  const obj = Object.fromEntries(lmMap);

  const newGL = new THREE.WebGLRenderer();
  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.MeshBasicMaterial();
  const plane = new THREE.Mesh(geo, mat);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;
  scene.add(plane);

  const toLightMapObj: {
    [key: string]: {
      image: Blob;
      texture: THREE.Texture;
    };
  } = {};

  const ps = Object.keys(obj).map(async (key: string) => {
    const t = obj[key] as THREE.CompressedTexture;

    // before Render
    t.channel = 0;
    mat.map = t;
    newGL.setSize(t.image.width, t.image.height);
    newGL.render(scene, camera);

    // after Render
    t.channel = 1;
    const glCanvas = newGL.domElement;
    const blob = (await new Promise(resolve =>
      // @ts-ignore
      glCanvas.toBlob(resolve),
    )) as Blob;

    toLightMapObj[key] = {
      image: blob,
      texture: t,
    };
  });

  await Promise.all(ps);
  console.log(ps.length + '개의 라이트맵 캐시 생성 완료');

  newGL.dispose();
  mat.dispose();
  geo.dispose();

  return toLightMapObj;
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
