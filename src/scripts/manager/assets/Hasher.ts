import { sha1 } from 'hash-wasm';
import objectHash from 'object-hash';
import { v4 } from 'uuid';
import { TypedArray } from './AssetTypes';

const _cache = new WeakMap<any, string>();
const _cachePrecise = new WeakMap<any, string>();

export default class Hasher {
  static async arrayBuffer(
    input: ArrayBufferLike | TypedArray,
    useCache = true,
  ): Promise<string> {
    if (useCache && _cache.has(input)) {
      return _cache.get(input) as string;
    }

    if (ArrayBuffer.isView(input)) {
      return await sha1(input as any);
    } else {
      return await sha1(new Uint8Array(input));
    }
  }

  static object(obj: object, useCache = true) {
    if (useCache && _cache.has(obj)) {
      return _cache.get(obj) as string;
    }

    const hash = objectHash(obj);
    _cache.set(obj, hash);

    return hash;
  }

  // 약식으로 해싱
  // 오브젝트가 캐시에 없으면 uuid 리턴
  // 실시간 작업에는 매번 해싱할 이유가 없으니 uuid로 충분하다
  // ! 엄밀히 말하면 캐싱이 아니라 한 obj에 대해 id를 부여하는 행위임
  static hash(input: ArrayBufferLike | TypedArray, useCache?: boolean): string;
  static hash(input: Record<any, any>, useCache?: boolean): string;
  static hash(input: any, useCache = true): string {
    if (useCache && _cache.has(input)) {
      return _cache.get(input) as string;
    }

    const hash = v4();
    _cache.set(input, hash);
    return hash;
  }

  // 실제로 데이터를 해싱
  static async hashPrecisely(
    input: ArrayBufferLike | TypedArray,
    useCache?: boolean,
  ): Promise<string>;
  static async hashPrecisely(
    input: Record<any, any>,
    useCache?: boolean,
  ): Promise<string>;
  static async hashPrecisely(input: any, useCache = true): Promise<string> {
    if (useCache && _cachePrecise.has(input)) {
      return _cachePrecise.get(input) as string;
    }

    if (input instanceof ArrayBuffer) {
      return this.arrayBuffer(input).then(hash => {
        _cachePrecise.set(input, hash);
        return hash;
      });
    } else {
      const hash = objectHash(input);
      _cachePrecise.set(input, hash);
      return Promise.resolve(objectHash(input));
    }
  }
}
