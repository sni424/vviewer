export type FileID = string;
export type FileUrl = string;

export type RawFile = ArrayBuffer;

export type FileType = string;

export const VAssetTypes = [
  'VFile', // 일반 json파일
  'VScene', // THREE.Scene보다 포괄적인 개념. 하나의 옵션을 그리기 위한 모든 내용 포함
  'VOption',
  'VProject',

  // Three.js로 변환가능한 파일들
  'VBufferGeometry',
  'VTexture',
  'VSource', // texture 하위에서 사용되는 데이터 소스
  'VDataTexture',
  'VCompressedTexture',
  'VMaterial',
  'VObject3D', // THREE.Group === THREE.Object3D이다
  'VMesh',
] as const;
export type VAssetType = (typeof VAssetTypes)[number];

export type CommonObject = Record<string, any>;

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

export const TYPED_ARRAY_NAMES = Object.keys(
  TYPED_ARRAYS,
) as (keyof typeof TYPED_ARRAYS)[];
export type TYPED_ARRAY_NAME = keyof typeof TYPED_ARRAYS;

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

export type DataArray = ArrayBuffer | TypedArray;

export const isDataArray = (obj?: any): boolean => {
  if (obj instanceof ArrayBuffer) return true;
  if (isTypedArray(obj)) return true;

  return false;
};

export function isTypedArray(value: any): value is TypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array
  );
}
