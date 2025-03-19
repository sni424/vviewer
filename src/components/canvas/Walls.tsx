import { useThree } from '@react-three/fiber';
import { useAtom, useAtomValue } from 'jotai';
import { useRef } from 'react';
import {
  panelTabAtom,
  roomAtom,
  threeExportsAtom,
  wallAtom,
  WallCreateOption,
} from '../../scripts/atoms';
import { getWallPoint } from '../../scripts/utils';
import * as THREE from '../../scripts/VTHREE';

interface MarkerProps {
  position: [number, number, number][];
}

const XZPlane: React.FC = () => {
  const [rooms, setRooms] = useAtom(roomAtom);
  const meshRef = useRef<Mesh>(null);
  const { camera, raycaster } = useThree();

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

function WallCreating({ wallInfo }: { wallInfo: WallCreateOption }) {
  const creating = wallInfo.creating;
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const XZPlaneRef = useRef<THREE.Plane>(
    new THREE.Plane(new THREE.Vector3(0, 1, 0)),
  );
  const threeExports = useAtomValue(threeExportsAtom);

  if (!creating || !threeExports || !creating.mouse) {
    return null;
  }

  const { mouse: mouseEvent, cmd } = creating;

  const raycaster = raycasterRef.current;
  const XZPlane = XZPlaneRef.current;

  const calcPlaneIntersection = () => {
    const { scene, camera } = threeExports;
    const mouse = new THREE.Vector2();
    const rect = mouseEvent.rect;
    const xRatio = (mouseEvent.x - rect.left) / rect.width;
    const yRatio = (mouseEvent.y - rect.top) / rect.height;

    mouse.x = xRatio * 2 - 1;
    mouse.y = -yRatio * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(XZPlane, intersection);

    // Return ray origin and intersection point
    return intersection;
  };

  const planeIntersection = calcPlaneIntersection();

  return (
    <>
      <mesh position={planeIntersection}>
        <sphereGeometry args={[0.07, 32, 32]}></sphereGeometry>
        <meshBasicMaterial color={0xff0000}></meshBasicMaterial>
      </mesh>
    </>
  );

  // const sphere = new THREE.Mesh(
  //   new THREE.SphereGeometry(0.1, 32, 32),
  //   new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  // );
  // sphere.position.copy(planeIntersectionPoint);
}

function Walls() {
  const threeExports = useAtomValue(threeExportsAtom);
  const [wallInfo, setWalls] = useAtom(wallAtom);

  const tab = useAtomValue(panelTabAtom);
  const isWallTab = tab === 'wall';

  if (!isWallTab) {
    return null;
  }

  if (!threeExports) {
    return;
  }

  const creating = wallInfo.creating;

  // const isCreating = walls.some(wall => !Boolean(wall.end));
  // const shows = walls.filter(wall => wall.show);

  // return (
  //   <>
  //     {isCreating && <XZPlane></XZPlane>}
  //     {shows.map((wall, i) => {
  //       const index = i;
  //       const total = shows.length;
  //       const colorHsl = new THREE.Color();
  //       colorHsl.setHSL(index / total, 1, 0.5);

  //       const { start, end } = wall;

  //       if (Boolean(start) && !Boolean(end)) {
  //         // draw a sphere
  //         const geometry = new THREE.SphereGeometry(0.1, 32, 32);
  //         const material = new THREE.MeshBasicMaterial({ color: colorHsl });
  //         const sphere = new THREE.Mesh(geometry, material);
  //         sphere.position.copy(start);

  //         return (
  //           <primitive object={sphere} key={`canvas-wall-${i}`}></primitive>
  //         );
  //       }

  //       if (Boolean(start) && Boolean(end)) {
  //         // draw a line
  //         const geometry = new THREE.BufferGeometry();
  //         geometry.setAttribute(
  //           'position',
  //           new THREE.BufferAttribute(new Float32Array([...start, ...end]), 3),
  //         );
  //         const material = new THREE.LineBasicMaterial({ color: colorHsl });
  //         const line = new THREE.Line(geometry, material);

  //         return <primitive object={line} key={`canvas-wall-${i}`}></primitive>;
  //       }
  //       return null;
  //     })}
  //   </>
  // );
  return (
    <>
      {creating && <WallCreating wallInfo={wallInfo}></WallCreating>}
      {wallInfo.points
        .filter(p => p.show)
        .map((pointView, i) => {
          const { point, color, id, show } = pointView;
          const pos = new THREE.Vector3(point.x, 0, point.y);

          return (
            <mesh key={`wall-point-view-${id}`} position={pos}>
              <sphereGeometry args={[0.05, 32, 32]}></sphereGeometry>
              <meshBasicMaterial color={color}></meshBasicMaterial>
            </mesh>
          );
        })}
      {wallInfo.walls
        .filter(wall => wall.show)
        .map((wallVie, i) => {
          const points = wallInfo.points;
          const { start: _start, end: _end, color, id, show } = wallVie;
          const startPoint = getWallPoint(_start, points)!;
          const endPoint = getWallPoint(_end, points)!;
          const start = startPoint.point;
          const end = endPoint.point;

          const posStart = new THREE.Vector3(start.x, 0, start.y);
          const posEnd = new THREE.Vector3(end.x, 0, end.y);

          // draw a line
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
              new Float32Array([...posStart.toArray(), ...posEnd.toArray()]),
              3,
            ),
          );
          const material = new THREE.LineBasicMaterial({ color });
          const line = new THREE.Line(geometry, material);

          return (
            <primitive object={line} key={`canvas-wall-${id}`}></primitive>
          );
        })}
    </>
  );
}

export default Walls;
