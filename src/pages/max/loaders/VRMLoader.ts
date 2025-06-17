import 'VTHREE';
import * as THREE from 'VTHREE';
import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import { resolveMaxFile } from 'src/pages/max/loaders/MaxUtils.ts';
import VRTLoader from 'src/pages/max/loaders/VRTLoader.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import { ColorJSON, MaxMaterialJSON } from 'src/pages/max/types';
import { fileToJson } from 'src/scripts/atomUtils.ts';

type TargetParams = Partial<THREE.MeshPhysicalMaterialParameters>;

class VRMLoader implements MaxLoader<THREE.MeshPhysicalMaterial> {
  constructor() {}

  readonly type: MaxFileType = 'material';
  private textureLoader: VRTLoader = new VRTLoader();

  async load(maxFile: MaxFile): Promise<THREE.MeshPhysicalMaterial> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if (MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as Promise<THREE.MeshPhysicalMaterial>;
    }

    if (type !== this.type) {
      throw new Error('wrong Type of Max File Income for material ' + type);
    }

    const prom = new Promise<THREE.MeshPhysicalMaterial>(async res => {
      const json: MaxMaterialJSON = await fileToJson(originalFile);

      // 우선 bump 관련 값 보간
      if (json.bumpScale > 2) {
        json.bumpScale = json.bumpScale * 0.02;
      }

      if (!json.normalScale) {
        const bumpScale = json.bumpScale;
        json.normalScale = [bumpScale, -bumpScale];
      }

      const maps = Object.keys(json).filter(key =>
        key.toLowerCase().endsWith('map'),
      );

      const others = Object.keys(json).filter(
        key => !key.toLowerCase().endsWith('map'),
      );

      console.log(`others : ${others}`);

      const physicalParams = {} as TargetParams;
      const specializedVrayMaps = ['reflectionMap', 'glossinessMap'];

      for (const mapKey of maps) {
        const value = json[mapKey as keyof MaxMaterialJSON];
        if (typeof value === 'string') {
          const texture = await this.textureLoader.loadFromFileName(value);
          if (specializedVrayMaps.includes(mapKey)) {
            if (mapKey === 'reflectionMap') {
              physicalParams.specularColorMap = texture;
            } else if (mapKey === 'glossinessMap') {
              // Reflection Glossiness 일단 PASS
            }
          } else if (mapKey === 'baseColorMap') {
            physicalParams.map = texture;
          } else if (mapKey === 'displacementMap') {
            // pass displacement
          } else {
            physicalParams[mapKey as keyof TargetParams] = texture;
          }
        }
      }

      for (const key of others) {
        const value = json[key as keyof MaxMaterialJSON];
        console.log(`checking key ${key}, `, value);
        if (value !== null) {
          let resultValue: any;
          if (typeof value === 'object' && !Array.isArray(value)) {
            const { r, g, b } = value as ColorJSON;
            resultValue = new THREE.Color(r, g, b);
          } else if (Array.isArray(value)) {
            const valueArray = value as number[];
            if (valueArray.length === 2) {
              resultValue = new THREE.Vector2(valueArray[0], valueArray[1]);
            } else if (valueArray.length === 3) {
              resultValue = new THREE.Vector3(
                valueArray[0],
                valueArray[1],
                valueArray[2],
              );
            } else {
              console.warn('value array length is strange : ', valueArray);
              resultValue = null;
            }
          } else {
            resultValue = value;
          }
          (physicalParams as any)[key] = resultValue;
        }
      }

      console.log(json, physicalParams);
      physicalParams.depthWrite = true;
      physicalParams.depthTest = true;
      // if (!physicalParams.metalnessMap) {
      //   physicalParams.metalnessMap = physicalParams.roughnessMap;
      // }

      // physicalParams.transmission = 0;
      // physicalParams.color = new THREE.Color(1, 1, 1);

      const material = new THREE.MeshPhysicalMaterial(physicalParams);

      material.vUserData.originalColor = material.color.getHexString();
      material.vUserData.originalMetalness = material.metalness;
      material.vUserData.originalRoughness = material.roughness;
      material.vUserData.isVMaterial = true;
      material.dithering = true;

      material.needsUpdate = true;

      maxFile.loaded = true;
      maxFile.resultData = material;

      return res(material);
    });

    MaxCache.addPromise(maxFile, prom);

    return prom;
  }

  async loadFromFileName(
    filename: string | null,
  ): Promise<THREE.MeshPhysicalMaterial> {
    if (filename === null) {
      throw new Error('filename is null');
    }

    if (MaxCache.hasByNameAndType(filename, this.type)) {
      return MaxCache.getByNameAndType(
        filename,
        this.type,
      ) as Promise<THREE.MeshPhysicalMaterial>;
    }

    const targetURL =
      MaxConstants.MATERIAL_PATH +
      encodeURIComponent(filename)
        // S3는 공백을 + 로 반환하므로 맞춰줌 (optional)
        .replace(/%20/g, '+');
    console.log('fileName', filename);
    console.log('targetURL', targetURL);
    const file = await resolveMaxFile(targetURL, filename, this.type);

    return await this.load(file);
  }
}

async function fetchToFile(url: string, filename: string) {
  const response = await fetch(url);
  const mimeType =
    response.headers.get('Content-Type') || 'application/octet-stream';
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
}

export default VRMLoader;
