import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import * as THREE from 'VTHREE';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import { BufferGeometry } from 'three';
import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { resolveMaxFile } from 'src/pages/max/loaders/MaxUtils.ts';

class VRGLoader implements MaxLoader<THREE.BufferGeometry> {
  readonly type: MaxFileType = 'geometry';

  constructor() {}

  async load(maxFile: MaxFile): Promise<BufferGeometry> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if ((loaded && resultData) || MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as THREE.BufferGeometry;
    }

    if (type !== this.type) {
      throw new Error(
        'wrong Type of Max File Income for ' + this.type + ' : ' + type,
      );
    }

    const geometry = await loadSmartGeometry(originalFile);

    maxFile.loaded = true;
    maxFile.resultData = geometry;

    MaxCache.add(maxFile);

    return geometry;
  }

  async loadFromFileName(
    filename: string | null,
  ): Promise<THREE.BufferGeometry> {
    if (filename === null) {
      throw new Error('filename is null');
    }

    if (MaxCache.hasByNameAndType(filename, this.type)) {
      return MaxCache.getByNameAndType(
        filename,
        this.type,
      ) as THREE.BufferGeometry;
    }

    const targetURL =
      MaxConstants.GEOMETRY_PATH +
      encodeURIComponent(filename)
        // S3는 공백을 + 로 반환하므로 맞춰줌 (optional)
        .replace(/%20/g, '+');
    console.log('fileName', filename);
    console.log('targetURL', targetURL);
    const file = await resolveMaxFile(targetURL, filename, this.type);

    return await this.load(file);
  }
}

async function fetchToFile(url: string, filename: string) {
  const response = await fetch(url);
  const mimeType =
    response.headers.get('Content-Type') || 'application/octet-stream';
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * ((t + 1) / 2); // t ∈ [-1,1]
}

function denormalizeSigned(val: number, min: number, max: number): number {
  return ((val + 1) / 2) * (max - min) + min;
}

function dequantizeUnsigned(val: number): number {
  return val / 65535;
}

function denormalize(val: number, min: number, max: number): number {
  return val * (max - min) + min;
}

function parseVXQ0(view: DataView): THREE.BufferGeometry {
  let offset = 4; // Skip magic number 'VXQ0'

  const vertexCount = view.getInt32(offset, true); offset += 4;
  const faceCount = view.getInt32(offset, true); offset += 4;
  offset += 8; // Skip fake uv/normal count

  const minX = view.getFloat32(offset, true); offset += 4;
  const minY = view.getFloat32(offset, true); offset += 4;
  const minZ = view.getFloat32(offset, true); offset += 4;
  const maxX = view.getFloat32(offset, true); offset += 4;
  const maxY = view.getFloat32(offset, true); offset += 4;
  const maxZ = view.getFloat32(offset, true); offset += 4;

  console.log('min:', minX, minY, minZ);
  console.log('max:', maxX, maxY, maxZ);

  // === UV range ===
  const uvMinX = view.getFloat32(offset, true); offset += 4;
  const uvMaxX = view.getFloat32(offset, true); offset += 4;
  const uvMinY = view.getFloat32(offset, true); offset += 4;
  const uvMaxY = view.getFloat32(offset, true); offset += 4;

  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    const x = view.getInt16(offset, true); offset += 2;
    const y = view.getInt16(offset, true); offset += 2;
    const z = view.getInt16(offset, true); offset += 2;
    positions.push(
      denormalizeSigned(x / 32767, minX, maxX),
      denormalizeSigned(y / 32767, minY, maxY),
      denormalizeSigned(z / 32767, minZ, maxZ),
    );

    offset += 6; // Skip dummy index

    const uNorm = dequantizeUnsigned(view.getUint16(offset, true)); offset += 2;
    const vNorm = dequantizeUnsigned(view.getUint16(offset, true)); offset += 2;
    const u = denormalize(uNorm, uvMinX, uvMaxX);
    const v = denormalize(vNorm, uvMinY, uvMaxY);
    uvs.push(u, 1.0 - v);

    const nx = view.getInt8(offset++) / 127;
    const ny = view.getInt8(offset++) / 127;
    const nz = view.getInt8(offset++) / 127;
    normals.push(nx, ny, nz);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

function parseVXQ1(view: DataView): THREE.BufferGeometry {
  let offset = 4; // Skip magic number 'VXQ1'

  const vertexCount = view.getInt32(offset, true); offset += 4;
  const faceCount = view.getInt32(offset, true); offset += 4;
  const uvCount = view.getInt32(offset, true); offset += 4;
  const normalCount = view.getInt32(offset, true); offset += 4;

  const minX = view.getFloat32(offset, true); offset += 4;
  const minY = view.getFloat32(offset, true); offset += 4;
  const minZ = view.getFloat32(offset, true); offset += 4;
  const maxX = view.getFloat32(offset, true); offset += 4;
  const maxY = view.getFloat32(offset, true); offset += 4;
  const maxZ = view.getFloat32(offset, true); offset += 4;

  // === UV range ===
  const uvMinX = view.getFloat32(offset, true); offset += 4;
  const uvMaxX = view.getFloat32(offset, true); offset += 4;
  const uvMinY = view.getFloat32(offset, true); offset += 4;
  const uvMaxY = view.getFloat32(offset, true); offset += 4;

  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    const x = view.getInt16(offset, true); offset += 2;
    const y = view.getInt16(offset, true); offset += 2;
    const z = view.getInt16(offset, true); offset += 2;
    positions.push(
      denormalizeSigned(x / 32767, minX, maxX),
      denormalizeSigned(y / 32767, minY, maxY),
      denormalizeSigned(z / 32767, minZ, maxZ),
    );
  }

  for (let i = 0; i < faceCount; i++) {
    indices.push(
      view.getUint16(offset, true),
      view.getUint16(offset + 2, true),
      view.getUint16(offset + 4, true)
    );
    offset += 6;
  }

  for (let i = 0; i < faceCount; i++) offset += 6; // Skip UV face indices

  for (let i = 0; i < uvCount; i++) {
    const uNorm = dequantizeUnsigned(view.getUint16(offset, true)); offset += 2;
    const vNorm = dequantizeUnsigned(view.getUint16(offset, true)); offset += 2;
    const u = denormalize(uNorm, uvMinX, uvMaxX);
    const v = denormalize(vNorm, uvMinY, uvMaxY);
    uvs.push(u, 1.0 - v);
  }

  for (let i = 0; i < normalCount; i++) {
    const nx = view.getInt8(offset++) / 127;
    const ny = view.getInt8(offset++) / 127;
    const nz = view.getInt8(offset++) / 127;
    normals.push(nx, ny, nz);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

async function loadSmartGeometry(file: File): Promise<THREE.BufferGeometry> {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  let offset = 0;

  const magic = new TextDecoder().decode(
    new Uint8Array(arrayBuffer.slice(0, 4)),
  );
  offset += 4;

  console.log('magic', magic);

  if (magic === 'VXQ1') {
    // ✅ Indexed + Quantized
    return parseVXQ1(dataView);
  } else if (magic === 'VXQ0') {
    return parseVXQ0(dataView);
  } else {
    // 기존 VXG0, VXG1 처리 → 그대로 두기
    return await legacyVXGLoader(dataView, magic, offset);
  }
}

// 기존 VXG 포맷 파서를 별도로 분리
async function legacyVXGLoader(
  dataView: DataView,
  magic: string,
  offset: number,
): Promise<THREE.BufferGeometry> {
  console.log('lecagy IN');
  if (magic === 'VXG1') {
    // ✅ Indexed 포맷
    const numVerts = dataView.getInt32(offset, true);
    offset += 4;
    const numFaces = dataView.getInt32(offset, true);
    offset += 4;
    const numUVs = dataView.getInt32(offset, true);
    offset += 4;
    const numNormals = dataView.getInt32(offset, true);
    offset += 4;

    const positions = new Float32Array(numVerts * 3);
    for (let i = 0; i < positions.length; i++) {
      positions[i] = dataView.getFloat32(offset, true);
      offset += 4;
    }

    const indices = new Uint32Array(numFaces * 3);
    for (let i = 0; i < indices.length; i++) {
      indices[i] = dataView.getUint32(offset, true);
      offset += 4;
    }

    const uvs = new Float32Array(numUVs * 2);
    for (let i = 0; i < uvs.length; i++) {
      uvs[i] = dataView.getFloat32(offset, true);
      offset += 4;
    }

    const normals = new Float32Array(numNormals * 3);
    for (let i = 0; i < normals.length; i++) {
      normals[i] = dataView.getFloat32(offset, true);
      offset += 4;
    }

    // interleave
    const stride = 8;
    const interleavedData = new Float32Array(numVerts * stride);
    for (let i = 0; i < numVerts; i++) {
      const pi = i * 3;
      const ni = i * 3;
      const uvi = i * 2;
      const ii = i * stride;

      interleavedData[ii] = positions[pi];
      interleavedData[ii + 1] = positions[pi + 1];
      interleavedData[ii + 2] = positions[pi + 2];

      interleavedData[ii + 3] = normals[ni];
      interleavedData[ii + 4] = normals[ni + 1];
      interleavedData[ii + 5] = normals[ni + 2];

      interleavedData[ii + 6] = uvs[uvi];
      interleavedData[ii + 7] = uvs[uvi + 1];
    }

    const interleavedBuffer = new THREE.InterleavedBuffer(
      interleavedData,
      stride,
    );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 0),
    );
    geometry.setAttribute(
      'normal',
      new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 3),
    );
    geometry.setAttribute(
      'uv',
      new THREE.InterleavedBufferAttribute(interleavedBuffer, 2, 6),
    );
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingBox();
    return geometry;
  } else if (magic === 'VXG0') {
    // ✅ Unindexed 포맷
    const numVerts = dataView.getInt32(offset, true);
    offset += 4;
    const numFaces = dataView.getInt32(offset, true);
    offset += 4;
    const numUVs = dataView.getInt32(offset, true);
    offset += 4;
    const numNormals = dataView.getInt32(offset, true);
    offset += 4;

    const vertexCount = numVerts;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    for (let i = 0; i < vertexCount; i++) {
      // position
      positions[i * 3] = dataView.getFloat32(offset, true);
      offset += 4;
      positions[i * 3 + 1] = dataView.getFloat32(offset, true);
      offset += 4;
      positions[i * 3 + 2] = dataView.getFloat32(offset, true);
      offset += 4;

      // dummy index (ignored)
      offset += 12;

      // uv
      uvs[i * 2] = dataView.getFloat32(offset, true);
      offset += 4;
      uvs[i * 2 + 1] = dataView.getFloat32(offset, true);
      offset += 4;

      // normal
      normals[i * 3] = dataView.getFloat32(offset, true);
      offset += 4;
      normals[i * 3 + 1] = dataView.getFloat32(offset, true);
      offset += 4;
      normals[i * 3 + 2] = dataView.getFloat32(offset, true);
      offset += 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.computeBoundingBox();
    return geometry;
  } else {
    throw new Error('VXG 포맷이 아닙니다. magic: ' + magic);
  }
}

// async function loadSmartGeometry(file: File): Promise<THREE.BufferGeometry> {
//   const arrayBuffer = await fileToArrayBuffer(file);
//   const dataView = new DataView(arrayBuffer);
//   let offset = 0;
//
//   // 1. Magic Number 확인 (VXG1 = indexed, VXG0 = unindexed)
//   const magic = new TextDecoder().decode(
//     new Uint8Array(arrayBuffer.slice(0, 4)),
//   );
//   offset += 4;
//
//   if (magic === 'VXG1') {
//     // ✅ Indexed 포맷
//     const numVerts = dataView.getInt32(offset, true);
//     offset += 4;
//     const numFaces = dataView.getInt32(offset, true);
//     offset += 4;
//     const numUVs = dataView.getInt32(offset, true);
//     offset += 4;
//     const numNormals = dataView.getInt32(offset, true);
//     offset += 4;
//
//     const positions = new Float32Array(numVerts * 3);
//     for (let i = 0; i < positions.length; i++) {
//       positions[i] = dataView.getFloat32(offset, true);
//       offset += 4;
//     }
//
//     const indices = new Uint32Array(numFaces * 3);
//     for (let i = 0; i < indices.length; i++) {
//       indices[i] = dataView.getUint32(offset, true);
//       offset += 4;
//     }
//
//     const uvs = new Float32Array(numUVs * 2);
//     for (let i = 0; i < uvs.length; i++) {
//       uvs[i] = dataView.getFloat32(offset, true);
//       offset += 4;
//     }
//
//     const normals = new Float32Array(numNormals * 3);
//     for (let i = 0; i < normals.length; i++) {
//       normals[i] = dataView.getFloat32(offset, true);
//       offset += 4;
//     }
//
//     // interleave
//     const stride = 8;
//     const interleavedData = new Float32Array(numVerts * stride);
//     for (let i = 0; i < numVerts; i++) {
//       const pi = i * 3;
//       const ni = i * 3;
//       const uvi = i * 2;
//       const ii = i * stride;
//
//       interleavedData[ii] = positions[pi];
//       interleavedData[ii + 1] = positions[pi + 1];
//       interleavedData[ii + 2] = positions[pi + 2];
//
//       interleavedData[ii + 3] = normals[ni];
//       interleavedData[ii + 4] = normals[ni + 1];
//       interleavedData[ii + 5] = normals[ni + 2];
//
//       interleavedData[ii + 6] = uvs[uvi];
//       interleavedData[ii + 7] = uvs[uvi + 1];
//     }
//
//     const interleavedBuffer = new THREE.InterleavedBuffer(
//       interleavedData,
//       stride,
//     );
//     const geometry = new THREE.BufferGeometry();
//     geometry.setAttribute(
//       'position',
//       new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 0),
//     );
//     geometry.setAttribute(
//       'normal',
//       new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 3),
//     );
//     geometry.setAttribute(
//       'uv',
//       new THREE.InterleavedBufferAttribute(interleavedBuffer, 2, 6),
//     );
//     geometry.setIndex(new THREE.BufferAttribute(indices, 1));
//     geometry.computeBoundingBox();
//     return geometry;
//   } else if (magic === 'VXG0') {
//     // ✅ Unindexed 포맷
//     const numVerts = dataView.getInt32(offset, true);
//     offset += 4;
//     const numFaces = dataView.getInt32(offset, true);
//     offset += 4;
//     const numUVs = dataView.getInt32(offset, true);
//     offset += 4;
//     const numNormals = dataView.getInt32(offset, true);
//     offset += 4;
//
//     const vertexCount = numVerts;
//
//     const positions = new Float32Array(vertexCount * 3);
//     const normals = new Float32Array(vertexCount * 3);
//     const uvs = new Float32Array(vertexCount * 2);
//
//     for (let i = 0; i < vertexCount; i++) {
//       // position
//       positions[i * 3] = dataView.getFloat32(offset, true);
//       offset += 4;
//       positions[i * 3 + 1] = dataView.getFloat32(offset, true);
//       offset += 4;
//       positions[i * 3 + 2] = dataView.getFloat32(offset, true);
//       offset += 4;
//
//       // dummy index (ignored)
//       offset += 12;
//
//       // uv
//       uvs[i * 2] = dataView.getFloat32(offset, true);
//       offset += 4;
//       uvs[i * 2 + 1] = dataView.getFloat32(offset, true);
//       offset += 4;
//
//       // normal
//       normals[i * 3] = dataView.getFloat32(offset, true);
//       offset += 4;
//       normals[i * 3 + 1] = dataView.getFloat32(offset, true);
//       offset += 4;
//       normals[i * 3 + 2] = dataView.getFloat32(offset, true);
//       offset += 4;
//     }
//
//     const geometry = new THREE.BufferGeometry();
//     geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//     geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
//     geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
//     geometry.computeBoundingBox();
//     return geometry;
//   } else {
//     throw new Error('VXG 포맷이 아닙니다. magic: ' + magic);
//   }
// }

export default VRGLoader;
