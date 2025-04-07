import { v4 } from 'uuid';
import { THREE } from 'VTHREE';

export const VRemoteAssetTypes = [
  'mesh',
  'material',
  'geometry',
  'texture',
] as const;
export const VTextureTypes = [
  'map',
  'alphaMap',
  'bumpMap',
  'normalMap',
  'displacementMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'aoMap',
  'envMap',
  'lightMap',
  'gradientMap',
  'specularMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
];
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

export type VRemoteAssetMesh = {
  id: string;
  type: 'mesh';
  geometry: VRemoteAssetGeometry;
  material: VRemoteAssetMaterial;
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
export type LocalAssetType =
  | THREE.Mesh
  | THREE.Material
  | THREE.Texture
  | THREE.BufferGeometry;
export type AssetType = RemoteAssetType | LocalAssetType;

export default class Asset {
  id: string = v4();
  isRemote = false;
  inputAsset?: AssetType;
  usable = false;

  constructor(asset?: AssetType) {
    if (asset) {
      this.setAsset(asset);
    }
  }

  setAsset(asset: AssetType) {
    if (VRemoteAssetTypes.includes((asset as RemoteAssetType).type)) {
      this.setRemoteAsset(asset as RemoteAssetType);
    } else {
      this.setLocalAsset(asset as LocalAssetType);
    }
  }

  setRemoteAsset(asset: RemoteAssetType) {
    this.inputAsset = asset;
    this.id = asset.id;
    this.isRemote = true;
    this.usable = false;
  }

  setLocalAsset(asset: LocalAssetType) {
    this.usable = true;
    this.inputAsset = asset;
    if (!asset.vUserData.id) {
      console.warn(
        'vUserData.id를 설정해주세요 : ',
        asset.name,
        asset.type,
        asset,
      );
    }

    this.id = asset.vUserData.id ?? asset.uuid;
    this.isRemote = false;
  }

  async get<T extends LocalAssetType>(): Promise<T> {
    if (this.isRemote) {
      return this.getRemoteAsset<T>();
    } else {
      return this.getLocalAsset<T>();
    }
  }

  async getRemoteAsset<T extends LocalAssetType>(): Promise<T> {
    if (!this.inputAsset) {
      throw new Error('Remote asset is not set');
    }

    const asset = this.inputAsset as RemoteAssetType;

    const baseUrl = '';
    const url = baseUrl + '/' + asset.type + '/' + asset.id;

    const cached = cache.get(asset.id);

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
          this.usable = true;
          const texture = new THREE.Texture();
          // texture.image = new Image();
          // texture.image.src = url;
          // texture.needsUpdate = true;
          cache.set(asset.id, { state: 'loaded', data: texture });
          return texture as T;
        });
      cache.set(asset.id, { state: 'pending', data: prom });
      return prom;
    }

    // case 2. geometry
    if (asset.type === 'geometry') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          this.usable = true;
          const geometry = new THREE.BufferGeometry();
          // geometry.fromArrayBuffer(arrayBuffer);
          cache.set(asset.id, { state: 'loaded', data: geometry });
          return geometry as T;
        });
      cache.set(asset.id, { state: 'pending', data: prom });
      return prom;
    }

    // case 3. material
    if (asset.type === 'material') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          this.usable = true;

          const textures: Promise<THREE.Texture>[] = [];
          asset.textures.forEach(tex => {
            const texture = new Asset(tex).get<THREE.Texture>();
            textures.push(texture);
          });

          return Promise.all(textures).then(textures => {
            const material = new THREE.MeshStandardMaterial();

            cache.set(asset.id, { state: 'loaded', data: material });
            return material as THREE.Material;
          });
        });
      cache.set(asset.id, { state: 'pending', data: prom });
      return prom as Promise<THREE.Material>;
    }

    // case 4. mesh
    if (asset.type === 'mesh') {
      const prom = fetch(url)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => {
          this.usable = true;

          const geometry = new Asset(
            asset.geometry,
          ).get<THREE.BufferGeometry>();
          const material = new Asset(asset.material).get<THREE.Material>();

          return Promise.all([geometry, material]).then(
            ([geometry, material]) => {
              const mesh = new THREE.Mesh(geometry, material);
              cache.set(asset.id, { state: 'loaded', data: mesh });
              return mesh as T;
            },
          );
        });
      cache.set(asset.id, { state: 'pending', data: prom });
      return prom as Promise<T>;
    }

    console.error(this);
    throw new Error('Unknown asset type');
  }

  getLocalAsset<T extends LocalAssetType>(): T {
    return this.inputAsset as T;
  }
}

const cacheData: [string, CacheData][] = [
  // ['mesh', { state: 'loaded', data: new THREE.Mesh() }],
  // ['material', { state: 'loaded', data: new THREE.MeshStandardMaterial() }],
  // ['tex1', { state: 'loaded', data: new THREE.Texture() }],
  // ['tex2', { state: 'loaded', data: new THREE.Texture() }],
  // ['geometry', { state: 'loaded', data: new THREE.BufferGeometry() }],
];
type CacheData =
  | { state: 'pending'; data: Promise<LocalAssetType> }
  | { state: 'loaded'; data: LocalAssetType };
const cache = new Map<string, CacheData>(cacheData);
