import { sha1 } from 'js-sha1';
import objectHash from 'object-hash';

// 재귀적으로 모든 promise를 기다린다
export async function awaitAll<T>(input: T): Promise<T> {
  if (input instanceof Promise) {
    return awaitAll(await input);
  }

  if (Array.isArray(input)) {
    return Promise.all(input.map(awaitAll)) as Promise<any> as Promise<T>;
  }

  if (typeof input === 'object' && input !== null) {
    const result: any = Array.isArray(input) ? [] : {};
    for (const key of Object.keys(input)) {
      result[key] = await awaitAll((input as any)[key]);
    }
    return result;
  }

  return input;
}

export const hashObject = objectHash;

export const hashArrayBuffer = (arrayBuffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(arrayBuffer);
  return sha1(uint8Array);
};
