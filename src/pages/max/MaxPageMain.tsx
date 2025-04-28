import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import UnifiedCameraControls from 'src/components/camera/UnifiedCameraControls.tsx';

const MaxPageMain = () => {
  return <div className="w-full h-full">
    <Canvas
      id="canvasDiv"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <Environment preset='apartment' background={true} environmentIntensity={1}/>
      <UnifiedCameraControls />
      <mesh>
        <sphereGeometry></sphereGeometry>
        <meshStandardMaterial color={'#97efff'} metalness={0.5} roughness={0}></meshStandardMaterial>
      </mesh>
    </Canvas>
  </div>;
};

export default MaxPageMain;
