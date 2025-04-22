import * as THREE from 'three';
import { AssetMgr } from '../manager/assets/AssetMgr';
import {
  VBufferAttribute,
  VInterleavedBuffer,
  VInterleavedBufferAttribute,
} from '../manager/assets/VBufferGeometry';

declare module 'three' {
  interface BufferAttribute {
    toAsset(): VBufferAttribute;
  }
}

declare module 'three' {
  interface InterleavedBufferAttribute {
    toAsset(): VInterleavedBufferAttribute;
  }

  interface InterleavedBuffer {
    toAsset(): VInterleavedBuffer;
  }
}

THREE.BufferAttribute.prototype.toAsset = function () {
  const array = AssetMgr.makeRemoteFile(this.array);

  const attributeData: VBufferAttribute = {
    itemSize: this.itemSize,
    type: this.array.constructor.name,
    array,
    normalized: this.normalized,
  };

  if (this.name !== '') attributeData.name = this.name;
  if ((this as any).usage !== THREE.StaticDrawUsage)
    attributeData.usage = (this as any).usage;

  return attributeData;
};

THREE.InterleavedBufferAttribute.prototype.toAsset = function () {
  return {
    isInterleavedBufferAttribute: true,
    itemSize: this.itemSize,
    data: this.data.toAsset(),
    offset: this.offset,
    normalized: this.normalized,
  };
};

THREE.InterleavedBuffer.prototype.toAsset = function () {
  const retval: VInterleavedBuffer = {
    uuid: this.uuid,
    buffer: AssetMgr.makeRemoteFile(this.array.buffer),
    type: this.array.constructor.name,
    stride: this.stride,
  };

  return retval;
};
