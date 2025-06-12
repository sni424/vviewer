import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import Workers from 'src/scripts/workers/Workers';
import { BufferGeometry } from 'three';
import * as THREE from 'VTHREE';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

class VRGLoader implements MaxLoader<THREE.BufferGeometry> {
  readonly type: MaxFileType = 'geometry';

  constructor() {}

  async load(maxFile: MaxFile): Promise<BufferGeometry> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if (MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as Promise<THREE.BufferGeometry>;
    }

    const prom = new Promise<THREE.BufferGeometry>(async res => {
      if (type !== this.type) {
        throw new Error(
          'wrong Type of Max File Income for ' + this.type + ' : ' + type,
        );
      }

      const geometry = await loadSmartGeometry(originalFile);

      maxFile.loaded = true;
      maxFile.resultData = geometry;
      return res(geometry);
    });

    MaxCache.addPromise(maxFile, prom);

    return prom;
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
      ) as Promise<THREE.BufferGeometry>;
    }

    const prom = new Promise<THREE.BufferGeometry>(async res => {
      const targetURL =
        MaxConstants.GEOMETRY_PATH +
        encodeURIComponent(filename)
          // S3는 공백을 + 로 반환하므로 맞춰줌 (optional)
          .replace(/%20/g, '+');
      console.log('fileName', filename);
      console.log('targetURL', targetURL);
      // const file = await resolveMaxFile(targetURL, filename, this.type);

      // return await this.load(file);

      return res(Workers.geometryDeserialize(targetURL));
    });

    MaxCache.addPromiseByNameAndType(filename, 'geometry', prom);
    return prom;
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

function unquantizeSigned(val: number, bits: number): number {
  const max = (1 << (bits - 1)) - 1;
  return Math.max(-1, val / max);
}

function unquantizeUnsigned(val: number, bits: number): number {
  const maxInt = (1 << bits) - 1;
  return val / maxInt;
}

function parseVXQ0(view: DataView): THREE.BufferGeometry {
  let offset = 4; // VXQ0 시그니처 후

  const totalVerts = view.getInt32(offset, true);
  offset += 4;
  const numFaces = view.getInt32(offset, true);
  offset += 4;
  offset += 8; // normal, uv 수 (사용하지 않음)

  const minX = view.getFloat32(offset, true);
  offset += 4;
  const minY = view.getFloat32(offset, true);
  offset += 4;
  const minZ = view.getFloat32(offset, true);
  offset += 4;
  const maxX = view.getFloat32(offset, true);
  offset += 4;
  const maxY = view.getFloat32(offset, true);
  offset += 4;
  const maxZ = view.getFloat32(offset, true);
  offset += 4;

  // --- UV 채널 수 및 bounds 읽기 ---
  const uvChannelCount = view.getInt32(offset, true);
  offset += 4;
  const uvBounds: [number, number, number, number][] = [];

  for (let i = 0; i < uvChannelCount; i++) {
    const minU = view.getFloat32(offset, true);
    offset += 4;
    const maxU = view.getFloat32(offset, true);
    offset += 4;
    const minV = view.getFloat32(offset, true);
    offset += 4;
    const maxV = view.getFloat32(offset, true);
    offset += 4;
    uvBounds.push([minU, maxU, minV, maxV]);
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvChannels = Array.from(
    { length: uvChannelCount },
    () => new Float32Array(totalVerts * 2),
  );

  for (let i = 0; i < totalVerts; i++) {
    const x = unquantizeSigned(view.getInt16(offset, true), 16);
    offset += 2;
    const y = unquantizeSigned(view.getInt16(offset, true), 16);
    offset += 2;
    const z = unquantizeSigned(view.getInt16(offset, true), 16);
    offset += 2;

    positions.set(
      [
        (x * (maxX - minX)) / 2 + (minX + maxX) / 2,
        (y * (maxY - minY)) / 2 + (minY + maxY) / 2,
        (z * (maxZ - minZ)) / 2 + (minZ + maxZ) / 2,
      ],
      i * 3,
    );

    offset += 6; // dummy index

    for (let ch = 0; ch < uvChannelCount; ch++) {
      const u_raw = view.getUint16(offset, true);
      offset += 2;
      const v_raw = view.getUint16(offset, true);
      offset += 2;
      const [minU, maxU, minV, maxV] = uvBounds[ch];

      const u = (u_raw / 65535) * (maxU - minU) + minU;
      const v = (v_raw / 65535) * (maxV - minV) + minV;

      uvChannels[ch].set([u, v], i * 2);
    }

    const nx = unquantizeSigned(view.getInt8(offset++), 8);
    const ny = unquantizeSigned(view.getInt8(offset++), 8);
    const nz = unquantizeSigned(view.getInt8(offset++), 8);
    normals.set([nx, ny, nz], i * 3);
  }

  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  uvChannels.forEach((uvs, idx) => {
    const name = idx === 0 ? 'uv' : `uv${idx}`;
    geometry.setAttribute(name, new THREE.BufferAttribute(uvs, 2));
  });

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  //
  // geometry = BufferGeometryUtils.mergeVertices(geometry);
  // geometry.computeVertexNormals();

  // normal map 쓸 경우
  if (geometry.getAttribute('uv') && geometry.getAttribute('normal')) {
    try {
      geometry.computeTangents();
    } catch (e) {
      console.warn('Tangent computation failed:', e);
    }
  }

  return geometry;
}

/**
 * VXQ1 File 구조
 *
 * VXQ1 magic header (4 bytes)
 *
 * vertexCount (int32)
 *
 * indexCount (int32)
 *
 * uvChannelCount (int32)
 *
 * bbox min/max (6 x float32)
 *
 * uvBounds[ch] (4 x float32 per channel)
 *
 * Vertex buffer (per vertex):
 *
 * position (3 x int16)
 *
 * uvs (2 x uint16 × channel count)
 *
 * normal (3 x int8)
 *
 * Index buffer (3 x uint32 per face)
 * **/

function parseVXQ1(view: DataView): THREE.BufferGeometry {
  let offset = 4; // VXQ1

  const vertexCount = view.getInt32(offset, true); offset += 4;
  const indexCount = view.getInt32(offset, true); offset += 4;
  const uvChannelCount = view.getInt32(offset, true); offset += 4;

  const minX = view.getFloat32(offset, true); offset += 4;
  const minY = view.getFloat32(offset, true); offset += 4;
  const minZ = view.getFloat32(offset, true); offset += 4;
  const maxX = view.getFloat32(offset, true); offset += 4;
  const maxY = view.getFloat32(offset, true); offset += 4;
  const maxZ = view.getFloat32(offset, true); offset += 4;

  const uvBounds: [number, number, number, number][] = [];
  for (let i = 0; i < uvChannelCount; i++) {
    const minU = view.getFloat32(offset, true); offset += 4;
    const maxU = view.getFloat32(offset, true); offset += 4;
    const minV = view.getFloat32(offset, true); offset += 4;
    const maxV = view.getFloat32(offset, true); offset += 4;
    uvBounds.push([minU, maxU, minV, maxV]);
  }

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvChannels = Array.from({ length: uvChannelCount }, () => new Float32Array(vertexCount * 2));

  for (let i = 0; i < vertexCount; i++) {
    const x = unquantizeSigned(view.getInt16(offset, true), 16); offset += 2;
    const y = unquantizeSigned(view.getInt16(offset, true), 16); offset += 2;
    const z = unquantizeSigned(view.getInt16(offset, true), 16); offset += 2;

    positions[i * 3] = x * (maxX - minX) / 2 + (minX + maxX) / 2;
    positions[i * 3 + 1] = y * (maxY - minY) / 2 + (minY + maxY) / 2;
    positions[i * 3 + 2] = z * (maxZ - minZ) / 2 + (minZ + maxZ) / 2;

    for (let ch = 0; ch < uvChannelCount; ch++) {
      const uRaw = view.getUint16(offset, true); offset += 2;
      const vRaw = view.getUint16(offset, true); offset += 2;
      const [minU, maxU, minV, maxV] = uvBounds[ch];

      const u = unquantizeUnsigned(uRaw, 16) * (maxU - minU) + minU;
      const v = unquantizeUnsigned(vRaw, 16) * (maxV - minV) + minV;
      uvChannels[ch][i * 2] = u;
      uvChannels[ch][i * 2 + 1] = v;
    }

    const nx = unquantizeSigned(view.getInt8(offset++), 8);
    const ny = unquantizeSigned(view.getInt8(offset++), 8);
    const nz = unquantizeSigned(view.getInt8(offset++), 8);
    normals[i * 3] = nx;
    normals[i * 3 + 1] = ny;
    normals[i * 3 + 2] = nz;
  }

  const indices = new Uint32Array(indexCount);
  for (let i = 0; i < indexCount; i++) {
    indices[i] = view.getUint32(offset, true); offset += 4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  uvChannels.forEach((uvs, i) => {
    const name = i === 0 ? 'uv' : `uv${i}`;
    geometry.setAttribute(name, new THREE.BufferAttribute(uvs, 2));
  });
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  try {
    if (geometry.getAttribute('uv') && geometry.getAttribute('normal')) {
      geometry.computeTangents();
    }
  } catch (e) {
    console.warn('Tangent computation failed:', e);
  }

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
