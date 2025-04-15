import { sha1 } from 'js-sha1';
import objectHash from 'object-hash';

// 재귀적으로 모든 promise를 기다린다
export async function awaitAll<T>(
  input: T,
  checked: Map<any, any> = new Map(),
): Promise<T> {
  if (input instanceof Promise) {
    const resolved = await input;
    return awaitAll(resolved, checked);
  }

  if (typeof input !== 'object' || input === null) {
    return input; // primitive
  }

  if (checked.has(input)) {
    return checked.get(input); // 순환 참조일 경우 기존 값 반환
  }

  if (Array.isArray(input)) {
    const placeholder: any[] = [];
    checked.set(input, placeholder); // 참조 등록

    const resolved = await Promise.all(
      input.map(async (item, i) => {
        const result = await awaitAll(item, checked);
        placeholder[i] = result;
        return result;
      }),
    );

    return resolved as any as T;
  }

  const proto = Object.getPrototypeOf(input);
  const isPlainObject = proto === Object.prototype || proto === null;

  if (!isPlainObject) {
    // 클래스 인스턴스: 그대로 사용하되 필드만 await
    checked.set(input, input); // 참조 등록

    // !재귀적으로 확인하지 않고 한 단계만, three.js객체의 순환참조로 무한루프
    for (const key of Object.keys(input)) {
      //! 한단계 참조
      (input as any)[key] = await (input as any)[key];

      //! 재귀참조
      // (input as any)[key] = await awaitAll((input as any)[key], checked);
    }

    return input;
  } else {
    const result: Record<string, any> = {};
    checked.set(input, result); // 참조 등록

    for (const key of Object.keys(input)) {
      result[key] = await awaitAll((input as any)[key], checked);
    }

    return result as T;
  }
}

export const hashObject = objectHash;

export const hashArrayBuffer = (arrayBuffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(arrayBuffer);
  return sha1(uint8Array);
};

export const TYPED_ARRAYS = {
  Int8Array: Int8Array,
  Uint8Array: Uint8Array,
  Uint8ClampedArray: Uint8ClampedArray,
  Int16Array: Int16Array,
  Uint16Array: Uint16Array,
  Int32Array: Int32Array,
  Uint32Array: Uint32Array,
  Float32Array: Float32Array,
  Float64Array: Float64Array,
};

export function getTypedArray(type: string, buffer: ArrayBuffer) {
  return new (TYPED_ARRAYS as any)[type](buffer);
}
