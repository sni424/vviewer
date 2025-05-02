import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import * as THREE from 'VTHREE';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import VRILoader from 'src/pages/max/loaders/VRILoader.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { MaxTextureJSON } from 'src/pages/max/types';
import { fileToJson } from 'src/scripts/atomUtils.ts';

class VRTLoader implements MaxLoader<THREE.Texture> {
  readonly type: MaxFileType = 'texture';
  private imageLoader: VRILoader = new VRILoader();

  constructor() {}

  async load(maxFile: MaxFile): Promise<THREE.Texture> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if ((loaded && resultData) || MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as THREE.Texture;
    }

    if (type !== this.type) {
      throw new Error(
        'wrong Type of Max File Income for ' + this.type + ' : ' + type,
      );
    }

    const json: MaxTextureJSON = await fileToJson(originalFile);

    const texture = await this.imageLoader.loadFromFileName(json.image.vri);

    // Object.keys(json).forEach((key) => {
    //   if (texture.hasOwnProperty(key)) {
    //     // @ts-ignore
    //     texture[key] = json[key];
    //   }
    // })

    texture.channel = json.channel;
    texture.flipY = json.flipY;
    texture.colorSpace = json.colorSpace;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapT = THREE.RepeatWrapping;
    texture.wrapS = THREE.RepeatWrapping;
    texture.unpackAlignment = 4;

    maxFile.loaded = true;
    maxFile.resultData = texture;

    MaxCache.add(maxFile);

    return texture;
  }

  async loadFromFileName(filename: string): Promise<THREE.Texture> {
    if (filename === null) {
      throw new Error('filename is null');
    }

    if (MaxCache.hasByNameAndType(filename, this.type)) {
      return MaxCache.getByNameAndType(filename, this.type) as THREE.Texture;
    }

    const targetURL =
      MaxConstants.TEXTURE_PATH +
      encodeURIComponent(filename)
        // S3는 공백을 + 로 반환하므로 맞춰줌 (optional)
        .replace(/%20/g, '+');
    console.log('fileName', filename);
    console.log('targetURL', targetURL);
    const file = await fetchToFile(targetURL, filename);
    const maxFile = {
      originalFile: file,
      type: 'texture',
      loaded: false,
    } as MaxFile;

    return await this.load(maxFile);
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
