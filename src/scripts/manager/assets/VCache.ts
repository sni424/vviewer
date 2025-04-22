import { CommonObject } from './AssetTypes';
import { isThreeObject } from './AssetUtils';
import Hasher from './Hasher';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './VFile';

export type FileID = string;
export type Hash = string;

export type Promisable<T> = T | Promise<T>;

export type CachePayload<T = any> = {
  file?: File; // input file
  inputBuffer?: ArrayBuffer; // 로컬File, 또는 VRemoteFile.binary이 인풋인 경우
  // resultBuffer?: ArrayBuffer; // upload 직전의 result ab
  // obj?: CommonObject; // VFile도 아니고 VRemoteFile도 아닌 일반 오브젝트

  // 순서
  // * VFile = load(VRemoteFile)
  //    buffer = fetchArrayBuffer(toUrl(VRemoteFile.id));
  //    if (hint === 'json') { VFile = parse(buffer); }
  //    if (hint === 'binary') { inputBuffer = unzip(buffer); }
  //
  // * Result = load(VFile)
  //    if ( type === 'VFile' )
  //      result = VFile; // 일반 json 객체
  //    if ( type === 'VTexture' )
  //      result = texture = TextureLoader(vfile);

  vremotefile?: VRemoteFile;
  vfile?: VFile;

  // 상위 파일들로부터 나온 데이터
  // load()로부터 나온 값임. ( set()으로부터 나온 값이 아님 )
  result?: T; // THREE.Material, THREE.Texture, 일반 오브젝트 등 추적할 데이터
};
export type PayloadValue<T = any> = CachePayload<T>[keyof CachePayload<T>];

export type CacheValue<T> = {
  id: string;
  hash: string; // 첫 시작시는 id == hash이지만 데이터가 변화됨에 따라 hash가 바뀜
  state: 'loading' | 'loaded';
  payload: T;
  loadingQueue: Map<Promise<PayloadValue<T>>, boolean>; // 로딩 중인 payload
};

class CacheValueHasher {
  static objectHashMap = new WeakMap<object, string>();
  static objectHashCounter = 0;

  static payload(payload: CachePayload): string {
    const keys = [
      'file',
      'inputBuffer',
      // 'obj',
      'vfile',
      'vremotefile',
      'result',
    ] as const;

    const hashParts: string[] = [];

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) continue;

      const useCache = true;
      if (isThreeObject(value)) {
        hashParts.push(value.vid);
      } else {
        // Hash.hash에서 같은 오브젝트에 대한 해시는 알아서 캐싱
        hashParts.push(Hasher.hash(value, useCache));
      }
    }

    return hashParts.join('|');
  }
}

let _cacheCount = 1;
export default class VCache {
  constructor(public name: string = 'Cache' + _cacheCount++) {}

  cache: Map<FileID, CacheValue<CachePayload>> = new Map();

  // payloadable로부터 캐시를 역으로 찾을 때 필요한 맵들
  cacheByFile: Map<File, FileID> = new Map();
  cacheByObject: Map<CommonObject, FileID> = new Map();
  cacheByArrayBuffer: Map<ArrayBuffer, FileID> = new Map();
  cacheByVFile: Map<VFile, FileID> = new Map();
  cacheByVRemoteFile: Map<VRemoteFile, FileID> = new Map();
  cacheByResult: Map<any, FileID> = new Map();
  cacheByHash: Map<Hash, FileID> = new Map();

  _updateDerivedCache(cache: Map<any, any>, id: string, value?: any) {
    if (value) {
      cache.set(value, id);
    } else {
      cache.delete(value!);
    }
  }

  // CacheValue의 각 필드 중 하나를 업서트
  _upsert<T = any>(
    cacheValue: CacheValue<CachePayload<T>>,
    value: PayloadValue<T>,
  ) {
    const payload = cacheValue.payload;
    if (value !== undefined && Object.values(payload).includes(value)) {
      // 같은 밸류를 다시 업데이트하려고하면 리턴
      return;
    }
    if (value instanceof ArrayBuffer) {
      payload.inputBuffer = value;
    } else if (value instanceof File) {
      payload.file = value;
    } else if (isVFile(value)) {
      payload.vfile = value as VFile;
    } else if (isVRemoteFile(value)) {
      payload.vremotefile = value as VRemoteFile;
    } else if (typeof value === 'object') {
      // three.js 객체인지 확인
      if (isThreeObject(value)) {
        // three.js 객체인 경우
        payload.result = value as T;
      } else {
        // payload.obj = value as CommonObject;
        throw new Error('지원하지 않는 타입입니다');
      }
    } else {
      // result는 load()에서 저장하는 값이
      throw new Error('지원하지 않는 타입입니다');
    }

    // 해시 업데이트
    cacheValue.hash = CacheValueHasher.payload(payload);

    // 참조캐시들 업데이트
    {
      const id = cacheValue.id;
      this._updateDerivedCache(
        this.cacheByArrayBuffer,
        id,
        payload.inputBuffer,
      );
      this._updateDerivedCache(this.cacheByFile, id, payload.file);
      // this._updateDerivedCache(this.cacheByObject, id, payload.obj);
      this._updateDerivedCache(this.cacheByVFile, id, payload.vfile);
      this._updateDerivedCache(
        this.cacheByVRemoteFile,
        id,
        payload.vremotefile,
      );
      this._updateDerivedCache(this.cacheByResult, id, payload.result);
      this._updateDerivedCache(this.cacheByHash, id, cacheValue.hash);
    }

    return cacheValue;
  }

  set<T = any>(id: string, ...value: Promisable<PayloadValue<T>>[]): this;
  set(vremotefile: VRemoteFile): this;
  set(vfile: VFile): this;
  set<T = any>(
    idCandidate: string | VFile | VRemoteFile,
    ...valueCandidate: Promisable<PayloadValue<T>>[]
  ): this {
    // valueCandidate길이가 2 이상일 때
    if (typeof idCandidate === 'string' && valueCandidate?.length > 1) {
      valueCandidate.forEach(value => this.set(idCandidate, value));
      return this;
    }

    // VFile인 경우 대응
    let id: string;
    let value: Promisable<PayloadValue<T>>;
    if (isVFile(idCandidate) || isVRemoteFile(idCandidate)) {
      // VFile인 경우 valueCandidate.length === 0이다 (뒤의 param이 없다)
      id = (idCandidate as VFile).id;
      value = idCandidate as Promisable<PayloadValue<T>>;
    } else {
      id = idCandidate as string;
      //  이 경우 반드시 valueCandidate의 길이가 1이어야 함
      value = valueCandidate[0] as Promisable<PayloadValue<T>>;
    }

    // 이미 같은 value가 있으면 리턴
    if (this.get(value)) {
      return this;
    }

    // if (id === 'vfile2') {
    //   debugger;
    // }
    // 로직 시작
    const cached = this.cache.get(id);
    const hasCache = cached !== undefined;
    const targetValue: CacheValue<CachePayload<T>> = hasCache
      ? cached
      : {
          id,
          hash: id,
          state: 'loading' as const,
          payload: {
            file: undefined,
            inputBuffer: undefined,
            // obj: undefined,
            vfile: undefined,
            vremotefile: undefined,
            result: undefined,
          },
          loadingQueue: new Map(),
        };

    // 캐시된게 없으면 일단 저장
    if (!hasCache) {
      this.cache.set(id, targetValue);
      // derived캐시는 이후 _upsert에서 업데이트
    }

    // case 1. value를 Promise로 받은 경우
    if (value instanceof Promise) {
      // promise이므로 loading
      targetValue.state = 'loading';

      // 1. payload의 밸류 업데이트
      const currentHashProm = targetValue.hash;
      const loadingPromise = value.then((payloadValue: PayloadValue<T>) => {
        const futureCache = this.cache.get(id)!;
        if (!futureCache) {
          // 끝나고 돌아왔는데 캐시삭제됨
          return;
        }

        // 바뀌지 않았다면 prom 객체도 같을 것이다
        if (currentHashProm !== futureCache.hash) {
          // 만약 업데이트가 끝났는데 내용이 바뀌어있으면 리턴
          return;
        }
        this._upsert(futureCache, payloadValue);

        futureCache.loadingQueue.delete(loadingPromise as any);

        if (futureCache.loadingQueue.size === 0) {
          // 남은 작업이 없다면 로드 종료
          targetValue.state = 'loaded';
        }

        return payloadValue;
      });

      targetValue.loadingQueue.set(loadingPromise as any, true);
    } else {
      // case 2. value가 Promise가 아닌 경우

      this._upsert(targetValue, value);
      targetValue.state = 'loaded';
    }

    return this;
  }

  getId(query: PayloadValue): string | undefined {
    if (query instanceof ArrayBuffer) {
      return this.cacheByArrayBuffer.get(query);
    } else if (query instanceof File) {
      return this.cacheByFile.get(query);
    } else if (isVFile(query)) {
      return this.cacheByVFile.get(query);
    } else if (isVRemoteFile(query)) {
      return this.cacheByVRemoteFile.get(query);
    } else if (typeof query === 'object') {
      return this.cacheByObject.get(query);
    } else {
      throw new Error('지원하지 않는 타입입니다');
    }
  }

  get<T = any>(id: FileID): CacheValue<CachePayload<T>> | undefined;
  get<T = any>(buffer: ArrayBuffer): CacheValue<CachePayload<T>> | undefined;
  get<T = any>(file: File): CacheValue<CachePayload<T>> | undefined;
  get<T = any>(vfile: VFile): CacheValue<CachePayload<T>> | undefined;
  get<T = any>(
    vremotefile: VRemoteFile,
  ): CacheValue<CachePayload<T>> | undefined;
  get<T = any>(result: T): CacheValue<CachePayload<T>> | undefined;
  get<T = any>(
    query: FileID | PayloadValue<T>,
  ): CacheValue<CachePayload<T>> | undefined {
    let id: string | undefined;
    if (typeof query !== 'string') {
      id = this.getId(query);
    } else {
      id = query;
    }

    if (id) {
      return this.cache.get(id);
    }
  }

  // if state == 'loading', 로딩 중인 작업들을 모두 기다린 후 리턴
  async getAsync<T = any>(
    query: FileID | PayloadValue<T>,
  ): Promise<CacheValue<CachePayload<T>> | undefined> {
    const cached = this.get(query);
    if (!cached) {
      return;
    }

    if (cached.state === 'loaded') {
      return cached as any;
    }

    return Promise.all(cached.loadingQueue!.keys()).then(() => {
      console.log('Then finished');
      return this.get(query) as any;
    });
  }
}
