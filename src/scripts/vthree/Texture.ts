import objectHash from 'object-hash';
import * as THREE from 'three';
import { hashDataTexture, hashImageData } from '../utils';
import { type VUserData } from './VTHREETypes';

declare module 'three' {
  interface WebGLProgramParametersWithUniforms {
    cleanup?: () => void;
  }

  interface Texture {
    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);

    // vUserData.hash가 있으면 리턴, 없으면 계산 후 vUserData.hash에 저장
    get hash(): Promise<string>;
    updateHash(): Promise<string>;
  }
}

if (
  !Object.prototype.hasOwnProperty.call(THREE.Texture.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Texture.prototype, 'vUserData', {
    get: function () {
      return this.userData as VUserData;
    },
    set: function (userData: Partial<VUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}

if (!Object.prototype.hasOwnProperty.call(THREE.Texture.prototype, 'hash')) {
  Object.defineProperty(THREE.Texture.prototype, 'hash', {
    get: async function (): Promise<string> {
      if (this.vUserData?.hash) {
        return Promise.resolve(this.vUserData.hash);
      }

      return this.updateHash();
    },
  });
}

THREE.Texture.prototype.updateHash = async function (): Promise<string> {
  if (!this.vUserData) {
    this.vUserData = {};
  }

  if ((this as THREE.DataTexture).isDataTexture) {
    return hashDataTexture(this as THREE.DataTexture).then(hash => {
      this.vUserData.hash = hash;
      return hash;
    });
  }

  if (Boolean(this.image)) {
    return hashImageData(this.image).then(hash => {
      this.vUserData.hash = hash;
      return hash;
    });
  }

  const hash = objectHash(this);
  this.vUserData.hash = hash;
  console.warn('이 텍스쳐는 해시할 수 없음, objectHash 이용함', this, hash);
  return hash;
};
