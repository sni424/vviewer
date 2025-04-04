import { RootState } from '@react-three/fiber';
import * as THREE from 'three';
import type { TransformControlsPlane } from 'three/examples/jsm/controls/TransformControls.js';
import { Layer } from '../../Constants';
import { resetGL } from '../utils';
import { type VUserData } from './VTHREETypes';

declare module 'three' {
  interface Object3D {
    get asMesh(): THREE.Mesh;

    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);

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

if (!Object.getOwnPropertyDescriptor(THREE.Object3D.prototype, 'asMesh')) {
  Object.defineProperty(THREE.Object3D.prototype, 'asMesh', {
    get: function () {
      return this as THREE.Mesh;
    },
    set: function () {
      throw new Error('asMesh is read-only');
    },
  });
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

THREE.Object3D.prototype.traverseAll = function (
  callback: (node: THREE.Object3D) => any,
) {
  callback(this);
  this.children.forEach(child => child.traverseAll(callback));
};

THREE.Object3D.prototype.traverse = function (
  callback: (node: THREE.Object3D) => any,
) {
  if (this.type !== 'Scene' && !this.layers.isEnabled(Layer.Model)) {
    // console.warn('traverse(): this Not in Model Layer : ', this);
    return;
  }
  callback(this);
  this.children.forEach(child => child.traverse(callback));
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
      return this.userData as VUserData;
    },
    set: function (userData: Partial<VUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}

THREE.Object3D.prototype.isTransformControl = function () {
  return (
    this.name === 'TransformControl' ||
    ['translate', 'rotate', 'scale'].includes(
      (this as TransformControlsPlane).mode,
    ) ||
    // R3F Drei 로 추가된 TransformControls 에 userData 를 통해 생성된 데이터로 Group 데이터 구별
    (this.type === 'Group' && this.userData.isTransformControl)
  );
};
THREE.Object3D.prototype.isBoxHelper = function () {
  return this.type === 'BoxHelper';
};

THREE.Object3D.prototype.isXYZGizmo = function () {
  return (
    this.name === 'GizmoHelper' || (this.type === 'Mesh' && this.name === 'XYZ')
  );
};

THREE.Object3D.prototype.isSystemGenerated = function () {
  return this.isBoxHelper() || this.isXYZGizmo() || this.isTransformControl();
};
