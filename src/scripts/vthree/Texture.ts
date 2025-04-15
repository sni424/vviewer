import objectHash from 'object-hash';
import * as THREE from 'three';
import { AssetMgr } from '../manager/assets/AssetMgr';
import { hashArrayBuffer } from '../manager/assets/AssetUtils';
import { VFile, VFileRemote } from '../manager/assets/VFile';
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
): Promise<VFileRemote> => {
  if ((texture as THREE.CompressedTexture).isCompressedTexture) {
    if (!texture.vUserData.ktx2Buffer) {
      console.log(texture);
      debugger;
      throw new Error('KTX2 Buffer가 없음');
    }
    const hash = AssetMgr.set(texture.vUserData.ktx2Buffer);
    return {
      id: hash,
      format: 'binary',
    } as VFileRemote;
  } else if ((texture as THREE.DataTexture).isDataTexture) {
    // exr임
    const ab = texture.image.data.buffer;
    const hash = AssetMgr.set(ab);
    return {
      id: hash,
      format: 'binary',
    } as VFileRemote;
  } else {
    // 일반 이미지포맷
    return texture.source.toAsset();
  }
};

THREE.Texture.prototype.toAsset = async function () {
  const output: VTexture = {
    // uuid: this.uuid,
    uuid: this.hash,
    name: this.name,

    image: await handleImageData(this),

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
  if (!this.vUserData) {
    this.vUserData = {};
  }

  if ((this as THREE.CompressedTexture).isCompressedTexture) {
    if (!this.vUserData.ktx2Buffer) {
      throw new Error('KTX2 Buffer가 없음');
    }
    const hash = hashArrayBuffer(this.vUserData.ktx2Buffer);
    this.vUserData.hash = hash;
    if (!this.vUserData.id) {
      this.vUserData.id = hash;
    }
    return hash;
  }

  if ((this as THREE.DataTexture).isDataTexture) {
    const hash = hashDataTexture(this as THREE.DataTexture);
    this.vUserData.hash = hash;
    if (!this.vUserData.id) {
      this.vUserData.id = hash;
    }
    return hash;
  }

  if (Boolean(this.image)) {
    const hash = hashImageData(this.image);
    this.vUserData.hash = hash;
    if (!this.vUserData.id) {
      this.vUserData.id = hash;
    }
    return hash;
  }

  const hash = objectHash(this);
  this.vUserData.hash = hash;
  if (!this.vUserData.id) {
    this.vUserData.id = hash;
  }
  console.warn('이 텍스쳐는 해시할 수 없음, objectHash 이용함', this, hash);
  return hash;
};
