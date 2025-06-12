import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import * as THREE from 'VTHREE';
import { MaxFile, MaxFileType } from '../maxAtoms';
import VRGLoader from 'src/pages/max/loaders/VRGLoader.ts';
import VRMLoader from 'src/pages/max/loaders/VRMLoader.ts';
import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { fileToJson } from 'src/scripts/atomUtils.ts';
import { MaxObjectJSON } from 'src/pages/max/types';

class VROLoader implements MaxLoader<THREE.Object3D> {
  constructor() {}

  readonly type: MaxFileType = 'object';

  private geometryLoader = new VRGLoader();
  private materialLoader = new VRMLoader();

  async load(
    maxFile: MaxFile,
  ): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
    const { originalFile, loaded, resultData, type } = maxFile;
    if (MaxCache.has(maxFile)) {
      // Return data from Cache
      return MaxCache.get(maxFile) as Promise<THREE.Object3D>;
    }

    if (type !== this.type) {
      throw new Error(
        'wrong Type of Max File Income for ' + this.type + ' : ' + type,
      );
    }

    const prom = new Promise<THREE.Object3D>(async res => {
      const object: MaxObjectJSON = await fileToJson(originalFile);

      if (this.isMesh(object)) {
        const geometry = await this.geometryLoader.loadFromFileName(
          object.geometry,
        );

        let material = new THREE.MeshPhysicalMaterial({
          color: 'blue',
          roughness: 1,
          metalness: 0,
        });
        material.vUserData.isMultiMaterial = true;
        material.vUserData.isVMaterial = true;
        if (object.material) {
          material = await this.materialLoader.loadFromFileName(
            object.material,
          );
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        mesh.name = object.name;
        object.position[0] = object.position[0] / 1000;
        object.position[1] = object.position[1] / 1000;
        object.position[2] = object.position[2] / 1000;
        // TODO 올바르게 아랫값 추출, geometry position reset
        mesh.position.fromArray([0, 0, 0]);
        mesh.scale.fromArray([0.01, 0.01, 0.01]);
        mesh.quaternion.fromArray(object.rotation);
        mesh.rotation.set(0, 0, 0);

        maxFile.loaded = true;
        maxFile.resultData = mesh;

        return res(mesh);
      } else {
        const o = new THREE.Object3D();
        o.name = object.name;
        o.position.fromArray(object.position);
        o.scale.fromArray(object.scale);
        o.quaternion.fromArray(object.rotation);

        maxFile.loaded = true;
        maxFile.resultData = o;

        return res(o);
      }
    });
    MaxCache.addPromise(maxFile, prom);

    return prom;
  }

  private isMesh(json: MaxObjectJSON) {
    return json.geometry !== null;
  }
}

export default VROLoader;
