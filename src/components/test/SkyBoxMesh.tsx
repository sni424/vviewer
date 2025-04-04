import { useRef } from 'react';
import * as THREE from 'VTHREE';
import { Layer } from 'src/Constants.ts';

const SkyBoxMesh = ({ texture }: { texture: THREE.Texture }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <>
      {texture && (
        <mesh
          ref={meshRef}
          frustumCulled={false}
          rotation={[0, 1.6, 0]}
          position={[0, 0.2, 0]}
          scale={[1, 1, 1]}
          layers={Layer.SkyBox}
        >
          <sphereGeometry args={[15, 32, 32]} />
          <meshStandardMaterial
            emissive="white"
            emissiveMap={texture}
            emissiveIntensity={1}
            side={THREE.DoubleSide}
            clippingPlanes={[]}
          />
        </mesh>
      )}
    </>
  );
};

export default SkyBoxMesh;
