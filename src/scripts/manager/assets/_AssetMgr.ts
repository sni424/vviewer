import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import VTextureLoader from 'src/scripts/loaders/VTextureLoader';
import _Asset, { download } from '../_Asset';
import _VCache, {
  _CachePayload,
  _CachePayloadTarget,
  _CacheValue,
  _PayloadValue,
  _Promisable,
  FileID,
} from './_VCache';
import { isDataArray, TypedArray } from './AssetTypes';
import {
  awaitAll,
  getBufferFormat,
  getDataArray,
  iterateWithPredicate,
} from './AssetUtils';
import BufferGeometryLoader from './BufferGeometryLoader';
import Hasher from './Hasher';
import MaterialLoader from './MaterialLoader';
import ObjectLoader from './ObjectLoader';
import TextureLoader from './TextureLoader';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './VFile';
import Workers from './Workers';

const SERVER_URL = '';
const getFilePath = (path: string) => `${_AssetMgr.projectId}/${path}`;

type ProjectId = string;
export class _AssetMgr {
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
    const url = `${SERVER_URL}/${this.projectId}/files/${query}`;
    return url;
  }

  static fileUrl(query: FileID | VRemoteFile) {
    const id = typeof query === 'string' ? query : query.id;
    return this._fileUrl(id);
  }

  // createURL같은 함수. buffer을 캐시에 등록

  static async inflate(vfile: VFile): Promise<VFile>;
  static async inflate(
    vremoteFile: VRemoteFile,
  ): Promise<VFile | ArrayBuffer | TypedArray>;
  static async inflate(
    input: VFile | VRemoteFile,
  ): Promise<VFile | ArrayBuffer | TypedArray> {
    const cacheValue = await this.cache.getAsync(input);
    if (!cacheValue) {
      debugger;
      throw new Error('Cache not found');
    }

    const { payload } = cacheValue;
    const { vfile, vremotefile, result, inputBuffer } = payload;

    if (!vremotefile) {
      debugger;
      throw new Error('VRemoteFile not found');
    }

    // if (!vfile) {
    //   debugger;
    //   throw new Error('VFile not found');
    // }

    if (vremotefile.format === 'json') {
      if (!vfile) {
        debugger;
        throw new Error('VFile not found');
      }
      const retval = vfile!;

      let count = 0;
      const recursvielyInflate = async (obj: any) => {
        count++;
        if (!obj) {
          return;
        }
        return Promise.all(
          Object.entries(obj).map(async ([key, value]) => {
            if (isVFile(value) || isVRemoteFile(value)) {
              obj[key] = await this.inflate(value as VFile);
            } else if (
              Boolean(value) &&
              typeof value === 'object' &&
              !isDataArray(value)
            ) {
              console.log('value', value);
              await recursvielyInflate(value);
            }
          }),
        );
      };

      await recursvielyInflate(retval);
      console.log('count', count);
      iterateWithPredicate(retval, isVRemoteFile, (value, path) => {
        // debugger;
      });
      // debugger;
      await awaitAll(retval);
      // Object.entries(retval).forEach(async ([key, value]) => {
      //   if (isVFile(value) || isVRemoteFile(value)) {
      //     (retval as any)[key] = await this.inflate(value);
      //   }
      // });
      return retval;
    } else {
      if (!result) {
        debugger;
      }

      const retval = result ?? inputBuffer; //! inputBuffer은 임시방편
      if (!retval) {
        // 임시방편마저 에러인 경우
        debugger;
      }

      return retval as unknown as ArrayBuffer | TypedArray;
    }
  }

  static makeRemoteFile(vfile: VFile): VRemoteFile;
  static makeRemoteFile(buffer: ArrayBufferLike | TypedArray): VRemoteFile;
  static makeRemoteFile(
    input: VFile | ArrayBufferLike | TypedArray,
  ): VRemoteFile {
    const vfile = input as VFile;
    const buffer = input as ArrayBufferLike | TypedArray;

    if (isVFile(vfile)) {
      const remote = {
        isVRemoteFile: true,
        id: vfile.id,
        format: 'json',
      } as VRemoteFile;

      this.set(vfile);

      return remote;
    } else {
      const { format } = getBufferFormat(buffer);

      const retval: VRemoteFile = {
        isVRemoteFile: true,
        id: Hasher.hash(buffer),
        format,
      };

      this.set(retval);
      this.cache.set(retval.id, {
        destination: 'result',
        from: retval,
        data: buffer,
      } as _CachePayloadTarget);
      // console.log('retval.id buffer', retval.id, buffer);

      return retval;
    }
  }

  static _cacheMap: Map<ProjectId, _VCache> = new Map([
    ['test', new _VCache('test')],
  ]);
  static projectId: string = 'test';
  static setProject(id: string) {
    if (this.projectId !== id) {
      this.projectId = id;
      this._cacheMap.set(id, new _VCache(id));
    }
  }

  // 프로젝트id에 따라 분기
  static get cache(): _VCache {
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
    ...value: _Promisable<_PayloadValue<T>>[]
  ): void;
  static set(vremotefile: VRemoteFile): void;
  static set(vfile: VFile): void;
  static set<T = any>(
    idCandidate: string | VFile | VRemoteFile,
    ...valueCandidate: _Promisable<_PayloadValue<T>>[]
  ): void {
    this.cache.set(idCandidate as any, ...valueCandidate);
    const cached = this.cache.get(idCandidate)!;
    if (!cached) {
      // 위에서 cache.set을 불러서 이게 없으면 안된다
      debugger;
    }

    // 만약 똑같은

    // 밖에서 File을 넣으면 cache에 inputBuffer을 넣는다
    const file = valueCandidate.find(v => v instanceof File);
    if (file) {
      const cached = this.cache.get(file);

      const alreadyArrayBuffered =
        cached && Boolean(cached.payload.inputBuffer);
      if (!alreadyArrayBuffered) {
        this.cache.set(
          idCandidate as string,
          {
            destination: 'inputBuffer',
            from: file,
            promise: file.arrayBuffer(),
          } as _CachePayloadTarget,
        );
        return;
      }
    }

    const vfile = isVFile(idCandidate)
      ? (idCandidate as VFile)
      : (valueCandidate.find(v => isVFile(v)) as VFile);
    const vremote = isVRemoteFile(idCandidate)
      ? (idCandidate as VRemoteFile)
      : (valueCandidate.find(v => isVRemoteFile(v)) as VRemoteFile);
    const cachedVRemote = this.cache.get(idCandidate)?.payload?.vremotefile;

    if (vfile && !cachedVRemote) {
      //vfile을 만들어서 넣는데 remote가 없으면 넣어준다
      const vremotefile: VRemoteFile = {
        isVRemoteFile: true,
        id: vfile.id,
        format: 'json',
      };
      this.cache.set(vfile.id, vremotefile);
    }

    if (vfile) {
      iterateWithPredicate(vfile, isVRemoteFile, value => {
        _AssetMgr.set(value);
      });
    }

    if (vremote) {
      if (vremote.format === 'json') {
        const needsDownload = !(
          cached.payload.vfile ||
          cached.loadingQueue.some(q => q.destination === 'vfile')
        );

        if (needsDownload) {
          const prom = download(vremote, {
            type: 'json',
          });
          this.cache.set(vremote.id, {
            destination: 'vfile',
            from: vremote.id + 'initial-download',
            promise: prom,
          } as _CachePayloadTarget);
        }
      } else {
        const needsDownload =
          cached &&
          !cached.payload.inputBuffer &&
          !cached.payload.result &&
          !cached.loadingQueue.some(
            q => q.destination === 'inputBuffer' || q.destination === 'result',
          );

        if (needsDownload) {
          const inflate = false; //  !나중에 압축들어가면 그 때
          const prom = download(vremote, {
            type: 'binary',
            inflate,
          }).then(buffer => {
            return getDataArray(vremote.format as any, buffer);
          });
          this.cache.set(
            idCandidate as string,
            {
              destination: 'result',
              from: vremote.id + 'initial-download',
              promise: prom,
            } as _CachePayloadTarget,
          );
        }
      }
    }
  }

  static async getRemote<T>(id: string, type?: 'json' | 'binary'): Promise<T>;
  static async getRemote<T>(
    param: string | VFile | VRemoteFile,
    type?: 'json' | 'binary',
    inflate?: boolean,
  ) {
    if (typeof param === 'string') {
      if (!type || type === 'json') {
        let retval = fetch(
          `http://localhost:4000/retrieve?filepath=${getFilePath(param)}`,
        ).then(res => res.json());
        if (!type) {
          retval = retval.catch(() => {
            return Workers.fetch(
              `/${_AssetMgr.projectId}/${param}`,
              inflate,
            ) as T;
          });
        }
        return retval;
      } else {
        // type === 'binary'
        return Workers.fetch(`/${getFilePath(param)}`, inflate) as T;
      }
    }

    const obj = param as VFile | VRemoteFile;

    if (isVFile(obj)) {
      return obj as T;
    }

    if (isVRemoteFile(obj)) {
      const file = obj as VRemoteFile;
      const isJson = file.format === 'json';

      if (isJson) {
        return fetch(`http://localhost:4000/retrieve?filepath=${file.id}`).then(
          res => res.json() as Promise<T>,
        );
      } else {
        return Workers.fetch(`/${_AssetMgr.projectId}/${obj.id}`, inflate) as T;
      }
    }

    throw new Error('Invalid object type');
  }

  static get<T = any>(id: FileID): _Asset<T> | undefined;
  static get<T = any>(buffer: ArrayBuffer): _Asset<T> | undefined;
  static get<T = any>(file: File): _Asset<T> | undefined;
  static get<T = any>(vfile: VFile): _Asset<T> | undefined;
  static get<T = any>(vremotefile: VRemoteFile): _Asset<T> | undefined;
  static get<T = any>(result: T): _Asset<T> | undefined;
  static get<T = any>(query: FileID | _PayloadValue<T>): _Asset<T> | undefined {
    const { id } = this.cache.get(query as any) ?? {};
    if (!id) {
      return undefined;
    } else {
      return _Asset.from(query);
    }
  }

  static async _loadLocal<T>(
    cacheValue: _CacheValue<_CachePayload<T>>,
  ): Promise<T> {
    if (cacheValue.loadingQueue.length > 0) {
      debugger;
      throw new Error('Already loading');
    }

    const payload = cacheValue.payload;
    const { file, inputBuffer: buffer } = payload;
    if (!file || !buffer) {
      // 로컬 파일이 있어야 함
      // VFile이라면 load()._loadVFile()에서 먼저 호출되었어야 함
      throw new Error('File not found');
    }

    const fname = file.name;

    const isGlb = fname.toLowerCase().endsWith('.glb');
    const isMap = [
      '.jpg',
      '.jpeg',
      '.png',
      '.exr',
      '.ktx',
      '.ktx2',
      '.hdr',
    ].some(ext => fname.toLowerCase().endsWith(ext));

    // case1. glb
    if (isGlb) {
      const prom = VGLTFLoader.instance.parseAsync(buffer, fname).then(gltf => {
        const scene = gltf.scene;
        scene.traverse(o => {
          if (o.asMesh.isMesh) {
            o.toAsset();
          }
        });
        return gltf.scene;
      });
      const cacheProm: _CachePayloadTarget = {
        destination: 'result',
        from: file,
        promise: prom,
      };
      this.cache.set(cacheValue.id, cacheProm);

      return prom as Promise<T>;
    }

    // case2. map
    if (isMap) {
      const ext = fname.split('.').pop();
      const prom = VTextureLoader.parseAsync(buffer, {
        ext,
      });
      const cacheProm: _CachePayloadTarget = {
        destination: 'result',
        from: file,
        promise: prom,
      };
      this.cache.set(cacheValue.id, cacheProm);

      return prom as Promise<T>;
    }

    throw new Error('Unknown file type');
  }

  static async _loadVFile<T>(vfile: VFile) {
    const { id, type, data } = vfile;
    switch (type) {
      case 'VObject3D':
      case 'VMesh':
        const objectProm = ObjectLoader(vfile);
        this.cache.set(id, {
          destination: 'result',
          from: vfile,
          promise: objectProm,
        } as _CachePayloadTarget);
        return objectProm as Promise<T>;
      case 'VCompressedTexture':
      case 'VDataTexture':
      case 'VTexture':
        const texProm = TextureLoader(vfile);
        this.cache.set(id, {
          destination: 'result',
          from: vfile,
          promise: texProm,
        } as _CachePayloadTarget);
        return texProm as Promise<T>;
      case 'VBufferGeometry':
        const bufferProm = BufferGeometryLoader(vfile);
        this.cache.set(id, {
          destination: 'result',
          from: vfile,
          promise: bufferProm,
        } as _CachePayloadTarget);
        return bufferProm as Promise<T>;
      case 'VMaterial':
        const materialProm = MaterialLoader(vfile);
        this.cache.set(id, {
          destination: 'result',
          from: vfile,
          promise: materialProm,
        } as _CachePayloadTarget);
        return materialProm as Promise<T>;
      default:
        throw new Error(`Unknown VFile type: ${type}`);
    }
  }

  static async load<T = any>(
    query: FileID | _PayloadValue<T>,
  ): Promise<T | undefined> {
    return this.getCacheAsync(query).then(cached => {
      if (!cached) {
        return undefined as T | undefined;
      }
      const {
        file,
        vfile,
        vremotefile,
        inputBuffer: buffer,
        result,
      } = cached.payload;

      // 이미 결과가 있으면 결과를 리턴
      if (result) {
        return result as T | undefined;
      }

      // remotefile만 있고 vfile은 로딩이 안 된 경우
      // if (vremotefile && !vfile) {
      //   const { id, format } = vremotefile;

      //   if (format === 'json') {
      //     const prom = fetch(this.fileUrl(id)).then(res => res.json());

      //     this.cache.set(cached.id, {
      //       destination: 'vfile',
      //       from: vremotefile,
      //       promise: prom,
      //     } as CachePayloadTarget);
      //   } else {
      //     const prom = Workers.fetch(this.fileUrl(id));

      //     this.cache.set(cached.id, {
      //       destination: 'result',
      //       from: vremotefile,
      //       promise: prom,
      //     } as CachePayloadTarget);
      //   }

      //   // vremote를 vfile로 로드했으니 다시 로드를 리턴
      //   return this.load(query) as T | undefined;
      // }

      // case 1. VFile | VRemoteFile
      if (vfile) {
        return this._loadVFile(vfile) as T | undefined;
      }

      // case 2. Local File
      if (cached.payload.file) {
        return this._loadLocal(cached).then(result => {
          if (result) {
            this.cache.set(cached.id, result);
          }
          return result;
        });
      }

      throw new Error('Unknown file type');
    });
  }

  static getCache<T = any>(
    query: FileID | _PayloadValue<T>,
  ): _CacheValue<_CachePayload<T>> | undefined {
    return this.cache.get(query as any);
  }

  static async getCacheAsync<T = any>(
    query: FileID | _PayloadValue<T>,
  ): Promise<_CacheValue<_CachePayload<T>> | undefined> {
    return this.cache.getAsync(query as any).then(cached => {
      return cached as any;
    });
  }

  static loaded(query: FileID | _PayloadValue): boolean {
    const cached = this.getCache(query);
    if (!cached) {
      return false;
    }

    return !_VCache.isLoading(cached);
  }

  static loading(query: FileID | _PayloadValue): boolean {
    const cached = this.getCache(query);
    if (!cached) {
      return false;
    }

    return _VCache.isLoading(cached);
  }

  static loadable(query: FileID | _PayloadValue): boolean {
    const cached = this.getCache(query);
    if (!cached) {
      return false;
    }

    const { payload } = cached;
    const { file, vfile, vremotefile, result } = payload;

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
