import { v4 } from 'uuid';
import { AssetMgr } from './assets/AssetMgr';
import { hashObject, isThreeObject } from './assets/AssetUtils';
import { PayloadValue } from './assets/VCache';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './assets/VFile';

// innerId가 동일한 경우 여기서 찾는다
const _assets: Map<string, Asset> = new Map();
const AssetCache = {
  set(asset: Asset) {
    _assets.set(asset.id, asset);
  },
  get(innerId: string | Asset) {
    if (typeof innerId === 'string') {
      return _assets.get(innerId);
    } else {
      const asset = innerId as Asset;
      return _assets.get(asset.id);
    }
  },
};

export default class Asset<T = any> {
  id!: string;
  // innerId!: string;

  private constructor(id: string) {
    this.id = id;
    // this.innerId = v5(id, AssetMgr.projectId);
    _assets.set(this.id, this);
  }

  static fromObject(obj: any, tryHash = true): Asset {
    const cached = AssetMgr.get(obj);
    if (cached) {
      const assetCache = AssetCache.get(cached.id);
      if (!assetCache) {
        // 이론 상 에셋캐시는 항상 있어야 함
        debugger;
      }
      return assetCache!;
    }

    const id = tryHash ? hashObject(obj) : v4();
    AssetMgr.set(id, obj);

    const asset = new Asset(id);
    AssetCache.set(asset);

    return asset;
  }

  // 캐시 있으면 리턴, 없으면 생성 (payload 이용)
  static fromId(id: string, payload?: PayloadValue): Asset {
    // case 1. cache hit
    const assetCache = AssetCache.get(id);
    if (assetCache) {
      if (payload) {
        // 캐시가 있을 때 id와 payload를 같이 넣으면
        // 다음 두 가지 중 어떻게 해야할 지 정해야 함
        // 1. 기존 캐시의 payload 덮어쓰기
        // 2. 그냥 기존 캐시 리턴하기
        debugger;
      }

      return assetCache;
    }

    // case 2. cache miss
    const asset = new Asset(id);
    if (payload) {
      // id가 있을때만 payload가 가능
      AssetMgr.set(id, payload);
    }
    AssetCache.set(asset);
    return asset;
  }

  static fromVFile(vfile: VFile | VRemoteFile): Asset {
    const cached = AssetMgr.get(vfile);
    if (cached) {
      const assetCache = AssetCache.get(cached.id);
      if (!assetCache) {
        // 이론 상 에셋캐시는 항상 있어야 함
        debugger;
      }
      return assetCache!;
    }

    const id = vfile.id;

    return this.fromId(id, vfile);
  }

  static fromThree(obj: any): Asset {
    if (!isThreeObject(obj)) {
      console.warn(obj, 'not a three object');
      debugger;
      return {} as Asset;
    }

    const cached = AssetMgr.get(obj);
    if (cached) {
      const assetCache = _assets.get(cached.id);
      if (assetCache) {
        return assetCache;
      } else {
        const asset = new Asset(obj.hash);
        AssetCache.set(new Asset(obj.hash));
        return asset;
      }
    }

    const id = obj.vid;
    if (!id) {
      //TODO : three 객세는 vid가 있어야 함
      debugger;
    }
    return this.fromId(id, obj);
  }

  static fromArrayBuffer(buffer: ArrayBuffer): Asset {
    const cached = AssetMgr.get(buffer);
    if (cached) {
      const assetCache = AssetCache.get(cached.id);
      if (!assetCache) {
        // 이론 상 에셋캐시는 항상 있어야 함
        debugger;
      }
      return assetCache!;
    }

    // 캐시되지 않은 어레이버퍼를 그냥 생성할 수는 없음
    console.warn('no cache found fromArrayBuffer', this, buffer);
    debugger;
    throw new Error('no cache found fromArrayBuffer');

    // return hashArrayBuffer(buffer).then(hash => {
    //   const id = hash;
    //   return this.fromId(id, buffer);
    // });
  }

  static from(payload: PayloadValue): Asset;
  static from(id: string, payload?: PayloadValue): Asset;
  static from(
    idCandidate: string | PayloadValue,
    payload?: PayloadValue,
  ): Asset {
    // 캐시된 경우 얼리리턴
    const cached = AssetMgr.get(idCandidate);
    if (cached) {
      const assetCache = AssetCache.get(cached.id);
      if (!assetCache) {
        // 이론 상 에셋캐시는 항상 있어야 함
        debugger;
      }

      return assetCache!;
    }

    // id로 생성하는 경우
    if (typeof idCandidate === 'string') {
      return Asset.fromId(idCandidate, payload);
    } else {
      // payload(File, VFile)로 생성하는 경우

      const payload = idCandidate as PayloadValue;

      // case 1. Local file
      if (payload instanceof File) {
        const id = hashObject(payload);
        return this.fromId(id, payload);
      }

      // case 2. VFile | VRemoteFile
      if (isVFile(payload) || isVRemoteFile(payload)) {
        return this.fromVFile(payload);
      }

      // case 3. ArrayBuffer
      if (payload instanceof ArrayBuffer) {
        // 캐시되지 않은 ArrayBuffer를 넣는 경우는 없다
        debugger;
        throw new Error('');
        // return this.fromArrayBuffer(payload);
      }

      // case 4. Three.js object
      if (isThreeObject(payload)) {
        return this.fromThree(payload);
      }

      // case 5. Object
      return this.fromObject(payload);
    }
  }

  async load(): Promise<T | undefined> {
    return AssetMgr.load<T>(this.id);
  }

  static same(a: Asset, b: Asset): boolean {
    return a === b || a.id === b.id;
  }

  same(b: Asset): boolean {
    return this === b || this.id === b.id;
  }

  loadable(): boolean {
    return AssetMgr.loadable(this.id);
  }

  loaded(): boolean {
    return AssetMgr.loaded(this.id);
  }
}
