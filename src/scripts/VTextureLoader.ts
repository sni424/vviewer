import GainmapLoader from "./GainmapLoader";
import { THREE } from "./VTHREE";

const dispoableUrls: string[] = [];
const disposables: { dispose?: Function }[] = [];

export type VTextureLoaderOption = {
  flipY: boolean;
  channel: number;
  gl?: THREE.WebGLRenderer;
  as?: "gainmap" | "texture";
};

const defaultOption: VTextureLoaderOption = {
  flipY: true,
  channel: 1,
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
  static loadAsync(fileOrUrl: File | string, option?: Partial<VTextureLoaderOption>) {
    const inputOption = { ...defaultOption, ...option } as VTextureLoaderOption;
    const isFile = typeof fileOrUrl !== "string";
    const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
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
        return GainmapLoader.load(fileOrUrl, { gl: inputOption.gl }).then(texture => {
          texture.flipY = inputOption.flipY;
          texture.channel = inputOption.channel;
          texture.needsUpdate = true;
          return texture;
        })
      } else if (inputOption.as === 'texture') {
        return new THREE.TextureLoader().loadAsync(url).then(texture => {
          texture.flipY = inputOption.flipY;
          texture.channel = inputOption.channel;
          texture.needsUpdate = true;
          return texture;
        });
      } else {
        console.error('Invalid Option : as');
        throw new Error('Invalid Option : as');
      }
    }

    // 2. file / url에 따라서 자동으로 결정
    const fork = isFile ? fileOrUrl.name.toLowerCase() : fileOrUrl.toLowerCase();

    const isHdr = fork.endsWith('.hdr') || fork.endsWith('.exr');
    const isJpg = fork.endsWith('.jpg') || fork.endsWith('.jpeg');
    const isGainmap = isHdr || isJpg;
    const isPng = fork.endsWith('.png');

    const detectFlipY = option?.flipY === undefined;
    let flipY = inputOption.flipY;
    if (detectFlipY) {
      flipY = isHdr ? true : (isJpg ? false : (isPng ? false : true));
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