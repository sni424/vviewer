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

function parseVXQ0(view: DataView) {
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

  return {
    format: 'VXQ0' as const,
    positions,
    normals,
    uvChannels,
  };

  // const geometry = new THREE.BufferGeometry();
  // geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  // uvChannels.forEach((uvs, idx) => {
  //   const name = idx === 0 ? 'uv' : `uv${idx}`;
  //   geometry.setAttribute(name, new THREE.BufferAttribute(uvs, 2));
  // });

  // return geometry;
}

function parseVXQ1(view: DataView) {
  let offset = 4; // VXQ1

  const vertexCount = view.getInt32(offset, true);
  offset += 4;
  const indexCount = view.getInt32(offset, true);
  offset += 4;
  const uvChannelCount = view.getInt32(offset, true);
  offset += 4;

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

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = Array.from(
    { length: uvChannelCount },
    () => new Float32Array(vertexCount * 2),
  );

  for (let i = 0; i < vertexCount; i++) {
    const x = unquantizeSigned(view.getInt16(offset, true), 16);
    offset += 2;
    const y = unquantizeSigned(view.getInt16(offset, true), 16);
    offset += 2;
    const z = unquantizeSigned(view.getInt16(offset, true), 16);
    offset += 2;

    positions[i * 3] = (x * (maxX - minX)) / 2 + (minX + maxX) / 2;
    positions[i * 3 + 1] = (y * (maxY - minY)) / 2 + (minY + maxY) / 2;
    positions[i * 3 + 2] = (z * (maxZ - minZ)) / 2 + (minZ + maxZ) / 2;

    for (let ch = 0; ch < uvChannelCount; ch++) {
      const uRaw = view.getUint16(offset, true);
      offset += 2;
      const vRaw = view.getUint16(offset, true);
      offset += 2;
      const [minU, maxU, minV, maxV] = uvBounds[ch];

      const u = unquantizeUnsigned(uRaw, 16) * (maxU - minU) + minU;
      const v = unquantizeUnsigned(vRaw, 16) * (maxV - minV) + minV;
      uvs[ch][i * 2] = u;
      uvs[ch][i * 2 + 1] = v;
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
    indices[i] = view.getUint32(offset, true);
    offset += 4;
  }

  return {
    format: 'VXQ1' as const,
    positions,
    normals,
    uvs,
    indices,
  };

  // const geometry = new THREE.BufferGeometry();
  // geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  // geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  // geometry.setIndex(indices);
  // return geometry;
}

export function loadSmartGeometry(arrayBuffer: ArrayBuffer) {
  const dataView = new DataView(arrayBuffer);
  let offset = 0;

  const magic = new TextDecoder().decode(
    new Uint8Array(arrayBuffer.slice(0, 4)),
  );
  offset += 4;

  // console.log('magic', magic);

  if (magic === 'VXQ1') {
    // ✅ Indexed + Quantized
    return parseVXQ1(dataView);
  } else if (magic === 'VXQ0') {
    return parseVXQ0(dataView);
  } else {
    // 기존 VXG0, VXG1 처리 → 그대로 두기
    // return await legacyVXGLoader(dataView, magic, offset);
    throw new Error('Unsupported format');
  }
}
