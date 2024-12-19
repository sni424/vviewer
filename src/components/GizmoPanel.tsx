import { GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { useEffect } from 'react';
import { Layer } from '../Constants';
import { THREE } from '../scripts/VTHREE';
import { View } from '../types';
import { useGetThreeExports } from './canvas/Viewport';

const Axis = (props: { axisColor: string; style?: React.CSSProperties }) => {
  const { axisColor: color } = props;

  return (
    <div
      style={{
        backgroundColor: color,
        width: 100,
        height: 2,
        position: 'relative',
        ...props.style,
      }}
    >
      <div className="absolute right-0">A</div>
    </div>
  );
};

// 메인 뷰포트 내에서 그리면 포스트프로세싱에 같이 잡혀서 별도로 떼놓음
const XYZGizmo = () => {
  const three = useGetThreeExports();
  const gizmoCameraRef = React.useRef<THREE.PerspectiveCamera | null>(
    new THREE.PerspectiveCamera(0, 1, 0, 0),
  );

  useEffect(() => {
    if (!three) {
      return;
    }
    gizmoCameraRef.current!.layers.enable(Layer.GizmoHelper);

    let anim = 0;
    const animate = () => {
      anim = requestAnimationFrame(animate);
      const three = window.getThree(View.Shared);
      if (three) {
        const { camera } = window.getThree(View.Shared)!;
        const cam = gizmoCameraRef.current!;
        cam.matrix.copy(camera.matrix);
        cam.position.addScalar(1000000);
      }
    };
    anim = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(anim);
    };
  });

  if (!three) {
    return null;
  }

  return (
    <Canvas
      className="w-full h-full"
      scene={three.scene}
      camera={gizmoCameraRef.current!}
    >
      <GizmoHelper
        layers={Layer.GizmoHelper}
        name="GizmoHelper"
        alignment="bottom-right" // widget alignment within scene
        // margin={[80, 80]} // widget margins (X, Y)
      >
        <GizmoViewport
          layers={Layer.GizmoHelper}
          name="GizmoHelper"
          axisColors={['red', 'green', 'blue']}
          labelColor="black"
        />
      </GizmoHelper>
    </Canvas>
  );
};

function GizmoPanel() {
  return (
    <section className="w-[140px] h-[140px]">
      <XYZGizmo></XYZGizmo>
    </section>
  );
}

export default GizmoPanel;
