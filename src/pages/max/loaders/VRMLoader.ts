import * as THREE from 'VTHREE';
import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import { MaxFile } from 'src/pages/max/maxAtoms.ts';
import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import VRTLoader from 'src/pages/max/loaders/VRTLoader.ts';
import { ColorJSON, MaxMaterialJSON } from 'src/pages/max/types';
import { fileToJson } from 'src/scripts/atomUtils.ts';

type TargetParams = Partial<THREE.MeshPhysicalMaterialParameters>;

class VRMLoader implements MaxLoader<THREE.MeshPhysicalMaterial> {
  constructor() {}

  private textureLoader: VRTLoader = new VRTLoader();

  async load(maxFile: MaxFile): Promise<THREE.MeshPhysicalMaterial> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if (loaded && resultData) {
      // Return data from Cache
      return MaxCache.get(maxFile) as THREE.MeshPhysicalMaterial;
    }

    if (type !== 'material') {
      throw new Error('wrong Type of Max File Income for material ' + type);
    }

    const json: MaxMaterialJSON = await fileToJson(originalFile);

    const maps = Object.keys(json).filter(key =>
      key.toLowerCase().endsWith('map'),
    );

    const others = Object.keys(json).filter(
      key => !key.toLowerCase().endsWith('map'),
    );

    const physicalParams = {} as TargetParams;

    for (const mapKey of maps) {
      const value = json[mapKey as keyof MaxMaterialJSON];
      if (typeof value === 'string') {
        const texture = await this.textureLoader.loadFromFileName(value);
        if (mapKey === 'baseColorMap') {
          physicalParams.map = texture;
        } else {
          physicalParams[mapKey as keyof TargetParams] = texture;
        }
      }
    }

    for (const key of others) {
      const value = json[key as keyof MaxMaterialJSON];
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
        physicalParams[key] = resultValue;
      }
    }

    console.log(physicalParams);
    physicalParams.depthWrite = true;
    physicalParams.depthTest = true;
    physicalParams.metalnessMap = physicalParams.roughnessMap;

    physicalParams.transmission = 0;
    physicalParams.color = new THREE.Color(1, 1, 1);

    const material = new THREE.MeshPhysicalMaterial(physicalParams);

    maxFile.loaded = true;
    maxFile.resultData = material;

    MaxCache.add(maxFile);

    return material;
  }
}

export default VRMLoader;
