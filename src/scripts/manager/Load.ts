// * Stage 1. Prep(aration)
// 로컬 또는 리모트에 있는 에셋을 준비.
// 캐시되어있으면 캐시된 것을 사용
//
// 1. 로컬의 경우 - Asset.create 시
//     File.arrayBuffer()을 실행
//
// 2. 리모트의 경우 - Asset.create 시
//   2-1. url : ArrayBuffer 준비
//     - url : fetch(url).then(res => res.arrayBuffer())
//     - arrayBuffer : 바로 사용
//   2-2. 위에서 준비한 ArrayBuffer을 이용하여
//     - VObject = await deserialize(arrayBuffer); // 웹워커에서 deserialize
//
// * State
//   - new Asset을 생성하면 empty
//   - prep 중이면 prep

const prepCache = new Map<any, Asset>();

type AssetState = 'empty' | 'prep' | 'loadable' | 'loading' | 'loaded';

type LocalAssetParam = File;
type RemoteAssetParam = string | ArrayBuffer;
type AssetLocation = 'local' | 'remote';
type AssetParam =
  | {
      object: LocalAssetParam;
      type: 'local';
    }
  | {
      object: RemoteAssetParam;
      type: 'remote';
    };

type AssetUploadParams = {
  workSpace: string;
};
class AssetMgr {
  static async upload(asset: Asset, params: AssetUploadParams) {}
}

abstract class Asset {
  abstract assetLocation: AssetLocation;
  state: AssetState = 'empty';

  abstract load<T = any>(): Promise<T>;
  abstract serialize(): ArrayBuffer;
  upload(params: AssetUploadParams): Promise<any> {
    return AssetMgr.upload(this, params);
  }

  static from(arrayBuffer: ArrayBuffer, loc?: AssetLocation): RemoteAsset;
  static from(url: string): RemoteAsset;
  static from(file: File): LocalAsset;
  static from<T extends AssetParam['type']>(
    params: Extract<AssetParam, { type: T }>,
  ): Asset;
  static from(
    params: AssetParam | ArrayBuffer | string | File,
    loc?: AssetLocation,
  ): Asset {
    const cached = prepCache.get(params);
    if (cached) {
      return cached;
    }
    if (params.type === 'local') {
      return new LocalAsset(params.object);
    }

    if (params.type === 'remote') {
      return new RemoteAsset(params.object);
    }

    throw new Error('Invalid asset type');
  }

  asRemote() {
    return this as unknown as RemoteAsset;
  }

  asLocal() {
    return this as unknown as LocalAsset;
  }

  on(state: AssetState, cb: (this: Asset) => this) {}
  setState(state: AssetState) {
    this.state = state;
  }
}

class RemoteAsset extends Asset {
  assetLocation: AssetLocation = 'remote';
  constructor(public object: RemoteAssetParam) {
    super();
    this.state = 'prep';
    // prepCache.set(object, this);
  }

  async load<T>() {
    return Promise.resolve({} as T);
  }

  async prepare() {
    if (this.state === 'prep') {
      this.state = 'loading';
      // fetch
      const res = await fetch(this.object as string);
      const arrayBuffer = await res.arrayBuffer();
      this.state = 'loaded';
      return this;
    }
    return this;
  }
}

class LocalAsset extends Asset {
  assetLocation: AssetLocation = 'local';
  constructor(public object: LocalAssetParam) {
    super();
    this.state = 'prep';
    // prepCache.set(object, this);
  }

  async load<T>() {
    return Promise.resolve({} as T);
  }

  async prepare() {
    if (this.state === 'prep') {
      this.state = 'loading';
      const arrayBuffer = await this.object.arrayBuffer();
      this.state = 'loaded';
      return this;
    }
    return this;
  }
}

////////////////////////////////////////////////
// case 1. 로컬

const LocalFile: File = new File([''], 'test.glb', {
  type: 'model/gltf-binary',
});
const ExrFile = new File([''], 'test.exr');
const JpgFile = new File([''], 'test.jpg');
const KtxFile = new File([''], 'test.ktx');
const PngFile = new File([''], 'test.png');
const JsonFile = new File([''], 'test.json');

import * as THREE from 'three';
declare module 'three' {
  // interface Mesh {
  //   toAsset(): Asset;
  // }
  // interface Material {
  //   toAsset(): Asset;
  // }
  // interface BufferGeometry {
  //   toAsset(): Asset;
  // }
  // interface Texture {
  //   toAsset(): Asset;
  // }
}
Asset.from(LocalFile)
  .load<THREE.Mesh>()
  .then(mesh => {
    // * 1안.
    const arrayBuffer = mesh.toAsset().serialize(); // Object3D, Geometry, Material, Texture에 대해 toAsset()을 구현
    // upload ArrayBuffer;
    const remoteAsset = Asset.from(arrayBuffer);

    // * 2안.
    mesh.toAsset().upload({
      workSpace: 'test',
    });
  });

////////////////////////////////////////////////
// case 2. 리모트
const RemoteFile: string | ArrayBuffer = '';
const url = ''; // arraybuffer을 받을 수 있는 url
const arrayBuffer = new ArrayBuffer(8);

Asset.from(RemoteFile)
  .load()
  .then(res => {});
