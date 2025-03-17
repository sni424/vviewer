import { useThree } from '@react-three/fiber';
import { useAtom, useAtomValue } from 'jotai';
import { useRef } from 'react';
import {
  panelTabAtom,
  roomAtom,
  threeExportsAtom,
  wallAtom,
} from '../../scripts/atoms';
import { Mesh, THREE } from '../../scripts/VTHREE';

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

function Walls() {
  const threeExports = useAtomValue(threeExportsAtom);
  const [walls, setRooms] = useAtom(wallAtom);

  const tab = useAtomValue(panelTabAtom);
  const isWallTab = tab === 'wall';

  if (!isWallTab) {
    return null;
  }

  if (!threeExports) {
    return;
  }

  const isCreating = walls.some(wall => !Boolean(wall.end));
  const shows = walls.filter(wall => wall.show);

  return (
    <>
      {isCreating && <XZPlane></XZPlane>}
      {shows.map((wall, i) => {
        const index = i;
        const total = shows.length;
        const colorHsl = new THREE.Color();
        colorHsl.setHSL(index / total, 1, 0.5);

        const { start, end } = wall;

        if (Boolean(start) && !Boolean(end)) {
          // draw a sphere
          const geometry = new THREE.SphereGeometry(0.1, 32, 32);
          const material = new THREE.MeshBasicMaterial({ color: colorHsl });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.copy(start);

          return (
            <primitive object={sphere} key={`canvas-wall-${i}`}></primitive>
          );
        }

        if (Boolean(start) && Boolean(end)) {
          // draw a line
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array([...start, ...end]), 3),
          );
          const material = new THREE.LineBasicMaterial({ color: colorHsl });
          const line = new THREE.Line(geometry, material);

          return <primitive object={line} key={`canvas-wall-${i}`}></primitive>;
        }
        return null;
      })}
    </>
  );
}

export default Walls;
