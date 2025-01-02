import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { Fragment, useRef } from 'react';
import { TextureLoader } from 'three';
import { HotspotIcon, Layer } from '../../Constants';
import { hotspotAtom, insideRoomAtom } from '../../scripts/atoms';
import { THREE } from '../../scripts/VTHREE';

function SingleHotspot({
  texture,
  camera,
  position,
  index: hotspotIndex,
}: {
  texture: THREE.Texture;
  camera: THREE.Camera;
  position?: [number, number, number];
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh | null>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh
      ref={meshRef}
      layers={Layer.Hotspot}
      onClick={() => {
        alert('hi');
      }}
      position={position}
      userData={{ hotspotIndex }}
    >
      {/* Create a CircleGeometry */}
      <circleGeometry args={[0.1, 32]} /> {/* args: [radius, segments] */}
      {/* Apply the PNG texture to a MeshBasicMaterial */}
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

function Hotspot() {
  // Load your PNG texture
  const texture = useLoader(TextureLoader, HotspotIcon.gearBlack);
  const hotspots = useAtomValue(hotspotAtom);
  const { camera } = useThree();
  const insideRoom = useAtomValue(insideRoomAtom);

  // const viewableHotspots = insideRoom
  //   ? hotspots
  //       .filter(hotspot => Boolean(hotspot.position))
  //       .filter(hotspot => hotspot.rooms.includes(insideRoom.index))
  //   : [];
  const viewableHotspots = hotspots.filter(hotspot =>
    Boolean(hotspot.position),
  );

  return (
    <Fragment>
      {viewableHotspots.map((hotspot, i) => {
        return (
          <SingleHotspot
            key={`hotspot-texture-${hotspot.index}`}
            texture={texture}
            camera={camera}
            {...hotspot}
          />
        );
      })}
    </Fragment>
  );
}

export default Hotspot;
