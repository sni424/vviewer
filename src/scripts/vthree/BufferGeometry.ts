import * as THREE from 'three';
import { VUserData } from './VTHREETypes';

declare module 'three' {
  interface BufferGeometry {
    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);
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
