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
import VMaterial from '../material/VMaterial.ts';
import VMeshBasicMaterial from '../material/VMeshBasicMaterial.ts';
import VMeshPhysicalMaterial from '../material/VMeshPhysicalMaterial.ts';
import VMeshStandardMaterial from '../material/VMeshStandardMaterial.ts';
import * as THREE from '../VTHREE.ts';
import { getVKTX2Loader } from './VKTX2Loader.ts';
import VTextureLoader from './VTextureLoader.ts';
import { lightMapAtom, setAtomValue } from '../atoms.ts';

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

      const vMaterialCache = new Map<string, VMaterial>();

      // Material의 Transmission 관련 값이 Probe CubeCamera의 렌더에 버그가 있어서, 모든 transmission 관련 값 초기화
      gltf.scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mesh = o as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat['transmissionMap']) {
            mat['transmissionMap'] = null;
          }
          if (mat['transmission']) {
            mat['transmission'] = 0;
          }
        }
      });

      gltf.scene.traverseAll(async (object: THREE.Object3D) => {
        object.layers.enable(Layer.Model);
        if (object.type === 'Mesh') {
          const mesh = object as THREE.Mesh;
          const mat = mesh.material as THREE.Material;
          if (object.name === '프레임') {
            mat.side = THREE.DoubleSide;
          }
          mat.vUserData.originalOpacity = mat.opacity;

          const originalMatID = mat.uuid;

          if (vMaterialCache.has(originalMatID)) {
            mesh.material = vMaterialCache.get(originalMatID);
          } else {
            let vMat: VMaterial;
            if (mat.type === 'MeshStandardMaterial') {
              vMat = VMeshStandardMaterial.fromThree(mat);
            } else if (mat.type === 'MeshPhysicalMaterial') {
              vMat = VMeshPhysicalMaterial.fromThree(mat);
            } else if (mat.type === 'MeshBasicMaterial') {
              vMat = VMeshBasicMaterial.fromThree(mat);
            } else {
              console.warn('???', mat);
            }
            mesh.material = vMat;
            vMaterialCache.set(originalMatID, vMat);
          }
        }
        getLightmap(object, lightMapSet);
      });

      vMaterialCache.clear();

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
            const lmKey = getVUserDataLightMapURL(
              mat.vUserData.lightMap,
              mat.vUserData.isMobile,
            );
            if (lmMap.has(lmKey)) {
              const texture = lmMap.get(lmKey);
              if (texture) {
                mat.lightMap = texture;
                const lightMapIntensity = mat.vUserData.lightMapIntensity;
                if (lightMapIntensity && lightMapIntensity > 0) {
                  mat.lightMapIntensity = lightMapIntensity;
                } else {
                  mat.lightMapIntensity = 1;
                }
                mat.needsUpdate = true;
              } else {
                console.warn('No Texture Found : ', lmKey);
              }
            }
          }
        }
      });

      // TODO 외부에서 isCreateLightMapCache 조정하기
      // if (isCreateLightMapCache) {
      //   const gl = new THREE.WebGLRenderer();
      //   const toLightMapObj = await createLightmapCache(lmMap, gl);
      //   setAtomValue(lightMapAtom, toLightMapObj);
      // }

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

export async function createLightmapCache(
  lmMap: Map<string, THREE.Texture>,
  newGL: THREE.WebGLRenderer,
) {
  const obj = Object.fromEntries(lmMap);

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
    const mat = mesh.material as VMaterial;
    if (mat) {
      const textures: string[] = [];
      if (mat.vUserData.lightMap) {
        // EXR 을 그냥 넣어서 업로드 한 경우
        textures.push(
          getVUserDataLightMapURL(
            mat.vUserData.lightMap,
            mat.vUserData.isMobile,
          ),
        );
      }

      if (textures.length > 0) {
        textures.forEach(texture => lightMapSet.add(texture));
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

function getVUserDataLightMapURL(lightMap: string, isMobile?: boolean) {
  return lightMap.startsWith('http')
    ? lightMap
    : `${ENV.base}` + ((isMobile ? 'mobile/' : '') + lightMap);
}
