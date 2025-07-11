import { MaxLoader } from 'src/pages/max/loaders/MaxLoader.ts';
import * as THREE from 'VTHREE';
import { MaxFile, MaxFileType } from '../maxAtoms';
import VRGLoader from 'src/pages/max/loaders/VRGLoader.ts';
import VRMLoader from 'src/pages/max/loaders/VRMLoader.ts';
import { MaxCache } from 'src/pages/max/loaders/MaxCache.ts';
import { fileToJson } from 'src/scripts/atomUtils.ts';
import { MaxObjectJSON } from 'src/pages/max/types';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { resolveMaxFile } from 'src/pages/max/loaders/MaxUtils.ts';

class VROLoader implements MaxLoader<THREE.Object3D> {
  constructor() {}

  readonly type: MaxFileType = 'object';
  serverURL: string = MaxConstants.OBJECT_PATH

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
          color: '#5f5f5f',
          roughness: 1,
          metalness: 0,
        });

        if (object.name.includes('욕실1_샤워기')) {
          material.metalness = 1;
          material.roughness = 0.2;
          material.color.set(1, 1, 1);
        }

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
        mesh.scale.fromArray([0.001, 0.001, 0.001]);
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

  async loadFromFileName(
    filename: string | null,
  ): Promise<THREE.Object3D<THREE.Object3DEventMap>> {
    if (filename === null) {
      throw new Error('filename is null');
    }

    if (MaxCache.hasByNameAndType(filename, this.type)) {
      return MaxCache.getByNameAndType(
        filename,
        this.type,
      ) as Promise<THREE.Object3D<THREE.Object3DEventMap>>;
    }

    const targetURL =
      this.serverURL +
      encodeURIComponent(filename)
        // S3는 공백을 + 로 반환하므로 맞춰줌 (optional)
        .replace(/%20/g, '+');
    const file = await resolveMaxFile(targetURL, filename, this.type);

    return await this.load(file);
  }

  private isMesh(json: MaxObjectJSON) {
    return json.geometry !== null;
  }

  resetServerURL() {
    this.serverURL = MaxConstants.OBJECT_PATH;
  }
}

export default VROLoader;
