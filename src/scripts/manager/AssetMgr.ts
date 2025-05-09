import VGLTFLoader from '../loaders/VGLTFLoader';
import VTextureLoader from '../loaders/VTextureLoader';
import {
  DataArray,
  isTypedArray,
  TYPED_ARRAY_NAMES,
  TypedArray,
} from './assets/AssetTypes';
import {
  getBufferFormat,
  getTypedArray,
  iterateWithPredicate,
} from './assets/AssetUtils';
import BufferGeometryLoader from './assets/BufferGeometryLoader';
import Hasher from './assets/Hasher';
import MaterialLoader from './assets/MaterialLoader';
import ObjectLoader from './assets/ObjectLoader';
import TextureLoader from './assets/TextureLoader';
import VCache, { CachePayload } from './assets/VCache';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './assets/VFile';
import Workers from './assets/Workers';

type ProjectId = string;

export type DownloadWithChildren = {
  self: VFile;
  vremotefiles: VRemoteFile[];
  vfiles: VFile[];
};

interface UploadResponse {
  message: string;
  filePath: string;
  error?: string;
}

export type VFileInflateOption = {
  inPlace?: boolean; // true면 vfile을 직접 수정, false면 clone한 후 수정
  replaceBuffer?: boolean; // VRemoteFile.format이 buffer | TypedArray인 경우 이것까지 바꿔줄지 여부
};

export type AssetUploadOption = {
  recursive?: boolean; // VFile인 경우 하위의 VFile, VRemoteFile, Binary파일까지 업로드
};

// obj를 재귀적으로 돌면서 내부의 ArrayBuffer만 Uint8Array로 변환하는 함수
// ArrayBuffer을 mongodb에 저장하면 데이터가 날아가서 일단 Uint8Array로 변환
function sanitizeObject(obj: any): any {
  // Handle null or non-object types (return unchanged)
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle ArrayBuffer
  if (obj instanceof ArrayBuffer) {
    return new Uint8Array(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Handle objects
  const result: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = sanitizeObject(obj[key]);
    }
  }
  return result;
}

async function fileToJson<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const json = JSON.parse((event.target as any).result);
        resolve(json as T);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = error => reject(error);

    reader.readAsText(file);
  });
}

export default class AssetMgr {
  private constructor() {}

  static projectId: string;

  static cache: VCache;
  static cacheMap: Map<ProjectId, VCache> = new Map();
  static setProject(id: string): VCache {
    if (id === AssetMgr.projectId) {
      return AssetMgr.cache;
    }

    AssetMgr.projectId = id;
    AssetMgr.cache = AssetMgr.cacheMap.get(id) ?? new VCache(id);

    return AssetMgr.cache;
  }

  // 캐시확인없이 다운로드만 하고 캐시에 등록하지 않음
  static async _downloadJson(
    id: string,
    withChildren: true,
  ): Promise<DownloadWithChildren>;
  static async _downloadJson(id: string): Promise<VFile>;
  static async _downloadJson(
    id: string,
    withChildren?: boolean,
  ): Promise<VFile | DownloadWithChildren> {
    const projectId = AssetMgr.projectId;
    const queryParams = new URLSearchParams({
      fileId: id,
      projectId,
      withChildren: withChildren ? 'true' : 'false',
    });

    // const serverUrl = 'http://localhost:4000/retrieve';
    const serverUrl = 'https://stan-vite-server.jp.ngrok.io';

    return fetch(`${serverUrl}/retrieve?${queryParams}`)
      .then(res => res.json())
      .then(res => {
        if (withChildren) {
          return res as DownloadWithChildren;
        } else {
          return res as VFile;
        }
      })
      .catch(e => {
        throw new Error(e);
      });
  }

  static bucketUrl = null;
  static async _downloadBinary(id: string) {
    const getFilePath = (path: string) => {
      if (AssetMgr.bucketUrl === null) {
        AssetMgr.bucketUrl = import.meta.env.VITE_S3_DEV_URL;
        if (!AssetMgr.bucketUrl) {
          throw new Error('VITE_S3_DEV_URL is not defined');
        }
      }
      return `${AssetMgr.bucketUrl}/${AssetMgr.projectId}/${path}`;
    };

    if (!AssetMgr.projectId) {
      debugger;
    }

    return Workers.fetch(getFilePath(id));
  }

  static setVRemoteFile(file: VRemoteFile, autoDownload: boolean) {
    const cache = AssetMgr.cache;

    cache.setVRemoteFile(file);

    if (!autoDownload) {
      return;
    }

    if (file.format === 'json') {
      if (!cache.hasVFile(file)) {
        // vfile이 없으면
        // 1. vfile + children 다운로드
        // 2. children에 있는 vfile + vremotefile 페어를 캐시에 셋
        // 3. vremotefile들 중에서 binary인 것들 다운로드 후 캐시에 셋

        const downloadPromise = AssetMgr._downloadJson(file.id, true).then(
          res => {
            const { self, vfiles, vremotefiles } = res;

            const vfilesExceptSelf = vfiles.filter(
              vfile => vfile.id !== self.id,
            );
            vfilesExceptSelf.forEach(vfile => {
              const remote = vremotefiles.find(
                vremotefile => vremotefile.id === vfile.id,
              );
              if (!remote) {
                // 서버에서 잘못 보내준거임
                res;
                debugger;
              }
              cache.set(vfile.id, vfile, remote);
            });

            vremotefiles
              .filter(file => file.format !== 'json')
              .forEach(vremotefile => {
                // binary인 것들만 다시 재귀적으로 호출
                // 아래의 "format이 binary인 경우"
                AssetMgr.setVRemoteFile(vremotefile, true);
              });

            return self;
          },
        );
        cache.setPromise(
          file.id,
          'vfile',
          downloadPromise,
          file.id + 'children',
        );
      }
    } else {
      // format이 binary인 경우
      // result가 없으면 다운로드

      if (!cache.hasResult(file.id)) {
        const downloadPromise: Promise<DataArray> = AssetMgr._downloadBinary(
          file.id,
        ).then((buffer: ArrayBuffer) => {
          if (TYPED_ARRAY_NAMES.includes(file.format as any)) {
            return getTypedArray(file.format as any, buffer);
          }
          return buffer; // ArrayBuffer
        });
        cache.setPromise(
          file.id,
          'result',
          downloadPromise,
          file.id + 'children',
        );
      }
    }
  }

  // static debugIndex = 0;

  // DataArray를 set하고 VRemoteFile을 돌려준다
  static async setDataArray(data: DataArray): Promise<VRemoteFile> {
    const hash = await Hasher.hashPrecisely(data);
    AssetMgr.cache.setResult(hash, data);

    // VRemoteFile이 없으면 만들어서 넣어준다
    if (!AssetMgr.cache.get(hash)?.payload?.vremotefile) {
      const vremotefile: VRemoteFile = {
        id: hash,
        format: getBufferFormat(data).format,
        isVRemoteFile: true,
      };
      AssetMgr.cache.set(hash, vremotefile);
    }

    const vremotefile = AssetMgr.cache.get(hash)?.payload?.vremotefile!;

    // vremotefile.index = AssetMgr.debugIndex++;

    return vremotefile;
  }

  static setVFile(vfile: VFile, autoDownload: boolean) {
    AssetMgr.cache.set(vfile.id, vfile);

    // 일치하는 vremotefile이 없으면 만들어서 넣어준다
    if (!AssetMgr.cache.hasVRemoteFile(vfile)) {
      const remote: VRemoteFile = {
        id: vfile.id,
        format: 'json', // vfile은 항상 json이다
        isVRemoteFile: true,
      };
      AssetMgr.cache.set(vfile.id, remote);
    }

    if (!autoDownload) {
      return;
    }

    const remotes: VRemoteFile[] = [];

    // 내부를 돌면서 VRemoteFile이 있으면 다운로드한다.
    iterateWithPredicate<VRemoteFile>(vfile, isVRemoteFile, vremotefile => {
      const cached = AssetMgr.cache.get(vremotefile);
      if (cached) {
        return;
      }

      remotes.push(vremotefile);
    });

    remotes.forEach(vremotefile => {
      AssetMgr.setVRemoteFile(vremotefile, true);
    });

    return AssetMgr;
  }

  static setFile(id: string, file: File, autoPrepare: boolean) {
    const cache = AssetMgr.cache;
    cache.setFile(id, file);

    if (!autoPrepare) {
      return;
    }

    // case 1. json파일
    if (file.name.toLowerCase().endsWith('.json')) {
      const prom = fileToJson(file).then(json => {
        if (isVFile(json)) {
          AssetMgr.setVFile(json as VFile, true);
        }
        return json;
      });
      cache.setPromise(id, 'result', prom, id + 'file to json');
      return;
    }

    // case 2. glb, exr 등 바이너리 파일
    const inputBuffer = file.arrayBuffer();
    cache.setPromise(
      id,
      'inputBuffer',
      inputBuffer,
      id + 'file to arraybuffer',
    );
  }

  static setBuffer(id: string, buffer: ArrayBuffer) {
    AssetMgr.cache.setBuffer(id, buffer);
  }

  static setResult(id: string, result: any) {
    AssetMgr.cache.setResult(id, result);
  }

  /**
   *
   * @param autoPrepare : value가 VFile | VRemoteFile인 경우 알아서 다운로드, value가 File인 경우 File.arrayBuffer()
   */
  static set(id: string, value: any, autoPrepare: boolean = true) {
    if (value instanceof File) {
      AssetMgr.setFile(id, value, autoPrepare);
    } else if (value instanceof ArrayBuffer) {
      AssetMgr.setBuffer(id, value);
    } else if (isVFile(value)) {
      AssetMgr.setVFile(value as VFile, autoPrepare);
    } else if (isVRemoteFile(value)) {
      AssetMgr.setVRemoteFile(value as VRemoteFile, autoPrepare);
    } else if (typeof value === 'object') {
      AssetMgr.setResult(id, value);
    } else {
      throw new Error('지원하지 않는 타입입니다');
    }
  }

  static createEmpty(id: string) {
    return AssetMgr.cache.getWithInit(id);
  }

  static async loadVFile<T = any>(vfile: VFile): Promise<T> {
    if (!AssetMgr.cache.has(vfile.id)) {
      // 없으면 캐시에 등록
      AssetMgr.setVFile(vfile, true);
    }

    const { id, type, data } = vfile;

    let promise: Promise<T> | null = null;
    switch (type) {
      case 'VObject3D':
      case 'VMesh':
        promise = ObjectLoader(vfile) as Promise<T>;
        break;
      case 'VCompressedTexture':
      case 'VDataTexture':
      case 'VTexture':
        promise = TextureLoader(vfile) as Promise<T>;
        break;
      case 'VBufferGeometry':
        promise = BufferGeometryLoader(vfile) as Promise<T>;
        break;
      case 'VMaterial':
        promise = MaterialLoader(vfile) as Promise<T>;
        break;
      default:
        // throw new Error(`Unknown VFile type: ${type}`);
        break;
    }

    if (!promise) {
      console.warn('지원하지 않는 VFile 타입입니다');
      debugger;
      throw new Error('지원하지 않는 VFile 타입입니다');
    }

    AssetMgr.cache.setPromise(id, 'result', promise, id + 'loadVFile');

    return promise;
  }

  static async load<T = any>(
    idContainer: string | { id: string },
    useCache = true,
  ): Promise<T> {
    const id = typeof idContainer === 'string' ? idContainer : idContainer.id;

    if (useCache) {
      // 이미 결과가 있으면 리턴
      //! 이 부분을 지나면 더이상 결과가 이미 있는지 검사하지 않는다.
      if (AssetMgr.cache.hasResult(idContainer)) {
        return AssetMgr.cache.getResultAsync(id) as Promise<T>;
      }
    }

    // 없으면 셋
    if (!AssetMgr.cache.has(id)) {
      if (isVFile(idContainer)) {
        AssetMgr.setVFile(idContainer as VFile, true);
      } else if (isVRemoteFile(idContainer)) {
        AssetMgr.setVRemoteFile(idContainer as VRemoteFile, true);
      } else {
        // 아무 캐시도 VFile도 없이 여기까지 올 수 없다
        debugger;
      }
    }

    // prepare() => AssetMgr.cache.getAsync<any>(id);

    console.log('Cache value', AssetMgr.cache.get(id));

    return AssetMgr.cache.getAsync<T>(id).then(async res => {
      if (!res) {
        AssetMgr.cache;
        console.warn('캐시에 없는 데이터');
        debugger;
        return undefined as T;
      }

      // case 1. VFile이 있는 경우
      const vfile = await AssetMgr.cache.getVFileAsync(id);

      if (vfile) {
        // VFile을 재귀적으로 다 채워서 로드한다
        const inflated = await AssetMgr.inflateVFile(vfile, {
          replaceBuffer: true,
        });
        return AssetMgr.loadVFile(inflated);
      }

      // case 2. File인 경우
      const file = await AssetMgr.cache.getFileAsync(id);
      const buffer = await AssetMgr.cache.getBufferAsync(id);

      if (file) {
        // file인데 json인 경우도 있다.
        // 그런 경우의 json데이터는 result에 있다.
        // 위의 useCache에서 이미 return돼서 나갔어야 함

        // 이 이하는 glb, exr 등 로컬 파일인 경우
        if (!buffer) {
          // file이 들어오면 자동으로 arraybuffer()이 되어야 하는데 안 된 경우.
          debugger;
        }
        return AssetMgr._loadLocalFile(id, file, buffer!);
      }

      debugger;
      throw new Error('로드할 수 없음');
    });
  }

  static async _loadLocalFile<T>(
    id: string,
    file: File,
    buffer: ArrayBuffer,
  ): Promise<T> {
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
          // if (o.asMesh.isMesh) {
          //   o.toAsset();
          // }
        });
        return gltf.scene;
      });

      AssetMgr.cache.setPromise(
        id,
        'result',
        prom,
        id + 'loadLocalFile' + fname,
      );

      return prom as Promise<T>;
    }

    // case2. map
    if (isMap) {
      const ext = fname.split('.').pop();
      const prom = VTextureLoader.parseAsync(buffer, {
        ext,
      });
      AssetMgr.cache.setPromise(
        id,
        'result',
        prom,
        id + 'loadLocalFile' + fname,
      );

      return prom as Promise<T>;
    }

    throw new Error('Unknown file type');
  }

  static async _uploadJson(vfile: VFile) {
    const filepath = `${AssetMgr.projectId}/${vfile.id}`;

    const jsonString = JSON.stringify(sanitizeObject(vfile));
    const file = new File([jsonString], filepath, { type: 'application/json' });
    const formData = new FormData();

    formData.append('data', file);
    formData.append('filepath', filepath);
    formData.append('type', 'json');

    return fetch('http://localhost:4000/save', {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'multipart/form-data',
      },
    }).then(res => res.json() as Promise<UploadResponse>);
  }

  static async __uploadBinary(vremotefile: VRemoteFile, dataArray: DataArray) {
    const filepath = `${AssetMgr.projectId}/${vremotefile.id}`;

    const buffer: ArrayBuffer = isTypedArray(dataArray)
      ? ((dataArray as TypedArray).buffer as ArrayBuffer)
      : (dataArray as ArrayBuffer);

    const fd = new FormData();
    fd.append('files', new Blob([buffer]), filepath);
    return fetch(import.meta.env.VITE_UPLOAD_URL as string, {
      method: 'POST',
      body: fd,
      headers: {
        Accept: 'multipart/form-data',
      },
    });
  }

  static async _uploadBinary(vremotefile: VRemoteFile, dataArray: DataArray) {
    const filepath = `${AssetMgr.projectId}/${vremotefile.id}`;
    const formData = new FormData();

    let file: File;
    if (isTypedArray(dataArray)) {
      file = new File(
        [(dataArray as TypedArray).buffer as ArrayBuffer],
        filepath,
        {
          type: 'application/octet-stream',
        },
      );
    } else {
      // ArrayBuffer
      file = new File([dataArray as ArrayBuffer], filepath, {
        type: 'application/octet-stream',
      });
    }

    formData.append('data', file);
    formData.append('filepath', filepath);
    formData.append('type', 'binary');

    return fetch('http://localhost:4000/save', {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'multipart/form-data',
      },
    }).then(res => res.json() as Promise<UploadResponse>);
  }

  static async upload(
    idContainer: string | { id: string },
    uploadOption?: AssetUploadOption,
  ) {
    const id = typeof idContainer === 'string' ? idContainer : idContainer.id;

    const cached = AssetMgr.cache.get(id);

    if (!cached) {
      return { error: '캐시가 없음' };
    }

    // handle options
    const { recursive = true } = (uploadOption ?? {}) as AssetUploadOption;

    const { vremotefile, vfile, result } = cached.payload;

    if (!vremotefile) {
      debugger;
      return { error: 'VRemoteFile이 생성되어 있어야 업로드 가능함' };
    }
    if (vremotefile.format === 'json') {
      if (!vfile) {
        debugger;
        return { error: 'VFile이 생성되어 있어야 업로드 가능함' };
      }

      if (recursive) {
        const childrenProms: Promise<any>[] = [];
        let iter = 1;
        iterateWithPredicate<VFile>(
          vfile,
          child => {
            return isVFile(child) || isVRemoteFile(child);
          },
          (child: VFile | VRemoteFile) => {
            if (child === vfile) {
              // 나 자신을 제외
              return;
            }
            console.log('Pushing child', child);
            childrenProms.push(AssetMgr.upload(child.id, uploadOption));
          },
        );
        await Promise.all(childrenProms);
      }

      return AssetMgr._uploadJson(vfile);
    } else {
      // binary
      if (!result) {
        debugger;
        return { error: 'result가 생성되어 있어야 업로드 가능함' };
      }
      if (!isTypedArray(result) && !(result instanceof ArrayBuffer)) {
        debugger;
        return { error: 'result가 TypedArray 또는 ArrayBuffer여야 함' };
      }
      return AssetMgr._uploadBinary(vremotefile, result);
    }
  }

  static async getAsync<T = any>(
    id: string,
    key: keyof CachePayload,
  ): Promise<T> {
    const cached = AssetMgr.cache.get(id);
    if (!cached) {
      return undefined as T;
    }

    // case 1. 이미 값이 존재하는 경우
    const payload = cached.payload[key];
    if (payload) {
      return payload as T;
    }

    // case 2. promise가 존재하는 경우
    const queued = cached.loadingQueue.find(item => item.destination === key);

    return queued?.promise as Promise<T>;
  }

  // vfile 내부를 돌면서 VRemoteFile을 VFile로 바꿔준다
  static async inflateVFile(
    vfile: VFile,
    option?: VFileInflateOption,
  ): Promise<VFile> {
    const { inPlace = false, replaceBuffer = false } = option ?? {};
    vfile = inPlace ? vfile : structuredClone(vfile);

    const proms: Promise<any>[] = [];

    iterateWithPredicate<VRemoteFile>(
      vfile,
      isVRemoteFile,
      async (vremotefile, [parent, key]) => {
        if (!replaceBuffer) {
          // !replaceBuffer = VFile만 대체하는 경우
          if (vremotefile.format !== 'json') {
            return;
          }
        }

        const prom = AssetMgr.getVRemoteFile(vremotefile).then(value => {
          // const pathToPop = path.slice(0, -1);
          // const target = pathToPop.reduce(
          //   (acc, key) => (acc as any)[key],
          //   vfile,
          // );

          // // 가장 마지막 요소인 VRemoteFile을 VFile로 갈아끼우기
          // (target as any)[path[path.length - 1]] = value;
          parent[key] = value;
        });
        proms.push(prom);
      },
    );

    // 한 번 채웠으니 다시 VRemoteFile이 있는지 재귀적으로 검사
    if (proms.length > 0) {
      await Promise.all(proms);
      return AssetMgr.inflateVFile(vfile, option);
    }

    return vfile;
  }

  // VRemoteFile을 VFile이나 DataArray로 바꿔준다
  static async getVRemoteFile<T extends VFile | DataArray>(
    vremotefile: VRemoteFile,
  ): Promise<T> {
    const { id, format } = vremotefile;

    AssetMgr.setVRemoteFile(vremotefile, true);

    if (format === 'json') {
      const vfile = await AssetMgr.cache.getVFileAsync(id);
      if (!vfile) {
        throw new Error('VFile이 없음');
      }
      return vfile as T;
    } else {
      const result = (await AssetMgr.cache.getResultAsync(id)) as DataArray;
      if (!result) {
        throw new Error('result가 없음');
      }
      return result as T;
    }
  }
}

const DEFAULT_PROJECT_ID = 'TEST_PROJECT_ID';
AssetMgr.setProject(DEFAULT_PROJECT_ID);
