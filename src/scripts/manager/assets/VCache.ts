import { CommonObject } from './AssetTypes';
import { isThreeObject } from './AssetUtils';
import Hasher from './Hasher';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './VFile';

export type FileID = string;
export type Hash = string;

// export type Promisable<T> = T | Promise<T>;
//T | File | ArrayBuffer | VRemoteFile | VFile

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

export type CachePayloadTarget<T = any> = {
  destination: keyof CachePayload<T>;
  from: File | VFile | VRemoteFile | string | any; // 무엇으로부터 promise를 만드는지. 무엇이 됐든 loadingQueue에 추가하기 전에 이미 이 from이 있는지를 검사하기 위한 일종의 id임
  promise?: Promise<CachePayload<T>[keyof CachePayload<T>]>;
  data?: CachePayload<T>[keyof CachePayload<T>];
};
export type Promisable<T = any> = T | CachePayloadTarget<T>;

export type CacheValue<T = any> = {
  id: string;
  hash: string; // 첫 시작시는 id == hash이지만 데이터가 변화됨에 따라 hash가 바뀜
  payload: T;
  loadingQueue: CachePayloadTarget[];
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
  static isLoading(value: CacheValue<any>) {
    return value.loadingQueue.length > 0;
  }

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

  _upsertArrayBuffer<T>(
    cacheValue: CacheValue<CachePayload<T>>,
    value?: ArrayBuffer,
  ) {
    cacheValue.payload.inputBuffer = value;
    if (value) {
      this.cacheByArrayBuffer.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertFile<T>(cacheValue: CacheValue<CachePayload<T>>, value?: File) {
    cacheValue.payload.file = value;
    if (value) {
      this.cacheByFile.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertVFile<T>(cacheValue: CacheValue<CachePayload<T>>, value?: VFile) {
    cacheValue.payload.vfile = value;
    if (value) {
      this.cacheByVFile.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertVRemoteFile<T>(
    cacheValue: CacheValue<CachePayload<T>>,
    value?: VRemoteFile,
  ) {
    cacheValue.payload.vremotefile = value;
    if (value) {
      this.cacheByVRemoteFile.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  _upsertResult<T>(cacheValue: CacheValue<CachePayload<T>>, value?: T) {
    cacheValue.payload.result = value;
    if (value) {
      this.cacheByResult.set(value, cacheValue.id);
    }
    return cacheValue;
  }

  // CacheValue의 각 필드 중 하나를 업서트
  _upsert<T = any>(
    cacheValue: CacheValue<CachePayload<T>>,
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

  isCachePayloadTarget(value: any) {
    return Boolean(value?.destination) && Boolean(value?.from);
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

    // // 이미 같은 value가 있으면 리턴
    // if (this.get(value)) {
    //   return this;
    // }

    // 로직 시작
    const cached = this.cache.get(id);
    const hasCache = cached !== undefined;
    const targetValue: CacheValue<CachePayload<T>> = hasCache
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

    // case 1. value를 Promise로 받은 경우
    if (this.isCachePayloadTarget(value)) {
      const target = value as CachePayloadTarget<T>;

      if (target.promise) {
        // 1. payload의 밸류 업데이트
        const tasks = targetValue.loadingQueue;

        if (tasks.some(p => p.from === target.from)) {
          // 이미 로딩 중인 promise가 있으면 리턴
          return this;
        } else {
          // 서로 다른 promise가 같은 destination을 가리키고 있는 경우
          if (tasks.some(p => p.destination === target.destination)) {
            const existingTask = tasks.find(
              p => p.destination === target.destination,
            );
            console.error(
              '서로 다른 promise가 같은 destination을 가리키고 있는 경우',
              existingTask,
              target,
              this,
              targetValue,
            );
            debugger;
            // debugger;
            // throw new Error('중복된 promise입니다');
          }
        }

        // 로딩 큐에 push
        tasks.push(target);

        target.promise = target.promise.then(result => {
          if (!result) {
            debugger;
          }
          // promise가 끝난 결과 할당
          // (targetValue.payload as any)[prom.destination] = result;
          this._upsert(targetValue, result, target.destination);

          // 최종적으로 loadingQueue에서 자기 자신을 클린업
          const arr = targetValue.loadingQueue;
          const index = arr.findIndex(obj => obj === target);
          if (index !== -1) {
            arr.splice(index, 1);
            // console.log('Spliced');
          }

          return result;
        });
      } else {
        // 2. payload의 밸류 업데이트
        this._upsert(targetValue, target.data, target.destination);
      }
    } else {
      // case 2. value가 Promise가 아닌 경우
      this._upsert(targetValue, value);
    }

    return this;
  }

  getId(query: PayloadValue): string | undefined {
    if (query instanceof ArrayBuffer) {
      return this.cacheByArrayBuffer.get(query);
    } else if (query instanceof File) {
      return this.cacheByFile.get(query);
    } else if (isVFile(query)) {
      return this.cacheByVFile.get(query) ?? (query as VFile).id;
    } else if (isVRemoteFile(query)) {
      return this.cacheByVRemoteFile.get(query) ?? (query as VRemoteFile).id;
    } else if (typeof query === 'object') {
      return this.cacheByObject.get(query);
    } else {
      console.error(query);
      debugger;
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
      debugger;
      return;
    }

    return Promise.all(cached.loadingQueue.map(item => item.promise)).then(
      loadingProms => {
        const retval = this.get(query) as any;
        if (!retval) {
          debugger;
        }
        return retval;
      },
    );
  }
}
