import { useEffect } from 'react';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useSetAtom } from 'jotai';
import { threeExportsAtom } from '../../scripts/atoms';
import PostProcess from '../canvas/PostProcess';

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
      {/* <EnvironmentMap></EnvironmentMap> */}
      <PostProcess></PostProcess>
    </Canvas>
  );
};

export default MobileRenderer;
