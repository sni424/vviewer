import { getVKTX2Loader } from 'src/scripts/loaders/VKTX2Loader';
import { EXRLoader } from 'three/examples/jsm/Addons.js';
import { THREE } from 'VTHREE';
import { AssetMgr } from './AssetMgr';
import { getTypedArray } from './AssetUtils';
import { VFile, VRemoteFile } from './VFile';
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

async function loadCompressedTexture(
  arrayBuffer: ArrayBuffer,
): Promise<THREE.CompressedTexture> {
  return new Promise((resolve, reject) => {
    try {
      getVKTX2Loader().parse(arrayBuffer, tex => {
        resolve(tex as THREE.CompressedTexture);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function createCompressedTexture(
  data: VTexture,
): Promise<THREE.CompressedTexture> {
  return AssetMgr.get(data.image)
    .then(arrayBuffer => loadCompressedTexture(arrayBuffer))
    .then(texture => {
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
      if (data.format)
        texture.format = data.format as THREE.CompressedPixelFormat;
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

      console.log({ texture });

      return texture;
    });
}

const _EXRLoader = new EXRLoader();
async function createDataTexture(data: VTexture): Promise<THREE.DataTexture> {
  if (!data.arrayType || !data.width || !data.height) {
    console.error(data);
    throw new Error('arrayType이 없습니다');
  }
  // const retval = new THREE.DataTexture();
  // return retval;
  return AssetMgr.get(data.image).then(arrayBuffer => {
    const sourceData = {
      data: getTypedArray(data.arrayType!, arrayBuffer),
      width: data.width!,
      height: data.height!,
    };
    const source = new THREE.Source(sourceData);
    const texture = new THREE.DataTexture();
    texture.source = source;

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

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
    if (data.premultiplyAlpha) texture.premultiplyAlpha = data.premultiplyAlpha;
    if (data.unpackAlignment) texture.unpackAlignment = data.unpackAlignment;
    if (data.userData) texture.userData = data.userData;

    texture.needsUpdate = true;

    return texture;
  });
}

async function imageBufferToImageBitmap(
  buffer: ArrayBuffer,
  mimeType: string = 'image/png',
): Promise<ImageBitmap> {
  const blob = new Blob([buffer], { type: mimeType });
  const bitmap = await createImageBitmap(blob);
  return bitmap;
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
    .then(arrayBuffer => imageBufferToImageBitmap(arrayBuffer))
    .then(bitmap => {
      const texture = new THREE.Texture(bitmap);

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

export default async function TextureLoader(
  file: VFile | VRemoteFile,
): Promise<THREE.Texture> {
  return AssetMgr.get<VFile<VTexture>>(file as any).then(async textureFile => {
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
