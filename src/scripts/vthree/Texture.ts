import * as THREE from 'three';
import { VUserData } from 'VTHREE';

declare module 'three' {
  interface WebGLProgramParametersWithUniforms {
    cleanup?: () => void;
  }

  interface Texture {
    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);
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
