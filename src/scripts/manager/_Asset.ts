import { v4 } from 'uuid';
import { _AssetMgr } from './assets/_AssetMgr';
import { _CachePayloadTarget, _PayloadValue } from './assets/_VCache';
import { FileID, isDataArray, TypedArray } from './assets/AssetTypes';
import {
  hashObject,
  isThreeObject,
  iterateWithPredicate,
} from './assets/AssetUtils';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './assets/VFile';
import Workers from './assets/Workers';
import Ext from './Ext';

const getFilePath = (path: string) => `${_AssetMgr.projectId}/${path}`;

// async function download<T>(
//   id: string,
//   type?: 'json' | 'binary',
//   inflate?: boolean,
// ): Promise<T>;
export type DownloadWithChildren = {
  self: VFile;
  vremotefiles: VRemoteFile[];
  vfiles: VFile[];
};
type DownloadOption = {
  type?: 'json' | 'binary';
  inflate?: boolean; // arraybuffer를 inflate할지 여부
  withChildren?: boolean;
};

export async function downloadJson(query: URLSearchParams) {
  // !TODO : VO로드 시 get 에러
  return fetch(`http://localhost:4000/retrieve?${query}`)
    .then(res => res.json())
    .catch(e => {
      throw new Error(e);
    });
}

export async function download<T = any>(
  param: FileID | VFile | VRemoteFile,
  downloadOptions?: DownloadOption,
): Promise<T> {
  const { type, inflate, withChildren } = downloadOptions ?? {};
  const projectId = _AssetMgr.projectId;
  const queryParams = new URLSearchParams({
    projectId,
    // fileId,
    withChildren: withChildren ? 'true' : 'false',
  });

  if (typeof param === 'string') {
    if (param === '53892431-8e7c-480b-a229-ffb3f8f17ef1') {
      debugger;
    }
    queryParams.append('fileId', param);
    if (type === 'json') {
      try {
        return downloadJson(queryParams);
      } catch (e) {
        debugger;
      }
    } else if (type === 'binary') {
      return Workers.fetch(`${getFilePath(param)}`, inflate) as T;
    } else {
      // type === undefined

      try {
        const retval = downloadJson(queryParams);
        return retval;
      } catch (e) {
        try {
          const retval = Workers.fetch(`${getFilePath(param)}`, inflate) as T;
          return retval;
        } catch (e2) {
          debugger;
        }
      }
    }
  }

  const obj = param as VFile | VRemoteFile;

  if (isVFile(obj)) {
    return obj as T;
  }

  if (isVRemoteFile(obj)) {
    if (!withChildren) {
      return obj as T;
    }

    const file = obj as VRemoteFile;
    queryParams.append('fileId', file.id);
    const isJson = file.format === 'json';

    if (isJson) {
      return fetch(`http://localhost:4000/retrieve?${queryParams}`).then(
        res => res.json() as Promise<T>,
      );
    } else {
      return Workers.fetch(`/${_AssetMgr.projectId}/${obj.id}`, inflate) as T;
    }
  }

  throw new Error('Invalid object type');
}

export type VUploadable<T extends Record<string, any> = any> = {
  vremotefile: VRemoteFile;
  data: VFile<T> | ArrayBuffer | TypedArray;
};

// innerId가 동일한 경우 여기서 찾는다
const _assets: Map<string, _Asset> = new Map();
const AssetCache = {
  set(asset: _Asset) {
    _assets.set(asset.id, asset);
  },
  get(innerId: string | _Asset) {
    if (typeof innerId === 'string') {
      return _assets.get(innerId);
    } else {
      const asset = innerId as _Asset;
      return _assets.get(asset.id);
    }
  },
};

export default class _Asset<T = any> {
  id!: string;
  // innerId!: string;

  private constructor(id: string) {
    this.id = id;
    // this.innerId = v5(id, AssetMgr.projectId);
    _assets.set(this.id, this);
  }

  static fromObject(obj: any, tryHash = true): _Asset {
    const cached = _AssetMgr.cache.get(obj);
    if (cached) {
      const assetCache = AssetCache.get(cached.id);
      if (!assetCache) {
        // 이론 상 에셋캐시는 항상 있어야 함
        debugger;
      }
      return assetCache!;
    }

    const id = tryHash ? hashObject(obj) : v4();
    _AssetMgr.set(id, obj);

    const asset = new _Asset(id);
    AssetCache.set(asset);

    return asset;
  }

  // 캐시 있으면 리턴, 없으면 생성 (payload 이용)
  static fromId(id: string, payload?: _PayloadValue): _Asset {
    // case 1. cache hit
    const assetCache = AssetCache.get(id);
    if (assetCache) {
      // cache가 있으면 payload가 있던말던 리턴
      // if (payload) {
      //   // 캐시가 있을 때 id와 payload를 같이 넣으면
      //   // 다음 두 가지 중 어떻게 해야할 지 정해야 함
      //   // 1. 기존 캐시의 payload 덮어쓰기
      //   // 2. 그냥 기존 캐시 리턴하기
      //   debugger;
      // }

      return assetCache;
    }

    // case 2. cache miss
    const asset = new _Asset(id);
    if (payload) {
      // id가 있을때만 payload가 가능
      _AssetMgr.set(id, payload);

      if (isVFile(payload)) {
        // recursively check vfile & vremotefile
        const vfile = payload as VFile;
        // !TODO : VFile이거나 VRemoteFile인 경우 내부를 돌면서 Asset + Cache에 넣어야 함

        iterateWithPredicate<VFile | VRemoteFile>(
          payload,
          v => isVFile(v) || isVRemoteFile(v),
          value => {
            _AssetMgr.set(value.id, value);
          },
        );
      }

      if (isVRemoteFile(payload)) {
        const vremotefile = payload as VRemoteFile;
        const destination = vremotefile.format === 'json' ? 'vfile' : 'result';
        const cacheProm = {
          destination,
          from: vremotefile.id + 'initial-download',
          promise: download<VRemoteFile | ArrayBuffer>(vremotefile, {
            type: vremotefile.format === 'json' ? 'json' : 'binary',
          }),
        } as _CachePayloadTarget;

        _AssetMgr.cache.set(vremotefile.id, cacheProm);
      }
    } else {
      // try download
      try {
        _AssetMgr.cache.set(id, {
          destination: 'result',
          from: id + 'initial-download',
          promise: new Promise(async (res, rej) => {
            const downloaded = await download<
              ArrayBuffer | DownloadWithChildren
            >(id, {
              withChildren: true,
              type: isDataArray(payload) ? 'binary' : 'json',
            });

            const downloadError = (downloaded as any)?.error;
            if (downloadError) {
              console.warn('FromId : ', id, payload, downloadError);
              return undefined;
            }

            if (downloaded instanceof ArrayBuffer) {
              return downloaded;
            }

            const { self, vfiles, vremotefiles } = downloaded;

            _AssetMgr.cache.set(id, {
              destination: 'vfile',
              from: id + 'set-vfile',
              data: self,
            } as _CachePayloadTarget);

            // 먼저 vfile에 대해서 에셋들을 만든 후
            vfiles.forEach(vfile => {
              console.log(vfile);
              _Asset.from(vfile);
            });

            // 위의 vfile과 연관된 remoteFile은 알아서 캐시에 들어갈 것이고, format !== 'json'인 버퍼들은 위의 await download()에서 arraybuffer로 들어감
            vremotefiles.forEach(vremotefile => {
              console.log(vremotefile);
              _Asset.from(vremotefile);
            });

            return self; // result에 vfile을 set하게 될 것임
          }),
        } as _CachePayloadTarget);
      } catch (e) {
        console.warn('다운로드 실패', id, e);
      }
    }
    AssetCache.set(asset);
    return asset;
  }

  static fromVFile(vfile: VFile | VRemoteFile): _Asset {
    if (vfile?.id === 'fc3a5981d1afbcaef9980ad60180e91ba4245fa4') {
      debugger;
    }
    const cached = _AssetMgr.cache.get(vfile);
    if (cached) {
      const assetCache = AssetCache.get(cached.id);
      if (!assetCache) {
        // 이론 상 에셋캐시는 항상 있어야 함
        debugger;
      }
      return assetCache!;
    }

    const id = vfile.id;

    return _Asset.fromId(id, vfile);
  }

  static fromThree(obj: any): _Asset {
    if (!isThreeObject(obj)) {
      console.warn(obj, 'not a three object');
      debugger;
      return {} as _Asset;
    }

    const cached = _AssetMgr.cache.get(obj);
    if (cached) {
      const assetCache = _assets.get(cached.id);
      if (assetCache) {
        return assetCache;
      } else {
        const asset = new _Asset(obj.hash);
        AssetCache.set(new _Asset(obj.hash));
        return asset;
      }
    }

    const id = obj.vid;
    if (!id) {
      //TODO : three 객세는 vid가 있어야 함
      debugger;
    }
    return _Asset.fromId(id, obj);
  }

  static fromArrayBuffer(buffer: ArrayBuffer): _Asset {
    const cached = _AssetMgr.cache.get(buffer);
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
    //   return Asset.fromId(id, buffer);
    // });
  }

  static from(payload: _PayloadValue): _Asset;
  static from(id: string, payload?: _PayloadValue): _Asset;
  static from(
    idCandidate: string | _PayloadValue,
    payload?: _PayloadValue,
  ): _Asset {
    if (idCandidate?.id === 'fc3a5981d1afbcaef9980ad60180e91ba4245fa4') {
      debugger;
    }

    // 캐시된 경우 얼리리턴
    const cached = _AssetMgr.cache.get(idCandidate);
    if (cached) {
      const assetCache = AssetCache.get(cached.id);
      if (!assetCache) {
        // 이론 상 에셋캐시는 항상 있어야 함
        _assets;
        debugger;
      }

      return assetCache!;
    }

    console.log('! cache miss : ', idCandidate, payload);

    // id로 생성하는 경우
    if (typeof idCandidate === 'string') {
      return _Asset.fromId(idCandidate, payload);
    } else {
      // payload(File, VFile)로 생성하는 경우

      const payload = idCandidate as _PayloadValue;

      // case 1. Local file
      if (payload instanceof File) {
        const id = hashObject(payload);
        return _Asset.fromId(id, payload);
      }

      // case 2. VFile | VRemoteFile
      if (isVFile(payload) || isVRemoteFile(payload)) {
        if (!_Asset) {
          debugger;
        }
        return _Asset.fromVFile(payload);
      }

      // case 3. ArrayBuffer
      if (payload instanceof ArrayBuffer) {
        // 캐시되지 않은 ArrayBuffer를 넣는 경우는 없다
        debugger;
        throw new Error('');
        // return Asset.fromArrayBuffer(payload);
      }

      // case 4. Three.js object
      if (isThreeObject(payload)) {
        return _Asset.fromThree(payload);
      }

      // case 5. Object
      return _Asset.fromObject(payload);
    }
  }

  async load<T = any>(): Promise<T> {
    return _AssetMgr.load<T>(this.id) as Promise<T>;
  }

  static same(a: _Asset, b: _Asset): boolean {
    return a === b || a.id === b.id;
  }

  same(b: _Asset): boolean {
    return this === b || this.id === b.id;
  }

  loadable(): boolean {
    return _AssetMgr.loadable(this.id);
  }

  loaded(): boolean {
    return _AssetMgr.loaded(this.id);
  }

  get filename(): string | undefined {
    const cached = _AssetMgr.getCache(this.id);
    if (cached?.payload?.file?.name) {
      return cached.payload.file.name;
    }

    return undefined;
  }

  get vfile(): VFile {
    const cached = _AssetMgr.getCache(this.id);
    if (cached?.payload?.vfile) {
      return cached.payload.vfile;
    }

    throw new Error('vfile not found');
  }

  get vremotefile(): VRemoteFile {
    const cached = _AssetMgr.getCache(this.id);
    if (cached?.payload?.vremotefile) {
      return cached.payload.vremotefile;
    }

    throw new Error('vremotefile not found');
  }

  get result(): T {
    const cached = _AssetMgr.getCache(this.id);
    if (cached?.payload?.result) {
      return cached.payload.result as T;
    }

    throw new Error('result not found');
  }

  get isGlb() {
    return this.filename?.toLowerCase()?.endsWith('.glb');
  }

  get isMap() {
    if (!this.filename) {
      return false;
    }

    const mapname = new Ext(this.filename).ext;
    const retval = ['jpg', 'jpeg', 'png', 'exr', 'ktx', 'ktx2', 'hdr'].includes(
      mapname as string,
    );

    if (retval) {
      console.log(mapname);
      return true;
    }

    return false;
  }

  static async result<T = any>(query: FileID | _PayloadValue) {
    return _AssetMgr
      .getCacheAsync(query)
      .then(cache => cache?.payload?.result as T);
  }

  static async buffer(query: FileID | _PayloadValue) {
    return _AssetMgr
      .getCacheAsync(query)
      .then(cache => cache?.payload?.inputBuffer);
  }

  static async file(query: FileID | _PayloadValue) {
    return _AssetMgr.getCacheAsync(query).then(cache => cache?.payload?.file);
  }

  static async vfile<T extends VFile = any>(query: FileID | _PayloadValue) {
    if (isVFile(query)) {
      return query;
    }

    return _AssetMgr
      .getCacheAsync(query)
      .then(cache => cache?.payload?.vfile as T);
  }

  static async vremotefile<T extends VRemoteFile = any>(
    query: FileID | _PayloadValue,
  ) {
    if (isVRemoteFile(query)) {
      return query;
    }

    return _AssetMgr
      .getCacheAsync(query)
      .then(cache => cache?.payload?.vremotefile as T);
  }

  async download(
    children: VUploadable[] = [],
  ): Promise<{ self: VUploadable; children: VUploadable[] } | undefined> {
    const cache = await _AssetMgr.getCacheAsync(this.id);
    if (!cache) {
      console.warn('다운로드할 수 없음', this.id, this);
      return undefined;
    }

    const { payload } = cache;
    const { vremotefile, vfile, inputBuffer, result } = payload;

    if (!vremotefile) {
      console.warn('vremotefile이 없음', this.id, this);
      return undefined;
    }

    if (vremotefile.format === 'json') {
      if (!vfile) {
        debugger;
      }

      const addChildren = async (obj: object) => {
        return Promise.all(
          Object.entries(obj!).map(async ([key, value]) => {
            if (typeof value !== 'object' || !Boolean(value)) {
              return;
            }

            if (isVFile(value) || isVRemoteFile(value)) {
              const childAlreadyExists = children.find(
                c => c.vremotefile.id === value.id,
              );

              if (!childAlreadyExists) {
                const child = await _Asset.from(value).download(children);

                children.push(child!.self);
              }
            } else {
              await addChildren(value);
            }
          }),
        );
      };

      await addChildren(vfile!);

      return {
        self: {
          vremotefile,
          data: vfile!,
        },
        children,
      };
    } else {
      // self.
      const retval = result ?? inputBuffer;
      if (!retval) {
        debugger;
      }
      return {
        self: {
          vremotefile,
          data: retval as ArrayBuffer,
        },
        children,
      };
    }

    // return retval;
  }

  async inflate<T extends VFile = any>(): Promise<T | undefined> {
    if (!this.vfile) {
      return undefined;
    }
    return _AssetMgr.inflate(this.vfile) as Promise<T>;
  }
}
