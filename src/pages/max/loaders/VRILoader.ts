import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import VKTX2Loader, {
  getVKTX2Loader,
} from 'src/scripts/loaders/VKTX2Loader.ts';
import Workers from 'src/scripts/workers/Workers';
import * as THREE from 'VTHREE';

class VRILoader implements MaxLoader<THREE.Texture> {
  readonly type: MaxFileType = 'image';
  private loader: VKTX2Loader = getVKTX2Loader();

  constructor() {}

  async load(maxFile: MaxFile): Promise<THREE.Texture> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if ((loaded && resultData) || MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as THREE.Texture;
    }

    if (type !== this.type) {
      throw new Error(
        `wrong Type of Max File Income for ${this.type} : ${type}`,
      );
    }

    const objectURL = URL.createObjectURL(originalFile);
    return await this.loader.loadAsync(objectURL);
  }

  async loadFromBuffer(
    arrayBuffer: ArrayBuffer,
    key: string, // 파일네임
  ): Promise<THREE.Texture> {
    if (key && MaxCache.hasByNameAndType(key, this.type)) {
      return MaxCache.getByNameAndType(key, this.type) as THREE.Texture;
    }

    return new Promise(res =>
      this.loader.parse(arrayBuffer, (texture: THREE.Texture) => {
        if (key) {
          MaxCache.setByNameAndType(key, this.type, texture);
        }
        res(texture);
      }),
    );
  }

  async loadFromFileName(filename: string): Promise<THREE.Texture> {
    if (filename === null) {
      throw new Error('filename is null');
    }

    if (MaxCache.hasByNameAndType(filename, this.type)) {
      return MaxCache.getByNameAndType(filename, this.type) as THREE.Texture;
    }

    const targetURL =
      MaxConstants.IMAGE_PATH +
      encodeURIComponent(filename)
        // S3는 공백을 + 로 반환하므로 맞춰줌 (optional)
        .replace(/%20/g, '+');
    // const file = await resolveMaxFile(targetURL, filename, this.type);

    // return await this.load(file);

    const buffer = await Workers.fetch(targetURL);
    return this.loadFromBuffer(buffer, filename);
  }
}

async function fetchToFile(url: string, filename: string) {
  const response = await fetch(url);
  const mimeType =
    response.headers.get('Content-Type') || 'application/octet-stream';
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
}

export default VRILoader;
