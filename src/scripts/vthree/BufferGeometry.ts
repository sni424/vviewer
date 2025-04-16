import * as THREE from 'three';
import { AssetMgr } from '../manager/assets/AssetMgr';
import { hashArrayBuffer, hashObject } from '../manager/assets/AssetUtils';
import { VBufferGeometry } from '../manager/assets/VBufferGeometry';
import { VFile } from '../manager/assets/VFile';
import { VUserData } from './VTHREETypes';
declare module 'three' {
  interface BufferGeometry {
    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);

    get hash(): string;
    updateHash(): string;

    toAsset(): Promise<VFile<VBufferGeometry>>;
  }
}

// vUserData
if (
  !Object.prototype.hasOwnProperty.call(THREE.Material.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Material.prototype, 'vUserData', {
    get: function () {
      if (!this.userData) {
        this.userData = {};
      }
      return this.userData as VUserData;
    },
    set: function (userData: Partial<VUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}

if (
  !Object.prototype.hasOwnProperty.call(THREE.BufferGeometry.prototype, 'hash')
) {
  Object.defineProperty(THREE.BufferGeometry.prototype, 'hash', {
    get: function (): string {
      if (this.vUserData?.hash) {
        return this.vUserData.hash;
      }

      return this.updateHash();
    },
  });
}

THREE.BufferGeometry.prototype.updateHash = function (): string {
  const geometry = this;
  const hashInputParts: string[] = [];

  // 인덱스 포함 (있다면)
  if (geometry.index) {
    const hash = hashArrayBuffer(geometry.index.array);
    hashInputParts.push(hash);
  }

  // 각 속성에 대해 데이터 추출
  for (const [_, attr] of Object.entries(geometry.attributes)) {
    const typedArray = (attr as any).array;
    const hash = hashArrayBuffer(typedArray.buffer);
    hashInputParts.push(hash);
  }

  const finalhash = hashObject(hashInputParts);

  if (!this.vUserData) {
    this.vUserData = {} as VUserData;
  }

  this.vUserData.hash = finalhash;
  if (!this.vUserData.id) {
    this.vUserData.id = finalhash;
  }
  return finalhash;
};

THREE.BufferGeometry.prototype.toAsset = function () {
  const data: Partial<VBufferGeometry> = {};

  data.uuid = this.uuid;
  data.type = this.type;
  if (this.name !== '') data.name = this.name;
  if (Object.keys(this.userData).length > 0) data.userData = this.userData;

  // if ((this as any).parameters !== undefined) {
  //   const parameters = (this as any).parameters;

  //   for (const key in parameters) {
  //     if (parameters[key] !== undefined) (data as any)[key] = parameters[key];
  //   }

  //   return data;
  // }

  // for simplicity the code assumes attributes are not shared across geometries, see #15811

  data.data = { attributes: {} };

  const index = this.index;

  if (index !== null) {
    data.data.index = {
      type: index.array.constructor.name,
      array: {
        id: AssetMgr.set(index.array),
        format: 'binary',
      },
    };
  }

  const attributes = this.attributes;

  for (const key in attributes) {
    const attribute: THREE.BufferAttribute = attributes[key];

    if (!attribute.toAsset) {
      console.log(attribute);
      debugger;
    }
    data.data.attributes[key] = attribute.toAsset();
  }

  const morphAttributes = {};
  let hasMorphAttributes = false;

  for (const key in this.morphAttributes) {
    const attributeArray = this.morphAttributes[key];

    const array = [];

    for (let i = 0, il = attributeArray.length; i < il; i++) {
      const attribute = attributeArray[i];

      array.push((attribute as THREE.BufferAttribute).toAsset());
    }

    if (array.length > 0) {
      (morphAttributes as any)[key] = array;

      hasMorphAttributes = true;
    }
  }

  if (hasMorphAttributes) {
    data.data.morphAttributes = morphAttributes;
    data.data.morphTargetsRelative = this.morphTargetsRelative;
  }

  const groups = this.groups;

  if (groups.length > 0) {
    data.data.groups = structuredClone(groups);
  }

  const boundingSphere = this.boundingSphere;

  if (boundingSphere !== null) {
    data.data.boundingSphere = {
      center: boundingSphere.center.toArray(),
      radius: boundingSphere.radius,
    };
  }

  const retval: VFile<VBufferGeometry> = {
    id: this.hash,
    type: 'VBufferGeometry',
    data: data as VBufferGeometry,
  };

  return Promise.resolve(retval);
};
