import * as THREE from 'three';
import { hashArrayBuffer, hashObject } from '../manager/assets/AssetUtils';
import { VUserData } from './VTHREETypes';
declare module 'three' {
  interface BufferGeometry {
    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);

    get hash(): string;
    updateHash(): string;
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
    get: function (): string {
      if (this.vUserData?.hash) {
        return this.vUserData.hash;
      }

      return this.updateHash();
    },
  });
}

THREE.BufferGeometry.prototype.updateHash = function (): string {
  const geometry = this;
  const hashInputParts: string[] = [];

  // 인덱스 포함 (있다면)
  if (geometry.index) {
    const hash = hashArrayBuffer(geometry.index.array);
    hashInputParts.push(hash);
  }

  // 각 속성에 대해 데이터 추출
  for (const [_, attr] of Object.entries(geometry.attributes)) {
    const typedArray = (attr as any).array;
    const hash = hashArrayBuffer(typedArray.buffer);
    hashInputParts.push(hash);
  }

  const finalhash = hashObject(hashInputParts);

  if (!this.vUserData) {
    this.vUserData = {} as VUserData;
  }

  this.vUserData.hash = finalhash;
  if (!this.vUserData.id) {
    this.vUserData.id = finalhash;
  }
  return finalhash;
};

import './BufferGeometryToAsset';
