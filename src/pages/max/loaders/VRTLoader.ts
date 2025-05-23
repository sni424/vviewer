import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import { downloadJson } from 'src/pages/max/loaders/MaxUtils.ts';
import VRILoader from 'src/pages/max/loaders/VRILoader.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import { MaxTextureJSON } from 'src/pages/max/types';
import { fileToJson } from 'src/scripts/atomUtils.ts';
import * as THREE from 'VTHREE';

class VRTLoader implements MaxLoader<THREE.Texture> {
  readonly type: MaxFileType = 'texture';
  private imageLoader: VRILoader = new VRILoader();

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
      const json: MaxTextureJSON =
        originalFile instanceof File
          ? await fileToJson(originalFile)
          : originalFile;

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
        texture.flipY = json.flipY;
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
    const projectName = 'max_test';
    const fname = filename;

    const file: MaxTextureJSON = await downloadJson(projectName, fname);
    return this.load({
      loaded: false,
      originalFile: file,
      type: this.type,
      fileName: filename,
    });
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
