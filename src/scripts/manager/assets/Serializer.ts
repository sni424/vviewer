import pako from 'pako';

// Type definition for TypedArray
type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

// Type definition for serializable values
export type Serializable =
  | null
  | undefined
  | boolean
  | number
  | string
  | ArrayBuffer
  | TypedArray
  | Serializable[]
  | { [key: string]: Serializable };

// Type indicators for serialization
const TYPE_NULL = 0;
const TYPE_UNDEFINED = 1;
const TYPE_BOOLEAN = 2;
const TYPE_NUMBER = 3;
const TYPE_STRING = 4;
const TYPE_OBJECT = 5;
const TYPE_ARRAY = 6;
const TYPE_ARRAYBUFFER = 7;
const TYPE_TYPEDARRAY = 8;

// TypedArray type information
interface TypedArrayType {
  ctor: any; // Constructor for TypedArray
  id: number; // Sub-type ID
  bytesPerElement: number; // Bytes per element
}

const typedArrayTypes: TypedArrayType[] = [
  { ctor: Int8Array, id: 0, bytesPerElement: 1 },
  { ctor: Uint8Array, id: 1, bytesPerElement: 1 },
  { ctor: Uint8ClampedArray, id: 2, bytesPerElement: 1 },
  { ctor: Int16Array, id: 3, bytesPerElement: 2 },
  { ctor: Uint16Array, id: 4, bytesPerElement: 2 },
  { ctor: Int32Array, id: 5, bytesPerElement: 4 },
  { ctor: Uint32Array, id: 6, bytesPerElement: 4 },
  { ctor: Float32Array, id: 7, bytesPerElement: 4 },
  { ctor: Float64Array, id: 8, bytesPerElement: 8 },
  { ctor: BigInt64Array, id: 9, bytesPerElement: 8 },
  { ctor: BigUint64Array, id: 10, bytesPerElement: 8 },
];

// Helper to check if a value is a TypedArray
function isTypedArray(value: any): value is TypedArray {
  return typedArrayTypes.some(t => value instanceof t.ctor);
}

/**
 * Estimates the initial buffer size for serialization based on the object structure.
 * @param obj The object to serialize.
 * @returns Estimated size in bytes.
 */
function estimateInitialSize(obj: Serializable): number {
  if (obj == null) return 16; // Small size for null/undefined
  if (typeof obj === 'boolean' || typeof obj === 'number') return 16; // Type + value
  if (typeof obj === 'string') return 8 + obj.length * 3; // Length prefix + UTF-8 bytes
  if (obj instanceof ArrayBuffer) return 8 + obj.byteLength; // Length prefix + data
  if (isTypedArray(obj)) return 16 + obj.byteLength; // Type, length, data
  if (Array.isArray(obj)) {
    return (
      8 + obj.reduce((sum: number, item) => sum + estimateInitialSize(item), 0)
    ); // Length + items
  }
  if (typeof obj === 'object') {
    return (
      8 +
      Object.entries(obj).reduce(
        (sum, [key, value]) =>
          sum + 8 + key.length * 3 + estimateInitialSize(value),
        0,
      )
    ); // Length + keys + values
  }
  return 1024; // Default
}

/**
 * Serializes an object to a Uint8Array (view of an ArrayBuffer).
 * @param obj The object to serialize.
 * @param compress Whether to compress the output with pako.
 * @returns A Uint8Array containing the serialized data.
 */
export function serialize(obj: Serializable, compress = true): Uint8Array {
  // Estimate initial buffer size, capped at 1MB
  const initialSize = Math.min(estimateInitialSize(obj), 1024 * 1024);
  let buffer = new ArrayBuffer(Math.max(16, initialSize));
  let view = new DataView(buffer);
  let offset = 0;

  function ensureSpace(needed: number) {
    if (offset + needed <= buffer.byteLength) return;

    // Calculate new size: at least needed size, grow by 1.5x, cap at 2GB
    const requiredSize = offset + needed;
    const newSize = Math.min(
      Math.max(requiredSize, buffer.byteLength * 1.5),
      2 * 1024 * 1024 * 1024, // 2GB limit
    );

    try {
      const newBuffer = new ArrayBuffer(newSize);
      const newView = new DataView(newBuffer);
      const temp = new Uint8Array(newBuffer);
      temp.set(new Uint8Array(buffer));
      buffer = newBuffer;
      view = newView;
    } catch (error) {
      throw new Error(
        `Failed to allocate ArrayBuffer of size ${newSize}: ${error}`,
      );
    }
  }

  function writeByte(value: number) {
    ensureSpace(1);
    view.setUint8(offset, value);
    offset += 1;
  }

  function writeUint32(value: number) {
    ensureSpace(4);
    view.setUint32(offset, value, true); // little-endian
    offset += 4;
  }

  function writeFloat64(value: number) {
    ensureSpace(8);
    view.setFloat64(offset, value, true);
    offset += 8;
  }

  function writeString(str: string) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    writeUint32(bytes.length);
    ensureSpace(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      view.setUint8(offset + i, bytes[i]);
    }
    offset += bytes.length;
  }

  function writeArrayBuffer(ab: ArrayBuffer) {
    writeUint32(ab.byteLength);
    ensureSpace(ab.byteLength);
    let abView = new Uint8Array(ab);
    for (let i = 0; i < ab.byteLength; i++) {
      view.setUint8(offset + i, abView[i]);
    }
    offset += ab.byteLength;
  }

  function serializeValue(value: Serializable) {
    if (value === null) {
      writeByte(TYPE_NULL);
    } else if (value === undefined) {
      writeByte(TYPE_UNDEFINED);
    } else if (typeof value === 'boolean') {
      writeByte(TYPE_BOOLEAN);
      writeByte(value ? 1 : 0);
    } else if (typeof value === 'number') {
      writeByte(TYPE_NUMBER);
      writeFloat64(value);
    } else if (typeof value === 'string') {
      writeByte(TYPE_STRING);
      writeString(value);
    } else if (isTypedArray(value)) {
      writeByte(TYPE_TYPEDARRAY);
      let typeInfo = typedArrayTypes.find(t => value instanceof t.ctor)!;
      writeByte(typeInfo.id);
      writeUint32(value.length);
      let data = new Uint8Array(
        value.buffer,
        value.byteOffset,
        value.byteLength,
      );
      ensureSpace(data.length);
      for (let i = 0; i < data.length; i++) {
        view.setUint8(offset + i, data[i]);
      }
      offset += data.length;
    } else if (value instanceof ArrayBuffer) {
      writeByte(TYPE_ARRAYBUFFER);
      writeArrayBuffer(value);
    } else if (Array.isArray(value)) {
      writeByte(TYPE_ARRAY);
      writeUint32(value.length);
      for (let item of value) {
        serializeValue(item as Serializable);
      }
    } else if (typeof value === 'object') {
      writeByte(TYPE_OBJECT);
      let keys = Object.keys(value as object);
      writeUint32(keys.length);
      for (let key of keys) {
        writeString(key);
        serializeValue((value as any)[key] as Serializable);
      }
    } else {
      throw new Error('Unsupported type');
    }
  }

  try {
    serializeValue(obj);
    const retval = new Uint8Array(buffer, 0, offset);
    if (compress) {
      return pako.deflate(retval);
    }
    return retval;
  } catch (error) {
    throw new Error(`Serialization failed: ${error}`);
  }
}

/**
 * Deserializes a Uint8Array (view of an ArrayBuffer) back to an object.
 * @param bufferInput The ArrayBuffer containing the serialized data.
 * @param decompress Whether to decompress the input with pako.
 * @returns The deserialized object.
 */
export function deserialize<T = any>(
  bufferInput: ArrayBufferLike | TypedArray,
  decompress = false,
): T {
  bufferInput = isTypedArray(bufferInput) ? bufferInput.buffer : bufferInput;
  let buffer: ArrayBuffer;
  if (decompress) {
    buffer = pako.inflate(new Uint8Array(bufferInput)).buffer as ArrayBuffer;
  } else {
    buffer = bufferInput as ArrayBuffer;
  }

  let view = new DataView(buffer);
  let offset = 0;

  function readByte(): number {
    if (offset >= buffer.byteLength) throw new Error('Buffer underflow');
    let value = view.getUint8(offset);
    offset += 1;
    return value;
  }

  function readUint32(): number {
    if (offset + 4 > buffer.byteLength) throw new Error('Buffer underflow');
    let value = view.getUint32(offset, true);
    offset += 4;
    return value;
  }

  function readFloat64(): number {
    if (offset + 8 > buffer.byteLength) throw new Error('Buffer underflow');
    let value = view.getFloat64(offset, true);
    offset += 8;
    return value;
  }

  function readString(): string {
    let length = readUint32();
    if (offset + length > buffer.byteLength)
      throw new Error('Buffer underflow');
    let bytes = new Uint8Array(buffer, offset, length);
    offset += length;
    let decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  function readArrayBuffer(): ArrayBuffer {
    let length = readUint32();
    if (offset + length > buffer.byteLength)
      throw new Error('Buffer underflow');
    let ab = buffer.slice(offset, offset + length);
    offset += length;
    return ab;
  }

  function deserializeValue(): Serializable {
    let type = readByte();
    switch (type) {
      case TYPE_NULL:
        return null;
      case TYPE_UNDEFINED:
        return undefined;
      case TYPE_BOOLEAN:
        return readByte() !== 0;
      case TYPE_NUMBER:
        return readFloat64();
      case TYPE_STRING:
        return readString();
      case TYPE_ARRAYBUFFER:
        return readArrayBuffer();
      case TYPE_ARRAY: {
        let length = readUint32();
        let array: Serializable[] = [];
        for (let i = 0; i < length; i++) {
          array.push(deserializeValue());
        }
        return array;
      }
      case TYPE_OBJECT: {
        let keyCount = readUint32();
        let obj: { [key: string]: Serializable } = {};
        for (let i = 0; i < keyCount; i++) {
          let key = readString();
          obj[key] = deserializeValue();
        }
        return obj;
      }
      case TYPE_TYPEDARRAY: {
        let subType = readByte();
        let length = readUint32();
        let typeInfo = typedArrayTypes.find(t => t.id === subType);
        if (!typeInfo) throw new Error('Unknown TypedArray sub-type');
        let totalBytes = length * typeInfo.bytesPerElement;
        if (offset + totalBytes > buffer.byteLength)
          throw new Error('Buffer underflow');
        let ab = buffer.slice(offset, offset + totalBytes);
        offset += totalBytes;
        let TypedArrayConstructor = typeInfo.ctor as any;
        return new TypedArrayConstructor(ab);
      }
      default:
        debugger;
        throw new Error('Unknown type');
    }
  }

  return deserializeValue() as T;
}
