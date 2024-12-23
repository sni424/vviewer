import { HDRJPGLoader } from '@monogrid/gainmap-js';
import { compress, encode, findTextureMinMax } from '@monogrid/gainmap-js/encode';
import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { THREE } from './VTHREE';

export type EXREncodeOption = {
  quality: number;
  flipY: boolean;
};

const defaultEncodeOption: EXREncodeOption = {
  quality: 0.9,
  flipY: false
};

export default class GainmapLoader {
  static disposables: { dispose?: Function }[] = [];
  static dispose() {
    for (const disposable of GainmapLoader.disposables) {
      disposable.dispose?.();
    }
    EXRCodec.dispose();
  }

  static async loadJpg(fileOrUrl: File | string, threeExports: {
    gl: THREE.WebGLRenderer;
  }) {
    const { gl } = threeExports;
    const isFile = typeof fileOrUrl !== "string";
    const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
    const loader = new HDRJPGLoader(gl);
    return loader.loadAsync(url).then(result => {
      this.disposables.push(result);
      URL.revokeObjectURL(url);
      return result.renderTarget.texture;
    });
  }

  static async loadExrHdr(fileOrUrl: File | string, threeExports: {
    gl: THREE.WebGLRenderer;
  }) {
    return EXRCodec.exrToJpg(fileOrUrl).then(jpg => {
      return GainmapLoader.loadJpg(jpg, threeExports);
    })
  }

  static async load(fileOrUrl: File | string, threeExports: {
    gl: THREE.WebGLRenderer;
  }) {

    const isFile = typeof fileOrUrl !== "string";

    const isJpg = isFile ? (fileOrUrl).type === 'image/jpeg' : fileOrUrl.toLowerCase().endsWith('.jpg');
    if (isJpg) {
      return this.loadJpg(fileOrUrl, threeExports);
    } else {
      // exr, hdr
      return this.loadExrHdr(fileOrUrl, threeExports);
    }
  }
}

export class EXRCodec {
  static loader = new EXRLoader();
  static disposables: { dispose?: Function }[] = [];
  static dispose() {
    for (const disposable of EXRCodec.disposables) {
      disposable.dispose?.();
    }
  }

  static async loadExr(file: File) { }

  // url : exr 또는 hdr 파일의 경로, 또는 파일
  // https://github.com/MONOGRID/gainmap-js
  static async exrToJpg(file: string | File, options?: Partial<EXREncodeOption>) {

    options = { ...defaultEncodeOption, ...options };
    const { quality, flipY } = options;

    const isUrl = typeof file === 'string';

    const url = isUrl ? file : URL.createObjectURL(file)

    debugger;
    if (isUrl) {
      if (
        !(url.toLowerCase().endsWith('.exr') ||
          url.toLowerCase().endsWith('.hdr'))
      ) {
        console.error('Invalid file format : ', url)
        throw new Error('Invalid file format')
      }
    } else {
      // File
      if (
        !(file.name.toLowerCase().endsWith('.exr') ||
          file.name.toLowerCase().endsWith('.hdr'))
      ) {
        console.error('Invalid file format : ', file)
        throw new Error('Invalid file format')
      }
    }

    const image = await EXRCodec.loader.loadAsync(url)

    // find RAW RGB Max value of a texture
    const textureMax = findTextureMinMax(image)

    // Encode the gainmap
    const encodingResult = encode({
      image,
      // this will encode the full HDR range
      maxContentBoost: Math.max.apply(this, textureMax)
    })

    // obtain the RAW RGBA SDR buffer and create an ImageData
    const sdrImageData = new ImageData(encodingResult.sdr.toArray(), encodingResult.sdr.width, encodingResult.sdr.height)
    // obtain the RAW RGBA Gain map buffer and create an ImageData
    const gainMapImageData = new ImageData(encodingResult.gainMap.toArray(), encodingResult.gainMap.width, encodingResult.gainMap.height)

    const mimeType = 'image/jpeg'
    const [sdr, gainMap] = await Promise.all([
      compress({
        source: sdrImageData,
        mimeType,
        quality,
        flipY // output needs to be flipped
      }),
      compress({
        source: gainMapImageData,
        mimeType,
        quality,
        flipY // output needs to be flipped
      })
    ])

    // obtain the metadata which will be embedded into
    // and XMP tag inside the final JPEG file
    const metadata = encodingResult.getMetadata()

    // embed the compressed images + metadata into a single
    // JPEG file
    const jpeg = await encodeJPEGMetadata({
      ...encodingResult,
      ...metadata,
      sdr,
      gainMap
    })

    // encoder must be manually disposed
    // when no longer needed
    EXRCodec.disposables.push(encodingResult.gainMap);
    EXRCodec.disposables.push(encodingResult.sdr);

    // `jpeg` will be an `Uint8Array` which can be saved somewhere
    const name = isUrl ? url.split('/').pop()! : file.name;
    const returnFile = new File([jpeg], name.replace(/\.exr|\.hdr/, '.jpg'), { type: 'image/jpeg' });

    if (!isUrl) {
      URL.revokeObjectURL(url);
    }

    return returnFile;
  }
}


