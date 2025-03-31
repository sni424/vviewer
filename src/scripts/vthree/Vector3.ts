import * as THREE from 'three';

declare module 'three' {

  interface Vector3 {
    screenPosition(
      camera: THREE.Camera,
      width?: number,
      height?: number,
    ): { x: number; y: number };

    inCameraView(camera: THREE.Camera): boolean;

    // 카메라와 점 사이의 물체
    cameraIntersects(
      camera: THREE.Camera,
      scene: THREE.Scene,
      raycasterInstance?: THREE.Raycaster,
    ): THREE.Intersection[];

    revert(): THREE.Vector3;

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

}



THREE.Vector3.prototype.screenPosition = function (
  camera,
  inputWidth,
  inputHeight,
) {
  const vector = this.clone().project(camera);
  const width = inputWidth ?? window.innerWidth;
  const height = inputHeight ?? window.innerHeight;

  // Convert NDC to screen space (0,0 is the top-left corner)
  const screenX = ((vector.x + 1) * width) / 2;
  const screenY = ((-vector.y + 1) * height) / 2; // Invert Y axis for screen space

  // console.log({ width, height, screenX, screenY, x: vector.x, y: vector.y });
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

THREE.Vector3.prototype.revert = function () {
  this.x = 1 / this.x;
  this.y = 1 / this.y;
  this.z = 1 / this.z;

  return this;
};
