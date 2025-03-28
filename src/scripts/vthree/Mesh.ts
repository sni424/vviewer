import * as THREE from 'three';

declare module 'three' {

  interface Mesh {
    mat: THREE.Material;
    matStandard: THREE.MeshStandardMaterial;
    matBasic: THREE.MeshBasicMaterial;
    matLambert: THREE.MeshLambertMaterial;
    matPhong: THREE.MeshPhongMaterial;
    matPhysical: THREE.MeshPhysicalMaterial;
  }

}

THREE.Mesh.prototype.mat = THREE.Mesh.prototype.material as THREE.Material;
THREE.Mesh.prototype.matStandard = THREE.Mesh.prototype.material as THREE.MeshStandardMaterial;
THREE.Mesh.prototype.matBasic = THREE.Mesh.prototype.material as THREE.MeshBasicMaterial;
THREE.Mesh.prototype.matLambert = THREE.Mesh.prototype.material as THREE.MeshLambertMaterial;
THREE.Mesh.prototype.matPhong = THREE.Mesh.prototype.material as THREE.MeshPhongMaterial;
THREE.Mesh.prototype.matPhysical = THREE.Mesh.prototype.material as THREE.MeshPhysicalMaterial;