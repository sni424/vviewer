import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import { resolveMaxFile } from 'src/pages/max/loaders/MaxUtils.ts';
import VRILoader from 'src/pages/max/loaders/VRILoader.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import { MaxTextureJSON } from 'src/pages/max/types';
import { fileToJson } from 'src/scripts/atomUtils.ts';
import * as THREE from 'VTHREE';

class VRTLoader implements MaxLoader<THREE.Texture> {
  readonly type: MaxFileType = 'texture';
  private imageLoader: VRILoader = new VRILoader();
  serverURL: string = MaxConstants.TEXTURE_PATH;

  constructor() {}

  async load(maxFile: MaxFile): Promise<THREE.Texture> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if (MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as Promise<THREE.Texture>;
    }

    if (type !== this.type) {
      throw new Error(
        `wrong Type of Max File Income for ${this.type} : ${type}`,
      );
    }

    const prom = new Promise<THREE.Texture>(async res => {
      const json: MaxTextureJSON = await fileToJson(originalFile);

      const texture = await this.imageLoader.loadFromFileName(json.image.vri);

      texture.channel = json.channel;

      if (json.channel === 1) {
        texture.flipY = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.HalfFloatType;
        texture.vUserData.mimeType = 'image/ktx2';
      } else {
        texture.flipY = true;
        texture.colorSpace = json.colorSpace;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapT = THREE.RepeatWrapping;
        texture.wrapS = THREE.RepeatWrapping;
        texture.unpackAlignment = 4;
        texture.anisotropy = 16;
        texture.vUserData.mimeType = 'image/ktx2';
      }

      texture.needsUpdate = true;

      maxFile.loaded = true;
      maxFile.resultData = texture;
      return res(texture);
    });

    MaxCache.addPromise(maxFile, prom);

    return prom;
  }

  async loadFromFileName(filename: string): Promise<THREE.Texture> {
    if (filename === null) {
      throw new Error('filename is null');
    }

    if (MaxCache.hasByNameAndType(filename, this.type)) {
      return MaxCache.getByNameAndType(
        filename,
        this.type,
      ) as Promise<THREE.Texture>;
    }

    const targetURL =
      this.serverURL +
      encodeURIComponent(filename)
        // S3는 공백을 + 로 반환하므로 맞춰줌 (optional)
        .replace(/%20/g, '+');
    console.log('fileName', filename);
    console.log('targetURL', targetURL);
    const file = await resolveMaxFile(targetURL, filename, this.type);

    return await this.load(file);
  }

  resetServerURL() {
    this.serverURL = MaxConstants.TEXTURE_PATH;
  }
}

async function fetchToFile(url: string, filename: string) {
  const response = await fetch(url);
  const mimeType =
    response.headers.get('Content-Type') || 'application/octet-stream';
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
}

export default VRTLoader;
