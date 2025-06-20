import { Canvas } from '@react-three/fiber';
import { useAtomValue, useSetAtom } from 'jotai';
import { Dispatch, SetStateAction } from 'react';
import UnifiedCameraControls from 'src/components/camera/UnifiedCameraControls.tsx';
import MyEnvironment from 'src/components/canvas/EnvironmentMap.tsx';
import { useMouseHandler } from 'src/components/canvas/Renderer.tsx';
import SelectBox from 'src/components/canvas/SelectBox.tsx';
import ShaderPassComponent from 'src/components/canvas/ShaderPassComponent';
import {
  getAtomValue,
  globalGlAtom,
  sharpenAtom,
  threeExportsAtom,
} from 'src/scripts/atoms.ts';
import { getVKTX2Loader } from 'src/scripts/loaders/VKTX2Loader.ts';
import * as THREE from 'VTHREE';

const MaxPageMain = ({
  setScene,
  useMouseEvent = false,
}: {
  setScene?: Dispatch<SetStateAction<THREE.Scene>>;
  useMouseEvent?: boolean;
}) => {
  const gl = getAtomValue(globalGlAtom);
  const mouse = useMouseHandler();
  const sharpenValue = useAtomValue(sharpenAtom);
  const setThreeExports = useSetAtom(threeExportsAtom);
  return (
    <div className="w-full h-full">
      <Canvas
        gl={gl}
        id="canvasDiv"
        onMouseDown={e => {
          if (useMouseEvent)
          mouse?.handleMouseDown(e);
        }}
        onMouseMove={e => {
          if (useMouseEvent)
            mouse?.handleMouseMove(e);
        }}
        onMouseUp={e => {
          if (useMouseEvent)
            mouse?.handleMouseUp(e);
        }}
        camera={{
          position: new THREE.Vector3(-0.3, 1.15, -0.4),
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
        // camera={{fov: 45}}
        onCreated={state => {
          getVKTX2Loader(state.gl);
          state.scene.background = new THREE.Color('gray');
          if (setScene) {
            setScene(state.scene);
          }
          state.camera.layers.enableAll();
          setThreeExports(state);
        }}
      >
        <MyEnvironment></MyEnvironment>
        <ShaderPassComponent />
        {/*<PostProcess/>*/}
        <SelectBox></SelectBox>
        <UnifiedCameraControls />
      </Canvas>
    </div>
  );
};

export default MaxPageMain;
