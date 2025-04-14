import { Buffer } from 'buffer';
import fs from 'fs';
import * as pako from 'pako';

type VObjectRemote = {
  id: string;
  format: 'json' | 'binary';
};

// Define the type
type VObject = {
  version: number;
  id: string;
  type:
    | 'object3d' // object3d, mesh, group
    | 'material' // material
    | 'texture' // jpg, png
    | 'datatexture' // exr
    | 'compressedtexture' // ktx
    | 'geometry' // buffergeometry
    | 'json';
  meta: Record<string, any>;
  // data?: Record<string, ArrayBuffer>;
};

const mesh2: VObject = {
  version: 1,
  id: 'mesh2',
  type: 'mesh',
  meta: {
    name: 'cube',
    vertices: 8,
    children: [],
  },
};
const mesh2Remote: VObjectRemote = {
  id: 'mesh2',
  format: 'json',
};

const lightMapRemote: VObjectRemote = {
  id: 'lightMap',
  format: 'binary',
};

const mapRemote: VObjectRemote = {
  id: 'map',
  format: 'binary',
};

const tex1: VObject = {
  version: 1,
  id: 'texture1',
  type: 'texture',
  meta: {
    name: 'mapTexture',
    img: mapRemote,
  },
};

const tex1Remote: VObjectRemote = {
  id: 'texture1',
  format: 'json',
};

const tex2: VObject = {
  version: 1,
  id: 'texture2',
  type: 'texture',
  meta: {
    name: 'lightMapTexture',
    img: lightMapRemote,
  },
};

const tex2Remote: VObjectRemote = {
  id: 'texture2',
  format: 'json',
};

const mat: VObject = {
  version: 1,
  id: 'material1',
  type: 'material',
  meta: {
    name: 'material1',
    map: tex1Remote,
    lightMap: tex2Remote,
  },
};
const matRemote = {
  id: 'material1',
  format: 'json',
};

const get = async (object: VObjectRemote) => {
  if (object === mesh2Remote) {
    return mesh2;
  }
  if (object === tex1Remote) {
    return tex1;
  }
  if (object === tex2Remote) {
    return tex2;
  }
  if (object === lightMapRemote) {
    return lightMapRemote;
  }
  if (object === mapRemote) {
    return mapRemote;
  }
  if (object === matRemote) {
    return mat;
  }

  throw new Error(`Unknown object: ${object.id}`);
};

const mesh1: VObject = {
  version: 1,
  id: 'mesh1',
  type: 'object3d',
  meta: {
    name: 'cube',
    vertices: 8,
    children: [mesh2Remote],
    material: matRemote,
  },
};

const HEADER = 'VRAPOINT';

const encoder = new TextEncoder();

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
    if (this.buffer.byteLength !== this.offset) {
      throw new Error(
        `Buffer size mismatch: expected ${this.buffer.byteLength}, got ${this.offset}`,
      );
    }
    return this.buffer;
    // return this.buffer.slice(0, this.offset);
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
    size += 4; // length of data object
    for (const key in obj.data) {
      const dataBuffer = obj.data[key];
      size += 4 + key.length; // key (length + string)
      size += 4 + dataBuffer.byteLength; // length of ArrayBuffer + ArrayBuffer size
    }
  }

  const serializer = new BinarySerializer(size);

  // Write data
  serializer.writeString(HEADER);
  serializer.writeUint32(obj.version);
  serializer.writeString(obj.id);
  serializer.writeString(obj.type);
  serializer.writeString(metaString);

  if (obj.data) {
    const leng = Object.keys(obj.data).length;
    serializer.writeUint32(leng); // length of data object
    // serializer.writeArrayBuffer(obj.data);
    for (const key in obj.data) {
      const dataBuffer = obj.data[key];
      serializer.writeString(key); // key (length + string)
      serializer.writeArrayBuffer(dataBuffer); // length of ArrayBuffer + ArrayBuffer size
    }
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

example();

// export {};
