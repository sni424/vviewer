import { Canvas } from '@react-three/fiber';
import UnifiedCameraControls from 'src/components/camera/UnifiedCameraControls.tsx';
import { getVKTX2Loader } from 'src/scripts/loaders/VKTX2Loader.ts';
import { Dispatch, SetStateAction } from 'react';
import * as THREE from 'VTHREE';
import MyEnvironment from 'src/components/canvas/EnvironmentMap.tsx';
import PostProcess from 'src/components/canvas/PostProcess.tsx';
import { getAtomValue, globalGlAtom } from 'src/scripts/atoms.ts';

const MaxPageMain = ({setScene}: {
  setScene: Dispatch<SetStateAction<THREE.Scene>>;
}) => {
  const gl = getAtomValue(globalGlAtom);
  return (
    <div className="w-full h-full">
      <Canvas
        gl={gl}
        id="canvasDiv"
        style={{
          width: '100%',
          height: '100%',
        }}
        onCreated={state => {
          getVKTX2Loader(state.gl);
          setScene(state.scene);
        }}
      >
        {/*<Environment*/}
        {/*  preset="warehouse"*/}
        {/*  background={false}*/}
        {/*  environmentIntensity={0.5}*/}
        {/*/>*/}
        <MyEnvironment></MyEnvironment>
        <PostProcess></PostProcess>
        {/*<ambientLight color={'#ffffff'} intensity={1}/>*/}
        <UnifiedCameraControls />
        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[4, 4, 4]}></boxGeometry>
          <meshStandardMaterial
            color={'#97efff'}
            metalness={0.5}
            roughness={0}
          ></meshStandardMaterial>
        </mesh>
        <mesh position={[8, 10, 0]}>
          <sphereGeometry args={[2, 128, 64]}></sphereGeometry>
          <meshStandardMaterial
            color={'#97efff'}
            metalness={0.5}
            roughness={0}
          ></meshStandardMaterial>
        </mesh>
      </Canvas>
    </div>
  );
};

export default MaxPageMain;
