import objectHash from 'object-hash';
import * as THREE from 'three';
import { AssetMgr } from '../manager/assets/AssetMgr';
import { hashArrayBuffer } from '../manager/assets/AssetUtils';
import { VFile, VRemoteFile } from '../manager/assets/VFile';
import { VTexture } from '../manager/assets/VTexture';
import { hashDataTexture, hashImageData } from '../utils';
import { type VUserData } from './VTHREETypes';

declare module 'three' {
  interface WebGLProgramParametersWithUniforms {
    cleanup?: () => void;
  }

  interface Texture {
    get asData(): THREE.DataTexture;
    get asCompressed(): THREE.CompressedTexture;

    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);

    // vUserData.hash가 있으면 리턴, 없으면 계산 후 vUserData.hash에 저장
    get hash(): string;
    updateHash(): string;
    toAsset(): Promise<VFile<VTexture>>;
  }
}

if (
  !Object.prototype.hasOwnProperty.call(THREE.Texture.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Texture.prototype, 'vUserData', {
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
): Promise<VRemoteFile> => {
  if ((texture as THREE.CompressedTexture).isCompressedTexture) {
    if (!texture.vUserData.ktx2Buffer) {
      console.log(texture);
      debugger;
      throw new Error('KTX2 Buffer가 없음');
    }
    console.log('called');
    const hash = AssetMgr.set(texture.vUserData.ktx2Buffer);
    return {
      id: hash,
      format: 'binary',
    } as VRemoteFile;
  } else if ((texture as THREE.DataTexture).isDataTexture) {
    // exr임
    const ab = texture.image.data.buffer;
    const hash = AssetMgr.set(ab);
    return {
      id: hash,
      format: 'binary',
    } as VRemoteFile;
  } else {
    // 일반 이미지포맷
    return texture.source.toAsset();
  }
};

THREE.Texture.prototype.toAsset = async function () {
  // const image = await AssetMgr.get<THREE.Texture>(this.hash);
  // if (!image) image = await handleImageData(this);
  const start = performance.now();
  const image = await handleImageData(this);
  const end = performance.now();
  console.log('handleImageData', end - start, image);

  const output: VTexture = {
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
    id: this.hash,
    type,
    data: output,
  };

  return retval;
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
    imageHash = hashArrayBuffer(this.vUserData.ktx2Buffer);
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

  const hash = objectHash(hashMap);
  this.vUserData.hash = hash;
  if (!this.vUserData.id) {
    this.vUserData.id = hash;
  }
  return hash;
};
