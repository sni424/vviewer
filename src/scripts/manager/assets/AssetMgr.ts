import VCache, { FileID, PayloadValue, Promisable } from './VCache';
import { VFile, VRemoteFile } from './VFile';

type Asset<T> = {};

type ProjectId = string;
export class AssetMgr {
  static _cacheMap: Map<ProjectId, VCache> = new Map([
    ['test', new VCache('test')],
  ]);
  static projectId: string = 'test';
  static setProject(id: string) {
    if (this.projectId !== id) {
      this.projectId = id;
      this._cacheMap.set(id, new VCache(id));
    }
  }

  // 프로젝트id에 따라 분기
  static get cache(): VCache {
    if (!this.projectId) {
      throw new Error('Project ID is not set');
    }
    const cache = this._cacheMap.get(this.projectId);
    if (!cache) {
      throw new Error(`Cache for project ${this.projectId} not found`);
    }
    return cache;
  }

  static set<T = any>(
    id: string,
    ...value: Promisable<PayloadValue<T>>[]
  ): void;
  static set(vremotefile: VRemoteFile): void;
  static set(vfile: VFile): void;
  static set<T = any>(
    idCandidate: string | VFile | VRemoteFile,
    ...valueCandidate: Promisable<PayloadValue<T>>[]
  ): void {
    this.cache.set(idCandidate as any, ...valueCandidate);

    // 밖에서 File을 넣으면 cache에 inputBuffer을 넣는다
    if (valueCandidate?.length === 1 && valueCandidate[0] instanceof File) {
      this.cache.set(idCandidate as string, valueCandidate[0].arrayBuffer());
    }
  }

  static get<T = any>(id: FileID): Asset<T> | undefined;
  static get<T = any>(buffer: ArrayBuffer): Asset<T> | undefined;
  static get<T = any>(file: File): Asset<T> | undefined;
  static get<T = any>(vfile: VFile): Asset<T> | undefined;
  static get<T = any>(vremotefile: VRemoteFile): Asset<T> | undefined;
  static get<T = any>(result: T): Asset<T> | undefined;
  static get<T = any>(query: FileID | PayloadValue<T>): Asset<T> | undefined {
    return this.cache.get(query as any);
  }

  // if state == 'loading', 로딩 중인 작업들을 모두 기다린 후 리턴
  static async getAsync<T = any>(
    query: FileID | PayloadValue<T>,
  ): Promise<Asset<T> | undefined> {
    return this.cache.getAsync(query as any).then(cached => {
      console.log('Then finished', { cached });
      return cached as any;
    });
  }
}
