import * as THREE from 'three';
import Asset from '../manager/Asset';
import AssetMgr from '../manager/AssetMgr';
import Hasher from '../manager/assets/Hasher';
import { VFile } from '../manager/assets/VFile';
import { VTexture } from '../manager/assets/VTexture';
import {
  hashDataTexture,
  hashDataTexturePrecise,
  hashImageData,
  hashImageDataPrecise,
} from '../utils';

declare module 'three' {
  interface WebGLProgramParametersWithUniforms {
    cleanup?: () => void;
  }

  interface Texture {
    get asData(): THREE.DataTexture;
    get asCompressed(): THREE.CompressedTexture;

    // vUserData.hash가 있으면 리턴, 없으면 계산 후 vUserData.hash에 저장
    get hash(): string;
    updateHash(): string;
    updateHashPrecise(): Promise<string>;
    toAsset(): Promise<Asset>;
  }
}

if (!Object.prototype.hasOwnProperty.call(THREE.Texture.prototype, 'asData')) {
  Object.defineProperty(THREE.Texture.prototype, 'asData', {
    get: function () {
      return this as THREE.DataTexture;
    },
  });
}

if (
  !Object.prototype.hasOwnProperty.call(THREE.Texture.prototype, 'asCompressed')
) {
  Object.defineProperty(THREE.Texture.prototype, 'asCompressed', {
    get: function () {
      return this as THREE.CompressedTexture;
    },
  });
}

if (!Object.prototype.hasOwnProperty.call(THREE.Texture.prototype, 'hash')) {
  Object.defineProperty(THREE.Texture.prototype, 'hash', {
    get: function (): string {
      if (this.vUserData?.hash) {
        return this.vUserData.hash;
      }

      return this.updateHash();
    },
  });
}

const handleImageData = async (
  texture: THREE.Texture,
): Promise<VTexture['image']> => {
  if ((texture as THREE.CompressedTexture).isCompressedTexture) {
    if (!texture.vUserData.ktx2Buffer) {
      console.log(texture);
      debugger;
      throw new Error('KTX2 Buffer가 없음');
    }
    return AssetMgr.setDataArray(texture.vUserData.ktx2Buffer);
  } else if ((texture as THREE.DataTexture).isDataTexture) {
    // exr임
    return AssetMgr.setDataArray(texture.image.data.buffer);
  } else {
    // 일반 이미지포맷
    return texture.source.toAsset();
  }
};

THREE.Texture.prototype.toAsset = async function () {
  await this.updateHashPrecise();
  const hashedAsset = Asset.fromId(this.hash);
  if (hashedAsset.result) {
    console.warn(`텍스쳐 해시 존재 : ${this.id}`);
    return hashedAsset;
  }

  // const id = this.vid;
  // const asset = Asset.fromId(id);
  // if (asset.vfile) {
  //   // 이미 Asset이 존재함

  //   // if (asset.result !== this) {
  //   // result는 있는데 나와 같지 않을 수 없음.
  //   // 다시 말해 에러

  //   // debugger;
  //   // }

  //   if (asset.vfile.data?.version === this._version) {
  //     console.warn(
  //       'Texture.toAsset() : version이 같음. 다시 할 필요 없음',
  //       this,
  //     );
  //     return asset;
  //   }
  //   console.warn('Texture.toAsset() : version이 다름. 다시 해야함', this);
  // }

  // const image = await AssetMgr.get<THREE.Texture>(this.hash);
  // if (!image) image = await handleImageData(this);
  const start = performance.now();
  const image = await handleImageData(this);
  const end = performance.now();
  console.log('handleImageData', end - start, image);

  const output: VTexture = {
    version: this._version,
    // uuid: this.uuid,
    uuid: this.hash,
    name: this.name,

    image,

    // imageData: await handleImageData(this),

    mapping: this.mapping,
    channel: this.channel,

    repeat: [this.repeat.x, this.repeat.y],
    offset: [this.offset.x, this.offset.y],
    center: [this.center.x, this.center.y],
    rotation: this.rotation,

    wrap: [this.wrapS, this.wrapT],

    format: this.format,
    internalFormat: this.internalFormat,
    type: this.type,
    colorSpace: this.colorSpace,

    minFilter: this.minFilter,
    magFilter: this.magFilter,
    anisotropy: this.anisotropy,

    flipY: this.flipY,

    generateMipmaps: this.generateMipmaps,
    premultiplyAlpha: this.premultiplyAlpha,
    unpackAlignment: this.unpackAlignment,
  };

  if (Object.keys(this.vUserData).length > 0)
    output.userData = this.vUserData as any;

  const type = (this as THREE.CompressedTexture).isCompressedTexture
    ? 'VCompressedTexture'
    : (this as THREE.DataTexture).isDataTexture
      ? 'VDataTexture'
      : 'VTexture';

  if (type === 'VDataTexture') {
    output.width = this.image.width;
    output.height = this.image.height;
    output.arrayType = this.image.data.constructor.name;
  }

  const retval: VFile<VTexture> = {
    isVFile: true,
    id: this.hash,
    type,
    data: output,
  };

  AssetMgr.setVFile(retval, false);
  AssetMgr.setResult(retval.id, this);

  // hashedAsset.payload.result = this;
  // hashedAsset.payload.vfile = retval;
  // hashedAsset.payload.vremotefile = {
  //   id: retval.id,
  //   format: 'json',
  //   isVRemoteFile: true,
  // };

  return Asset.fromVFile(retval);
};

THREE.Texture.prototype.updateHash = function (): string {
  const excludes = ['uuid', 'id'];
  const rawKeys = Object.keys(this) as (keyof THREE.MeshPhysicalMaterial)[];

  // 우선 이미지데이터를 해싱
  let imageHash: string | undefined = undefined;

  if ((this as THREE.CompressedTexture).isCompressedTexture) {
    if (!this.vUserData.ktx2Buffer) {
      throw new Error('KTX2 Buffer가 없음');
    }
    imageHash = Hasher.hash(this.vUserData.ktx2Buffer);
  } else if ((this as THREE.DataTexture).isDataTexture) {
    imageHash = hashDataTexture(this as THREE.DataTexture);
  } else if (Boolean(this.image)) {
    imageHash = hashImageData(this.image);
  } else {
    throw new Error('이미지 없음');
  }

  // 이미지해시 + 기타 들어가있는 value값들 해시를 모아서 다시 해시

  const hashMap: Record<string, any> = {
    imageHash,
  };

  const scope = this as any;
  const filteredKeys = rawKeys
    .filter(key => scope[key] !== undefined && scope[key] !== null)
    .filter(key => typeof scope[key] !== 'function')
    .filter(key => !excludes.includes(key))
    .filter(key => !key.startsWith('_'));

  filteredKeys.forEach(key => {
    const value = scope[key];
    const typeofValue = typeof value;
    if (
      typeofValue === 'string' ||
      typeofValue === 'number' ||
      typeofValue === 'boolean' ||
      typeofValue === 'undefined' ||
      value === null
    ) {
      hashMap[key] = value;
    } else if (scope[key].toArray && typeof scope[key].toArray === 'function') {
      // vec2, vec3, vec4, quat 등등
      hashMap[key] = scope[key].toArray();
    }
  });

  const prev = this.vUserData.hash;
  const hash = Hasher.object(hashMap);
  this.vUserData.hash = hash;

  // if (prev !== hash) {
  //   this.update();
  // }

  if (!this.vUserData.id) {
    this.vUserData.id = hash;
  }

  return hash;
};

THREE.Texture.prototype.updateHashPrecise = async function (): Promise<string> {
  const excludes = ['uuid', 'id'];
  const rawKeys = Object.keys(this) as (keyof THREE.MeshPhysicalMaterial)[];

  // 우선 이미지데이터를 해싱
  let imageHash: string | undefined = undefined;

  if ((this as THREE.CompressedTexture).isCompressedTexture) {
    if (!this.vUserData.ktx2Buffer) {
      throw new Error('KTX2 Buffer가 없음');
    }
    imageHash = await Hasher.hashPrecisely(this.vUserData.ktx2Buffer);
  } else if ((this as THREE.DataTexture).isDataTexture) {
    imageHash = await hashDataTexturePrecise(this as THREE.DataTexture);
  } else if (Boolean(this.image)) {
    imageHash = await hashImageDataPrecise(this.image);
  } else {
    throw new Error('이미지 없음');
  }

  // 이미지해시 + 기타 들어가있는 value값들 해시를 모아서 다시 해시

  const hashMap: Record<string, any> = {
    imageHash,
  };

  const scope = this as any;
  const filteredKeys = rawKeys
    .filter(key => scope[key] !== undefined && scope[key] !== null)
    .filter(key => typeof scope[key] !== 'function')
    .filter(key => !excludes.includes(key))
    .filter(key => !key.startsWith('_'));

  filteredKeys.forEach(key => {
    const value = scope[key];
    const typeofValue = typeof value;
    if (
      typeofValue === 'string' ||
      typeofValue === 'number' ||
      typeofValue === 'boolean' ||
      typeofValue === 'undefined' ||
      value === null
    ) {
      hashMap[key] = value;
    } else if (scope[key].toArray && typeof scope[key].toArray === 'function') {
      // vec2, vec3, vec4, quat 등등
      hashMap[key] = scope[key].toArray();
    }
  });

  const prev = this.vUserData.hash;
  const hash = Hasher.object(hashMap);
  this.vUserData.hash = hash;

  // if (prev !== hash) {
  //   this.update();
  // }

  if (!this.vUserData.id) {
    this.vUserData.id = hash;
  }

  return hash;
};
