import { GLTFExporter } from 'three/examples/jsm/Addons.js';
import * as TextureUtils from 'three/examples/jsm/utils/WebGLTextureUtils';
import { Layer } from '../Constants.ts';
import * as THREE from '../scripts/VTHREE.ts';

interface GLTFExporterOptions {
  /**
   * Export position, rotation and scale instead of matrix per node. Default is false
   */
  trs?: boolean;

  /**
   * Export only visible objects. Default is true.
   */
  onlyVisible?: boolean;

  /**
   * Export just the attributes within the drawRange, if defined, instead of exporting the whole array. Default is true.
   */
  truncateDrawRange?: boolean;

  /**
   * Export in binary (.glb) format, returning an ArrayBuffer. Default is false.
   */
  binary?: boolean;

  /**
   * Export with images embedded into the glTF asset. Default is true.
   */
  embedImages?: boolean;

  /**
   * Restricts the image maximum size (both width and height) to the given value. This option works only if embedImages is true. Default is Infinity.
   */
  maxTextureSize?: number;

  /**
   * List of animations to be included in the export.
   */
  animations?: THREE.AnimationClip[];

  /**
   * Generate indices for non-index geometry and export with them. Default is false.
   */
  forceIndices?: boolean;

  /**
   * Export custom glTF extensions defined on an object's userData.gltfExtensions property. Default is false.
   */
  includeCustomExtensions?: boolean;
}

export default class VGLTFExporter extends GLTFExporter {
  constructor() {
    super();
    this.setTextureUtils(TextureUtils);
  }

  parse(
    input: THREE.Object3D | THREE.Object3D[],
    onDone: (gltf: ArrayBuffer | { [key: string]: any }) => void,
    onError: (error: ErrorEvent) => void,
    options?: GLTFExporterOptions,
  ): void {
    const cloned = this.onBeforeParse(input);
    console.log('onBeforeParse Done');
    super.parse(cloned, onDone, onError, options);
  }

  parseAsync(
    input: THREE.Object3D | THREE.Object3D[],
    options?: GLTFExporterOptions,
  ): Promise<ArrayBuffer | { [key: string]: any }> {
    return new Promise((resolve, reject) => {
      this.parse(input, resolve, reject, options);
    });
  }

  /**
   * OnBeforeParse
   * Material 내에 lightMap 이 있을 경우, 해당 lightMap 을 emissive 에 넣어서 할당
   * **/
  onBeforeParse(input: THREE.Object3D | THREE.Object3D[]) {
    console.log('onBeforeParse START');
    function lightMapToEmissive(object: THREE.Object3D) {
      if ('isMesh' in object) {
        const mesh = object as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material.lightMap) {
          console.log('lightMapToEmissive : ', mesh, material);
        }
        // 이미 매핑 됐으면 패스
        if (!material.vUserData.isEmissiveLightMap && material.lightMap) {
          const clonedMat = material.clone();
          clonedMat.emissiveMap = clonedMat.lightMap;
          clonedMat.vUserData.isEmissiveLightMap = true;
          clonedMat.vUserData.lightMapIntensity = clonedMat.lightMapIntensity;
          clonedMat.needsUpdate = true;
          mesh.material = clonedMat;
          console.log('lightmap Passed');
        }
      }
    }

    function filterNotModelObjects(obj: THREE.Object3D) {
      const toDelete: string[] = [];
      obj.traverseAll(object => {
        if (!object.layers.isEnabled(Layer.Model)) {
          toDelete.push(object.uuid);
        }
      });

      const elementsToDelete = toDelete
        .map(uuid => {
          return obj.getObjectByProperty('uuid', uuid);
        })
        .filter(e => e !== undefined);

      elementsToDelete.forEach(e => {
        e.removeFromParent();
      });
    }

    function lightMapToGainmap(obj: THREE.Object3D) {
      const mesh = obj as THREE.Mesh;
      if (mesh.material) {
        console.log(mesh.name, mesh.material);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const clonedMat = mat.clone();
        const lm = clonedMat.lightMap;
        if (lm) {
          if (lm.vUserData.gainMap) {
            console.log('has GainMap');
            // 기존 Material 날라가는 것 방지로 clonedMat 이용
            clonedMat.vUserData.gainMap = lm.vUserData.gainMap;
            clonedMat.vUserData.gainMapIntensity = mat.lightMapIntensity;
            clonedMat.lightMap = null;
            mesh.material = clonedMat;
          } else if (lm.vUserData.mimeType === 'image/ktx2') {
            // Remove Light map from ktx2
            console.log('has KTX2 LightMap');
            clonedMat.lightMap = null;
            clonedMat.vUserData.lightMapIntensity = clonedMat.lightMapIntensity;
            mesh.material = clonedMat;
          }
        }
      }
    }

    // TODO Traverse 합치기
    if (Array.isArray(input)) {
      const clonedArr = input.map(i => i.clone());
      for (const obj of clonedArr) {
        filterNotModelObjects(obj);
        obj.traverseAll(lightMapToGainmap);
        // obj.traverse(lightMapToEmissive);
      }
      return clonedArr;
    } else {
      const cloned = input.clone();
      console.log(cloned);
      filterNotModelObjects(cloned);
      cloned.traverseAll(lightMapToGainmap);
      // cloned.traverse(lightMapToEmissive);
      return cloned;
    }
  }
}
