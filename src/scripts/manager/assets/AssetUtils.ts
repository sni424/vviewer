import objectHash, { sha1 } from 'object-hash';

declare global {
  interface ArrayBuffer {
    copied(): ArrayBuffer;
    isDetached(): boolean;
  }
}

ArrayBuffer.prototype.copied = function () {
  const copy = new ArrayBuffer(this.byteLength);
  new Uint8Array(copy).set(new Uint8Array(this));
  return copy;
};

ArrayBuffer.prototype.isDetached = function () {
  try {
    new Uint8Array(this, 0, 1);
    return false;
  } catch {
    return true;
  }
};

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

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

const hashCache: Map<ArrayBufferLike | TypedArray, string> = new Map();
export const hashArrayBuffer = (
  input: ArrayBufferLike | TypedArray,
): string => {
  if (hashCache.has(input)) {
    console.log('Cached ab');
    return hashCache.get(input) as string;
  }

  if (ArrayBuffer.isView(input)) {
    const hash = sha1(input as any);
    hashCache.set(input, hash);
    return hash;
  } else {
    const hash = sha1(new Uint8Array(input));
    hashCache.set(input, hash);
    return hash;
  }
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

export function cloneArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer));
  return copy;
}
