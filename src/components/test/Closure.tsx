import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { Environment, OrbitControls } from '@react-three/drei';
import { LineGeometry } from 'three/examples/jsm/Addons.js';

import * as THREE from 'three';
import { mainCameraPosAtom, mainCameraProjectedAtom, threeExportsAtom } from '../../scripts/atoms';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import TopView from '../canvas/FloatingTopView';
import Grid from '../canvas/Grid';

type Point = { x: number, y: number };

const samplePoints: Point[] = [
    { x: 0, y: 0 },
    { x: 3, y: 1 },
    { x: 4, y: 0 },
    { x: 3, y: 4 },
    { x: 1, y: 1 },
    { x: 2, y: 4 }
];

const sampleTests: Point[] = [
    { x: 0.5, y: 0.5 },
    { x: 3, y: 3 },
    { x: 2, y: 2 },
    { x: 3.1, y: 2 },
    { x: 1.1, y: 2 },
    { x: 2, y: 3 }
];

function _isPointOnLineSegment(p: Point, v1: Point, v2: Point): boolean {
    const crossProduct = (p.y - v1.y) * (v2.x - v1.x) - (p.x - v1.x) * (v2.y - v1.y);
    if (Math.abs(crossProduct) > 1e-10) return false; // Not on the line
    const dotProduct = (p.x - v1.x) * (v2.x - v1.x) + (p.y - v1.y) * (v2.y - v1.y);
    if (dotProduct < 0) return false; // Before the segment
    const squaredLength = (v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2;
    return dotProduct <= squaredLength; // After the segment
}

function _isPointInsidePolygon(point: Point, polygon: Point[]): boolean {
    let count = 0;
    const { x, y } = point;

    for (let i = 0; i < polygon.length; i++) {
        const vertex1 = polygon[i];
        const vertex2 = polygon[(i + 1) % polygon.length];

        // Check if the point lies exactly on the edge
        if (_isPointOnLineSegment(point, vertex1, vertex2)) {
            return true; // Point is on the edge
        }

        if ((vertex1.y > y) !== (vertex2.y > y)) {
            const intersectX = (vertex2.x - vertex1.x) * (y - vertex1.y) / (vertex2.y - vertex1.y) + vertex1.x;
            if (x < intersectX) {
                count++;
            }
        }
    }

    return count % 2 === 1; // Odd number of crossings = inside
}

function _TestPage() {

    return (
        <div>
            {sampleTests.map((test, i) => {
                return <div>{i + 1}. {_isPointInsidePolygon(test, samplePoints) ? "true" : "false"}</div>
            })}
        </div>
    )
}


interface MarkerProps {
    position: [number, number, number][];
}


interface Point2D {
    x: number;
    z: number;
}

export function createClosedConcaveSurface(
    points: Point2D[],
    y: number
): THREE.Mesh {

    if (points.length < 3) {
        throw new Error('At least three points are required to create a closed surface.');
    }

    // xz 평면에서 생성했지만 shape은 xy기준으로 생성되므로
    // 생성 수 마지막에 geometry.rotateX(Math.PI / 2)를 호출하여 xz평면으로 변환

    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].z);
    points.slice(1).forEach(point => {
        shape.lineTo(point.x, point.z);
    });
    shape.closePath();


    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);

    // 이 때 바깥쪽을 보고 있으므로 Material에서 더블사이드로 설정
    const material = new THREE.MeshStandardMaterial({ color: 0x44aa88, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

export function createMeshesFromPoints(
    points: Point2D[],
    minY: number,
    maxY: number
): {
    verticalSurfaces: THREE.Mesh,
    topFace: THREE.Mesh,
    bottomFace: THREE.Mesh,
    closureFace: THREE.Mesh
} {

    if (points.length < 2) {
        throw new Error('At least two points are required to create a mesh.');
    }

    const createBufferGeometry = (vertices: number[], indices: number[]) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    };

    const createMesh = (geometry: THREE.BufferGeometry) => {
        // const material = new THREE.MeshStandardMaterial({ color: 0x44aa88, side: THREE.DoubleSide });
        // return new THREE.Mesh(geometry, material);
        return new THREE.Mesh(geometry);
    };

    // Vertical surfaces
    const verticalVertices: number[] = [];
    const verticalIndices: number[] = [];

    points.forEach((point, i) => {
        verticalVertices.push(point.x, minY, point.z); // Lower vertex
        verticalVertices.push(point.x, maxY, point.z); // Upper vertex
    });

    for (let i = 0; i < points.length - 1; i++) {
        const lowerLeft = i * 2;
        const upperLeft = i * 2 + 1;
        const lowerRight = (i + 1) * 2;
        const upperRight = (i + 1) * 2 + 1;
        verticalIndices.push(lowerLeft, upperLeft, lowerRight);
        verticalIndices.push(upperLeft, upperRight, lowerRight);
    }

    const verticalSurfaces = createMesh(createBufferGeometry(verticalVertices, verticalIndices));

    // Bottom face
    // const bottomVertices: number[] = [];
    // const bottomIndices: number[] = [];
    // points.forEach((point) => {
    //     bottomVertices.push(point.x, minY, point.z);
    // });
    // // bottomVertices.push(0, minY, 0);
    // points.forEach((_, i) => {
    //     bottomIndices.push(0, i, (i + 1) % points.length);
    // });
    // const bottomFace = createMesh(createBufferGeometry(bottomVertices, bottomIndices));
    const bottomFace = createClosedConcaveSurface(points, minY);

    // Top face
    // const topVertices: number[] = [];
    // const topIndices: number[] = [];
    // points.forEach((point) => {
    //     topVertices.push(point.x, maxY, point.z);
    // });
    // points.forEach((_, i) => {
    //     topIndices.push(0, (i + 1) % points.length, i);
    // });
    // const topFace = createMesh(createBufferGeometry(topVertices, topIndices));
    const topFace = createClosedConcaveSurface(points, maxY);

    // Closure face (connect last point back to first point)
    const closureVertices: number[] = [];
    const closureIndices: number[] = [];
    const lastIndex = points.length - 1;
    closureVertices.push(points[lastIndex].x, minY, points[lastIndex].z);
    closureVertices.push(points[lastIndex].x, maxY, points[lastIndex].z);
    closureVertices.push(points[0].x, minY, points[0].z);
    closureVertices.push(points[0].x, maxY, points[0].z);
    closureIndices.push(0, 1, 2);
    closureIndices.push(1, 3, 2);
    const closureFace = createMesh(createBufferGeometry(closureVertices, closureIndices));

    return {
        verticalSurfaces,
        topFace,
        bottomFace,
        closureFace
    };
}
// Example usage
const points: Point2D[] = [
    { x: -5, z: -5 },
    { x: -3, z: 2 },
    { x: 0, z: 5 },
    { x: 3, z: 2 },
    { x: 5, z: -5 }
];

const minY = -2;
const maxY = 2;

// Add this mesh to your scene
// scene.add(mesh);


const Marker: React.FC<MarkerProps> = ({ position }) => {

    if (position.length < 3) {
        return null;
    }

    const minY = 0;
    const maxY = 2;

    const points = position.map(([x, y, z]) => ({ x, z }));
    const { verticalSurfaces, bottomFace, topFace, closureFace } = createMeshesFromPoints(points, minY, maxY);
    verticalSurfaces.material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    verticalSurfaces.material.side = THREE.DoubleSide;
    (verticalSurfaces.material as THREE.MeshStandardMaterial).wireframe = true;
    bottomFace.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    bottomFace.material.side = THREE.DoubleSide;
    // (bottomFace.material as THREE.MeshStandardMaterial).wireframe = true;
    topFace.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    topFace.material.side = THREE.DoubleSide;
    // (topFace.material as THREE.MeshStandardMaterial).wireframe = true;
    topFace.material.transparent = true;
    topFace.material.opacity = 0.5
    closureFace.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    (closureFace.material as THREE.MeshStandardMaterial).wireframe = true;
    return <>
        <mesh>
            <primitive object={verticalSurfaces} />
        </mesh>
        <mesh>
            <primitive object={bottomFace} />
        </mesh>
        <mesh>
            <primitive object={topFace} />
        </mesh>
        <mesh>
            <primitive object={closureFace} />
        </mesh>
    </>
};

const markerPositionAtom = atom<[number, number, number][]>([]);

const XZPlane: React.FC = () => {
    const meshRef = useRef<Mesh>(null);
    const { raycaster } = useThree();
    const [markerPosition, setMarkerPosition] = useAtom(markerPositionAtom);

    const handlePointerDown = (event: any) => {
        event.stopPropagation();

        if (!meshRef.current) return;

        const intersects = raycaster.intersectObject(meshRef.current);
        if (intersects.length > 0) {
            const { point } = intersects[0];
            setMarkerPosition(prev => [...prev, [point.x, point.y, point.z]]);
        }
    };

    return (
        <>
            <mesh
                ref={meshRef}
                rotation={[-Math.PI / 2, 0, 0]} // Rotates plane to XZ
                onPointerDown={handlePointerDown}
            >
                <planeGeometry args={[10000, 10000]} />
                <meshStandardMaterial color="lightblue" side={0} opacity={0.0} transparent={true} />
            </mesh>
            {markerPosition && <Marker position={markerPosition} />}
        </>
    );
};

const isInsideAtom = atom<boolean>(false);

const TheScene = () => {
    const threeExports = useThree();
    const setThreeExports = useSetAtom(threeExportsAtom);
    const markerPosition = useAtomValue(markerPositionAtom);
    const setIsInside = useSetAtom(isInsideAtom);
    const setCameraPosAtom = useSetAtom(mainCameraPosAtom);

    useEffect(() => {
        setThreeExports(threeExports);
    }, []);

    return <>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <XZPlane />
        <OrbitControls makeDefault onChange={e => {
            const pos = e?.target.object.position;
            if (!pos) {
                return;
            }


            const x = pos.x;
            const z = pos.z;
            // setCameraPosAtom([x,z]);
            setCameraPosAtom(pos);
            // console.log(x, z)
            const markers = markerPosition.map(([x, y, z]) => ({ x, z }));
            const isInside = isPointInsidePolygon({ x, z }, markers);
            setIsInside(isInside);


        }} />
        <Environment files={"https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/dancing_hall_1k.hdr"}>
        </Environment></>
}

function isPointOnLineSegment(p: Point2D, v1: Point2D, v2: Point2D): boolean {
    const crossProduct = (p.z - v1.z) * (v2.x - v1.x) - (p.x - v1.x) * (v2.z - v1.z);
    if (Math.abs(crossProduct) > 1e-10) return false; // Not on the line
    const dotProduct = (p.x - v1.x) * (v2.x - v1.x) + (p.z - v1.z) * (v2.z - v1.z);
    if (dotProduct < 0) return false; // Before the segment
    const squaredLength = (v2.x - v1.x) ** 2 + (v2.z - v1.z) ** 2;
    return dotProduct <= squaredLength; // After the segment
}

function isPointInsidePolygons(point: Point2D, polygons: Point2D[][]): number | undefined {
    // return index of the first polygon that contains the point, or undefined when not found
    for (let i = 0; i < polygons.length; i++) {
        if (isPointInsidePolygon(point, polygons[i])) {
            return i;
        }
    }

}

function isPointInsidePolygon(point: Point2D, polygon: Point2D[]): boolean {
    if (polygon.length < 3) {
        return false;
    }

    let count = 0;
    const { x, z } = point;

    for (let i = 0; i < polygon.length; i++) {
        const vertex1 = polygon[i];
        const vertex2 = polygon[(i + 1) % polygon.length];

        // Check if the point lies exactly on the edge
        if (isPointOnLineSegment(point, vertex1, vertex2)) {
            return true; // Point is on the edge
        }

        if ((vertex1.z > z) !== (vertex2.z > z)) {
            const intersectX = (vertex2.x - vertex1.x) * (z - vertex1.z) / (vertex2.z - vertex1.z) + vertex1.x;
            if (x < intersectX) {
                count++;
            }
        }
    }

    return count % 2 === 1; // Odd number of crossings = inside
}


const Closure: React.FC = () => {
    const [canvasX, setCanvasX] = useState(0);
    const isInside = useAtomValue(isInsideAtom);
    const mainCameraProjected = useAtomValue(mainCameraProjectedAtom);


    return (
        <div style={{ width: "100dvw", height: "100dvh", position: "relative" }}>
            <Canvas
                camera={{ position: [5, 5, 5], fov: 50 }}
                onCreated={({ gl }) => gl.setClearColor('#a0a0a0')}
            >
                <TheScene></TheScene>
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[0.1, 32, 32]} />
                    <meshBasicMaterial color="red" />
                </mesh>
                <mesh position={[5, 0, 0]}>
                    <sphereGeometry args={[0.1, 32, 32]} />
                    <meshBasicMaterial color="blue" />
                </mesh>
                <mesh position={[-5, 0, 0]}>
                    <sphereGeometry args={[0.1, 32, 32]} />
                    <meshBasicMaterial color="green" />
                </mesh>
                {[[5, 5], [-5, 5], [-5, -5], [5, -5]].map(pos => {
                    return <mesh position={[pos[0], 0, pos[1]]}>
                        <sphereGeometry args={[0.1, 32, 32]} />
                    </mesh>
                })}
            </Canvas>
            <div style={{ width: 200, height: 200, position: "absolute", top: 10, left: 10, zIndex: 20, backgroundColor: "red", transform: `translate(${canvasX}px, 0px)`, overflow: "hidden" }}>
                {/* <Canvas>
                    <TopView></TopView>
                </Canvas> */}
                <TopView></TopView>
                {mainCameraProjected && <div style={{
                    position: "absolute",
                    width: 10,
                    height: 10,
                    top: 0, left: 0,
                    backgroundColor: "red",
                    borderRadius: "50%",
                    border: "1px solid white",
                    transform: `translate(${mainCameraProjected[0]}px, ${mainCameraProjected[1]}px
                    )`
                }}></div>}
            </div>
            <div style={{ position: "absolute", top: 10, right: 10, padding: 8, backgroundColor: isInside ? "green" : "red", color: "white" }}>Is Inside : {isInside ? "O" : "X"}</div>
        </div>

    );
};

export default Closure;


// export default TestPage