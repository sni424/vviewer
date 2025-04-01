import { useThree } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { THREE } from 'VTHREE';
import { skyBoxAtom } from '../../scripts/atoms';

const SkyBoxMesh = () => {
  const { scene } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const skyBoxInfo = useAtomValue(skyBoxAtom);

  // 한 번만 생성하도록 useMemo 사용

  useEffect(() => {
    if (
      skyBoxInfo.type === 'scene' &&
      skyBoxInfo.isSkyBox &&
      skyBoxInfo.texture
    ) {
      scene.background = skyBoxInfo.texture;
      scene.backgroundRotation.set(0, 56, 0);
      scene.backgroundIntensity = 2;
    } else {
      scene.background = null;
    }
  }, [skyBoxInfo.type, skyBoxInfo.isSkyBox, skyBoxInfo.texture]);

  useEffect(() => {
    if (meshRef.current && skyBoxInfo.texture) {
      // meshRef.current.material는 Material 또는 Material[]일 수 있음
      const { material } = meshRef.current;
      if (Array.isArray(material)) {
        material.forEach(mat => {
          // 배열일 경우 각각의 material에 대해 needsUpdate를 true로 설정
          mat.needsUpdate = true;
        });
      } else {
        // 단일 material인 경우 바로 needsUpdate 설정
        material.needsUpdate = true;
      }
    }
  }, [skyBoxInfo.texture]);

  return (
    <>
      {skyBoxInfo.type === 'mesh' && skyBoxInfo.isSkyBox && (
        <mesh
          ref={meshRef}
          frustumCulled={false}
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
          />
        </mesh>
      )}
    </>
  );
};

export default SkyBoxMesh;
