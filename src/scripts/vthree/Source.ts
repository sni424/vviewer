import * as THREE from 'three';
import { AssetMgr } from '../manager/assets/AssetMgr';
import { VRemoteFile } from '../manager/assets/VFile';
import { getImageData } from '../utils';
import { type VUserData } from './VTHREETypes';

declare module 'three' {
  interface Source {
    toAsset(): Promise<VRemoteFile>;

    get vUserData(): VUserData;
    set vUserData(userData: Partial<VUserData>);
    get hash(): string;
    updateHash(): string;
  }
}

if (
  !Object.prototype.hasOwnProperty.call(THREE.Source.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Source.prototype, 'vUserData', {
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

if (!Object.prototype.hasOwnProperty.call(THREE.Source.prototype, 'hash')) {
  Object.defineProperty(THREE.Source.prototype, 'hash', {
    get: async function (): Promise<string> {
      if (this.vUserData?.hash) {
        return Promise.resolve(this.vUserData.hash);
      }

      return this.updateHash();
    },
  });
}

let _canvas: HTMLCanvasElement | undefined;

class ImageUtils {
  static async getArrayBuffer(
    image: HTMLImageElement | HTMLCanvasElement | ImageData,
  ): Promise<ArrayBuffer> {
    // Return early if image.src is a Data URL
    if ('src' in image && /^data:/i.test(image.src)) {
      const response = await fetch(image.src);
      return await response.arrayBuffer();
    }

    // Return early if canvas is not supported
    if (typeof HTMLCanvasElement === 'undefined') {
      if ('src' in image) {
        const response = await fetch(image.src);
        return await response.arrayBuffer();
      }
      throw new Error(
        'Canvas not supported and no valid image source provided',
      );
    }

    let canvas: HTMLCanvasElement;

    if (image instanceof HTMLCanvasElement) {
      canvas = image;
    } else {
      if (_canvas === undefined) {
        _canvas = document.createElementNS(
          'http://www.w3.org/1999/xhtml',
          'canvas',
        ) as HTMLCanvasElement;
      }

      _canvas.width = image.width;
      _canvas.height = image.height;

      const context = _canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get 2D context');
      }

      if (image instanceof ImageData) {
        context.putImageData(image, 0, 0);
      } else {
        context.drawImage(image, 0, 0, image.width, image.height);
      }

      canvas = _canvas;
    }

    // Convert canvas to ArrayBuffer
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const format =
        canvas.width > 2048 || canvas.height > 2048
          ? 'image/jpeg'
          : 'image/png';
      const quality = format === 'image/jpeg' ? 0.6 : undefined;

      if (canvas.width > 2048 || canvas.height > 2048) {
        console.warn(
          'THREE.ImageUtils.getArrayBuffer: Image converted to jpg for performance reasons',
          image,
        );
      }

      canvas.toBlob(
        blob => {
          if (blob) {
            blob.arrayBuffer().then(resolve).catch(reject);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        format,
        quality,
      );
    });
  }
}

async function serializeImage(
  image:
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | {
        data: Uint16Array | Float32Array;
        width: number;
        height: number;
      },
): Promise<{
  data: ArrayBufferLike;
  type: 'png' | 'Float32Array' | 'Uint16Array' | string;
  width?: number;
  height?: number;
}> {
  if (!_canvas) {
    _canvas = document.createElement('canvas');
  }

  if (
    (typeof HTMLImageElement !== 'undefined' &&
      image instanceof HTMLImageElement) ||
    (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap)
  ) {
    // default images
    const ab = getImageData(image).data.buffer;
    return {
      data: ab,
      type: 'png',
    };
  } else {
    // exr
    const exrData = image as {
      data: Uint16Array | Float32Array;
      width: number;
      height: number;
    };
    if (exrData.data) {
      const ab = exrData.data.buffer;
      return {
        data: ab,
        width: exrData.width,
        height: exrData.height,
        type: exrData.data.constructor.name,
      };
    } else {
      console.error(image);
      throw new Error('Not supported source');
    }
  }
}

THREE.Source.prototype.toAsset = async function (): Promise<VRemoteFile> {
  const data = this.data;

  if (data !== null) {
    if (Array.isArray(data)) {
      // cube texture은 아직 지원 안함
      throw new Error('큐브 텍스쳐는 지원하지 않음');

      // url = [];

      // for (let i = 0, l = data.length; i < l; i++) {
      //   if (data[i].isDataTexture) {
      //     url.push(serializeImage(data[i].image));
      //   } else {
      //     url.push(serializeImage(data[i]));
      //   }
      // }
    }

    const { data: ab, type, width, height } = await serializeImage(data);
    const hash = AssetMgr.set(ab);

    this.vUserData.hash = hash;
    if (!this.vUserData.id) {
      this.vUserData.id = hash;
    }

    const output: VRemoteFile = {
      id: hash,
      format: 'binary',
      hint: type,
    };

    return output;
  } else {
    throw new Error('Data가 없는 텍스쳐는 지원하지 않음');
  }
};
