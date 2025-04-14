import * as THREE from 'three';
import { AssetMgr } from '../manager/assets/AssetMgr';
import { FileID, FileUrl } from '../manager/assets/AssetTypes';
import { awaitAll } from '../manager/assets/AssetUtils';
import { VFile, VFileRemote } from '../manager/assets/VFile';

// BufferAttributeJSON
export type VBufferAttribute = {
  itemSize: number;
  type: string;
  // array: number[];
  array: VFileRemote;
  normalized: boolean;

  name?: string;
  usage?: THREE.Usage;
};

export type VBufferGeometry = {
  name?: string;
  userData?: Record<string, unknown>;

  data?: {
    attributes: Record<string, VBufferAttribute>;

    // index?: { type: string; array: number[] };
    index?: { type: string; array: VFileRemote };

    morphAttributes?: Record<string, VBufferAttribute[]>;
    morphTargetsRelative?: boolean;

    groups?: THREE.GeometryGroup[];

    boundingSphere?: { center: THREE.Vector3Tuple; radius: number };
  };
};

export interface VBufferGeometryFile
  extends VFile<// BufferGeometryJSON
  // uuid, type 제외
  VBufferGeometry> {}

type ToAssetMeta = {
  references?: Record<FileID, VFile>;
  rawFiles?: Record<FileID, FileUrl>;
};

declare module 'three' {
  interface BufferGeometry {
    toAsset(meta?: ToAssetMeta): Promise<VBufferGeometryFile>;
  }
}

declare module 'three' {
  interface BufferAttribute {
    toAsset: (attrArray: (Promise<string> | string)[]) => VBufferAttribute;
  }
}

THREE.BufferAttribute.prototype.toAsset = function (
  attrArray: (Promise<string> | string)[],
) {
  const arrayId = AssetMgr.set(this.array);
  attrArray.push(arrayId);

  const attributeData: VBufferAttribute = {
    itemSize: this.itemSize,
    type: this.array.constructor.name,
    array: {
      id: arrayId,
      format: 'binary',
    },
    normalized: this.normalized,
  };

  if (this.name !== '') attributeData.name = this.name;
  if ((this as any).usage !== THREE.StaticDrawUsage)
    attributeData.usage = (this as any).usage;

  return attributeData;
};

THREE.BufferGeometry.prototype.toAsset = function () {
  // Object3D에서 전달된 rawFiles

  //prepare raw file uploads
  const proms: {
    hash: Promise<string> | string;
    indexFileId?: Promise<FileID> | FileID;
    attrs: (Promise<FileID> | FileID)[];
  } = {
    hash: this.hash,
    attrs: [],
  };

  if (this.index !== null) {
    proms['indexFileId'] = AssetMgr.set(
      Array.prototype.slice.call(this.index.array),
    );
  }

  return Promise.all([...Object.values(proms), ...proms.attrs]).then(
    async () => {
      const data: VBufferGeometry = {
        data: {
          attributes: {},
        },
      };

      // standard BufferGeometry serialization

      // data.uuid = this.uuid;
      // data.type = this.type;
      if (this.name !== '') data.name = this.name;
      if (Object.keys(this.userData).length > 0) data.userData = this.userData;

      //! 지오메트리의 parameters는 스킵
      // if ((this as any).parameters !== undefined) {
      //   const parameters = (this as any).parameters;

      //   for (const key in parameters) {
      //     if (parameters[key] !== undefined) data[key] = parameters[key];
      //   }

      //   return data;
      // }

      // for simplicity the code assumes attributes are not shared across geometries, see #15811

      data.data = { attributes: {} };

      const index = this.index;

      if (index !== null) {
        data.data.index = {
          type: index.array.constructor.name,
          array: { id: proms.indexFileId as FileID, format: 'binary' },
        };
      }

      const attributes = this.attributes;

      for (const key in attributes) {
        const attribute = attributes[key];

        data.data.attributes[key] = (
          attribute as THREE.BufferAttribute
        ).toAsset(proms.attrs) as unknown as VBufferAttribute; // await된 것처럼
      }

      const morphAttributes: Record<string, any> = {};
      let hasMorphAttributes = false;

      for (const key in this.morphAttributes) {
        const attributeArray = this.morphAttributes[key];

        const array = [];

        for (let i = 0, il = attributeArray.length; i < il; i++) {
          const attribute = attributeArray[i];

          // array.push(attribute.toJSON(data.data));
          //BufferAttribute.toJSON()
          if (
            (attribute as THREE.InterleavedBufferAttribute)
              .isInterleavedBufferAttribute
          ) {
            throw new Error('InterleavedBuffer not supported');
          }
          const attributeData = (attribute as THREE.BufferAttribute).toAsset(
            proms.attrs,
          );

          array.push(attributeData);
        }

        if (array.length > 0) {
          morphAttributes[key] = array;

          hasMorphAttributes = true;
        }
      }

      if (hasMorphAttributes) {
        data.data.morphAttributes = morphAttributes;
        data.data.morphTargetsRelative = this.morphTargetsRelative;
      }

      const groups = this.groups;

      if (groups.length > 0) {
        data.data.groups = JSON.parse(JSON.stringify(groups));
      }

      const boundingSphere = this.boundingSphere;

      if (boundingSphere !== null) {
        data.data.boundingSphere = {
          center: boundingSphere.center.toArray(),
          radius: boundingSphere.radius,
        };
      }

      const retval: VBufferGeometryFile = {
        id: proms.hash as string,
        type: 'VBufferGeometry',
        data: data,
      };

      return awaitAll(retval);
    },
  );
};
