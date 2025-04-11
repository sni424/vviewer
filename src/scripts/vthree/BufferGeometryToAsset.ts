import objectHash from 'object-hash';
import * as THREE from 'three';
import { FileID, FileUrl, VAssetType } from '../manager/assets/AssetTypes';

type CommonObject = Record<string, any>;

// json객체
type VFile<T extends Record<any, any> = any> = {
  id: FileID; // json url : workspace/project/files/[id] <- json파일
  type: VAssetType;
  data: T; // json객체
  references?: Record<FileID, VFile<any>>; // 이 파일을 로드하기 위해 필요한 VFile들. ex) Material 하위의 Texture
  rawFiles?: Record<FileID, FileUrl>; // RawFile Url, geometry의 경우 여러 개 필요해서 배열
} & {
  // 업로드 시 제외, json로드 시 자동으로 할당
  isVFile: true; // always true,
  state: 'loadable' | 'loading' | 'loaded';
};

// BufferAttributeJSON
type VBufferAttribute = {
  itemSize: number;
  type: string;
  // array: number[];
  array: FileID;
  normalized: boolean;

  name?: string;
  usage?: THREE.Usage;
};

type VBufferGeometry = {
  name?: string;
  userData?: Record<string, unknown>;

  data?: {
    attributes: Record<string, VBufferAttribute>;

    // index?: { type: string; array: number[] };
    index?: { type: string; array: FileID };

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

const hashObject = objectHash;

const hashArrayBuffer = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(b => ('00' + b.toString(16)).slice(-2))
    .join('');
  return hashHex;
};

export class AssetMgr {
  static cache: Map<FileID, VFile> = new Map();
  static rawFileCache = new Map<FileID, ArrayBuffer | CommonObject>();

  static async getRawFile<T>(id: string) {
    return this.rawFileCache.get(id) as T;
  }

  static rawFileUrl(id: FileID): FileUrl {
    return id;
  }
  static async uploadRawFile(
    rawData: CommonObject | ArrayBuffer,
    id?: string,
  ): Promise<FileID> {
    const cacher = this.rawFileCache;
    const hasher =
      rawData instanceof ArrayBuffer ? hashArrayBuffer : hashObject;

    const hash = id ?? (await hasher(rawData as any));
    const cached = cacher.get(hash);
    if (!cached) {
      cacher.set(hash, rawData);
    }
    return hash;
  }
}

declare module 'three' {
  interface BufferAttribute {
    toAsset: (
      attrArray: (Promise<string> | string)[],
    ) => Promise<VBufferAttribute>;
  }
}

THREE.BufferAttribute.prototype.toAsset = function (
  attrArray: (Promise<string> | string)[],
) {
  const arrayData = AssetMgr.uploadRawFile(this.array);
  attrArray.push(arrayData);

  const attributeData: VBufferAttribute = {
    itemSize: this.itemSize,
    type: this.array.constructor.name,
    array: arrayData as unknown as string,
    normalized: this.normalized,
  };

  if (this.name !== '') attributeData.name = this.name;
  if ((this as any).usage !== THREE.StaticDrawUsage)
    attributeData.usage = (this as any).usage;

  return arrayData.then(id => {
    attributeData.array = id;
    return attributeData;
  });
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
    proms['indexFileId'] = AssetMgr.uploadRawFile(
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
          array: proms.indexFileId as FileID,
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
        isVFile: true,
        state: 'loaded',
      };

      return awaitAll(retval);
    },
  );
};

// 재귀적으로 모든 promise를 기다린다
export async function awaitAll<T>(input: T): Promise<T> {
  if (input instanceof Promise) {
    return awaitAll(await input);
  }

  if (Array.isArray(input)) {
    return Promise.all(input.map(awaitAll)) as Promise<any> as Promise<T>;
  }

  if (typeof input === 'object' && input !== null) {
    const result: any = Array.isArray(input) ? [] : {};
    for (const key of Object.keys(input)) {
      result[key] = await awaitAll((input as any)[key]);
    }
    return result;
  }

  return input;
}
