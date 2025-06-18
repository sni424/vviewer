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
  serverURL: string = MaxConstants.IMAGE_PATH;

  constructor() {}

  async load(maxFile: MaxFile): Promise<THREE.Texture> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if (MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as Promise<THREE.Texture>;
    }

    const prom = new Promise<THREE.Texture>(async res => {
      if (type !== this.type) {
        throw new Error(
          `wrong Type of Max File Income for ${this.type} : ${type}`,
        );
      }

      const objectURL = URL.createObjectURL(originalFile);
      const t = await this.loader.loadAsync(objectURL);
      URL.revokeObjectURL(objectURL);

      maxFile.loaded = true;
      maxFile.resultData = t;
      return res(t);
    });

    MaxCache.addPromise(maxFile, prom);
    return prom;
  }

  async loadFromBuffer(
    arrayBuffer: ArrayBuffer,
    key: string, // 파일네임
  ): Promise<THREE.Texture> {
    if (key && MaxCache.hasByNameAndType(key, this.type)) {
      return MaxCache.getByNameAndType(
        key,
        this.type,
      ) as Promise<THREE.Texture>;
    }

    const prom = new Promise<THREE.Texture>(res => {
      return this.loader.parse(arrayBuffer, (texture: THREE.Texture) => {
        return res(texture);
      });
    });

    MaxCache.addPromiseByNameAndType(key, this.type, prom);
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
    // const file = await resolveMaxFile(targetURL, filename, this.type);

    // return await this.load(file);

    const buffer = await Workers.fetch(targetURL);
    return this.loadFromBuffer(buffer, filename);
  }

  resetServerURL() {
    this.serverURL = MaxConstants.IMAGE_PATH;
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
