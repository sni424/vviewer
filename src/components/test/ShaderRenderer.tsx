import { Canvas, useThree } from '@react-three/fiber';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { THREE } from 'VTHREE';
import { Layer } from '../../Constants';
import { globalGlAtom, threeExportsAtom } from '../../scripts/atoms';
import { View } from '../../types';

const Renderer = () => {
  const threeExports = useThree();
  const setThreeExportsAtom = useSetAtom(threeExportsAtom);

  useEffect(() => {
    setThreeExportsAtom(threeExports);
  }, []);

  return <></>;
};

function ShaderRenderer() {
  const gl = useAtomValue(globalGlAtom);
  const cameraLayer = new THREE.Layers();
  cameraLayer.enableAll();
  cameraLayer.disable(View.Top);
  cameraLayer.disable(View.Front);

  return (
    <div
      id="canvasDiv"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <Canvas
        gl={gl}
        camera={{ layers: cameraLayer }}
        id="main-canvas"
        style={{
          width: '100%',
          height: '100%',
        }}
        onCreated={state => {
          const { scene } = state;
          scene.layers.enable(Layer.Model);
        }}
      >
        <Renderer />
      </Canvas>
    </div>
  );
}

export default ShaderRenderer;
