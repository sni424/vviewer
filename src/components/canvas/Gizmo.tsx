import { Box, TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { useMemo, useRef } from 'react';
import { selectedAtom } from '../../scripts/atoms';
import { THREE } from '../../scripts/vthree/VTHREE';

function Gizmo() {
  const selecteds = useAtomValue(selectedAtom);
  console.log('Gizmo, selectedLen : ', selecteds.length);
  const { scene } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const boxMesh = useMemo(() => {
    //boundingbox of selecteds
    const objects: THREE.Object3D[] = [];
    scene.traverse(obj => {
      if (selecteds.includes(obj.uuid)) {
        objects.push(obj);
      }
    });

    console.log('selectedObjects:', objects);

    if (objects.length === 0) {
      return () => null;
    }

    // get a bounding box
    const boundingBox = new THREE.Box3();
    objects.forEach(obj => {
      boundingBox.expandByObject(obj);
    });

    return () => (
      <mesh ref={meshRef}>
        <Box
          args={boundingBox.getSize(new THREE.Vector3()).toArray()}
          position={boundingBox.getCenter(new THREE.Vector3()).toArray()}
        >
          <meshBasicMaterial color={0x00ff00} wireframe={true} />
        </Box>
      </mesh>
    );
  }, [selecteds]);

  if (selecteds.length === 0) {
    return null;
  }

  console.log('Boxposition:', meshRef.current?.position);

  return (
    <>
      {boxMesh}
      <TransformControls
        position={meshRef.current?.position}
        name="TransformControl"
        object={meshRef.current!}
        onChange={e => {
          console.log(e);
        }}
      ></TransformControls>
    </>
  );
}

export default Gizmo;
