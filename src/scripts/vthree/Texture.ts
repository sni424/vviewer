import * as THREE from 'three';
import { ThreeUserData } from './types.ts';

declare module 'three' {

  interface WebGLProgramParametersWithUniforms {
    cleanup?: () => void;
  }

  interface Texture {
    get vUserData(): ThreeUserData;

    set vUserData(userData: Partial<ThreeUserData>);
  }

}

if (
  !Object.prototype.hasOwnProperty.call(THREE.Texture.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Texture.prototype, 'vUserData', {
    get: function () {
      return this.userData as ThreeUserData;
    },
    set: function (userData: Partial<ThreeUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}
