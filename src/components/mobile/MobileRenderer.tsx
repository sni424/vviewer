import { useEffect } from 'react';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useSetAtom } from 'jotai';
import { threeExportsAtom } from '../../scripts/atoms';
import EnvironmentMap from '../canvas/EnvironmentMap';

const Renderer = () => {
  // useStats();
  const setThreeExports = useSetAtom(threeExportsAtom);
  const threeExports = useThree();

  useEffect(() => {
    setThreeExports(threeExports);
  }, []);

  return (
    <>
      <OrbitControls />
      {/* <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} /> */}
    </>
  );
};

const MobileRenderer = () => {
  return (
    <Canvas>
      <Renderer />
      <EnvironmentMap></EnvironmentMap>
    </Canvas>
  );
};

export default MobileRenderer;
