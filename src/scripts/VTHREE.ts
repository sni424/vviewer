import { RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { TransformControlsPlane } from 'three/examples/jsm/Addons.js';
import { Layer } from '../Constants';
import {
  Matrix4Array,
  MoveActionOptions,
  MoveActionType,
  View,
} from '../types';
import { moveTo, resetGL } from './utils';

export class LightmapImageContrast {
  static min = -0.5;
  static max = 2.5;
  static step = 0.005;
  static on = false;
  static value = 0.0;
}
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

  interface Object3D {
    getUserData(): ThreeUserData;
    // extend가 true이면 기존 데이터를 유지하면서 새로운 데이터를 추가한다.
    // false이면 오버라이드
    // default : true
    setUserData(userData: ThreeUserData, extend?: boolean): Object3D;
    traverse(
      callback: (node: Object3D) => any,
      filter?: (node: Object3D) => boolean,
    ): void;
    traverse(
      callback: (node: Object3D) => any,
      layer?: Layer,
    ): void;

    isSystemGenerated(): boolean;
    isBoxHelper(): boolean;
    isXYZGizmo(): boolean;
    isTransformControl(): boolean;

    traverseParent(...params: Parameters<Object3D["traverseAncestors"]>): ReturnType<Object3D["traverseAncestors"]>;

    isParentVisible(): boolean;

    // 자신을 포함한 모든 자식들
    all<T = Object3D>(includeSelf?: boolean): T[];

    ofIDs(ids: string[]): Object3D[];
    meshes(): THREE.Mesh[];
    materials(): THREE.Material[];
    updateAllMaterials(threeExports?: RootState): void;
  }

  interface Camera {
    moveTo(action: MoveActionType, options: MoveActionOptions): void;
  }

  interface Material {
    onBeforeCompile: (parameters: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => void;
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

THREE.Object3D.prototype.all = function <T = THREE.Object3D>(includeSelf = false) {
  const result = includeSelf ? [this] : [];
  this.traverse((node) => {
    result.push(node);
  });
  return result as T[];
}

THREE.Object3D.prototype.ofIDs = function (ids: string[]) {
  const result: THREE.Object3D[] = [];
  this.traverse((node) => {
    if (ids.includes(node.uuid)) {
      result.push(node);
    }
  });
  return result;
}

THREE.Object3D.prototype.meshes = function () {
  const result: THREE.Mesh[] = [];
  this.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      result.push(node);
    }
  });
  return result;
}

THREE.Object3D.prototype.materials = function () {
  const result: THREE.Material[] = [];
  this.traverse((node) => {
    if (node instanceof THREE.Mesh && node.material) {
      result.push(node.material);
    }
  });
  return result;
}

THREE.Object3D.prototype.updateAllMaterials = function (threeExports?: RootState) {
  resetGL(threeExports);
}

THREE.Object3D.prototype.traverseParent = THREE.Object3D.prototype.traverseAncestors;

THREE.Object3D.prototype.isParentVisible = function () {
  let visibility = true;
  this.traverseParent((node) => {
    if (node.visible === false) {
      visibility = false;
    }
  });
  return visibility;
};

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

THREE.Vector3.prototype.revert = function () {
  this.x = 1 / this.x;
  this.y = 1 / this.y;
  this.z = 1 / this.z;
  console.log('revert : ', this);
  return this;
};

THREE.Camera.prototype.moveTo = function (
  action: MoveActionType,
  options: MoveActionOptions,
) {
  if (this.type !== 'PerspectiveCamera') {
    console.error(this);
    throw new Error('not PerspectiveCamera');
  }
  moveTo(this, action, options);
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

const defaultSceneFilter = (node: THREE.Object3D) => {
  if (node.isTransformControl()) {
    return false;
  }
  if (node.isXYZGizmo()) {
    return false;
  }
  if (node.isBoxHelper()) {
    return false;
  }
  if (node.layers.isEnabled(Layer.Selected)) {
    return false;
  }
  if (node.layers.isEnabled(Layer.GizmoHelper)) {
    return false;
  }
  if (node.layers.isEnabled(Layer.ReflectionBox)) {
    return false;
  }
  return true;
};
THREE.Object3D.prototype.traverse = function (
  callback: (node: THREE.Object3D) => any,
  filterInput?: Layer | ((node: THREE.Object3D) => boolean),
) {
  //original code :
  /*
  callback( this );
 
    const children = this.children;
 
    for ( let i = 0, l = children.length; i < l; i ++ ) {
 
      children[ i ].traverse( callback );
 
    }
   */

  const filter = filterInput ?? defaultSceneFilter;

  if (typeof filter === "number") {
    // Layer
    if (!this.layers.isEnabled(filter)) {
      return;
    }
  }

  callback(this);

  if (filter && typeof filter === "function" && !filter(this)) {
    // debugger;
    return;
  }

  const children = this.children;

  for (let i = 0, l = children.length; i < l; i++) {
    children[i].traverse(callback, filter as any);
  }
};

const _prevMaterial_onBeforeCompile = THREE.Material.prototype.onBeforeCompile;
THREE.Material.prototype.onBeforeCompile = function (parameters: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) {
  _prevMaterial_onBeforeCompile(parameters, renderer);

  // if (!parameters.uniforms.lmContrastOn) {
  parameters.uniforms = {
    ...parameters.uniforms,
    lmContrastOn: new THREE.Uniform(LightmapImageContrast.on)
  }
  // }
  // if (!parameters.uniforms.lmContrastValue) {
  parameters.uniforms = {
    ...parameters.uniforms,
    lmContrastValue: new THREE.Uniform(LightmapImageContrast.value)
  }
  // }
  /**
   * "uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
  varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
  vec4 diffuseColor = vec4( diffuse, opacity );
  #include <clipping_planes_fragment>
  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <alphahash_fragment>
  #include <specularmap_fragment>
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  #ifdef USE_LIGHTMAP
    vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
    reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
  #else
    reflectedLight.indirectDiffuse += vec3( 1.0 );
  #endif
  #include <aomap_fragment>
  reflectedLight.indirectDiffuse *= diffuseColor.rgb;
  vec3 outgoingLight = reflectedLight.indirectDiffuse;
  #include <envmap_fragment>
  #include <opaque_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}"
   */

  const targetHead = "void main() {";
  const contentHead = /*glsl */`
  #ifndef USE_LIGHTMAP_CONTRAST
  #define USE_LIGHTMAP_CONTRAST
  uniform bool lmContrastOn;
  uniform float lmContrastValue;
  #endif
  void main() {`;
  parameters.fragmentShader = parameters.fragmentShader.replace(targetHead, contentHead);

  const targetBody = `#include <lights_fragment_maps>`;
  const contentBody = /*glsl */`

  #if defined( RE_IndirectDiffuse )

	#ifdef USE_LIGHTMAP

		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
    vec3 lmcolor = lightMapTexel.rgb;
    vec3 lmcolorComputed = lmcolor;
    
    float contrast = lmContrastValue;
    contrast = contrast*0.8 + 0.8;
    lmcolorComputed = clamp(lmcolorComputed, 0.0, 1.0);
    lmcolorComputed = (lmcolorComputed - 0.5) * contrast + 0.5;
    lmcolorComputed = smoothstep(0.0, 1.0, lmcolorComputed); 

    
		vec3 lightMapIrradiance = (lmContrastOn ? lmcolorComputed : lmcolor) * lightMapIntensity;
		// vec3 lightMapIrradiance = lmcolor * lightMapIntensity;
		// vec3 lightMapIrradiance = lightMapTexel.rgb * 0.0;

		irradiance += lightMapIrradiance;
    // irradiance = vec3(0.0);

	#endif

	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )

		iblIrradiance += getIBLIrradiance( geometryNormal );

	#endif

#endif

#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )

	#ifdef USE_ANISOTROPY

		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );

	#else

		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );

	#endif

	#ifdef USE_CLEARCOAT

		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );

	#endif

#endif
  `;
  parameters.fragmentShader = parameters.fragmentShader.replace(targetBody, contentBody);
  // console.log(parameters.fragmentShader)
  // console.log("Mat onBeforeCompile");
}


export * from 'three';
export { THREE };

declare global {
  interface Window {
    getThree: (view: View) => RootState | undefined;
    setThree: (view: View, state: RootState) => RootState;
    threeStore: { [key in View]: RootState | undefined };
  }
}

window.threeStore = {
  [View.Shared]: undefined,
  [View.Main]: undefined,
  [View.Top]: undefined,
  [View.Front]: undefined,
  [View.Right]: undefined,
  [View.Back]: undefined,
  [View.Left]: undefined,
  [View.Bottom]: undefined,
};

window.setThree = (view: View, state: RootState) => {
  window.threeStore[view] = state;
  return state;
};

window.getThree = (view: View = View.Shared) => {
  return window.threeStore[view];
};


