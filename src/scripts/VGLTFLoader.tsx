import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as THREE from '../scripts/VTHREE.ts';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export default class VGLTFLoader extends GLTFLoader {
    constructor(manager?: THREE.LoadingManager) {
        super(manager);
        
        //DRACO
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        this.setDRACOLoader(dracoLoader);
        
        //KTX2
        const ktx2loader = new KTX2Loader();
        ktx2loader.setTranscoderPath(
            'https://unpkg.com/three@0.168.0/examples/jsm/libs/basis/',
        );
        this.setKTX2Loader(ktx2loader);
        
        // MeshOptimizer
        this.setMeshoptDecoder(MeshoptDecoder);
        return this;
    }
    
    parse(
        data: ArrayBuffer | string,
        path: string,
        onLoad: (gltf: GLTF) => void,
        onError?: (event: ErrorEvent) => void,
    ): void {
        function customOnLoad(gltf: GLTF) {
            const scene = gltf.scene;
            scene.traverse((object: THREE.Object3D) => {
                if ('isMesh' in object) {
                    const mesh = object as THREE.Mesh;
                    const material = mesh.material as THREE.MeshStandardMaterial;
                    if (material.userData.isEmissiveLightMap) {
                        const emissiveMap = material.emissiveMap;
                        if (emissiveMap) {
                            if (emissiveMap.channel !== 1) {
                                emissiveMap.channel = 1;
                            }
                            emissiveMap.colorSpace = ''
                            material.lightMap = emissiveMap.clone();
                            material.lightMapIntensity = material.userData.lightMapIntensity;
                            material.emissiveMap = null;
                            material.needsUpdate = true;
                            console.log(material);
                        }
                    }
                }
            });
            onLoad(gltf);
        }
        super.parse(data, path, customOnLoad, onError);
    }
}
