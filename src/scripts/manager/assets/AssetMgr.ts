import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import VTextureLoader from 'src/scripts/loaders/VTextureLoader';
import Asset from '../Asset';
import { iterateObjectWithPredicate } from './AssetMgr copy';
import {
  awaitAll,
  getBufferFormat,
  getTypedArray,
  TYPED_ARRAY_NAMES,
  TypedArray,
} from './AssetUtils';
import BufferGeometryLoader from './BufferGeometryLoader';
import Hasher from './Hasher';
import MaterialLoader from './MaterialLoader';
import ObjectLoader from './ObjectLoader';
import TextureLoader from './TextureLoader';
import VCache, {
  CachePayload,
  CachePromise,
  CacheValue,
  FileID,
  PayloadValue,
  Promisable,
} from './VCache';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './VFile';
import Workers from './Workers';

const SERVER_URL = '';
const getFilePath = (path: string) => `${AssetMgr.projectId}/${path}`;

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
            } else if (Boolean(obj) && typeof obj === 'object') {
              await recursvielyInflate(value);
            }
          }),
        );
      };

      await recursvielyInflate(retval);
      console.log('count', count);
      iterateObjectWithPredicate(retval, isVRemoteFile, (value, path) => {
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
      const retval = result ?? inputBuffer; //! inputBuffer은 임시방편
      if (!retval) {
        // 임시방편마저 에러인 경우
        debugger;
      }

      return result as unknown as ArrayBuffer | TypedArray;
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
        promise: Promise.resolve(buffer),
      });
      // console.log('retval.id buffer', retval.id, buffer);

      return retval;
    }
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
        this.cache.set(
          idCandidate as string,
          {
            destination: 'inputBuffer',
            from: file,
            promise: file.arrayBuffer(),
          } as CachePromise,
        );
        return;
      }
    }

    const vfile = valueCandidate.find(v => isVFile(v)) as VFile;
    const vremote = valueCandidate.find(v => isVRemoteFile(v)) as VRemoteFile;
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
        this.cache.set(
          idCandidate as string,
          {
            destination: 'result',
            promise: prom,
          } as CachePromise,
        );
        // !TODO : AssetMgr.load 구현
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
              `/${AssetMgr.projectId}/${param}`,
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
        return Workers.fetch(`/${AssetMgr.projectId}/${obj.id}`, inflate) as T;
      }
    }

    throw new Error('Invalid object type');
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

  static async _loadLocal<T>(
    cacheValue: CacheValue<CachePayload<T>>,
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
      const prom = VGLTFLoader.instance
        .parseAsync(buffer, fname)
        .then(gltf => gltf.scene);
      const cacheProm: CachePromise = {
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
      const cacheProm: CachePromise = {
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
        } as CachePromise);
        return objectProm as Promise<T>;
      case 'VCompressedTexture':
      case 'VDataTexture':
      case 'VTexture':
        const texProm = TextureLoader(vfile);
        this.cache.set(id, {
          destination: 'result',
          from: vfile,
          promise: texProm,
        } as CachePromise);
        return texProm as Promise<T>;
      case 'VBufferGeometry':
        const bufferProm = BufferGeometryLoader(vfile);
        this.cache.set(id, {
          destination: 'result',
          from: vfile,
          promise: bufferProm,
        } as CachePromise);
        return bufferProm as Promise<T>;
      case 'VMaterial':
        const materialProm = MaterialLoader(vfile);
        this.cache.set(id, {
          destination: 'result',
          from: vfile,
          promise: materialProm,
        } as CachePromise);
        return materialProm as Promise<T>;
      default:
        throw new Error(`Unknown VFile type: ${type}`);
    }
  }

  static async load<T = any>(
    query: FileID | PayloadValue<T>,
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
      if (vremotefile && !vfile) {
        const { id, format } = vremotefile;

        if (format === 'json') {
          const prom = fetch(this.fileUrl(id)).then(res => res.json());

          this.cache.set(cached.id, {
            destination: 'vfile',
            from: vremotefile,
            promise: prom,
          } as CachePromise);
        } else {
          const prom = Workers.fetch(this.fileUrl(id));

          this.cache.set(cached.id, {
            destination: 'result',
            from: vremotefile,
            promise: prom,
          } as CachePromise);
        }

        // vremote를 vfile로 로드했으니 다시 로드를 리턴
        return this.load(query) as T | undefined;
      }

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
    query: FileID | PayloadValue<T>,
  ): CacheValue<CachePayload<T>> | undefined {
    return this.cache.get(query as any);
  }

  static async getCacheAsync<T = any>(
    query: FileID | PayloadValue<T>,
  ): Promise<CacheValue<CachePayload<T>> | undefined> {
    return this.cache.getAsync(query as any).then(cached => {
      return cached as any;
    });
  }

  static loaded(query: FileID | PayloadValue): boolean {
    const cached = this.getCache(query);
    if (!cached) {
      return false;
    }

    return !VCache.isLoading(cached);
  }

  static loading(query: FileID | PayloadValue): boolean {
    const cached = this.getCache(query);
    if (!cached) {
      return false;
    }

    return VCache.isLoading(cached);
  }

  static loadable(query: FileID | PayloadValue): boolean {
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
