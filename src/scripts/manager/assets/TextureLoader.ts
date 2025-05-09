import { getVKTX2Loader } from 'src/scripts/loaders/VKTX2Loader';
import { THREE } from 'VTHREE';
import Asset from '../Asset';
import { getTypedArray } from './AssetUtils';
import { deserialize } from './Serializer';
import { isVFile, isVRemoteFile, VFile, VRemoteFile } from './VFile';
import { VTexture, VTextureSource } from './VTexture';
import Workers from './Workers';

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

const handleArrayBuffer = async (data: any): Promise<ArrayBuffer> => {
  if (isVRemoteFile(data)) {
    return _Asset.buffer(data) as Promise<ArrayBuffer>;
  } else {
    return data as ArrayBuffer;
  }
};

async function createCompressedTexture(
  data: VTexture,
): Promise<THREE.CompressedTexture> {
  const arrayBuffer = await handleArrayBuffer(data.image);
  const texture = await loadCompressedTexture(arrayBuffer);

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
  if (data.format) texture.format = data.format as THREE.CompressedPixelFormat;
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

  console.log({ texture });

  return texture;
}

async function createDataTexture(data: VTexture): Promise<THREE.DataTexture> {
  if (!data.arrayType || !data.width || !data.height) {
    console.error(data);
    throw new Error('arrayType이 없습니다');
  }

  const arrayBuffer = await handleArrayBuffer(data.image);

  const sourceData = {
    data: getTypedArray(data.arrayType!, arrayBuffer!),
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
}

async function imageBufferToImageBitmap(
  buffer: ArrayBuffer,
  // mimeType: string = 'image/png',
): Promise<ImageBitmap> {
  const decompress = !true;

  buffer = decompress ? await Workers.decompress(buffer) : buffer;

  const { data, width, height, type } = deserialize<{
    data: ArrayBuffer;
    width: number;
    height: number;
    type: string;
  }>(buffer); // decompress

  const uint8Array = new Uint8ClampedArray(data);
  const imageData = new ImageData(uint8Array, width, height);
  const bitmap = await createImageBitmap(imageData);
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
  let texture!: THREE.Texture;
  const image = data.image as VTextureSource;
  if (image.width && image.height) {
    const { data: imageArrayBuffer, width, height } = image;
    const arrayBuffer = await handleArrayBuffer(imageArrayBuffer);
    // const uint8Array = new Uint8ClampedArray(arrayBuffer);
    // const imageData = new ImageData(uint8Array, width, height);
    // const bitmap = await createImageBitmap(imageData);
    // texture = new THREE.Texture(bitmap);

    const blob = new Blob([arrayBuffer], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    texture = new THREE.Texture(bitmap);

    // VTextureSource
  } else {
    const arrayBuffer = await handleArrayBuffer(data.image);
    const bitmap = await imageBufferToImageBitmap(arrayBuffer!);
    texture = new THREE.Texture(bitmap);
  }

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
}

export default async function TextureLoader(
  file: VFile | VRemoteFile,
): Promise<THREE.Texture> {
  const vfile = (
    isVFile(file)
      ? file
      : await Asset.fromVRemoteFile(file as VRemoteFile).vfileAsync
  ) as VFile<VTexture>;

  if (!TEXTURE_KEYS.includes(vfile.type)) {
    throw new Error('VTexture가 아닙니다');
  }

  const { id, type, data } = vfile;
  if (type === 'VTexture') {
    return createCommonTexture(data);
  } else if (type === 'VDataTexture') {
    return createDataTexture(data);
  } else if (type === 'VCompressedTexture') {
    return createCompressedTexture(data);
  }

  throw new Error('지원하지 않는 텍스쳐 타입입니다');
}
