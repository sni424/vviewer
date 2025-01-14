import { useEffect } from 'react';

import { Canvas, useThree } from '@react-three/fiber';
import { useSetAtom } from 'jotai';
import { useAtomValue } from 'jotai/index';
import { globalGlAtom, threeExportsAtom } from '../../scripts/atoms';
import OrbitManager from '../camera/OrbitManager';
import MyEnvironment from '../canvas/EnvironmentMap';
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
      <OrbitManager />
      {/* <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} /> */}
    </>
  );
};

const MobileRenderer = () => {
  const gl = useAtomValue(globalGlAtom);
  return (
    <div
      id="mobileCanvasDiv"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <Canvas gl={gl}>
        <Renderer />
        <MyEnvironment></MyEnvironment>
        {/* <EnvironmentMap></EnvironmentMap> */}
        <PostProcess></PostProcess>
      </Canvas>
    </div>
  );
};

export default MobileRenderer;
