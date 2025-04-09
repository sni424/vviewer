import { THREE } from 'VTHREE';

declare module 'three' {
  interface Matrix4 {
    decomposed(): [Vector3, THREE.Quaternion, Vector3];
  }
}

THREE.Matrix4.prototype.decomposed = function () {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  this.decompose(position, quaternion, scale);
  return [position, quaternion, scale];
};
