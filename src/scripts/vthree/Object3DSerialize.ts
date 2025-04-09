import * as THREE from 'three';

type Serializable = ArrayBuffer;

declare module 'three' {
  interface Object3D {
    serialize(): Serializable;
  }

  // static function
  namespace Object3D {
    export function deserialize(data: Serializable): Object3D;
  }
}

THREE.Object3D.prototype.serialize = function () {
  return new ArrayBuffer(0);
};

THREE.Object3D.deserialize = function (data: Serializable) {
  const obj = new THREE.Object3D();
  // Deserialize the data into the object
  // For example, if you have a position property in your object:
  // obj.position.fromArray(new Float32Array(data));

  return obj;
};
