import * as THREE from 'three';
import { Matrix4Array } from './types';

export interface ThreeUserData {
  otherUserCamera?: boolean;
  sessionId?: string;
  ignoreRaycast?: boolean;
  isReview?: boolean;
  id?: string;
  nodeId?: string;
  // mySelectBox?: boolean;
  selectBox?: 'mine' | string; // 내 꺼는 mine, 이 외의 경우 다른 유저의 uuid
}

declare module 'three' {
  interface Matrix4 {
    toArray(): Matrix4Array;
    decomposed(): [Vector3, THREE.Quaternion, Vector3];
  }

  interface Vector3 {
    screenPosition(camera: THREE.Camera): { x: number; y: number };
    inCameraView(camera: THREE.Camera): boolean;

    // 카메라와 점 사이의 물체
    cameraIntersects(
      camera: THREE.Camera,
      scene: THREE.Scene,
      raycasterInstance?: THREE.Raycaster,
    ): THREE.Intersection[];

    // 카메라와 점 사이에 물체가 있는지 확인
    // @filterFunction : 물체를 필터링할 함수, 예를 들어 유저카메라, 3D텍스트 등
    isHidden(
      camera: THREE.Camera,
      scene: THREE.Scene,
      filterFunction: (
        value: THREE.Intersection,
        index?: number,
        array?: THREE.Intersection[],
      ) => boolean,
      raycasterInstance?: THREE.Raycaster,
    ): boolean;
  }

  interface Object3D {
    getUserData(): ThreeUserData;
    // extend가 true이면 기존 데이터를 유지하면서 새로운 데이터를 추가한다.
    // false이면 오버라이드
    // default : true
    setUserData(userData: ThreeUserData, extend?: boolean): Object3D;
  }
}

THREE.Vector3.prototype.screenPosition = function (camera) {
  const vector = this.project(camera);
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Convert NDC to screen space (0,0 is the top-left corner)
  const screenX = ((vector.x + 1) * width) / 2;
  const screenY = ((-vector.y + 1) * height) / 2; // Invert Y axis for screen space
  return {
    x: screenX,
    y: screenY,
  };
};

THREE.Vector3.prototype.inCameraView = function (camera) {
  const vector = this.project(camera);
  const isInView =
    vector.x >= -1 &&
    vector.x <= 1 &&
    vector.y >= -1 &&
    vector.y <= 1 &&
    vector.z >= -1 &&
    vector.z <= 1;

  return isInView;
};

THREE.Vector3.prototype.cameraIntersects = function (
  camera,
  scene,
  raycasterInstance,
) {
  const raycaster = raycasterInstance ?? new THREE.Raycaster();

  // Set the ray starting from the camera and pointing towards the point
  raycaster.set(camera.position, this.clone().sub(camera.position).normalize());

  // Check for intersection with objects (assuming you have an array of objects to test)
  const intersects = raycaster.intersectObjects(scene.children, true);
  return intersects;
};

THREE.Vector3.prototype.isHidden = function (
  camera,
  scene,
  filterFunction,
  raycasterInstance,
) {
  const intersects = this.cameraIntersects(camera, scene, raycasterInstance);

  const filtered = intersects.filter(filterFunction);

  const hidden = filtered.length > 0;
  return hidden;
};

THREE.Object3D.prototype.getUserData = function () {
  return this.userData as ThreeUserData;
};

THREE.Object3D.prototype.setUserData = function (
  userData: ThreeUserData,
  extend = true,
) {
  if (extend) {
    this.userData = {
      ...this.userData,
      ...userData,
    };
  } else {
    this.userData = { ...userData };
  }

  return this;
};

THREE.Matrix4.prototype.decomposed = function () {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  this.decompose(position, quaternion, scale);
  return [position, quaternion, scale];
};

export * from 'three';
export { THREE };
