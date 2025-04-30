import { RootState } from '@react-three/fiber';
import objectHash from 'object-hash';
import * as THREE from 'three';
import type { TransformControlsPlane } from 'three/examples/jsm/controls/TransformControls.js';
import { Layer } from '../../Constants';
import _Asset from '../manager/_Asset';
import { VFile } from '../manager/assets/VFile';
import { VObject3D, VObject3DType } from '../manager/assets/VObject3D';
import { resetGL } from '../utils';
import './Object3DSerialize';

declare module 'three' {
  interface Object3D {
    get asMesh(): THREE.Mesh;

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

    // 부모의 transform을 적용한 최종 메시들
    //! 카피된 mesh + 카피된 geometry임
    flattendMeshes(): THREE.Mesh[];

    materials(): THREE.Material[];

    textures(): THREE.Texture[];

    geometries(): THREE.BufferGeometry[];

    updateAllMaterials(threeExports?: RootState): void;

    // 부모를 순회하면서 이름을 가져옴
    // ex) 'parent1/parent2/parent3'
    get parentPath(): string;

    get hash(): string;
    updateHash(path?: string): string;

    toAsset(): Promise<_Asset>;
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

if (!Object.getOwnPropertyDescriptor(THREE.Object3D.prototype, 'parentPath')) {
  Object.defineProperty(THREE.Object3D.prototype, 'parentPath', {
    get: function () {
      const path: string[] = [];
      this.traverseAncestors((parent: THREE.Object3D) => {
        path.push(parent.name);
      });
      path.reverse();
      return path.join('/');
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

THREE.Object3D.prototype.textures = function () {
  const resultSet = new Set<THREE.Texture>();
  this.materials().forEach(material => {
    material.textures().forEach(texture => {
      resultSet.add(texture);
    });
  });

  return Array.from(resultSet) as THREE.Texture[];
};

THREE.Object3D.prototype.geometries = function () {
  const result: THREE.BufferGeometry[] = [];
  this.traverse(node => {
    if (node instanceof THREE.Mesh && node.geometry) {
      result.push(node.geometry);
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

if (!Object.getOwnPropertyDescriptor(THREE.Object3D.prototype, 'hash')) {
  Object.defineProperty(THREE.Object3D.prototype, 'hash', {
    get: function (): string {
      if (this.userData.hash) {
        return this.userData.hash;
      }

      return this.updateHash();
    },
  });
}

THREE.Object3D.prototype.updateHash = function (path = ''): string {
  if (!this.userData) {
    this.userData = {};
  }

  // 자신에 대해 하기 전에 자식들을 다 돈다
  const childrenHashes = this.children.map(child => child.updateHash(path));

  const excludes = ['uuid', 'id'];
  const rawKeys = Object.keys(this) as (keyof THREE.MeshPhysicalMaterial)[];

  const filteredKeys = rawKeys
    .filter(key => !excludes.includes(key))
    .filter(key => !key.startsWith('_'));

  // type Primitive = string | number | boolean | null | undefined;

  const hashMap: Record<string, any> = { childrenHashes };

  // 기본 정보
  const resolvedPath = path + this.parentPath;
  const fileName = this.vUserData?.fileName ?? '';
  hashMap.path = resolvedPath;
  hashMap.fileName = fileName;

  filteredKeys.forEach(key => {
    const value = (this as any)[key];
    const typeofValue = typeof value;
    if (
      typeofValue === 'string' ||
      typeofValue === 'number' ||
      typeofValue === 'boolean' ||
      typeofValue === 'undefined' ||
      value === null
    ) {
      hashMap[key] = value;
    } else if (
      (value as THREE.BufferGeometry).isBufferGeometry ||
      (value as THREE.Material).isMaterial
    ) {
      hashMap[key] = value.hash;
    }
  });

  const hash = objectHash(hashMap);
  this.vUserData.hash = hash;
  if (!this.vUserData.id) {
    this.vUserData.id = hash;
  }

  return hash;
};

const getVObjectType = (type: string | THREE.Object3D): VObject3DType => {
  if (typeof type === 'string') {
    if (type === 'Mesh') {
      return 'VMesh';
    } else {
      return 'VObject3D';
    }
  } else {
    // THREE.Object3D
    if (type.asMesh.isMesh) {
      return 'VMesh';
    } else {
      return 'VObject3D';
    }
  }
};

THREE.Object3D.prototype.toAsset = async function () {
  const object: Partial<VObject3D> = {};

  const o3 = this as THREE.Object3D;
  const mesh = o3 as THREE.Mesh;
  const group = o3 as THREE.Group;
  const instanced = o3 as THREE.InstancedMesh;
  const batched = o3 as THREE.BatchedMesh;
  const scene = o3 as THREE.Scene;
  const line = o3 as THREE.Line;
  const points = o3 as THREE.Points;

  object.uuid = this.vid;
  object.type = this.type;

  if (this.name !== '') object.name = this.name;
  if (this.castShadow === true) object.castShadow = true;
  if (this.receiveShadow === true) object.receiveShadow = true;
  if (this.visible === false) object.visible = false;
  if (this.frustumCulled === false) object.frustumCulled = false;
  if (this.renderOrder !== 0) object.renderOrder = this.renderOrder;
  if (Object.keys(this.userData).length > 0) object.userData = this.userData;

  object.layers = this.layers.mask;
  object.matrix = this.matrix.toArray();
  object.up = this.up.toArray();

  if (this.matrixAutoUpdate === false) object.matrixAutoUpdate = false;

  // object specific properties

  if (instanced.isInstancedMesh) {
    throw new Error('InstancedMesh is not supported yet');
    // object.type = 'InstancedMesh';
    // object.count = instanced.count;
    // object.instanceMatrix = instanced.instanceMatrix.toAsset();
    // if (instanced.instanceColor !== null)
    //   object.instanceColor = instanced.instanceColor.toAsset();
  }

  if (batched.isBatchedMesh) {
    throw new Error('BatchedMesh is not supported yet');
    // object.type = 'BatchedMesh';
    // object.perObjectFrustumCulled = batched.perObjectFrustumCulled;
    // object.sortObjects = batched.sortObjects;

    // object.drawRanges = batched._drawRanges;
    // object.reservedRanges = batched._reservedRanges;

    // object.visibility = batched._visibility;
    // object.active = batched._active;
    // object.bounds = batched._bounds.map(bound => ({
    //   boxInitialized: bound.boxInitialized,
    //   boxMin: bound.box.min.toArray(),
    //   boxMax: bound.box.max.toArray(),

    //   sphereInitialized: bound.sphereInitialized,
    //   sphereRadius: bound.sphere.radius,
    //   sphereCenter: bound.sphere.center.toArray(),
    // }));

    // object.maxInstanceCount = this._maxInstanceCount;
    // object.maxVertexCount = this._maxVertexCount;
    // object.maxIndexCount = this._maxIndexCount;

    // object.geometryInitialized = this._geometryInitialized;
    // object.geometryCount = this._geometryCount;

    // object.matricesTexture = this._matricesTexture.toJSON(meta);

    // if (this._colorsTexture !== null)
    //   object.colorsTexture = this._colorsTexture.toJSON(meta);

    // if (this.boundingSphere !== null) {
    //   object.boundingSphere = {
    //     center: object.boundingSphere.center.toArray(),
    //     radius: object.boundingSphere.radius,
    //   };
    // }

    // if (this.boundingBox !== null) {
    //   object.boundingBox = {
    //     min: object.boundingBox.min.toArray(),
    //     max: object.boundingBox.max.toArray(),
    //   };
    // }
  }

  //

  // function serialize(library, element) {
  //   if (library[element.uuid] === undefined) {
  //     library[element.uuid] = element.toJSON(meta);
  //   }

  //   return element.uuid;
  // }

  if (scene.isScene) {
    //! 일단 Scene은 그룹으로 다룬다
    object.type = 'Group'; // 원래Scene임

    // if (scene.background) {
    //   throw new Error('Scene background is not supported yet');
    //   // if (scene.background.isColor) {
    //   //   object.background = scene.background.toJSON();
    //   // } else if (scene.background.isTexture) {
    //   //   object.background = scene.background.toJSON(meta).uuid;
    //   // }
    // }

    // if (
    //   scene.environment &&
    //   scene.environment.isTexture &&
    //   scene.environment.isRenderTargetTexture !== true
    // ) {
    //   // throw new Error('Scene environment is not supported yet');
    //   // object.environment = scene.environment.toJSON(meta).uuid;
    //   object.environment = (await scene.environment.toAsset()).vremotefile;
    // }
  } else if (mesh.isMesh || line.isLine || points.isPoints) {
    // object.geometry = serialize(meta.geometries, mesh.geometry);
    object.geometry = (await mesh.geometry.toAsset()).vremotefile;

    const parameters = (mesh.geometry as any).parameters;

    if (parameters !== undefined && parameters.shapes !== undefined) {
      throw new Error('Geometry shapes is not supported yet');
      // const shapes = parameters.shapes;

      // if (Array.isArray(shapes)) {
      //   for (let i = 0, l = shapes.length; i < l; i++) {
      //     const shape = shapes[i];

      //     serialize(meta.shapes, shape);
      //   }
      // } else {
      //   serialize(meta.shapes, shapes);
      // }
    }
  }

  if ((this as any).isSkinnedMesh) {
    throw new Error('SkinnedMesh is not supported yet');
    // object.bindMode = this.bindMode;
    // object.bindMatrix = this.bindMatrix.toArray();

    // if (this.skeleton !== undefined) {
    //   serialize(meta.skeletons, this.skeleton);

    //   object.skeleton = this.skeleton.uuid;
    // }
  }

  if (mesh.material !== undefined) {
    object.material = (await mesh.matStandard.toAsset()).vremotefile;
  }

  //

  if (this.children.length > 0) {
    object.children = (
      await Promise.all(this.children.map(child => child.toAsset()))
    ).map(a => a.vremotefile);
  }

  //

  if (this.animations.length > 0) {
    throw new Error('Object3D animations is not supported yet');
    // object.animations = [];

    // for (let i = 0; i < this.animations.length; i++) {
    //   const animation = this.animations[i];

    //   object.animations.push(serialize(meta.animations, animation));
    // }
  }

  // if (isRootObject) {
  //   const geometries = extractFromCache(meta.geometries);
  //   const materials = extractFromCache(meta.materials);
  //   const textures = extractFromCache(meta.textures);
  //   const images = extractFromCache(meta.images);
  //   const shapes = extractFromCache(meta.shapes);
  //   const skeletons = extractFromCache(meta.skeletons);
  //   const animations = extractFromCache(meta.animations);
  //   const nodes = extractFromCache(meta.nodes);

  //   if (geometries.length > 0) output.geometries = geometries;
  //   if (materials.length > 0) output.materials = materials;
  //   if (textures.length > 0) output.textures = textures;
  //   if (images.length > 0) output.images = images;
  //   if (shapes.length > 0) output.shapes = shapes;
  //   if (skeletons.length > 0) output.skeletons = skeletons;
  //   if (animations.length > 0) output.animations = animations;
  //   if (nodes.length > 0) output.nodes = nodes;
  // }

  const retval: VFile<VObject3D> = {
    isVFile: true,
    id: this.hash,
    type: getVObjectType(this.type),
    data: object as VObject3D,
  };

  return _Asset.from(retval);
};

THREE.Object3D.prototype.flattendMeshes = function () {
  const meshes: THREE.Mesh[] = [];

  this.updateMatrixWorld(true); // 반드시! worldMatrix 업데이트 먼저

  this.traverse(object => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;

      // 로컬 -> 글로벌 변환 적용
      mesh.updateWorldMatrix(false, false);

      // geometry를 변환된 matrixWorld를 적용해서 bake
      const clonedGeometry = mesh.geometry.clone();
      clonedGeometry.applyMatrix4(mesh.matrixWorld);

      const newMesh = new THREE.Mesh(clonedGeometry, mesh.material);
      newMesh.name = mesh.name;
      newMesh.matrix.identity(); // 이제 로컬에서 변환 0
      newMesh.position.set(0, 0, 0);
      newMesh.rotation.set(0, 0, 0);
      newMesh.scale.set(1, 1, 1);

      meshes.push(newMesh);
    }
  });

  return meshes;
};
