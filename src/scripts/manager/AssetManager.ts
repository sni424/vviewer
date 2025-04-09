import { v4 } from 'uuid';
import { THREE } from 'VTHREE';
type AssetMeta = {
  id: string;
  name: string;
  version: number;
  mesh: any[];
  material: any[];
  texture: any[];
  geometry: any[];
  // walls:any[];
  // rooms:any[];
};
type AssetType =
  | THREE.Mesh
  | THREE.Material
  | THREE.Texture
  | THREE.BufferGeometry;

type AssetManagerSetParams = {};

type AssetState = 'idle' | 'loading' | 'uploading' | 'finish' | 'error';

const AssetDataCache = new Map<string, AssetType>();

export class Asset<T extends AssetType = any> {
  id!: string;
  name?: string;
  data?: T;
  type: 'empty' | 'mesh' | 'material' | 'geometry' | 'texture' | 'probe' =
    'empty';
  isAsset = true;
  isRemoteAsset: boolean = false;
  uploaded = false;
  state: AssetState = 'idle';

  constructor(remoteAsstet?: RemoteAssetJson<T>);
  constructor(data?: T | RemoteAssetJson<T>) {
    this.id = v4();

    if ((data as RemoteAssetJson<T>)?.assetJson) {
      this.fromJSON(data as RemoteAssetJson<T>);
      return;
    }

    if (data) {
      this.set(data as T);
      AssetDataCache.set(this.id, data as T);
    }
  }

  onStateChange?: (this: Asset<T>, state: AssetState) => void;
  onIdle?: (this: Asset<T>) => void;
  onUpload?: (this: Asset<T>) => void;
  onLoading?: (this: Asset<T>) => void;
  onFinish?: (this: Asset<T>) => void;
  onError?: (this: Asset<T>) => void;

  setState(targetState: AssetState) {
    if (this.state === targetState) {
      return;
    }

    this.state = targetState;
    this.onStateChange?.call(this, targetState);
    switch (targetState) {
      case 'idle':
        this.onIdle?.call(this);
        break;
      case 'loading':
        this.onLoading?.call(this);
        break;
      case 'uploading':
        this.onUpload?.call(this);
        break;
      case 'finish':
        this.onFinish?.call(this);
        break;
      case 'error':
        this.onError?.call(this);
        break;
    }
  }

  get(): Promise<T> {
    if (this.data) {
      this.setState('finish');
      return Promise.resolve(this.data);
    }

    if (!this.data) {
      const cached = AssetDataCache.get(this.id);
      if (cached) {
        this.data = cached as T;
        this.setState('finish');
        return Promise.resolve(this.data);
      }
    }

    if (!this.data && this.isRemoteAsset) {
      return this._loadRemote();
    }
    !TODO : 불러오는 로직 완성
    return Promise.resolve(this.data!);
  }
  _loadRemote(): Promise<T> {
    if (!this.assetUrl) {
      throw new Error('assetUrl이 없습니다.');
    }

    return fetch(this.assetUrl)
      .then(res => res.arrayBuffer())
      .then(data => {
        switch (this.type) {
          case 'mesh':
            return new THREE.Mesh() as T;
          case 'material':
            return new THREE.Material() as T;
          case 'texture':
            return new THREE.Texture() as T;
          case 'probe':
            return new THREE.Texture() as T;
          default:
            throw new Error(`Unknown asset type ${this.type}`);
        }
      });
  }

  set(data: T) {
    const mesh = data as THREE.Mesh;
    const mat = data as THREE.Material;
    const geom = data as THREE.BufferGeometry;
    const tex = data as THREE.Texture;

    const isValid =
      mesh.isMesh || mat.isMaterial || tex.isTexture || geom.isBufferGeometry;
    if (!isValid) {
      throw new Error('지원하지 않는 타입입니다.');
    }

    this.uploaded = false;
    this.setState('idle');
    this.data = data;
    this.name = (data as any).name ?? 'NONAME';
    this.id = (data as any).vUserData.id ?? (data as any).uuid ?? this.id;
    this.type = 'empty';

    if (mesh.isMesh) {
      this.type = 'mesh';
    } else if (mat.isMaterial) {
      this.type = 'material';
    } else if (tex.isTexture) {
      this.type = 'texture';
    } else if (geom.isBufferGeometry) {
      this.type = 'geometry';
    } else {
      throw new Error('지원하지 않는 타입입니다.');
    }
  }

  toJSON(): RemoteAssetJson<T> {
    if (!this.uploaded) {
      throw new Error('업로드되지 않은 Asset입니다.');
    }

    if (!this.data) {
      throw new Error('data가 없습니다.');
    }
    return {} as any;
  }

  async upload(basePath = '', url?: string): Promise<RemoteAssetJson<T>> {
    if (this.uploaded) {
      return this.toJSON();
    }

    if (!this.data) {
      throw new Error('업로드할 데이터가 없습니다.');
    }

    return new Promise((resolve, reject) => {
      this.uploaded = true;
      this.assetUrl = 'someAssetUrl';
      resolve(this.toJSON());
    });
  }

  fromJSON(json: any): this {
    type FieldValue = keyof this;

    const prevValues: Record<FieldValue, any> = {} as any;
    for (const key in this) {
      // if is field value, store it to prevValues
      if (this[key] && typeof this[key] !== 'function') {
        prevValues[key as FieldValue] = this[key];
      }
    }

    try {
      this.id = json.id;
      this.name = json.name;
      this.type = json.type;
      this.assetUrl = json.url;
      this.uploaded = true;
    } catch (e) {
      console.error('Failed to parse JSON', json, e);
      this.setState('error');
      for (const key in prevValues) {
        this[key as keyof this] = prevValues[key as FieldValue];
      }
    }

    return this;
  }
  assetUrl?: string;
}

type RemoteAssetJson<T = any> = {
  assetJson: true;
  id: string;
  name: string;
  type: 'mesh' | 'material' | 'texture' | 'probe';
  url: string;
  data: T;
};

class RemoteAsset<T extends AssetType = any> extends Asset<T> {
  _loadRemote(): Promise<T> {}

  constructor() {
    super();
    this.isRemoteAsset = true;
  }

  fromJSON(json: any) {
    this.id = json.id;
    this.name = json.name;
    this.url = json.url;
  }

  async fromUrl(url: string) {
    return fetch(url)
      .then(res => res.json())
      .then(json => {
        return this.fromJSON(json);
      });
  }
}

class _AssetManager {
  id: string = v4();
  name: string = 'Untitled';

  version: number = 0;
  meshes: Asset<THREE.Mesh>[] = [];
  materials: Asset<THREE.Material>[] = [];
  textures: Asset<THREE.Texture>[] = [];
  geometries: Asset<THREE.BufferGeometry>[] = [];
  // walls:any[] = [];
  // rooms:any[] = [];

  constructor() {}

  set(meta: AssetMeta, params: AssetManagerSetParams) {
    this.id = meta.id;
    this.name = meta.name;
  }
}

const AssetManager = new _AssetManager();
export default AssetManager;
