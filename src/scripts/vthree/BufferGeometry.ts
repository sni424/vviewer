import * as THREE from 'three';
import { VUserData } from './VTHREETypes';

declare module 'three' {
  interface BufferGeometry {
    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);

    get hash(): Promise<string>;
    updateHash(): Promise<string>;
  }
}

// vUserData
if (
  !Object.prototype.hasOwnProperty.call(THREE.Material.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Material.prototype, 'vUserData', {
    get: function () {
      return this.userData as VUserData;
    },
    set: function (userData: Partial<VUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}

if (
  !Object.prototype.hasOwnProperty.call(THREE.BufferGeometry.prototype, 'hash')
) {
  Object.defineProperty(THREE.BufferGeometry.prototype, 'hash', {
    get: async function (): Promise<string> {
      if (this.vUserData?.hash) {
        return Promise.resolve(this.vUserData.hash);
      }

      return this.updateHash();
    },
  });
}

THREE.BufferGeometry.prototype.updateHash = async function (): Promise<string> {
  const geometry = this;
  const hashInputParts: ArrayBuffer[] = [];

  // 인덱스 포함 (있다면)
  if (geometry.index) {
    const index = geometry.index.array;
    hashInputParts.push(
      index.buffer.slice(index.byteOffset, index.byteOffset + index.byteLength),
    );
  }

  // 각 속성에 대해 데이터 추출
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const typedArray = (attr as any).array;
    const buffer = typedArray.buffer.slice(
      typedArray.byteOffset,
      typedArray.byteOffset + typedArray.byteLength,
    );

    // 속성 이름 해싱을 위해 텍스트도 포함
    const nameEncoded = new TextEncoder().encode(name);
    hashInputParts.push(nameEncoded.buffer);
    hashInputParts.push(buffer);
  }

  // 하나로 합치기
  const totalLength = hashInputParts.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of hashInputParts) {
    combined.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }

  return crypto.subtle.digest('SHA-1', combined.buffer).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (!this.vUserData) {
      this.vUserData = {};
    }
    this.vUserData.hash = hash;
    if (!this.vUserData.id) {
      this.vUserData.id = hash;
    }
    return hash;
  });
};

import './BufferGeometryToAsset';
