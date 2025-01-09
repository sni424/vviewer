import { useThree } from '@react-three/fiber';
import { useAtom, useAtomValue } from 'jotai';
import { Fragment, useRef } from 'react';
import { roomColor } from '../../Constants';
import { panelTabAtom, roomAtom, threeExportsAtom } from '../../scripts/atoms';
import { createClosedConcaveSurface, PointXZ } from '../../scripts/utils';
import { Mesh, Vector3 } from '../../scripts/VTHREE';

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
        const points: PointXZ[] = room.border.map(border => ({
          x: border[0],
          z: border[1],
        }));
        const surface =
          points.length > 2
            ? createClosedConcaveSurface(points, roomColor(room.index))
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
