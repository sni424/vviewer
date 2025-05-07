import * as THREE from 'three';
import { VUserData } from './VTHREETypes';

declare module 'three' {
  // Object3D, Material, Texture, BufferGeometry 모두
  // EventDispatcher를 상속받고 있음
  interface EventDispatcher {
    get vUserData(): VUserData;
    set vUserData(userData: Partial<VUserData>);

    // 처음 한 번만 v4()로 아이디를 만든다.
    get vid(): string; // userData.vid

    updateHash(): string;
    updateHashPrecise(): Promise<string>;

    update(): void;
    _version: number;
  }
}

THREE.EventDispatcher.prototype._version = 0;
THREE.EventDispatcher.prototype.update = function () {
  this._version++;
  this.dispatchEvent({ type: 'update' });
};

if (
  !Object.prototype.hasOwnProperty.call(THREE.EventDispatcher.prototype, 'vid')
) {
  Object.defineProperty(THREE.EventDispatcher.prototype, 'vid', {
    get: function (): string {
      if (this.vUserData?.vid) {
        return this.vUserData.vid;
      }

      // updateHash() : 각 클래스에서 정의해줘야함
      // Object3D, Material, Texture, BufferGeometry
      const hash = this.updateHash?.();
      if (!hash) {
        console.error(this.type, this);
        throw new Error('updateHash를 정의해야함');
      }

      this.vUserData.vid = hash;
      return hash;
    },
  });
}

// vUserData
if (
  !Object.prototype.hasOwnProperty.call(
    THREE.EventDispatcher.prototype,
    'vUserData',
  )
) {
  Object.defineProperty(THREE.EventDispatcher.prototype, 'vUserData', {
    get: function () {
      if (!this.userData) {
        this.userData = {};
      }
      return this.userData as VUserData;
    },
    set: function (userData: Partial<VUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}
