import { GLTFExporter } from 'three/examples/jsm/Addons.js';
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
  }

  parse(
    input: THREE.Object3D | THREE.Object3D[],
    onDone: (gltf: ArrayBuffer | { [key: string]: any }) => void,
    onError: (error: ErrorEvent) => void,
    options?: GLTFExporterOptions,
  ): void {
    const cloned = this.onBeforeParse(input);
    super.parse(cloned, onDone, onError, options);
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

        // 이미 매핑 됐으면 패스
        if (!material.userData.isEmissiveLightMap && material.lightMap) {
          const clonedMat = material.clone();
          clonedMat.emissiveMap = clonedMat.lightMap;
          clonedMat.userData.isEmissiveLightMap = true;
          clonedMat.userData.lightMapIntensity = clonedMat.lightMapIntensity;
          clonedMat.needsUpdate = true;
          mesh.material = clonedMat;
        }
      }
    }

    if (Array.isArray(input)) {
      const clonedArr = input.map(i => i.clone());
      for (const obj of clonedArr) {
        obj.traverse(lightMapToEmissive);
      }
      return clonedArr;
    } else {
      const cloned = input.clone();
      cloned.traverse(lightMapToEmissive);
      return cloned;
    }
  }
}
