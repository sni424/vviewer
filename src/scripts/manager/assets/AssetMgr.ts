import { fetchArrayBuffer } from 'src/scripts/atomUtils';
import { CommonObject, FileID, FileUrl } from './AssetTypes';
import { awaitAll, hashArrayBuffer, hashObject } from './AssetUtils';
import { isVFile, isVFileRemote, VFile, VFileRemote } from './VFile';

type Callback = (value: any, path: string[]) => void;

// 재귀적으로 순회하면서 객체를 탐색하는 함수
// obj에 대해서 predicate === true인 경우 callback 호출
export function iterateObjectWithPredicate(
  obj: any,
  predicate: (val: any) => boolean,
  callback: Callback,
  path: string[] = [],
) {
  if (predicate(obj)) {
    callback(obj, path);
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) =>
      iterateObjectWithPredicate(item, predicate, callback, [
        ...path,
        String(index),
      ]),
    );
  } else if (obj && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      iterateObjectWithPredicate(val, predicate, callback, [...path, key]);
    }
  }
}

export type AssetCacheType = ArrayBuffer | CommonObject;
export type AssetState = 'loading' | 'loaded';
export class AssetMgr {
  static cache: Map<
    FileID,
    | { id: FileID; state: 'loading'; data: Promise<AssetCacheType> }
    | { id: FileID; state: 'loaded'; data: AssetCacheType }
  > = new Map();

  static async get<T extends AssetCacheType = any>(vfile: VFile): Promise<T>;
  static async get<T extends AssetCacheType = any>(
    remoteFile: VFileRemote,
  ): Promise<T>;
  static async get<T extends AssetCacheType = any>(
    id: string,
    hint?: 'json' | 'binary',
  ): Promise<T>;
  static async get<T extends AssetCacheType = any>(
    idOrRemoteFile: string | VFileRemote | VFile,
    hint?: 'json' | 'binary',
  ) {
    if (typeof idOrRemoteFile === 'object') {
      if (isVFileRemote(idOrRemoteFile)) {
        const remoteFile = idOrRemoteFile as VFileRemote;
        const id = remoteFile.id;
        const hint = remoteFile.format;
        return this.get<T>(id, hint);
      } else if (isVFile(idOrRemoteFile)) {
        return idOrRemoteFile as unknown as T;
      } else {
        throw new Error('file이 VFile도 아니고 VFileRemote도 아닙니다');
      }
    }

    const id = idOrRemoteFile as string;
    const cached = this.cache.get(id);
    if (cached) {
      return cached.data as Promise<T>;
    }

    if (!hint) {
      // 캐시된 데이터가 없는 경우 id를 어떻게 해석할 지 힌트를 줘야함
      debugger;
      throw new Error(
        '캐시된 데이터가 없는 경우 id를 어떻게 해석할 지 힌트를 줘야함',
      );
    }

    const fetchJson = () => {
      const loadingJson = fetch(this.fileUrl(id))
        .then(res => res.json())
        .then(completedJson => {
          const childrenProms: Promise<any>[] = [];
          iterateObjectWithPredicate(
            completedJson,
            isVFileRemote,
            (obj, path) => {
              const file = obj as VFileRemote;
              childrenProms.push(AssetMgr.get(file.id, file.format));
            },
          );

          // 하위 객체중에 VFileRemote가 있으면 그것들의 로드가 완료되어야 나도 완료
          return Promise.all(childrenProms).then(() => {
            this.cache.set(id, { id, state: 'loaded', data: completedJson });
            return completedJson;
          });
        });
      this.cache.set(id, { id, state: 'loading', data: loadingJson });
      return loadingJson;
    };
    const fetchBuffer = () => {
      const loadingBuffer = fetchArrayBuffer(this.fileUrl(id)).then(buffer => {
        this.cache.set(id, { id, state: 'loaded', data: buffer });
        return buffer;
      });
      this.cache.set(id, { id, state: 'loading', data: loadingBuffer });
      return loadingBuffer;
    };

    if (hint === 'json') {
      return fetchJson();
    } else if (hint === 'binary') {
      return fetchBuffer();
    } else {
      // no hint
      try {
        const retval = fetchJson(); // res.json()하다가 실패하면 fetchBuffer()로
        return retval;
      } catch (e) {
        // no json
        return fetchBuffer();
      }
    }
  }

  static fileUrl(id: FileID): FileUrl {
    return '/files/' + id;
  }

  // return cache id
  static set(rawData: AssetCacheType, id?: string): FileID {
    const cacher = this.cache;
    const hasher =
      rawData instanceof ArrayBuffer ? hashArrayBuffer : hashObject;

    const hash = id ?? hasher(rawData as any);
    cacher.set(hash, {
      id: hash,
      state: 'loaded',
      data: rawData,
    });
    return hash;
  }

  static fill(obj: any) {
    const copied = structuredClone(obj);

    const proms: Promise<any>[] = [];

    iterateObjectWithPredicate(
      copied,
      isVFileRemote,
      async (val: VFileRemote, path: string[]) => {
        console.log({ val });
        const file = val as VFileRemote;

        const prom = AssetMgr.get(file).then(replacer => {
          // VFileRemote인 현재의 키값을 대체
          const key = path.pop() as string;
          const parent = path.reduce((acc, cur, depth) => {
            if (depth >= path.length) {
              // pop했으니 -1을 생략해야함
              return acc;
            }

            return acc[cur];
          }, copied);

          parent[key] = replacer;

          // 대체 완료 후 json인 경우 다시 fill 실행
          if (file.format === 'json') {
            proms.push(AssetMgr.fill(replacer));
          }
        });

        proms.push(prom);
        return prom;
      },
    );

    return awaitAll(copied);
  }
}
