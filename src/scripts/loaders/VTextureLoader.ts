import { set } from 'idb-keyval';
import { EXRLoader } from 'three/examples/jsm/Addons.js';
import { THREE } from 'VTHREE';
import { getVKTX2Loader } from './VKTX2Loader.ts';

const dispoableUrls: string[] = [];
const disposables: { dispose?: Function }[] = [];

export type VTextureLoaderOption = {
  flipY: boolean;
  channel: number;
  forceExrToJpg?: boolean; // exr로 입력되어도 jpg로 변환해서 처리
  gl?: THREE.WebGLRenderer;
  saveAs?: string;
};

const defaultOption: VTextureLoaderOption = {
  flipY: true,
  channel: 1,
  forceExrToJpg: true,
};

const exrLoader = new EXRLoader();
const textureLoader = new THREE.TextureLoader();

export default class VTextureLoader {
  static dispose() {
    for (const url of dispoableUrls) {
      URL.revokeObjectURL(url);
    }
    for (const disposable of disposables) {
      disposable.dispose?.();
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
      texture.channel = inputOption.channel;
      texture.flipY = inputOption.flipY;
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

      return texture.hash.then(hash => {
        if (!texture.vUserData) {
          texture.vUserData = {};
        }

        // path
        const filename = (isFile ? fileOrUrl.name : fileOrUrl).split('/').pop();
        texture.vUserData.path = filename;

        return texture;
      });
    });
  }
}
