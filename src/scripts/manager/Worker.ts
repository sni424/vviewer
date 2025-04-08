import { Buffer } from 'buffer';
import fs from 'fs';
import * as pako from 'pako';

// Define the type
type VObject = {
  version: number;
  id: string;
  type: 'mesh' | 'material' | 'texture' | 'geometry';
  meta: Record<string, any>;
  data?: ArrayBuffer;
};

const HEADER = 'VRAPOINT';

const encoder = new TextEncoder();

async function fetchIntoArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Fetch failed');

  // Get total size from headers (if available)
  const contentLength = response.headers.get('Content-Length');
  if (!contentLength) throw new Error('Content-Length not provided');
  const totalSize = parseInt(contentLength, 10);

  // Pre-allocate the ArrayBuffer
  const buffer = new ArrayBuffer(totalSize);
  const view = new Uint8Array(buffer);
  let offset = 0;

  // Read stream chunks
  const reader = response.body!.getReader();
  while (true) {
    const { done, value } = await reader.read(); // value is Uint8Array
    if (done) break;

    if (offset + value.length > totalSize) {
      throw new Error('Received more data than expected');
    }

    view.set(value, offset); // Copy chunk into pre-allocated buffer
    offset += value.length;
  }

  if (offset !== totalSize) {
    throw new Error('Received less data than expected');
  }

  return buffer;
}

// Helper class for binary serialization (similar to C++ binary streams)
class BinarySerializer {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(size: number) {
    this.buffer = new ArrayBuffer(size);
    this.view = new DataView(this.buffer);
  }

  writeUint8(value: number) {
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeUint32(value: number) {
    this.view.setUint32(this.offset, value, false); // false for big-endian
    this.offset += 4;
  }

  writeString(str: string) {
    const bytes = encoder.encode(str);
    this.writeUint32(bytes.length);
    bytes.forEach(byte => {
      this.view.setUint8(this.offset, byte);
      this.offset += 1;
    });
  }

  writeArrayBuffer(buffer: ArrayBuffer) {
    this.writeUint32(buffer.byteLength);
    new Uint8Array(this.buffer, this.offset, buffer.byteLength).set(
      new Uint8Array(buffer),
    );
    this.offset += buffer.byteLength;
  }

  getBuffer() {
    return this.buffer.slice(0, this.offset);
  }
}

class BinaryDeserializer {
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readString(): string {
    const length = this.readUint32();
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return new TextDecoder().decode(bytes);
  }

  readArrayBuffer(): ArrayBuffer {
    const length = this.readUint32();
    const buffer = this.view.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return buffer;
  }
}

// Serialization function
export function serializeObject(obj: VObject): Uint8Array {
  // First pass: calculate required buffer size
  let size = 0;
  size += 4 + HEADER.length; // header (length + string)
  size += 4; // version (uint32)
  size += 4 + obj.id.length; // id (length + string)
  size += 4 + obj.type.length; // type (length + string)

  // Serialize meta as JSON string
  const metaString = JSON.stringify(obj.meta);
  size += 4 + metaString.length; // meta (length + string)

  // Data if present
  if (obj.data) {
    size += 4 + obj.data.byteLength; // length + data
  }

  const serializer = new BinarySerializer(size);

  // Write data
  serializer.writeString(HEADER);
  serializer.writeUint32(obj.version);
  serializer.writeString(obj.id);
  serializer.writeString(obj.type);
  serializer.writeString(metaString);

  if (obj.data) {
    serializer.writeArrayBuffer(obj.data);
  }

  const buffer = serializer.getBuffer();
  return compressData(buffer);
}

// Deserialization function
export function deserializeObject(buffer: ArrayBuffer): VObject {
  // inflate pako
  const inflatedBuffer = decompressData(new Uint8Array(buffer));

  const deserializer = new BinaryDeserializer(inflatedBuffer);

  const header = deserializer.readString();
  if (header !== HEADER) {
    throw new Error(`Invalid header: ${header}`);
  }
  const version = deserializer.readUint32();
  const id = deserializer.readString();
  const type = deserializer.readString() as
    | 'mesh'
    | 'material'
    | 'texture'
    | 'geometry';
  const metaString = deserializer.readString();
  const meta = JSON.parse(metaString);

  // Check if there's more data (for ArrayBuffer)
  let data: ArrayBuffer | undefined;
  if (deserializer['offset'] < inflatedBuffer.byteLength) {
    data = deserializer.readArrayBuffer();
  }

  return { version, type, meta, data, id };
}

// Compression and decompression functions
function compressData(buffer: ArrayBuffer): Uint8Array {
  return pako.deflate(new Uint8Array(buffer));
}

function decompressData(compressed: Uint8Array): ArrayBuffer {
  return pako.inflate(compressed).buffer;
}

// Example usage
function example() {
  // Sample object
  const obj: VObject = {
    version: 1,
    id: 'ddd',
    type: 'material',
    meta: {
      // name: 'cube',
      // vertices: 8,
      // properties: { color: 'red' },
      // recursive: {
      //   thisIsRecursive: true,
      // },
      map: 'id',
    },
    data: new Uint8Array([1, 2, 3, 4, 5]).buffer,
  };

  // Serialize
  const binaryData = serializeObject(obj);

  // Compress
  // const compressed = compressData(binaryData);

  // write binaryData to file binaryData.bin
  console.log('File written,', binaryData);
  fs.writeFileSync('binaryData.bin', Buffer.from(binaryData));

  // // Decompress
  // const decompressed = decompressData(compressed);

  // Deserialize
  const restoredObj = deserializeObject(binaryData.buffer);

  // console.log('Original:', obj);
  // console.log('Restored:', restoredObj);
}

// example();

// export {};

export interface WorkerMessage {
  type: 'processUrl';
  url: string;
}

export interface WorkerResponse {
  type: 'result';
  arrayBuffer: ArrayBuffer;
  width: number;
  height: number;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === 'processUrl') {
    try {
      // Fetch the URL

      // const response = await fetch(event.data.url);
      const arrayBuffer = await fetchIntoArrayBuffer(event.data.url);
      const obj = deserializeObject(arrayBuffer);

      // // Use your custom module
      // const { data, size } = processBuffer(arrayBuffer);
      // const { width, height } = calculateDimensions(size);

      // Transfer the buffer without copying
      self.postMessage(
        {
          type: 'result',
          obj,
          arrayBuffer: arrayBuffer,
        },
        [arrayBuffer], // Transferable object
      );
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

export {};
