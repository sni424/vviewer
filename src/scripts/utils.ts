import { RootState } from '@react-three/fiber';
import { get, set } from 'idb-keyval';

import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from "./VTHREE";
import pako from 'pako';
import { FileInfo } from '../types';
import objectHash from 'object-hash';


export const groupInfo = (group: THREE.Group | { scene: THREE.Group } | THREE.Scene | THREE.Object3D) => {
    // triangle, vertices, mesh count
    const scene = ((group as GLTF).scene ?? group) as THREE.Group;
    let triangleCount = 0;
    let vertexCount = 0;
    let meshCount = 0;
    let object3dCount = 0;
    let nodeCount = 0;
    scene.traverse((node: THREE.Object3D) => {
        if (node.isSystemGenerated()) {
            return;
        }

        // if (isGizmo(node)) {
        //     return;
        // }

        // if (node.type === "BoxHelper") {
        //     return;
        // }
        if (node instanceof THREE.Mesh) {
            try {

                const geometry = node.geometry;
                if (geometry instanceof THREE.BufferGeometry) {
                    triangleCount += geometry.index!.count / 3;
                    vertexCount += geometry.attributes.position.count;
                    meshCount++;
                }
            } catch (e) {
                console.error(e);
                debugger;
            }
        }
        if (node instanceof THREE.Object3D) {
            object3dCount++;
        }
        nodeCount++;
    });
    return { triangleCount, vertexCount, meshCount, nodeCount, object3dCount };

}

export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
}

export const toNthDigit = (num: number, digit: number): string => {

    const isNegative = num < 0;
    const positivePart = Math.abs(num);

    // add dot with pad
    const multiplied = Math.round(positivePart * Math.pow(10, digit));
    const padded = multiplied.toString().padStart(digit, '0');
    const integerPart = padded.slice(0, -digit);
    const decimalPart = padded.slice(-digit);

    return `${isNegative ? '-' : ''}${integerPart.length === 0 ? "0" : integerPart}.${decimalPart}`;


}

export const getIntersects = (
    e: React.MouseEvent,
    threeExports: RootState | null,
    raycaster: THREE.Raycaster = new THREE.Raycaster(),
    filterUserdataIgnoreRaycast = true, // Object3D.userData.ignoreRayCast가 true인 아이들은 무시
) => {

    if (!threeExports) {
        console.error(
            'Three가 셋업되지 않은 상태에서 Intersect가 불림 @useEditorInputEvents',
        );
        return {
            intersects: [],
            mesh: [],
            otherUserCameras: [],
            review: [],
        };
    }
    const { scene, camera } = threeExports;
    const mouse = new THREE.Vector2();
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    mouse.x = xRatio * 2 - 1;
    mouse.y = -yRatio * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const dstObjects = filterUserdataIgnoreRaycast
        ? scene.children.filter(
            obj => !obj.getUserData().ignoreRaycast && !obj.isTransformControl() && !obj.isBoxHelper(),
        )
        : scene.children;
    const intersects = raycaster.intersectObjects(dstObjects, true) as THREE.Intersection[];

    const mesh = intersects.filter(obj => obj.object.type === 'Mesh') as THREE.Intersection<THREE.Mesh>[];

    return { intersects, mesh };
};

export const saveScene = async (scene: THREE.Scene) => {
    return new Promise(async (resolve, reject) => {
        const json = scene.toJSON();
        const key = "savedScene";

        set(key, json).then(() => {
            resolve(true);
            return true;
        }).catch(e => {
            console.error(e);
            reject(false);
        })

    });
}

export const loadScene = async (): Promise<THREE.Object3D | undefined> => {
    return new Promise(async (resolve, reject) => {
        const key = "savedScene";
        get(key).then((json) => {
            if (!json) {
                reject(undefined);
                return;
            }
            const loader = new THREE.ObjectLoader();
            const scene = loader.parse(json);
            resolve(scene);
        }).catch(e => {
            console.error(e);
            reject(undefined);
        })
    });
}


export function compressObjectToFile(obj: object, fileName: string): File {

    // Convert the object to a JSON string
    const jsonString = JSON.stringify(obj);

    // Compress the JSON string using pako
    const compressed = pako.gzip(jsonString);

    // Create a Blob from the compressed data
    const blob = new Blob([compressed], { type: 'application/gzip' });

    // Return a File instance
    return new File([blob], fileName, { type: 'application/gzip' });
}

export async function decompressFileToObject<T = any>(url: string): Promise<T> {
    return fetch(url).then(res => res.arrayBuffer()).then(buffer => {
        const decompressed = pako.ungzip(buffer, { to: 'string' });
        return JSON.parse(decompressed) as T
    })
}

export async function cached(file: FileInfo): Promise<boolean> {
    return get(objectHash(file)).then(data => {
        return Boolean(data);
    })
}

export async function loadFile(file: FileInfo): Promise<Blob> {
    const hash = objectHash(file);
    return get(hash).then(data => {
        if (!data) {
            return fetch(file.fileUrl).then(res => res.blob()).then(data => {
                return set(hash, data).then(_ => {
                    return data
                });
            })
        }
        return data;
    })
}