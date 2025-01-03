import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { Fragment, useRef } from 'react';
import { TextureLoader } from 'three';
import { HotspotIcon, Layer } from '../../Constants';
import { hotspotAtom, settingsAtom } from '../../scripts/atoms';
import { THREE } from '../../scripts/VTHREE';

function SingleHotspot({
  texture,
  camera,
  target,
  index: hotspotIndex,
  hotspotSize = 0.12,
}: {
  texture: THREE.Texture;
  camera: THREE.Camera;
  target?: [number, number, number];
  index: number;
  hotspotSize?: number;
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
      position={target}
      userData={{ hotspotIndex }}
    >
      <circleGeometry args={[hotspotSize, 32]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

function Hotspot() {
  // Load your PNG texture
  const texture = useLoader(TextureLoader, HotspotIcon.gearBlack);
  const hotspots = useAtomValue(hotspotAtom);
  const { camera } = useThree();
  const settings = useAtomValue(settingsAtom);
  const hide = !settings.shotHotspots;

  if (hide) {
    return null;
  }

  const viewableHotspots = hotspots.filter(hotspot => Boolean(hotspot.target));

  return (
    <Fragment>
      {viewableHotspots.map((hotspot, i) => {
        return (
          <SingleHotspot
            key={`hotspot-texture-${hotspot.index}`}
            texture={texture}
            camera={camera}
            {...hotspot}
            {...settings}
          />
        );
      })}
    </Fragment>
  );
}

export default Hotspot;
