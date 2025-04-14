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

async function imageBufferToHTMLImgElement(
  buffer: ArrayBuffer,
  mimeType: string = 'image/png',
): Promise<HTMLImageElement> {
  const img = document.createElement('img');
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);

  img.src = url;
  return new Promise(
    res =>
      (img.onload = () => {
        URL.revokeObjectURL(url);
        res(img);
      }),
  );
}

async function createCommonTexture(data: VTexture): Promise<THREE.Texture> {
  return AssetMgr.get(data.image)
    .then(arrayBuffer => imageBufferToHTMLImgElement(arrayBuffer))
    .then(img => {
      const texture = new THREE.Texture();
      texture.source = new THREE.Source(img);

      // for (const key of TEXTURE_ASSIGN_KEYS) {
      //   if (key in data) {
      //     const value = (data as any)[key];
      //     if (Array.isArray(value)) {
      //       if (key === 'wrap') {
      //         texture.wrapS = value[0];
      //         texture.wrapT = value[1];
      //       } else {
      //         (texture as any)[key] = new THREE.Vector2(...value);
      //       }
      //     } else {
      //       (texture as any)[key] = value;
      //     }
      //   }
      // }

      // avoid clever code
      if (data.uuid) texture.uuid = data.uuid;
      if (data.name) texture.name = data.name;
      if (data.type) texture.type = data.type;

      if (data.mapping) texture.mapping = data.mapping;
      if (data.channel) texture.channel = data.channel;

      if (data.repeat) texture.repeat.set(data.repeat[0], data.repeat[1]);
      if (data.offset) texture.offset.set(data.offset[0], data.offset[1]);
      if (data.center) texture.center.set(data.center[0], data.center[1]);
      if (data.rotation) texture.rotation = data.rotation;

      if (data.wrap) {
        texture.wrapS = data.wrap[0] as THREE.Wrapping;
        texture.wrapT = data.wrap[1] as THREE.Wrapping;
      }
      if (data.format) texture.format = data.format;
      if (data.internalFormat) texture.internalFormat = data.internalFormat;
      if (data.colorSpace) texture.colorSpace = data.colorSpace;

      if (data.minFilter) texture.minFilter = data.minFilter;
      if (data.magFilter) texture.magFilter = data.magFilter;
      if (data.anisotropy) texture.anisotropy = data.anisotropy;

      if (data.flipY) texture.flipY = data.flipY;

      if (data.generateMipmaps) texture.generateMipmaps = data.generateMipmaps;
      if (data.premultiplyAlpha)
        texture.premultiplyAlpha = data.premultiplyAlpha;
      if (data.unpackAlignment) texture.unpackAlignment = data.unpackAlignment;
      if (data.userData) texture.userData = data.userData;

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
