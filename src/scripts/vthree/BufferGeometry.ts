import * as THREE from 'three';
import Asset from '../manager/Asset';
import AssetMgr from '../manager/AssetMgr';
import { hashObject } from '../manager/assets/AssetUtils';
import Hasher from '../manager/assets/Hasher';
import { VBufferGeometry } from '../manager/assets/VBufferGeometry';
import { VFile } from '../manager/assets/VFile';
import { VUserData } from './VTHREETypes';
declare module 'three' {
  interface BufferGeometry {
    get hash(): string;
    updateHash(): string;

    toAsset(): Promise<Asset>;
  }
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
    const hash = Hasher.hash(geometry.index.array);
    hashInputParts.push(hash);
  }

  // 각 속성에 대해 데이터 추출
  for (const [_, attr] of Object.entries(geometry.attributes)) {
    const typedArray = (attr as any).array;
    const hash = Hasher.hash(typedArray.buffer);
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

THREE.BufferGeometry.prototype.toAsset = async function () {
  const id = this.vid;
  const asset = Asset.fromId(id);
  if (asset.vfile) {
    // 이미 Asset이 존재함

    if (asset.result !== this) {
      // result는 있는데 나와 같지 않을 수 없음.
      // 다시 말해 에러
      debugger;
    }

    if (asset.vfile.data?.version === this._version) {
      console.warn(
        'BufferGeometry.toAsset() : version이 같음. 다시 할 필요 없음',
        this,
      );
      return asset;
    }
    console.warn(
      'BufferGeometry.toAsset() : version이 다름. 다시 해야함',
      this,
    );
  }

  const data: Partial<VBufferGeometry> = {
    version: this._version,
  };

  data.uuid = this.vid;
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
      array: AssetMgr.setDataArray(index.array),
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
    isVFile: true,
    id: this.vid,
    type: 'VBufferGeometry',
    data: data as VBufferGeometry,
  };

  AssetMgr.setVFile(retval, false);
  AssetMgr.setResult(retval.id, this);

  return Asset.fromVFile(retval);
};
