import { set } from 'idb-keyval';
import { EXRLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
import { DataTexture, THREE } from 'VTHREE';
import { getTypedArray } from '../manager/assets/AssetUtils.ts';
import Workers from '../manager/assets/Workers.ts';
import { getVKTX2Loader } from './VKTX2Loader.ts';

const dispoableUrls: string[] = [];
const disposables: { dispose?: Function }[] = [];

export type VTextureLoaderOption = {
  flipY?: boolean;
  channel?: number;
  gl?: THREE.WebGLRenderer;
  saveAs?: string;
  ext?: 'exr' | 'ktx';
};

const defaultOption: VTextureLoaderOption = {
  flipY: true,
  channel: 1,
};

const exrLoader = new EXRLoader();
const rgbeLoader = new RGBELoader();
const textureLoader = new THREE.TextureLoader();

function exrToDataTexture(arrayBuffer: ArrayBuffer) {
  const exr = exrLoader.parse(arrayBuffer);
  const texture = new DataTexture(
    exr.data,
    exr.width,
    exr.height,
    exr.format,
    exr.type,
  );
  texture.needsUpdate = true;
  return texture;
}

function ktxToDataTexture(
  arrayBuffer: ArrayBuffer,
  gl: THREE.WebGLRenderer,
): Promise<THREE.CompressedTexture> {
  return new Promise((res, rej) => {
    const ktxLoader = getVKTX2Loader(gl);
    ktxLoader.parse(arrayBuffer, texture => {
      res(texture);
    });
  });
}

export default class VTextureLoader {
  static dispose() {
    for (const url of dispoableUrls) {
      URL.revokeObjectURL(url);
    }
    for (const disposable of disposables) {
      disposable.dispose?.();
    }
  }

  static parseAsync(
    arrayBuffer: ArrayBuffer,
    option?: Partial<VTextureLoaderOption>,
  ): Promise<THREE.Texture>;
  static parseAsync(
    url: string,
    option?: Partial<VTextureLoaderOption>,
  ): Promise<THREE.Texture>;
  static parseAsync(
    file: File,
    option?: Partial<VTextureLoaderOption>,
  ): Promise<THREE.Texture>;
  static parseAsync(
    param: File | string | ArrayBuffer,
    option?: Partial<VTextureLoaderOption>,
  ): Promise<THREE.Texture> {
    if (param instanceof ArrayBuffer) {
      if (!option?.ext) {
        throw new Error('ext is required when using ArrayBuffer');
      }

      if (option?.ext === 'exr') {
        // return new Promise((res, rej) => {
        //   console.log('exrToDataTexture', param);
        //   res(exrToDataTexture(param));
        // });
        return Workers.exrParse(param).then(exr => {
          const texture = new DataTexture(
            getTypedArray(exr.arrayType, exr.data),
            exr.width,
            exr.height,
            exr.format,
            exr.type,
          );
          texture.needsUpdate = true;
          return texture;
        });
      }

      if (option?.ext === 'ktx') {
        if (!option?.gl) {
          throw new Error('gl is required when using ktx');
        }
        return ktxToDataTexture(param, option.gl);
      }

      throw new Error('Unknown ext');
    } else {
      return VTextureLoader.loadAsync(param, option);
    }
  }

  static load = VTextureLoader.loadAsync;
  static loadAsync(
    fileOrUrl: File | string,
    option?: Partial<VTextureLoaderOption>,
  ) {
    const inputOption = { ...defaultOption, ...option } as VTextureLoaderOption;
    const isFile = typeof fileOrUrl !== 'string';
    const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;

    if (isFile) {
      dispoableUrls.push(url);
    }

    let loader: THREE.Loader;
    const isExr =
      (isFile && fileOrUrl.name.toLowerCase().endsWith('.exr')) ||
      (!isFile && (fileOrUrl as string).toLowerCase().endsWith('.exr'));
    const isKtx =
      (isFile && fileOrUrl.name.toLowerCase().endsWith('.ktx')) ||
      (!isFile && (fileOrUrl as string).toLowerCase().endsWith('.ktx'));
    if (isExr) {
      loader = exrLoader;
    } else if (isKtx) {
      loader = getVKTX2Loader(inputOption.gl);
    } else {
      loader = textureLoader;
    }
    return loader.loadAsync(url).then(_texture => {
      const texture = _texture as THREE.Texture;
      if (typeof inputOption.channel !== 'undefined') {
        texture.channel = inputOption.channel;
      }
      if (typeof inputOption.flipY !== 'undefined') {
        texture.flipY = inputOption.flipY;
      }
      if (isExr) {
        texture.vUserData.isExr = true;
        if (isFile) {
          texture.vUserData.lightMap = fileOrUrl.name;
          let fileName = fileOrUrl.name;
          if (option && option.saveAs) {
            fileName = option.saveAs;
          }
          // saveAs 등과 키를 맞춰야함.
          let fileToSave: File = fileOrUrl as File;
          if (fileToSave.name !== fileName) {
            fileToSave = new File([fileToSave], fileName, {
              type: fileToSave.type,
            });
          }
          set(fileName, fileToSave);
        }
        // texture.flipY = !texture.flipY;
      }
      if (isKtx) {
        texture.vUserData.mimeType = 'image/ktx2';
      }

      if (isExr || isKtx) {
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if (inputOption.gl) {
          texture.anisotropy = inputOption.gl.capabilities.getMaxAnisotropy();
        }
      }

      texture.needsUpdate = true;

      return texture;
    });
  }
}
