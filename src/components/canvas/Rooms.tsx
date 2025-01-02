import { useThree } from '@react-three/fiber';
import { atom, useAtom, useAtomValue } from 'jotai';
import { Fragment, useRef } from 'react';
import { Layer, roomColor } from '../../Constants';
import { panelTabAtom, roomAtom, threeExportsAtom } from '../../scripts/atoms';
import { Mesh, THREE, Vector3 } from '../../scripts/VTHREE';

interface MarkerProps {
  position: [number, number, number][];
}

interface Point2D {
  x: number;
  z: number;
}

export function createClosedConcaveSurface(
  points: Point2D[],
  // y: number,
  color?: number,
): THREE.Mesh {
  if (points.length < 3) {
    throw new Error(
      'At least three points are required to create a closed surface.',
    );
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
  const material = new THREE.MeshStandardMaterial({
    emissive: color ?? 0x3333cc,
    emissiveIntensity: 1.0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.layers.disableAll();
  mesh.layers.enable(Layer.Room);

  return mesh;
}

export function createMeshesFromPoints(
  points: Point2D[],
  minY: number,
  maxY: number,
): {
  verticalSurfaces: THREE.Mesh;
  topFace: THREE.Mesh;
  bottomFace: THREE.Mesh;
  closureFace: THREE.Mesh;
} {
  if (points.length < 2) {
    throw new Error('At least two points are required to create a mesh.');
  }

  const createBufferGeometry = (vertices: number[], indices: number[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
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

  const verticalSurfaces = createMesh(
    createBufferGeometry(verticalVertices, verticalIndices),
  );

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
  const bottomFace = createClosedConcaveSurface(points);

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
  const topFace = createClosedConcaveSurface(points);

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
  const closureFace = createMesh(
    createBufferGeometry(closureVertices, closureIndices),
  );

  return {
    verticalSurfaces,
    topFace,
    bottomFace,
    closureFace,
  };
}

const Marker: React.FC<MarkerProps> = ({ position }) => {
  if (position.length < 3) {
    return null;
  }

  const minY = 0;
  const maxY = 2;

  const points = position.map(([x, y, z]) => ({ x, z }));
  const { verticalSurfaces, bottomFace, topFace, closureFace } =
    createMeshesFromPoints(points, minY, maxY);
  verticalSurfaces.material = new THREE.MeshStandardMaterial({
    color: 0x0000ff,
  });
  verticalSurfaces.material.side = THREE.DoubleSide;
  (verticalSurfaces.material as THREE.MeshStandardMaterial).wireframe = true;
  bottomFace.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  bottomFace.material.side = THREE.DoubleSide;
  // (bottomFace.material as THREE.MeshStandardMaterial).wireframe = true;
  topFace.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  topFace.material.side = THREE.DoubleSide;
  // (topFace.material as THREE.MeshStandardMaterial).wireframe = true;
  topFace.material.transparent = true;
  topFace.material.opacity = 0.5;
  closureFace.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  (closureFace.material as THREE.MeshStandardMaterial).wireframe = true;
  return (
    <>
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
  );
};

const markerPositionAtom = atom<[number, number, number][]>([]);
const XZPlane: React.FC = () => {
  const [rooms, setRooms] = useAtom(roomAtom);
  const meshRef = useRef<Mesh>(null);
  const { raycaster } = useThree();

  // const [markerPosition, setMarkerPosition] = useAtom(markerPositionAtom);

  const isCreating = rooms.some(room => Boolean(room.creating));
  if (!isCreating) {
    return null;
  }

  const handlePointerDown = (event: any) => {
    event.stopPropagation();

    if (!meshRef.current) return;

    const intersects = raycaster.intersectObject(meshRef.current);
    console.log('here');
    if (intersects.length > 0) {
      const { point } = intersects[0];
      setRooms(prev => {
        const newRooms = [...prev];
        newRooms
          .find(room => Boolean(room.creating))!
          .border!.push([point.x, point.z]);
        return newRooms;
      });
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
        <meshStandardMaterial
          color="lightblue"
          side={0}
          opacity={0.0}
          transparent={true}
        />
      </mesh>
      {/* {markerPosition && <Marker position={markerPosition} />} */}
    </>
  );
};

function Rooms() {
  const threeExports = useAtomValue(threeExportsAtom);
  const [rooms, setRooms] = useAtom(roomAtom);

  const tab = useAtomValue(panelTabAtom);
  const isRoomTab = tab === 'room';

  if (!isRoomTab) {
    return null;
  }

  if (!threeExports) {
    return;
  }

  const isCreating = rooms.some(room => Boolean(room.border));
  const shows = rooms.filter(room => room.show);

  return (
    <>
      {isCreating && <XZPlane></XZPlane>}
      {shows.map((room, i) => {
        const points: Point2D[] = room.border.map(border => ({
          x: border[0],
          z: border[1],
        }));
        const surface =
          points.length > 2
            ? createClosedConcaveSurface(points, roomColor(i))
            : null;
        return (
          <Fragment key={`canvas-room-${i}`}>
            {surface && (
              <mesh position={new Vector3(0, 0.001, 0)}>
                <primitive object={surface}></primitive>
              </mesh>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export default Rooms;
