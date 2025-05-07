import { isThreeObject } from './AssetUtils';
import Hasher from './Hasher';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './VFile';

export type FileID = string;
export type Hash = string;

// export type Promisable<T> = T | Promise<T>;
//T | File | ArrayBuffer | VRemoteFile | VFile

export type CachePayload<T = any> = {
  file: File; // input file

  /**
   * @param inputBuffer
   * 로컬File.arrayBuffer()
   * * VFile = load(VRemoteFile)
   *    buffer = fetchArrayBuffer(toUrl(VRemoteFile.id));
   *    if (hint === 'json') { VFile = parse(buffer); }
   *    if (hint === 'binary') { inputBuffer = unzip(buffer); }
   *   //
   * * Result = load(VFile)
   *    if ( type === 'VFile' )
   *      result = VFile; // 일반 json 객체
   *    if ( type === 'VTexture' )
   *      result = texture = TextureLoader(vfile);
   */
  inputBuffer: ArrayBuffer;

  vremotefile: VRemoteFile;
  vfile: VFile;

  /**
   * @param result
   * 상위 파일들로부터 나온 데이터
   * load()로부터 나온 값임. ( set()으로부터 나온 값이 아님 )
   * THREE.Material, THREE.Texture, 일반 오브젝트 등 추적할 데이터
   */
  result: T;
};
export type PayloadValue<T = any> = CachePayload<T>[keyof CachePayload<T>];

export type CachePayloadPromise<ResultType = any, PromiseType = any> = {
  destination: keyof CachePayload<ResultType>;
  from: any; // 무엇으로부터 promise를 만드는지. 무엇이 됐든 loadingQueue에 추가하기 전에 이미 이 from이 있는지를 검사하기 위한 일종의 id임
  promise: Promise<PromiseType>;
};
export type Promisable<T = any> = T | CachePayloadPromise<T>;

export type CacheValue<T = any> = {
  id: string;
  hash: string; // 첫 시작시는 id == hash이지만 데이터가 변화됨에 따라 hash가 바뀜
  payload: Partial<CachePayload<T>>;
  loadingQueue: CachePayloadPromise<T>[];
};

class CacheValueHasher {
  static objectHashMap = new WeakMap<object, string>();
  static objectHashCounter = 0;

  static payload(payload: CacheValue['payload']): string {
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
  static isLoading(value: CacheValue<any>) {
    return value.loadingQueue.length > 0;
  }

  constructor(public name: string = 'Cache' + _cacheCount++) {}

  cache: Map<FileID, CacheValue> = new Map();

  // payloadable로부터 캐시를 역으로 찾을 때 필요한 맵들
  cacheByFile: Map<File, FileID> = new Map();
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

  _upsertArrayBuffer<T>(cacheValue: CacheValue<T>, value?: ArrayBuffer) {
    cacheValue.payload.inputBuffer = value;
    if (value) {
      this.cacheByArrayBuffer.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertFile<T>(cacheValue: CacheValue<T>, value?: File) {
    cacheValue.payload.file = value;
    if (value) {
      this.cacheByFile.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertVFile<T>(cacheValue: CacheValue<T>, value?: VFile) {
    cacheValue.payload.vfile = value;
    if (value) {
      this.cacheByVFile.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertVRemoteFile<T>(cacheValue: CacheValue<T>, value?: VRemoteFile) {
    cacheValue.payload.vremotefile = value;
    if (value) {
      this.cacheByVRemoteFile.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertResult<T>(cacheValue: CacheValue<T>, value?: T) {
    cacheValue.payload.result = value;
    if (value) {
      this.cacheByResult.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  // CacheValue의 각 필드 중 하나를 업서트
  _upsert<T = any>(
    cacheValue: CacheValue<T>,
    value: PayloadValue<T>,
    destination?: keyof CachePayload<T>,
  ) {
    const payload = cacheValue.payload;
    if (value !== undefined && Object.values(payload).includes(value)) {
      // 같은 밸류를 다시 업데이트하려고하면 리턴
      return;
    }

    let upsertBuffer: boolean = false;
    let upsertFile: boolean = false;
    let upsertVFile: boolean = false;
    let upsertVRemoteFile: boolean = false;
    let upsertResult: boolean = false;

    if (destination) {
      if (destination === 'inputBuffer') {
        upsertBuffer = true;
      } else if (destination === 'file') {
        upsertFile = true;
      } else if (destination === 'vfile') {
        upsertVFile = true;
      } else if (destination === 'vremotefile') {
        upsertVRemoteFile = true;
      } else if (destination === 'result') {
        upsertResult = true;
      }
    } else {
      // destination이 없으면 value의 타입에 따라 결정
      if (value instanceof ArrayBuffer) {
        upsertBuffer = true;
      } else if (value instanceof File) {
        upsertFile = true;
      } else if (isVFile(value)) {
        upsertVFile = true;
      } else if (isVRemoteFile(value)) {
        upsertVRemoteFile = true;
      } else if (typeof value === 'object') {
        upsertResult = true;
      }
    }

    if (upsertBuffer) {
      this._upsertArrayBuffer(cacheValue, value as ArrayBuffer);
    } else if (upsertFile) {
      this._upsertFile(cacheValue, value as File);
    } else if (upsertVFile) {
      this._upsertVFile(cacheValue, value as VFile);
    } else if (upsertVRemoteFile) {
      this._upsertVRemoteFile(cacheValue, value as VRemoteFile);
    } else if (upsertResult) {
      this._upsertResult(cacheValue, value as T);
    } else {
      debugger;
      throw new Error('업서트할 수 없는 타입입니다');
    }

    cacheValue.hash = CacheValueHasher.payload(payload);
    const id = cacheValue.id;
    this._updateDerivedCache(this.cacheByHash, id, cacheValue.hash);

    return cacheValue;
  }

  // 캐시값을 가져옴. 없으면 생성
  getWithInit(id: string) {
    // 로직 시작
    const cached = this.cache.get(id);
    const hasCache = cached !== undefined;
    const targetValue: CacheValue<CachePayload> = hasCache
      ? cached
      : {
          id,
          hash: id,
          payload: {
            file: undefined,
            inputBuffer: undefined,
            // obj: undefined,
            vfile: undefined,
            vremotefile: undefined,
            result: undefined,
          },
          loadingQueue: [],
        };

    // 캐시된게 없으면 일단 저장
    if (!hasCache) {
      this.cache.set(id, targetValue);
      // derived캐시는 이후 _upsert에서 업데이트
    }

    return targetValue;
  }

  getFile(id: string): File | undefined {
    return this.cache.get(id)?.payload?.file;
  }

  getBuffer(id: string): ArrayBuffer | undefined {
    return this.cache.get(id)?.payload?.inputBuffer;
  }

  getVFile(id: string): VFile | undefined {
    return this.cache.get(id)?.payload?.vfile;
  }
  getVRemoteFile(id: string): VRemoteFile | undefined {
    return this.cache.get(id)?.payload?.vremotefile;
  }
  getResult<T>(id: string): T {
    return this.cache.get(id)?.payload?.result as T;
  }

  async getFileAsync(id: string): Promise<File | undefined> {
    const cached = this.cache.get(id);
    if (!cached) {
      return;
    }

    const file = cached?.payload?.file;
    if (file) {
      return file;
    }

    const prom = cached.loadingQueue.find(item => item.destination === 'file')
      ?.promise as Promise<File>;

    return prom;
  }

  async getBufferAsync(id: string): Promise<ArrayBuffer | undefined> {
    const cached = this.cache.get(id);
    if (!cached) {
      return;
    }

    const buffer = cached?.payload?.inputBuffer;
    if (buffer) {
      return buffer;
    }

    const prom = cached.loadingQueue.find(
      item => item.destination === 'inputBuffer',
    )?.promise as Promise<ArrayBuffer>;

    return prom;
  }

  _hasValue(
    idContainer: string | { id: string },
    key: keyof CachePayload,
  ): boolean {
    const id = typeof idContainer === 'string' ? idContainer : idContainer.id;

    const cached = this.cache.get(id);
    const payload = cached?.payload;
    if (!payload) {
      return false;
    }

    // case 1. 이미 값이 payload에 있다
    const loadedValue = payload[key];
    if (Boolean(loadedValue)) {
      return true;
    }

    // case 2. 로딩큐에 promise가 있다
    const prom = cached.loadingQueue.find(
      item => item.destination === key,
    )?.promise;

    const hasPromiseInQueue = prom !== undefined;
    if (hasPromiseInQueue) {
      return true;
    }

    // 아무것도 없음
    return false;
  }

  hasVFile(idContainer: string | { id: string }): boolean {
    return this._hasValue(idContainer, 'vfile');
  }

  hasVRemoteFile(idContainer: string | { id: string }): boolean {
    return this._hasValue(idContainer, 'vremotefile');
  }

  hasResult(idContainer: string | { id: string }): boolean {
    return this._hasValue(idContainer, 'result');
  }

  hasFile(idContainer: string | { id: string }): boolean {
    return this._hasValue(idContainer, 'file');
  }

  hasBuffer(idContainer: string | { id: string }): boolean {
    return this._hasValue(idContainer, 'inputBuffer');
  }

  async getVFileAsync(id: string): Promise<VFile | undefined> {
    const cached = this.cache.get(id);
    if (!cached) {
      return;
    }

    const vfile = cached?.payload?.vfile;
    if (vfile) {
      return vfile;
    }

    const prom = cached.loadingQueue.find(item => item.destination === 'vfile')
      ?.promise as Promise<VFile>;

    return prom;
  }

  async getVRemoteFileAsync(id: string): Promise<VRemoteFile | undefined> {
    const cached = this.cache.get(id);
    if (!cached) {
      return;
    }

    const vremotefile = cached?.payload?.vremotefile;
    if (vremotefile) {
      return vremotefile;
    }

    const prom = cached.loadingQueue.find(
      item => item.destination === 'vremotefile',
    )?.promise as Promise<VRemoteFile>;

    return prom;
  }

  async getResultAsync<T>(id: string): Promise<T | undefined> {
    const cached = this.cache.get(id);
    if (!cached) {
      return;
    }

    const result = cached?.payload?.result;
    if (result) {
      return result;
    }

    const prom = cached.loadingQueue.find(item => item.destination === 'result')
      ?.promise as Promise<T>;

    return prom;
  }

  setFile(id: string, file: File): this {
    const cachedOrCreated = this.getWithInit(id);
    cachedOrCreated.payload.file = file;

    this._upsertFile(cachedOrCreated, file);

    return this;
  }

  setBuffer(id: string, buffer: ArrayBuffer): this {
    const cachedOrCreated = this.getWithInit(id);
    cachedOrCreated.payload.inputBuffer = buffer;

    this._upsert(cachedOrCreated, buffer, 'inputBuffer');

    return this;
  }
  setVFile(vfile: VFile): this {
    const id = vfile.id;
    const cachedOrCreated = this.getWithInit(id);
    cachedOrCreated.payload.vfile = vfile;
    cachedOrCreated.hash = CacheValueHasher.payload(cachedOrCreated.payload);

    this._upsert(cachedOrCreated, vfile, 'vfile');

    return this;
  }

  setVRemoteFile(vremotefile: VRemoteFile): this {
    const id = vremotefile.id;
    const cachedOrCreated = this.getWithInit(id);
    cachedOrCreated.payload.vremotefile = vremotefile;
    cachedOrCreated.hash = CacheValueHasher.payload(cachedOrCreated.payload);

    this._upsert(cachedOrCreated, vremotefile, 'vremotefile');

    return this;
  }

  setResult(id: string, result: any): this {
    const cachedOrCreated = this.getWithInit(id);
    cachedOrCreated.payload.result = result;
    cachedOrCreated.hash = CacheValueHasher.payload(cachedOrCreated.payload);

    this._upsert(cachedOrCreated, result, 'result');

    return this;
  }

  /**
   *
   * @param destination Promise가 끝나면 payload[destination]에 저장됨
   * @param promise
   * @param key
   * @returns
   */
  setPromise(
    id: string,
    destination: keyof CachePayload,
    promise: Promise<any>,
    key: any,
  ): this {
    const cachedOrCreated = this.getWithInit(id);

    // debugging
    {
      const alreadyHaveSameDestination = cachedOrCreated.loadingQueue.find(
        q => q.destination === destination,
      );
      if (alreadyHaveSameDestination) {
        debugger;
      }
      const alreadyHaveSameKey = cachedOrCreated.loadingQueue.find(
        q => q.from === key,
      );
      if (alreadyHaveSameKey) {
        debugger;
      }
    }

    const target: CachePayloadPromise = {
      destination,
      from: key,
      promise,
    };

    target.promise = target.promise.then(result => {
      if (!result) {
        debugger;
      }
      // promise가 끝난 결과 할당
      // (targetValue.payload as any)[prom.destination] = result;
      this._upsert(cachedOrCreated, result, target.destination);

      // 최종적으로 loadingQueue에서 자기 자신을 클린업
      const arr = cachedOrCreated.loadingQueue;
      const index = arr.findIndex(obj => obj === target);
      if (index !== -1) {
        arr.splice(index, 1);
        // console.log('Spliced');
      }

      return result;
    });

    cachedOrCreated.loadingQueue.push(target);

    return this;
  }

  set(vremotefile: VRemoteFile): this;
  set(vfile: VFile): this;
  set(id: string, ...values: PayloadValue[]): this;
  set<T = any>(
    idCandidate: string | VFile | VRemoteFile,
    ...values: PayloadValue<T>[]
  ): this {
    if (isVFile(idCandidate)) {
      const vfile = idCandidate as VFile;
      this.setVFile(vfile);
    } else if (isVRemoteFile(idCandidate)) {
      const vremotefile = idCandidate as VRemoteFile;
      this.setVRemoteFile(vremotefile);
    } else {
      const id = idCandidate as string;
      values.forEach(value => {
        if (value instanceof File) {
          this.setFile(id, value);
        } else if (value instanceof ArrayBuffer) {
          this.setBuffer(id, value);
        } else if (isVFile(value)) {
          this.setVFile(value as VFile);
        } else if (isVRemoteFile(value)) {
          this.setVRemoteFile(value as VRemoteFile);
        } else if (typeof value === 'object') {
          this.setResult(id, value);
        } else {
          throw new Error('지원하지 않는 타입입니다');
        }
      });
    }

    return this;
  }
  getId(query: FileID | PayloadValue): string | undefined {
    if (typeof query === 'string') {
      return query;
    }

    if (query instanceof ArrayBuffer) {
      return this.cacheByArrayBuffer.get(query);
    } else if (query instanceof File) {
      return this.cacheByFile.get(query);
    } else if (isVFile(query)) {
      return this.cacheByVFile.get(query) ?? (query as VFile).id;
    } else if (isVRemoteFile(query)) {
      return this.cacheByVRemoteFile.get(query) ?? (query as VRemoteFile).id;
    } else if (typeof query === 'object') {
      return this.cacheByResult.get(query);
    } else {
      console.error(query);
      debugger;
      throw new Error('지원하지 않는 타입입니다');
    }
  }

  get<T = any>(id: FileID): CacheValue<T> | undefined;
  get<T = any>(buffer: ArrayBuffer): CacheValue<T> | undefined;
  get<T = any>(file: File): CacheValue<T> | undefined;
  get<T = any>(vfile: VFile): CacheValue<T> | undefined;
  get<T = any>(vremotefile: VRemoteFile): CacheValue<T> | undefined;
  get<T = any>(result: T): CacheValue<T> | undefined;
  get<T = any>(query: FileID | PayloadValue<T>): CacheValue<T> | undefined {
    const id = this.getId(query);

    if (id) {
      return this.cache.get(id);
    }
  }

  has<T = any>(id: FileID): boolean;
  has<T = any>(buffer: ArrayBuffer): boolean;
  has<T = any>(file: File): boolean;
  has<T = any>(vfile: VFile): boolean;
  has<T = any>(vremotefile: VRemoteFile): boolean;
  has<T = any>(result: T): boolean;
  has<T = any>(query: FileID | PayloadValue<T>): boolean {
    const id = this.getId(query);
    return this.cache.has(id!);
  }

  async getAsync<T = any>(
    query: FileID | PayloadValue<T>,
  ): Promise<CacheValue<T> | undefined> {
    const cached = this.get(query);
    if (!cached) {
      debugger;
      return;
    }

    return Promise.all(cached.loadingQueue.map(item => item.promise)).then(
      () => {
        const retval = this.get(query) as any;
        if (!retval) {
          // 로딩큐를 기다렸는데 캐시값이 없어진게 말이 안 됨
          debugger;
        }
        return retval;
      },
    );
  }
}
