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
  id!: string; // 로컬의 경우 objectHash(File)한 값
  inputAsset?: LoadableAssetType;
  arrayBuffer?: Promise<ArrayBuffer>; // local file인 경우 set하면 생성됨

  // 하단의 Asset.create()을 이용할 것
  private constructor(asset?: LoadableAssetType, id?: string) {
    if (asset) {
      this.setAsset(asset, id);
    }
  }

  // 캐시되어있는 모든 에셋
  static all(): { local: Asset[]; remote: Asset[] } {
    return {
      local: this.allLocal(),
      remote: this.allRemote(),
    };
  }

  static allLocal(): Asset[] {
    return Array.from(localFileCache.values()).map(v => v.asset);
  }

  static allRemote(): Asset[] {
    return Array.from(remoteCache.values()).map(v => v.asset);
  }

  // 생성 시 캐시가 있는지 확인
  //  -> 같은 파일에 대해 같은 에셋을 돌려주기 위함
  //     로컬인 경우 File을 해싱, 원격은 json.id 확인
  //   없으면 생성 후 등록, 있으면 캐시 리턴
  static create(asset: LoadableAssetType) {
    const isLocal = asset instanceof File;

    if (isLocal) {
      const fileId = objectHash(asset);
      const cached = localFileCache.get(fileId);

      if (cached?.asset) {
        return cached.asset;
      }

      // asset 생성 시 setAsset()에서 캐시 등록
      return new Asset(asset);
    } else {
      // remote

      const rAsset = asset as RemoteAssetType;
      const remoteId = rAsset.id;
      const cached = remoteCache.get(remoteId);
      if (cached?.asset) {
        return cached.asset;
      }

      return new Asset(asset);
    }
  }

  get isLocal() {
    return this.inputAsset instanceof File;
  }

  get isRemote() {
    return (
      this.inputAsset !== undefined &&
      !this.isLocal &&
      VRemoteAssetTypes.includes(this.inputAsset?.type as any)
    );
  }

  get isGlb() {
    if (this.isLocal && this.inputAsset instanceof File) {
      const fname = this.inputAsset.name.toLowerCase();
      return fname.endsWith('.glb') || fname.endsWith('.gltf');
    }

    return false;
  }

  get isTexture() {
    return this.isMap;
  }
  get isMap() {
    if (this.isLocal && this.inputAsset instanceof File) {
      const fname = this.inputAsset.name.toLowerCase();
      const mappable = ['.jpg', '.jpeg', '.png', '.exr', '.ktx', '.ktx2'];
      return mappable.some(ext => fname.endsWith(ext));
    }

    if (this.isRemote) {
      return this.inputAsset!.type === 'texture';
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

  get isMesh() {
    if (this.isRemote) {
      return this.inputAsset!.type === 'mesh';
    }

    return false;
  }

  get isMaterial() {
    if (this.isRemote) {
      return this.inputAsset!.type === 'material';
    }

    return false;
  }

  get isGeometry() {
    if (this.isRemote) {
      return this.inputAsset!.type === 'geometry';
    }

    return false;
  }

  get isEmpty() {
    return !Boolean(this.inputAsset);
  }

  // 에셋 상태
  // empty | loadable | loading | loaded
  // 1. empty : 에셋이 생성만 됨 (asset.isEmpty)
  // 2. loadable : 로컬파일이나 원격파일제이슨 할당됨 (cache[asset.id].state === loadable)
  // 3. loading : asset.get()으로 파일 불러오는 중 (cache[asset.id].state === loading)
  // 4. loaded : 로드 완료 (cache[asset.id].state === loaded)
  get state() {
    if (this.isEmpty) {
      return 'empty';
    }

    if (this.isLocal) {
      const file = this.inputAsset as File;
      const fileId = objectHash(file);
      const cached = localFileCache.get(fileId);

      if (cached) {
        return cached.state;
      }
    }

    if (this.isRemote) {
      const asset = this.inputAsset as RemoteAssetType;
      const cached = remoteCache.get(asset.id);

      if (cached) {
        return cached.state;
      }
    }

    // 여기까지 왔을 때 스테이트가 비어있을 수 없음
    // 반드시 asset.set()을 통해 캐시가 세팅됨
    throw new Error('Asset state is not set');
  }

  get isLoaded() {
    if (this.isEmpty) {
      return false;
    }

    return this.state === 'loaded';
  }

  // 변화 감지가 필요하면 밖에서 넣어준다
  onStateChange?: (
    asset: this,
    state: CacheState,
    from: CacheState | 'empty',
  ) => void;
  onLoadable?: (asset: this) => void;
  onLoading?: (asset: this) => void;
  onLoaded?: <T>(asset: this, data: T) => void;

  get isLoading() {
    if (this.isEmpty) {
      return false;
    }

    return this.state === 'loading';
  }

  get isLoadable() {
    if (this.isEmpty) {
      return false;
    }

    return this.state === 'loadable';
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

    if (!remoteCache.get(this.id)) {
      remoteCache.set(this.id, {
        state: 'loadable',
        asset: this,
      });
    }

    this.onStateChange?.(this, 'loadable', 'empty');
    this.onLoadable?.(this);
  }

  static fileType(file: File) {
    const fname = file.name.toLowerCase();
    const mapExts = ['.jpg', '.jpeg', '.png', '.exr', '.ktx', '.ktx2'];
    const modelExts = ['.gltf', '.glb'];
    const jsonExts = ['.json'];

    if (modelExts.some(ext => fname.endsWith(ext))) {
      return 'glb';
    } else if (mapExts.some(ext => fname.endsWith(ext))) {
      return 'map';
    } else if (jsonExts.some(ext => fname.endsWith(ext))) {
      return 'json';
    }

    throw new Error('Unknown file type');
  }

  setLocalAsset(asset: LocalAssetType, id?: string) {
    this.id = id ?? objectHash(asset);

    const type = Asset.fileType(asset);

    this.arrayBuffer = asset.arrayBuffer();

    if (!localFileCache.get(this.id)) {
      localFileCache.set(this.id, {
        state: 'loadable',
        asset: this,
        file: asset,
        type: type,
      });
    }

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
      if (mesh.geometry && !mesh.geometry.vUserData.id) {
        console.error(mesh);
        debugger;
        throw new Error('Geometry id is not set');
      }

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
        if (!mat.vUserData.id) {
          console.error(mat);
          debugger;
          throw new Error('Material id is not set');
        }

        const materialAsset: VRemoteAssetMaterial = {
          id: mat.vUserData.id!,
          type: 'material',
          textures: mat.textures().map(tex => {
            if (!tex.vUserData.id) {
              console.error(tex);
              throw new Error('Texture id is not set');
            }
            return {
              id: tex.vUserData.id!,
              type: 'texture',
            };
          }),
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
        if (!tex.vUserData.id) {
          console.error(tex);
          debugger;
          throw new Error('Texture id is not set');
        }
        const retval: VRemoteAssetTexture = {
          id: tex.vUserData.id!,
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
    if (cached && (cached as { data?: any }).data) {
      console.log('cache hit', asset.id, cached.state);
      if (cached.state === 'loading') {
        return cached.data as Promise<T>;
      } else {
        return (cached as any).data as T;
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
          remoteCache.set(asset.id, {
            state: 'loaded',
            data: texture,
            asset: this,
          });

          this.onLoaded?.(this, texture);
          this.onStateChange?.(this, 'loaded', 'loading');
          return texture as T;
        });
      remoteCache.set(asset.id, { state: 'loading', data: prom, asset: this });
      this.onLoading?.(this);
      this.onStateChange?.(this, 'loading', 'loadable');
      return prom;
    }

    // case 2. geometry
    if (asset.type === 'geometry') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          const geometry = new THREE.BufferGeometry();
          // geometry.fromArrayBuffer(arrayBuffer);
          remoteCache.set(asset.id, {
            state: 'loaded',
            data: geometry,
            asset: this,
          });

          this.onLoaded?.(this, geometry);
          this.onStateChange?.(this, 'loaded', 'loading');
          return geometry as T;
        });
      remoteCache.set(asset.id, { state: 'loading', data: prom, asset: this });
      this.onLoading?.(this);
      this.onStateChange?.(this, 'loading', 'loadable');
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

            remoteCache.set(asset.id, {
              state: 'loaded',
              data: material,
              asset: this,
            });

            this.onLoaded?.(this, material);
            this.onStateChange?.(this, 'loaded', 'loading');
            return material as THREE.Material as T;
          });
        });
      remoteCache.set(asset.id, { state: 'loading', data: prom, asset: this });
      this.onLoading?.(this);
      this.onStateChange?.(this, 'loading', 'loadable');
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

              remoteCache.set(asset.id, {
                state: 'loaded',
                data: mesh,
                asset: this,
              });

              this.onLoaded?.(this, mesh);
              this.onStateChange?.(this, 'loaded', 'loading');

              return mesh as T;
            },
          );
        });
      remoteCache.set(asset.id, { state: 'loading', data: prom, asset: this });

      this.onLoading?.(this);
      this.onStateChange?.(this, 'loading', 'loadable');

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
    if (cached && (cached as { data?: any }).data) {
      console.log('local cache hit', fileId, cached.state);
      if (cached.state === 'loading') {
        return cached.data as Promise<T>;
      } else {
        return (cached as any).data as T;
      }
    } else {
      console.log('local cache miss', fileId);
    }

    const ftype = Asset.fileType(file);
    const isJson = ftype === 'json';
    const isGlb = ftype === 'glb';
    const isMap = ftype === 'map';

    if (isJson) {
      const prom = file.text().then(text => {
        const data = JSON.parse(text);
        localFileCache.set(fileId, {
          state: 'loaded',
          file,
          data,
          type: 'json',
          asset: this,
        });

        this.onLoaded?.(this, data);
        this.onStateChange?.(this, 'loaded', 'loading');

        return data as T;
      });

      localFileCache.set(fileId, {
        state: 'loading',
        file,
        data: prom as Promise<VMeta>,
        type: 'json',
        asset: this,
      });

      this.onLoading?.(this);
      this.onStateChange?.(this, 'loading', 'loadable');

      return prom as Promise<T>;
    }

    // case 1. glb
    if (isGlb) {
      if (!this.arrayBuffer) {
        throw new Error('ArrayBuffer is not set');
      }
      const prom = this.arrayBuffer.then(arrayBuffer => {
        return VGLTFLoader.instance
          .parseAsync(arrayBuffer, file.name)
          .then(glb => {
            const scene = glb.scene;

            // scene을 돌면서 mesh, geometry, material, texture을 캐시에 등록
            // registerLocalCache(scene);

            const start = performance.now();
            const fname = file.name.split('/').pop();
            return scene.updateHash(fname).then(() => {
              const end = performance.now();
              console.log('GLB hash time', fname, end - start);
              localFileCache.set(fileId, {
                state: 'loaded',
                file,
                data: scene,
                type: 'glb',
                asset: this,
              });

              this.onLoaded?.(this, scene);
              this.onStateChange?.(this, 'loaded', 'loading');

              return scene;
            });
          });
      });

      localFileCache.set(fileId, {
        state: 'loading',
        file,
        data: prom,
        type: 'glb',
        asset: this,
      });

      this.onLoading?.(this);
      this.onStateChange?.(this, 'loading', 'loadable');

      return prom as Promise<T>;
    }

    // case 2. map

    if (isMap) {
      const fname = file.name.toLowerCase();
      const ext = fname.split('.').pop();

      if (!this.arrayBuffer) {
        throw new Error('ArrayBuffer is not set');
      }

      const prom = this.arrayBuffer!.then(arrayBuffer => {
        return VTextureLoader.parseAsync(arrayBuffer, {
          ext: ext as any,
        }).then(texture => {
          const hashStart = performance.now();

          return texture.hash.then(() => {
            const hashEnd = performance.now();
            console.log('Texture hash time', fname, hashEnd - hashStart);

            localFileCache.set(fileId, {
              state: 'loaded',
              file,
              data: texture,
              type: ext as LocalCacheType,
              asset: this,
            });

            this.onLoaded?.(this, texture);
            this.onStateChange?.(this, 'loaded', 'loading');

            return texture;
          });
        });
      });
      localFileCache.set(fileId, {
        state: 'loading',
        file,
        data: prom,
        type: ext as LocalCacheType,
        asset: this,
      });

      this.onLoading?.(this);
      this.onStateChange?.(this, 'loading', 'loadable');

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

export const CacheStates = ['loadable', 'loading', 'loaded'] as const;
export type CacheState = (typeof CacheStates)[number];

type RemoteCacheData =
  | { state: 'loadable'; asset: Asset }
  | { state: 'loading'; asset: Asset; data: Promise<AssetType> }
  | { state: 'loaded'; asset: Asset; data: AssetType };
const remoteCache = new Map<string, RemoteCacheData>(remoteCacheDefault);

// string : objectHash(File);
export const LocalCacheTypes = ['glb', 'map', 'json'] as const;
export type LocalCacheType = (typeof LocalCacheTypes)[number];
type LocalCacheData =
  | {
      state: 'loadable';
      asset: Asset;
      type: LocalCacheType;
      file: File;
    }
  | {
      state: 'loading';
      asset: Asset;
      type: LocalCacheType;
      file: File;
      data: Promise<AssetType | VMeta>;
    }
  | {
      state: 'loaded';
      asset: Asset;
      type: LocalCacheType;
      file: File;
      data: AssetType;
    };

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
        localObjectCache.set(
          geometry.vUserData?.id! ?? geometry.uuid,
          geometry,
        );
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
