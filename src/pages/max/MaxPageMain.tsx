import { Canvas } from '@react-three/fiber';
import { useSetAtom } from 'jotai';
import { Dispatch, SetStateAction } from 'react';
import UnifiedCameraControls from 'src/components/camera/UnifiedCameraControls.tsx';
import MyEnvironment from 'src/components/canvas/EnvironmentMap.tsx';
import { useMouseHandler } from 'src/components/canvas/Renderer.tsx';
import SelectBox from 'src/components/canvas/SelectBox.tsx';
import ShaderPassComponent from 'src/components/canvas/ShaderPassComponent';
import {
  getAtomValue,
  globalGlAtom,
  threeExportsAtom,
} from 'src/scripts/atoms.ts';
import { getVKTX2Loader } from 'src/scripts/loaders/VKTX2Loader.ts';
import * as THREE from 'VTHREE';
import Walls from 'src/components/canvas/Walls.tsx';

const MaxPageMain = ({
  setScene,
}: {
  setScene: Dispatch<SetStateAction<THREE.Scene>>;
}) => {
  const gl = getAtomValue(globalGlAtom);
  const mouse = useMouseHandler();
  const setThreeExports = useSetAtom(threeExportsAtom);
  return (
    <div className="w-full h-full">
      <Canvas
        gl={gl}
        id="canvasDiv"
        onMouseDown={mouse?.handleMouseDown}
        onMouseMove={mouse?.handleMouseMove}
        onMouseUp={mouse?.handleMouseUp}
        style={{
          width: '100%',
          height: '100%',
        }}
        // camera={{fov: 45}}
        onCreated={state => {
          getVKTX2Loader(state.gl);
          state.scene.background = new THREE.Color('gray');
          setScene(state.scene);
          state.camera.layers.enableAll();
          setThreeExports(state);
        }}
      >
        {/*<Environment*/}
        {/*  preset="warehouse"*/}
        {/*  background={false}*/}
        {/*  environmentIntensity={0.5}*/}
        {/*/>*/}
        <MyEnvironment></MyEnvironment>
        <ShaderPassComponent />
        <Walls></Walls>
        {/* <PostProcess></PostProcess> */}
        <SelectBox></SelectBox>
        {/*<ambientLight color={'#ffffff'} intensity={1}/>*/}
        <UnifiedCameraControls />
        {/*<mesh position={[0, 10, 0]}>*/}
        {/*  <boxGeometry args={[4, 4, 4]}></boxGeometry>*/}
        {/*  <meshStandardMaterial*/}
        {/*    color={'#97efff'}*/}
        {/*    metalness={0.5}*/}
        {/*    roughness={0}*/}
        {/*    vUserData={{*/}
        {/*      isVMaterial: true*/}
        {/*    }}*/}
        {/*  ></meshStandardMaterial>*/}
        {/*</mesh>*/}
        {/*<mesh position={[8, 10, 0]}>*/}
        {/*  <sphereGeometry args={[2, 128, 64]}></sphereGeometry>*/}
        {/*  <meshStandardMaterial*/}
        {/*    color={'#97efff'}*/}
        {/*    metalness={0.5}*/}
        {/*    roughness={0}*/}
        {/*    vUserData={{*/}
        {/*      isVMaterial: true*/}
        {/*    }}*/}
        {/*  ></meshStandardMaterial>*/}
        {/*</mesh>*/}
      </Canvas>
    </div>
  );
};

export default MaxPageMain;
