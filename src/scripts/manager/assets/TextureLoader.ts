import { THREE } from 'VTHREE';
import { AssetMgr } from './AssetMgr';
import { VFile, VFileRemote } from './VFile';
import { VTexture } from './VTexture';

const TEXTURE_KEYS = ['VTexture', 'VDataTexture', 'VCompressedTexture'];

const TEXTURE_ASSIGN_KEYS = [
  'uuid',
  'name',
  'mapping',
  'channel',
  'repeat',
  'offset',
  'center',
  'rotation',
  'wrap',
  'format',
  'internalFormat',
  'type',
  'colorSpace',
  'minFilter',
  'magFilter',
  'anisotropy',
  'flipY',
  'generateMipmaps',
  'premultiplyAlpha',
  'unpackAlignment',
  'userData',
];

async function createCompressedTexture(
  data: VTexture,
): Promise<THREE.CompressedTexture> {
  const retval = new THREE.CompressedTexture();
  return retval;
}

async function createDataTexture(data: VTexture): Promise<THREE.DataTexture> {
  const retval = new THREE.DataTexture();
  return retval;
}

function setImageFromArrayBuffer(
  buffer: ArrayBuffer,
  mimeType: string = 'image/png',
) {
  const img = document.createElement('img');
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);

  img.src = url;

  // Optional: Revoke URL after image loads
  img.onload = () => {
    URL.revokeObjectURL(url);
  };

  return img;
}

async function createCommonTexture(data: VTexture): Promise<THREE.Texture> {
  return AssetMgr.get(data.image).then(async arrayBuffer => {
    const texture = new THREE.Texture();
    texture.source = new THREE.Source(setImageFromArrayBuffer(arrayBuffer));

    for (const key of TEXTURE_ASSIGN_KEYS) {
      if (key in data) {
        const value = (data as any)[key];
        console.log('Assigning key:', key, value);
        if (Array.isArray(value)) {
          if (key === 'wrap') {
            texture.wrapS = value[0];
            texture.wrapT = value[1];
          } else {
            (texture as any)[key] = new THREE.Vector2(...value);
          }
        } else {
          (texture as any)[key] = value;
        }
      }
    }

    texture.needsUpdate = true;
    return texture;
  });
}

export default async function (
  file: VFile | VFileRemote,
): Promise<THREE.Texture> {
  return AssetMgr.get<VFile<VTexture>>(file as any).then(textureFile => {
    if (!TEXTURE_KEYS.includes(textureFile.type)) {
      throw new Error('VTexture가 아닙니다');
    }

    const { id, type, data } = textureFile;

    if (type === 'VTexture') {
      return createCommonTexture(data);
    } else if (type === 'VDataTexture') {
      return createDataTexture(data);
    } else if (type === 'VCompressedTexture') {
      return createCompressedTexture(data);
    }

    throw new Error('지원하지 않는 텍스쳐 타입입니다');
  });
}
