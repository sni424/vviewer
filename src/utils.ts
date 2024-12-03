import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export const groupInfo = (group: THREE.Group | GLTF) => {
    // triangle, vertices, mesh count
    const scene = group.scene ?? group;
    let triangleCount = 0;
    let vertexCount = 0;
    let meshCount = 0;
    let object3dCount = 0;
    let nodeCount = 0;
    scene.traverse((node: THREE.Object3D) => {
        if (node.type === "BoxHelper") {
            return;
        }
        if (node instanceof THREE.Mesh) {
            const geometry = node.geometry;
            if (geometry instanceof THREE.BufferGeometry) {
                triangleCount += geometry.index!.count / 3;
                vertexCount += geometry.attributes.position.count;
                meshCount++;
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