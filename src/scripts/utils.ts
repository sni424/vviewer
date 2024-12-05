import { RootState } from '@react-three/fiber';
import { get, set } from 'idb-keyval';

import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from "./VTHREE";
// import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

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

export const cacheLoadModel = async (url: string): Promise<Blob> => {
    return get(url).then(data => {
        if (!data) {
            return fetch(url).then(res => res.blob()).then(data => {
                return set(url, data).then(_ => {
                    return data
                })
            })
        }
        return data;
    })
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