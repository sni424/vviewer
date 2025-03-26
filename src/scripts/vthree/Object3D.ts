import { RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { resetGL } from '../utils';
import { ThreeUserData } from './types';

declare module "three" {
  interface Object3D {
    get vUserData(): ThreeUserData;

    set vUserData(userData: Partial<ThreeUserData>);

    traverse(callback: (node: Object3D) => any): void;

    traverseAll(callback: (node: Object3D) => any): void;

    isSystemGenerated(): boolean;

    isBoxHelper(): boolean;

    isXYZGizmo(): boolean;

    isTransformControl(): boolean;

    traverseParent(
      ...params: Parameters<Object3D['traverseAncestors']>
    ): ReturnType<Object3D['traverseAncestors']>;

    isParentVisible(): boolean;

    // 자신을 포함한 모든 자식들
    all<T = Object3D>(includeSelf?: boolean): T[];

    ofIDs(ids: string[]): Object3D[];

    meshes(): THREE.Mesh[];

    materials(): THREE.Material[];

    updateAllMaterials(threeExports?: RootState): void;
  }
}

THREE.Object3D.prototype.all = function <T = THREE.Object3D>(
  includeSelf = false,
) {
  const result = includeSelf ? [this] : [];
  this.traverse(node => {
    result.push(node);
  });
  return result as T[];
};

THREE.Object3D.prototype.ofIDs = function (ids: string[]) {
  const result: THREE.Object3D[] = [];
  this.traverse(node => {
    if (ids.includes(node.uuid)) {
      result.push(node);
    }
  });
  return result;
};

THREE.Object3D.prototype.meshes = function () {
  const result: THREE.Mesh[] = [];
  this.traverse(node => {
    if (node instanceof THREE.Mesh) {
      result.push(node);
    }
  });
  return result;
};

THREE.Object3D.prototype.materials = function () {
  const result: THREE.Material[] = [];
  this.traverse(node => {
    if (node instanceof THREE.Mesh && node.material) {
      result.push(node.material);
    }
  });
  return result;
};

THREE.Object3D.prototype.updateAllMaterials = function (
  threeExports?: RootState,
) {
  resetGL(threeExports);
};

THREE.Object3D.prototype.traverseParent =
  THREE.Object3D.prototype.traverseAncestors;

THREE.Object3D.prototype.isParentVisible = function () {
  let visibility = true;
  this.traverseParent(node => {
    if (node.visible === false) {
      visibility = false;
    }
  });
  return visibility;
};

// vUserData
if (
  !Object.prototype.hasOwnProperty.call(THREE.Object3D.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Object3D.prototype, 'vUserData', {
    get: function () {
      return this.userData as ThreeUserData;
    },
    set: function (userData: Partial<ThreeUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}