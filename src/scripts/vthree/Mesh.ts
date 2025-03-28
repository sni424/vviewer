import * as THREE from 'three';

declare module 'three' {

  interface Mesh {

    get mat(): THREE.Material;
    get matStandard(): THREE.MeshStandardMaterial;
    get matBasic(): THREE.MeshBasicMaterial;
    get matLambert(): THREE.MeshLambertMaterial;
    get matPhong(): THREE.MeshPhongMaterial;
    get matPhysical(): THREE.MeshPhysicalMaterial;
  }

}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'mat')) {
  Object.defineProperty(THREE.Mesh.prototype, 'mat', {
    get: function () {
      return this.material as THREE.Material;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matStandard')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matStandard', {
    get: function () {
      return this.material as THREE.MeshStandardMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matBasic')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matBasic', {
    get: function () {
      return this.material as THREE.MeshBasicMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matLambert')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matLambert', {
    get: function () {
      return this.material as THREE.MeshLambertMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matPhong')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matPhong', {
    get: function () {
      return this.material as THREE.MeshPhongMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matPhysical')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matPhysical', {
    get: function () {
      return this.material as THREE.MeshPhysicalMaterial;
    }
  });
}