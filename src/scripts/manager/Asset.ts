import objectHash from 'object-hash';
import { v5 } from 'uuid';
import { THREE, VTextureTypes } from 'VTHREE';
import VGLTFLoader from '../loaders/VGLTFLoader';
import VTextureLoader from '../loaders/VTextureLoader';

const NAMESPACE = 'ASSET_TEST';
const hashString = (str: string) => v5(str, NAMESPACE);

export const VRemoteAssetTypes = [
  'mesh',
  'material',
  'geometry',
  'texture',
] as const;

export type VRemoteAssetType = (typeof VRemoteAssetTypes)[number];
export type VTextureType = (typeof VTextureTypes)[number];

// export type VRemoteAsset = {
//   id: string;
//   type: VRemoteAssetType;
//   // name: string;
//   // url: string; // 이론 상 id + type조합으로 url을 만들 수 있음
//   children?: VRemoteAsset[];
//   target?:VTextureType;
// };

// !TODO : GLB 로드 시 같은 경로의 메시/지오/머티리얼/텍스쳐인 경우 같은 식별자를 가질 수 있도록.
// 노트 참조

export type VRemoteAssetMesh = {
  id: string;
  type: 'mesh';
  geometry: VRemoteAssetGeometry;
  material?: VRemoteAssetMaterial;
};

export type VRemoteAssetGeometry = {
  id: string;
  type: 'geometry';
};

export type VRemoteAssetTexture = {
  id: string;
  type: 'texture';
  // target: VTextureType;
};

export type VRemoteAssetMaterial = {
  id: string;
  type: 'material';
  textures: VRemoteAssetTexture[];
};

export type VRemoteAsset =
  | VRemoteAssetMesh
  | VRemoteAssetGeometry
  | VRemoteAssetTexture
  | VRemoteAssetMaterial;
// & {
//   textures?: VRemoteAssetTexture[]; // compatibility
//   geometry?: VRemoteAssetGeometry;  // compatibility
//   material?: VRemoteAssetMaterial;  // compatibility
// };

export type RemoteAssetType = VRemoteAsset;
export type LocalAssetType = File;
export type AssetType =
  | THREE.Group // glb
  | THREE.Mesh
  | THREE.Material
  | THREE.Texture
  | THREE.BufferGeometry;
export type LoadableAssetType = RemoteAssetType | LocalAssetType;

export type VMeta = {}; // json으로 로드한 파일
export default class Asset {
  id!: string;
  inputAsset?: LoadableAssetType;

  get isLocal() {
    return this.inputAsset instanceof File;
  }

  get isRemote() {
    return !this.isLocal;
  }

  get isGlb() {
    if (this.isLocal && this.inputAsset instanceof File) {
      const fname = this.inputAsset.name.toLowerCase();
      return fname.endsWith('.glb') || fname.endsWith('.gltf');
    }
    return false;
  }

  get isMap() {
    if (this.isLocal && this.inputAsset instanceof File) {
      const fname = this.inputAsset.name.toLowerCase();
      const mappable = ['.jpg', '.jpeg', '.png', '.exr', '.ktx', '.ktx2'];
      return mappable.some(ext => fname.endsWith(ext));
    }
    return false;
  }

  get isJson() {
    if (this.isLocal && this.inputAsset instanceof File) {
      const fname = this.inputAsset.name.toLowerCase();
      return fname.endsWith('.json');
    }
    return false;
  }

  constructor(asset?: LoadableAssetType, id?: string) {
    if (asset) {
      this.setAsset(asset, id);
    }
  }

  setAsset(asset: LoadableAssetType, id?: string) {
    if (VRemoteAssetTypes.includes((asset as RemoteAssetType).type)) {
      this.setRemoteAsset(asset as RemoteAssetType, id);
    } else {
      this.setLocalAsset(asset as LocalAssetType, id);
    }
  }

  setRemoteAsset(asset: RemoteAssetType, id?: string) {
    this.id = id ?? asset.id;
    this.inputAsset = asset;
  }

  setLocalAsset(asset: LocalAssetType, id?: string) {
    this.id = id ?? objectHash(asset);
    this.inputAsset = asset;
  }

  async get<T extends AssetType>(): Promise<T> {
    if (this.isRemote) {
      return this.getRemoteAsset<T>();
    } else {
      return this.getLocalAsset<T>();
    }
  }

  async upload<T extends VRemoteAsset['type']>(): Promise<
    Extract<VRemoteAsset, { type: T }>[]
  > {
    return this.toJson().then(jsons => {
      // debugger;
      return Promise.all(
        jsons.map(json => {
          if (json.type === 'mesh') {
            const mesh = localObjectCache.get(json.id)! as THREE.Mesh;
            if (!mesh) {
              throw new Error('Mesh not found in local cache');
            }

            const geo = mesh.geometry;
            const mat = mesh.matPhysical;
            const textures: THREE.Texture[] = [];

            for (const key of VTextureTypes) {
              // debugger;
              if ((mat as any)[key as keyof THREE.Material]) {
                const texture = (mat as any)[
                  key as keyof THREE.Material
                ] as THREE.Texture;
                textures.push(texture);
              }
            }

            return json as Extract<VRemoteAsset, { type: T }>;
          } else if (json.type === 'texture') {
            console.log('upload texture');
            return json as Extract<VRemoteAsset, { type: T }>;
          }

          throw new Error('Unknown asset type');
        }),
      );
    });
  }

  async toJson<T extends VRemoteAsset['type']>(): Promise<
    Extract<VRemoteAsset, { type: T }>[]
  > {
    if (!this.inputAsset) {
      console.warn('inputAsset is not set', this);
      // return;
      throw new Error('inputAsset is not set');
    }

    const makeMeshJson = (mesh: THREE.Mesh) => {
      const retval: VRemoteAssetMesh = {
        id: mesh.vUserData.id!,
        type: 'mesh',
        geometry: {
          id: mesh.geometry.vUserData.id!,
          type: 'geometry',
        },
      };

      const mat = mesh.matPhysical;
      if (mat.isMaterial) {
        const materialAsset: VRemoteAssetMaterial = {
          id: mesh.matPhysical.vUserData.id!,
          type: 'material',
          textures: mat.textures().map(tex => ({
            id: tex.vUserData.id!,
            type: 'texture',
          })),
        };

        retval.material = materialAsset;
      }

      return retval;
    };

    if (this.isGlb) {
      return this.get<THREE.Group>().then(scene => {
        const flattendMeshes = flattenGLTFScene(scene);

        const jsons = flattendMeshes.map(makeMeshJson);

        return jsons as Extract<VRemoteAsset, { type: T }>[];
      });
    }

    if (this.isMap) {
      return this.get<THREE.Texture>().then(tex => {
        const retval: VRemoteAssetTexture = {
          id: this.id,
          type: 'texture',
        };

        return [retval as Extract<VRemoteAsset, { type: T }>];
      });
    }

    throw new Error('Unknown asset type');
  }

  async getRemoteAsset<T extends AssetType>(): Promise<T> {
    if (!this.inputAsset) {
      throw new Error('Remote asset is not set');
    }

    const asset = this.inputAsset as RemoteAssetType;

    const baseUrl = '';
    const url = baseUrl + '/' + asset.type + '/' + asset.id;

    const cached = remoteCache.get(asset.id);

    // debugger;

    // cache hit
    if (cached) {
      console.log('cache hit', asset.id, cached.state);
      if (cached.state === 'pending') {
        return cached.data as Promise<T>;
      } else {
        return cached.data as T;
      }
    } else {
      console.log('cache miss', asset.id);
    }

    // case 1. texture
    if (asset.type === 'texture') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          const texture = new THREE.Texture();
          // texture.image = new Image();
          // texture.image.src = url;
          // texture.needsUpdate = true;
          remoteCache.set(asset.id, { state: 'loaded', data: texture });
          return texture as T;
        });
      remoteCache.set(asset.id, { state: 'pending', data: prom });
      return prom;
    }

    // case 2. geometry
    if (asset.type === 'geometry') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          const geometry = new THREE.BufferGeometry();
          // geometry.fromArrayBuffer(arrayBuffer);
          remoteCache.set(asset.id, { state: 'loaded', data: geometry });
          return geometry as T;
        });
      remoteCache.set(asset.id, { state: 'pending', data: prom });
      return prom;
    }

    // case 3. material
    if (asset.type === 'material') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          const textures: Promise<THREE.Texture>[] = [];
          asset.textures.forEach(tex => {
            const texture = new Asset(tex).get<THREE.Texture>();
            textures.push(texture);
          });

          return Promise.all(textures).then(textures => {
            const material = new THREE.MeshStandardMaterial();

            remoteCache.set(asset.id, { state: 'loaded', data: material });
            return material as THREE.Material as T;
          });
        });
      remoteCache.set(asset.id, { state: 'pending', data: prom });
      return prom as Promise<T>;
    }

    // case 4. mesh
    if (asset.type === 'mesh') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          const geometry = new Asset(
            asset.geometry,
          ).get<THREE.BufferGeometry>();
          const material = new Asset(asset.material).get<THREE.Material>();

          return Promise.all([geometry, material]).then(
            ([geometry, material]) => {
              const mesh = new THREE.Mesh(geometry, material);
              remoteCache.set(asset.id, { state: 'loaded', data: mesh });
              return mesh as T;
            },
          );
        });
      remoteCache.set(asset.id, { state: 'pending', data: prom });
      return prom as Promise<T>;
    }

    console.error(this);
    throw new Error('Unknown asset type');
  }

  async getLocalAsset<T extends AssetType | VMeta>(): Promise<T> {
    if (!this.inputAsset) {
      throw new Error('Local asset is not set');
    }

    const file = this.inputAsset as File;
    const fileId = objectHash(file);

    const cached = localFileCache.get(fileId);
    if (cached) {
      console.log('local cache hit', fileId, cached.state);
      if (cached.state === 'pending') {
        return cached.data as Promise<T>;
      } else {
        return cached.data as T;
      }
    } else {
      console.log('local cache miss', fileId);
    }

    const fname = file.name.toLowerCase();

    if (fname.endsWith('.json')) {
      const prom = file.text().then(text => {
        const data = JSON.parse(text);
        localFileCache.set(fileId, {
          state: 'loaded',
          file,
          data,
          type: 'json',
        });
        return data as T;
      });

      localFileCache.set(fileId, {
        state: 'pending',
        file,
        data: prom as Promise<VMeta>,
        type: 'json',
      });
      return prom as Promise<T>;
    }

    // case 1. glb
    if (fname.endsWith('.glb')) {
      new VGLTFLoader();
      const prom = VGLTFLoader.instance.loadAsync(file).then(glb => {
        const scene = glb.scene;

        // scene을 돌면서 mesh, geometry, material, texture을 캐시에 등록
        registerLocalCache(scene);

        localFileCache.set(fileId, {
          state: 'loaded',
          file,
          data: scene,
          type: 'glb',
        });
        return scene;
      });
      localFileCache.set(fileId, {
        state: 'pending',
        file,
        data: prom,
        type: 'glb',
      });
      return prom as Promise<T>;
    }

    // case 2. map
    const mappable = ['.jpg', '.jpeg', '.png', '.exr', '.ktx', '.ktx2'];
    const isMap = mappable.some(ext => {
      if (fname.endsWith(ext)) {
        return true;
      }
    });

    if (isMap) {
      const ext = fname.split('.').pop();
      const prom = VTextureLoader.loadAsync(file).then(texture => {
        localFileCache.set(fileId, {
          state: 'loaded',
          file,
          data: texture,
          type: ext as LocalCacheType,
        });
        return texture;
      });
      localFileCache.set(fileId, {
        state: 'pending',
        file,
        data: prom,
        type: ext as LocalCacheType,
      });
      return prom as Promise<T>;
    }

    debugger;
    throw new Error('Unknown file type');
  }
}

const remoteCacheDefault: [string, RemoteCacheData][] = [
  // ['mesh', { state: 'loaded', data: new THREE.Mesh() }],
  // ['material', { state: 'loaded', data: new THREE.MeshStandardMaterial() }],
  // ['tex1', { state: 'loaded', data: new THREE.Texture() }],
  // ['tex2', { state: 'loaded', data: new THREE.Texture() }],
  // ['geometry', { state: 'loaded', data: new THREE.BufferGeometry() }],
];
type RemoteCacheData =
  | { state: 'pending'; data: Promise<AssetType> }
  | { state: 'loaded'; data: AssetType };
const remoteCache = new Map<string, RemoteCacheData>(remoteCacheDefault);

// string : objectHash(File);
export const LocalCacheTypes = ['glb', 'map', 'json'] as const;
export type LocalCacheType = (typeof LocalCacheTypes)[number];
type LocalCacheData =
  | {
      state: 'pending';
      type: LocalCacheType;
      file: File;
      data: Promise<AssetType | VMeta>;
    }
  | { state: 'loaded'; type: LocalCacheType; file: File; data: AssetType };

const localFileCache = new Map<string, LocalCacheData>();
const localObjectCache = new Map<string, AssetType>();

function registerLocalCache(scene: THREE.Group) {
  localObjectCache.set(scene.vUserData.id!, scene);

  scene.traverse(obj => {
    const mesh = obj.asMesh;

    // mesh
    if (mesh.isMesh) {
      localObjectCache.set(mesh.vUserData.id!, mesh);

      // geometry
      const geometry = mesh.geometry;
      if (geometry) {
        localObjectCache.set(geometry.vUserData.id!, geometry);
      }

      // material
      const material = mesh.matPhysical;
      if (material) {
        localObjectCache.set(material.vUserData.id!, material);

        // textures
        material.textures().forEach(tex => {
          localObjectCache.set(tex.vUserData.id!, tex);
        });
      }
    }
  });
}

function serializeBufferGeometry(geometry: THREE.BufferGeometry): ArrayBuffer {
  const data = {
    attributes: {},
    index: null as null | { array: number[]; itemSize: number },
  };

  for (const [key, attr] of Object.entries(geometry.attributes)) {
    (data.attributes as any)[key] = {
      array: Array.from(attr.array),
      itemSize: attr.itemSize,
    };
  }

  if (geometry.index) {
    data.index = {
      array: Array.from(geometry.index.array),
      itemSize: 1,
    };
  }

  // 직렬화 → ArrayBuffer
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  return encoder.encode(json).buffer;
}

function deserializeBufferGeometry(buffer: ArrayBuffer): THREE.BufferGeometry {
  const decoder = new TextDecoder();
  const json = decoder.decode(buffer);
  const data = JSON.parse(json);

  const geometry = new THREE.BufferGeometry();

  for (const [key, attr] of Object.entries(data.attributes)) {
    const array = new Float32Array((attr as any).array);
    geometry.setAttribute(
      key,
      new THREE.BufferAttribute(array, (attr as any).itemSize),
    );
  }

  if (data.index) {
    const indexArray = new Uint16Array(data.index.array);
    geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
  }

  return geometry;
}

function flattenGLTFScene(scene: THREE.Group): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];

  // Traverse the scene hierarchy
  scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      // Clone the mesh to avoid modifying the original
      const mesh = object.clone();

      // Get the world matrix of the original mesh
      object.updateWorldMatrix(true, false);
      const worldMatrix = object.matrixWorld.clone();

      // Apply the world transform to the cloned mesh
      mesh.applyMatrix4(worldMatrix);

      // Reset the local transform since it's now baked into the geometry
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.updateMatrix();

      meshes.push(mesh);
    }
  });

  return meshes;
}
