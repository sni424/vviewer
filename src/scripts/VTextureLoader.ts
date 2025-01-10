import { set } from 'idb-keyval';
import { EXRLoader, KTX2Loader } from 'three/examples/jsm/Addons.js';
import GainmapLoader from './GainmapLoader';
import { THREE } from './VTHREE';

const dispoableUrls: string[] = [];
const disposables: { dispose?: Function }[] = [];

export type VTextureLoaderOption = {
  flipY: boolean;
  channel: number;
  forceExrToJpg?: boolean; // exr로 입력되어도 jpg로 변환해서 처리
  gl?: THREE.WebGLRenderer;
  as?: 'gainmap' | 'texture';
  saveAs?: string;
};

const defaultOption: VTextureLoaderOption = {
  flipY: true,
  channel: 1,
  forceExrToJpg: true,
};

export default class VTextureLoader {
  static dispose() {
    for (const url of dispoableUrls) {
      URL.revokeObjectURL(url);
    }
    for (const disposable of disposables) {
      disposable.dispose?.();
    }
    GainmapLoader.dispose();
  }

  static load = VTextureLoader.loadAsync;
  static loadAsync(
    fileOrUrl: File | string,
    option?: Partial<VTextureLoaderOption>,
  ) {
    const inputOption = { ...defaultOption, ...option } as VTextureLoaderOption;
    const isFile = typeof fileOrUrl !== 'string';
    const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
    let gainMap = isFile ? fileOrUrl.name : fileOrUrl;
    if (option?.forceExrToJpg) {
      gainMap = gainMap.replace('.exr', '.jpg');
    }

    if (isFile) {
      dispoableUrls.push(url);
    }

    // 1. 옵션이 강제된 경우
    if (inputOption.as) {
      if (inputOption.as === 'gainmap') {
        if (!inputOption.gl) {
          console.error('게인맵의 경우 옵션에 gl 필요');
          throw new Error('게인맵의 경우 옵션에 gl 필요');
        }
        return GainmapLoader.load(fileOrUrl, { gl: inputOption.gl }).then(
          texture => {
            texture.vUserData.gainMap = gainMap;
            texture.flipY = inputOption.flipY;
            texture.channel = inputOption.channel;
            texture.needsUpdate = true;
            return texture;
          },
        );
      } else if (inputOption.as === 'texture') {
        let loader: THREE.Loader;
        const isExr =
          (isFile && fileOrUrl.name.toLowerCase().endsWith('.exr')) ||
          (!isFile && (fileOrUrl as string).toLowerCase().endsWith('.exr'));
        const isKtx =
          (isFile && fileOrUrl.name.toLowerCase().endsWith('.ktx')) ||
          (!isFile && (fileOrUrl as string).toLowerCase().endsWith('.ktx'));
        if (isExr) {
          loader = new EXRLoader();
        } else if (isKtx) {
          loader = new KTX2Loader();
          if (!inputOption.gl) {
            throw new Error('KTX2Loader의 경우 gl이 필요합니다.');
          } else {
            (loader as KTX2Loader).detectSupport(inputOption.gl);
          }
        } else {
          loader = new THREE.TextureLoader();
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
              texture.anisotropy =
                inputOption.gl.capabilities.getMaxAnisotropy();
            }
          }

          texture.needsUpdate = true;
          return texture;
        });
      } else {
        console.error('Invalid Option : as');
        throw new Error('Invalid Option : as');
      }
    }

    // 2. file / url에 따라서 자동으로 결정
    const fork = isFile
      ? fileOrUrl.name.toLowerCase()
      : fileOrUrl.toLowerCase();

    const isHdr = fork.endsWith('.hdr') || fork.endsWith('.exr');
    const isJpg = isFile
      ? fileOrUrl.type === 'image/jpeg'
      : fork.endsWith('.jpg') || fork.endsWith('.jpeg');
    const isGainmap = isHdr || isJpg;
    const isPng = fork.endsWith('.png');

    const detectFlipY = option?.flipY === undefined;
    let flipY = inputOption.flipY;
    if (detectFlipY) {
      flipY = isHdr ? true : isJpg ? false : isPng ? false : true;
    }

    // console.log(flipY);

    if (isGainmap) {
      if (!inputOption.gl) {
        // jpg인 경우 게인맵으로 강제
        console.error('게인맵의 경우 옵션에 gl 필요');
        throw new Error('게인맵의 경우 옵션에 gl 필요');
      }
      return GainmapLoader.load(fileOrUrl, {
        gl: inputOption.gl,
      }).then(texture => {
        texture.vUserData.gainMap = gainMap;
        texture.flipY = flipY;
        texture.channel = inputOption.channel;
        texture.needsUpdate = true;
        return texture;
      });
    } else if (isPng) {
      return new THREE.TextureLoader().loadAsync(url).then(texture => {
        texture.flipY = flipY;
        texture.channel = inputOption.channel;
        texture.needsUpdate = true;
        return texture;
      });
    } else {
      console.error('Invalid File Format : ', fileOrUrl);
      throw new Error('Invalid File Format : ' + fileOrUrl);
    }
  }
}
