import { sha1 } from 'js-sha1';
import objectHash from 'object-hash';

// 재귀적으로 모든 promise를 기다린다
export async function awaitAll<T>(input: T): Promise<T> {
  if (input instanceof Promise) {
    return awaitAll(await input);
  }

  if (Array.isArray(input)) {
    const resolved = await Promise.all(input.map(awaitAll));
    return resolved as any as T;
  }

  if (input !== null && typeof input === 'object') {
    // 클래스 인스턴스인지 확인
    const proto = Object.getPrototypeOf(input);
    const isPlainObject = proto === Object.prototype || proto === null;

    if (!isPlainObject) {
      // 클래스 인스턴스: 그대로 유지하고, 필드만 재귀 처리
      const clone = input as any;
      for (const key of Object.keys(clone)) {
        clone[key] = await awaitAll(clone[key]);
      }
      return clone;
    } else {
      // 일반 객체: 새 객체 생성
      const result: any = {};
      for (const key of Object.keys(input)) {
        result[key] = await awaitAll((input as any)[key]);
      }
      return result;
    }
  }

  return input;
}

export const hashObject = objectHash;

export const hashArrayBuffer = (arrayBuffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(arrayBuffer);
  return sha1(uint8Array);
};
