import { useThree } from '@react-three/fiber';
import { useAtom, useAtomValue } from 'jotai';
import { Fragment, useRef } from 'react';
import { Mesh, Vector3 } from 'VTHREE';
import { newRoomColorString } from '../../Constants';
import {
  newRoomAtom,
  panelTabAtom,
  roomAtom,
  threeExportsAtom,
} from '../../scripts/atoms';
import { createClosedConcaveSurface, PointXZ } from '../../scripts/utils';

interface MarkerProps {
  position: [number, number, number][];
}

const XZPlane: React.FC = () => {
  const [newRooms, setNewRooms] = useAtom(newRoomAtom);
  // const [rooms, setRooms] = useAtom(roomAtom);
  const meshRef = useRef<Mesh>(null);
  const { camera, raycaster } = useThree();
  const isCreating = newRooms.some(
    room =>
      room.roomInfo &&
      room.roomInfo.length > 0 &&
      room.roomInfo.some(child => child.creating),
  );
  // const isCreating = rooms.some(room => Boolean(room.creating));
  if (!isCreating) {
    return null;
  }

  const handlePointerDown = (event: any) => {
    event.stopPropagation();

    if (!meshRef.current) return;

    const intersects = raycaster.intersectObject(meshRef.current);

    // console.log('here');
    if (intersects.length > 0) {
      const { point } = intersects[0];

      setNewRooms(prev => {
        const newRooms = [...prev];
        // creating이 true인 roomInfo를 가진 room 찾기
        const room = newRooms.find(child =>
          child.roomInfo.some(data => data.creating),
        );
        if (room) {
          const target = room.roomInfo.find(data => data.creating);
          if (target) {
            // border가 없으면 초기화
            if (!target.border) target.border = [];
            target.border.push([point.x, point.z]);
          }
        }
        return newRooms;
      });
      // setRooms(prev => {
      //   const newRooms = [...prev];
      //   newRooms
      //     .find(room => Boolean(room.creating))!
      //     .border!.push([point.x, point.z]);
      //   return newRooms;
      // });
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
  const [newRooms, setNewRooms] = useAtom(newRoomAtom);

  const tab = useAtomValue(panelTabAtom);
  const isRoomTab = tab === 'room';

  if (!isRoomTab) {
    return null;
  }

  if (!threeExports) {
    return;
  }

  console.log('newRooms', newRooms);

  const { scene } = threeExports;

  const isCreating = newRooms.some(
    room =>
      room.roomInfo &&
      room.roomInfo.length > 0 &&
      room.roomInfo.some(child => child.creating),
  );
  const shows = newRooms.map(
    room =>
      room.roomInfo &&
      room.roomInfo.length > 0 &&
      room.roomInfo.filter(child => child.show),
  );

  // const shows = newRooms.map(room => ({
  //   ...room,
  //   roomInfo: room.roomInfo.filter(child => child.show),
  // }));
  // const isCreating = rooms.some(room => Boolean(room.border));
  // const shows = rooms.filter(room => room.show);

  return (
    <>
      {isCreating && <XZPlane></XZPlane>}

      {shows.map(
        (room, i) =>
          room && room.length > 0
            ? room.map((data, j) => {
                const points: PointXZ[] = data.border.map(border => ({
                  x: border[0],
                  z: border[1],
                }));

                const surface =
                  points.length > 2
                    ? createClosedConcaveSurface(
                        points,
                        newRoomColorString(Number(data.index)),
                      )
                    : null;
                console.log(surface, scene);
                return (
                  <Fragment key={`canvas-room-${i}-${j}`}>
                    {surface && (
                      <mesh name="방 바닥" position={new Vector3(0, 0.001, 0)}>
                        <primitive object={surface} />
                      </mesh>
                    )}
                  </Fragment>
                );
              })
            : null,
        // const points: PointXZ[] = room.border.map(border => ({
        //   x: border[0],
        //   z: border[1],
        // }));
        // const surface =
        //   points.length > 2
        //     ? createClosedConcaveSurface(points, roomColor(room.index))
        //     : null;
        // return (
        //   <Fragment key={`canvas-room-${i}`}>
        //     {/* {surface && (
        //       <mesh position={new Vector3(0, 0.001, 0)}>
        //         <primitive object={surface}></primitive>
        //       </mesh>
        //     )} */}
        //   </Fragment>
        // );
      )}
    </>
  );
}

export default Rooms;
