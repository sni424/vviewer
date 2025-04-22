import Asset from '../Asset';
import {
  getBufferFormat,
  getTypedArray,
  TYPED_ARRAY_NAMES,
  TypedArray,
} from './AssetUtils';
import Hasher from './Hasher';
import VCache, {
  CachePayload,
  CacheValue,
  FileID,
  PayloadValue,
  Promisable,
} from './VCache';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './VFile';
import Workers from './Workers';

type ProjectId = string;
export class AssetMgr {
  static async makeRemoteFilePrecise(
    buffer: ArrayBufferLike | TypedArray,
  ): Promise<VRemoteFile> {
    const { format } = getBufferFormat(buffer);
    const retval: VRemoteFile = {
      isVRemoteFile: true,
      id: await Hasher.hashPrecisely(buffer),
      format,
    };
    this.set(retval);

    return retval;
  }

  protected static _fileUrl(query: FileID) {
    const url = `/${this.projectId}/files/${query}`;
    return url;
  }

  static fileUrl(query: FileID | VRemoteFile) {
    const id = typeof query === 'string' ? query : query.id;
    return this._fileUrl(id);
  }

  // createURL같은 함수. buffer을 캐시에 등록

  static makeRemoteFile(buffer: ArrayBufferLike | TypedArray): VRemoteFile {
    const { format } = getBufferFormat(buffer);
    const retval: VRemoteFile = {
      isVRemoteFile: true,
      id: Hasher.hash(buffer),
      format,
    };
    this.set(retval);

    return retval;
  }

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

    // 만약 똑같은

    // 밖에서 File을 넣으면 cache에 inputBuffer을 넣는다
    const file = valueCandidate.find(v => v instanceof File);
    if (file) {
      const cached = this.cache.get(file);

      const alreadyArrayBuffered =
        cached && Boolean(cached.payload.inputBuffer);
      if (!alreadyArrayBuffered) {
        this.cache.set(idCandidate as string, file.arrayBuffer());
        return;
      }
    }

    const vremote = valueCandidate.find(v => isVRemoteFile(v)) as VRemoteFile;
    if (vremote) {
      const cached = this.cache.get(vremote);
      const alreadyDownloading = cached && Boolean(cached.payload.inputBuffer);

      if (!alreadyDownloading) {
        const id = vremote.id;
        const inflate = false; //  !나중에 압축들어가면 그 때
        const prom = Workers.fetch(this.fileUrl(id), inflate).then(buffer => {
          if (TYPED_ARRAY_NAMES.includes(vremote.format as any)) {
            return getTypedArray(vremote.format as any, buffer);
          }
          return buffer;
        });
        this.cache.set(idCandidate as string, prom);
        !TODO : AssetMgr.load 구현
      }
    }
  }

  static get<T = any>(id: FileID): Asset<T> | undefined;
  static get<T = any>(buffer: ArrayBuffer): Asset<T> | undefined;
  static get<T = any>(file: File): Asset<T> | undefined;
  static get<T = any>(vfile: VFile): Asset<T> | undefined;
  static get<T = any>(vremotefile: VRemoteFile): Asset<T> | undefined;
  static get<T = any>(result: T): Asset<T> | undefined;
  static get<T = any>(query: FileID | PayloadValue<T>): Asset<T> | undefined {
    const { id } = this.cache.get(query as any) ?? {};
    if (!id) {
      return undefined;
    } else {
      return Asset.fromId(id);
    }
  }

  static async load<T = any>(
    query: FileID | PayloadValue<T>,
  ): Promise<T | undefined> {
    return this.getCacheAsync(query).then(cached => {
      if (!cached) {
        return undefined as T;
      }

      const result = cached.payload.result;
      if (result) {
        return result as T;
      }

      // case 1. VFile | VRemoteFile

      // case 2. Local File

      return {} as T;
    });
  }

  static getCache<T = any>(
    query: FileID | PayloadValue<T>,
  ): CacheValue<CachePayload<T>> | undefined {
    return this.cache.get(query as any);
  }

  static async getCacheAsync<T = any>(
    query: FileID | PayloadValue<T>,
  ): Promise<CacheValue<CachePayload<T>> | undefined> {
    return this.cache.getAsync(query as any).then(cached => {
      console.log('Then finished', { cached });
      return cached as any;
    });
  }

  static loaded(query: FileID | PayloadValue): boolean {
    const cached = this.getCache(query);
    if (!cached) {
      return false;
    }

    if (cached.state === 'loading') {
      return false;
    }

    return Boolean(cached.payload.result);
  }

  static loadable(query: FileID | PayloadValue): boolean {
    const cached = this.getCache(query);
    if (!cached) {
      return false;
    }

    const { payload } = cached;
    const { file, inputBuffer, vfile, vremotefile, result } = payload;

    // 이미 결과가 있음
    if (result) {
      return true;
    }

    // case 1. VFile | VRemoteFile
    if (isVFile(vfile) || isVRemoteFile(vremotefile)) {
      return true;
    }

    // case 2. local file
    if (file instanceof File) {
      return true;
    }

    return false;
  }
}
