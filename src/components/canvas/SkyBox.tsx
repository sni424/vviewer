import { useThree } from '@react-three/fiber';
import { useAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { THREE } from 'VTHREE';
import { skyBoxAtom } from '../../scripts/atoms';

const SkyBoxMesh = () => {
  const { scene } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const [skyBoxInfo, setSkyBoxAtom] = useAtom(skyBoxAtom);

  // 한 번만 생성하도록 useMemo 사용

  useEffect(() => {
    if (
      skyBoxInfo.type === 'scene' &&
      skyBoxInfo.isSkyBox &&
      skyBoxInfo.texture
    ) {
      scene.background = skyBoxInfo.texture;
      scene.backgroundRotation.set(
        skyBoxInfo.scene.rotation.x,
        skyBoxInfo.scene.rotation.y,
        skyBoxInfo.scene.rotation.z,
      );

      scene.backgroundIntensity = skyBoxInfo.scene.intensity;
    } else {
      scene.background = null;
    }
  }, [
    skyBoxInfo.type,
    skyBoxInfo.isSkyBox,
    skyBoxInfo.texture,
    JSON.stringify(skyBoxInfo.scene.rotation),
    skyBoxInfo.scene.intensity,
  ]);

  useEffect(() => {
    if (skyBoxInfo.texture) {
      const cloned = skyBoxInfo.texture.clone();
      cloned.flipY = !skyBoxInfo.flipY;
      setSkyBoxAtom(pre => ({
        ...pre,
        texture: cloned,
      }));
      cloned.needsUpdate = true;
    }
  }, [skyBoxInfo.flipY]);

  return (
    <>
      {skyBoxInfo.type === 'mesh' && skyBoxInfo.isSkyBox && (
        <mesh
          ref={meshRef}
          name="skyBoxMesh"
          frustumCulled={false}
          visible={skyBoxInfo.visible}
          rotation={[
            skyBoxInfo.mesh.rotation.x,
            skyBoxInfo.mesh.rotation.y,
            skyBoxInfo.mesh.rotation.z,
          ]}
          position={[
            skyBoxInfo.mesh.position.x,
            skyBoxInfo.mesh.position.y,
            skyBoxInfo.mesh.position.z,
          ]}
          scale={[
            skyBoxInfo.mesh.scale.x,
            skyBoxInfo.mesh.scale.y,
            skyBoxInfo.mesh.scale.z,
          ]}
        >
          <sphereGeometry args={[15, 32, 32]} />
          <meshStandardMaterial
            emissive="white"
            emissiveMap={skyBoxInfo.texture}
            emissiveIntensity={skyBoxInfo.mesh.intensity ?? 1}
            side={THREE.DoubleSide}
            transparent={skyBoxInfo.mesh.transparent}
            opacity={skyBoxInfo.mesh.opacity}
          />
        </mesh>
      )}
    </>
  );
};

export default SkyBoxMesh;
