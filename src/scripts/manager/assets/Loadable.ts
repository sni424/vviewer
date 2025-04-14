// 재귀적으로 객체를 FileID로 변환하는 유틸리티 타입
// ex)
// type MyType = { depth1 : { depth2 : SomeType; } } 일 때

import AssetMgr from './AssetMgr';
import { FileID, VAssetType } from './AssetTypes';
import type VFile from './VFile';

// LoadableAssets<MyType> = { depth1 : { depth2 : FileID; } }
export type LoadableAssetWithIds<T> = {
  [K in keyof T]: T[K] extends any[] | undefined
    ? LoadableAssetWithIds<T[K]>[] | FileID[] // Arrays map to FileID[]
    : T[K] extends object | undefined
      ? LoadableAssetWithIds<T[K]> // Recurse into objects
      : LoadableAssetWithIds<T[K]> | FileID; // Leaf values map to FileID
};

// Generic Loadable interface
export default abstract class Loadable<T extends Record<string, any>> {
  id!: FileID;
  abstract get type(): VAssetType;
  name?: string;
  state: 'loadable' | 'loading' | 'loaded' = 'loadable';
  loadables?: LoadableAssetWithIds<T>; // loadables로부터 하위의 data를 구한다
  data: null | T = null;

  constructor(
    params: ({ id: FileID; name?: string } & LoadableAssetWithIds<T>) | T,
  ) {
    const { id, name } = params;
    this.id = id;
    if (!id) {
      console.error(this, params);
      throw new Error('id is required');
    }
    this.name = name;
    this.loadables = params;
  }

  load(forceReload?: boolean): Promise<this> {
    this.state = 'loading';
    this.beforeLoading?.(this);

    // 강제 재실행이 아니면 캐시된 데이터가 있는지 확인
    const useCache = !forceReload;
    if (!forceReload) {
      const cached = AssetMgr.get<T>(this.id);
      if (cached) {
        this.data = cached;
        this.state = 'loaded';
        return Promise.resolve(this);
      }
    }

    return this.parse().then(data => {
      this.data = data;
      AssetMgr.set(this.id, data);
      this.state = 'loaded';

      if (this.onLoad) {
        return this.onLoad?.(this);
      }

      return Promise.resolve(this);
    });
  }

  // 상속받은 클래스에서 각각 구현
  abstract parse(forceReload?: boolean): Promise<T>;

  beforeLoading?: (thisInstance: this) => void;
  onLoad?: (thisInstance: this) => any;

  // type casters
  get asVFile(): VFile<T> {
    throw new Error('Not VFile');
  }
  get asVTexture(): VFile<T> {
    throw new Error('Not VTexture');
  }
  get asVMaterial(): VFile<T> {
    throw new Error('Not VMaterial');
  }
  get asVScene(): VFile<T> {
    throw new Error('Not VScene');
  }
  get asVObject3D(): VFile<T> {
    throw new Error('Not VObject3D');
  }
  get asVProject(): VFile<T> {
    throw new Error('Not VProject');
  }
  get asVOption(): VFile<T> {
    throw new Error('Not VOption');
  }
  get asVBufferGeometry(): VFile<T> {
    throw new Error('Not VBufferGeometry');
  }
}
