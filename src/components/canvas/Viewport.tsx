import { OrthographicCamera } from '@react-three/drei';
import { Canvas, CanvasProps, useThree } from '@react-three/fiber';
import React, { useEffect } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/Addons.js';
import { DefaultCameraPositions, ViewName } from '../../Constants';
import { useViewportOption } from '../../scripts/atoms';
import useGetThreeExports, {
  useSetThreeExports,
} from '../../scripts/useGetThreeExports';
import { THREE } from '../../scripts/vthree/VTHREE';
import { View } from '../../types';
import Grid from './Grid';

const GridAxisMap: { [key in View]: 'xz' | 'xy' | 'yz' } = {
  [View.Top]: 'xz',
  [View.Front]: 'xy',
  [View.Right]: 'yz',
  [View.Left]: 'yz',
  [View.Back]: 'xy',
  [View.Bottom]: 'xz',
  [View.Shared]: 'xz',
  [View.Main]: 'xz',
} as const;

export const ViewportRenderer =
  (view: View) =>
  ({ children }: { children?: React.ReactNode }) => {
    const localThreeExports = useThree();
    const setThreeExports = useSetThreeExports(view);
    const gridOn = useViewportOption(view).getOption.grid;

    useEffect(() => {
      const { camera, gl } = localThreeExports;
      const orbitControls = new OrbitControlsImpl(camera, gl.domElement);
      localThreeExports.controls = orbitControls;
      // window.setThree(view, localThreeExports);
      setThreeExports(localThreeExports);
    }, [localThreeExports]);

    const { position, zoom } = DefaultCameraPositions[View.Top];

    return (
      <>
        {gridOn && <Grid layers={view} axis={GridAxisMap[view]}></Grid>}
        <OrthographicCamera makeDefault position={position} zoom={zoom} />

        {/* <OrbitControls></OrbitControls> */}
        {children}
      </>
    );
  };

export const Viewport =
  (view: View) =>
  ({
    children,
    onCreated,
    ...rest
  }: {
    children?: React.ReactNode;
    onCreated?: CanvasProps['onCreated'];
    rest?: CanvasProps;
  }) => {
    // const sharedExports = useAtomValue(Threes[View.Shared]);
    const sharedExports = useGetThreeExports();
    const Renderer = ViewportRenderer(view);
    // const localThreeExports = useAtomValue(Threes[view]);
    // const Renderer = useMemo(() => ViewportRenderer(view), [localThreeExports]);

    if (!sharedExports) {
      return null;
    }

    return (
      <Canvas
        id={`canvas-${view}`}
        scene={sharedExports.scene}
        {...rest}
        onCreated={state => {
          const { camera } = state;
          camera.layers.enable(view);
          const { position, zoom, up } = DefaultCameraPositions[view];
          camera.position.set(position[0], position[1], position[2]);
          camera.zoom = zoom;
          // camera.rotation.set(0, 0, 0);
          camera.lookAt(0, 0, 0);
          camera.up = new THREE.Vector3(up[0], up[1], up[2]);
          camera.updateProjectionMatrix();

          onCreated?.(state);
        }}
      >
        <Renderer>{children}</Renderer>
      </Canvas>
    );
  };

export const ViewportController =
  (view: View) =>
  ({ children, hide }: { children?: React.ReactNode; hide: () => void }) => {
    const { getOption, setOption } = useViewportOption(view);
    const localThreeExports = useGetThreeExports(view);
    if (!localThreeExports) {
      return null;
    }

    const { camera, scene, controls } = localThreeExports;

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <div>
          <span
            style={{
              backgroundColor: 'black',
              color: 'white',
              cursor: 'pointer',
            }}
            onClick={() => {
              console.log(controls);

              // camera.position.set(p[0], p[1], p[2]);
              // camera.zoom = zoom;
              // camera.rotation.set(0, 0, 0);
              // camera.lookAt(0, 0, 0);
              // camera.up = new THREE.Vector3(0, 0, -1);

              const { position: p, zoom, up } = DefaultCameraPositions[view];
              camera.position.set(p[0], p[1], p[2]);
              camera.zoom = zoom;
              camera.rotation.set(0, 0, 0);
              camera.lookAt(0, 0, 0);
              camera.up = new THREE.Vector3(up[0], up[1], up[2]);

              camera.updateProjectionMatrix();

              if (controls instanceof OrbitControlsImpl) {
                controls.target.set(0, 0, 0);
                controls.update();
              }
            }}
          >
            {ViewName[view]}
          </span>
          {/* <button style={{ width: 16, height: 16, fontSize: 12 }} onClick={() => {
                const { camera } = localThreeExports;
                camera.zoom *= 0.85;
                camera.updateProjectionMatrix();
            }}>-</button>
            <button style={{ width: 16, height: 16, fontSize: 12 }} onClick={() => {
                const { camera } = localThreeExports;
                camera.zoom *= 1.15;
                camera.updateProjectionMatrix();
            }}>+</button> */}

          <button
            style={{ fontSize: 11 }}
            onClick={() => {
              // setOption({ show: false });
              hide();
            }}
          >
            끄기
          </button>
          <button
            style={{ fontSize: 11 }}
            onClick={() => {
              // setOption({
              //     grid: !Boolean(getOption.grid)
              // })
              console.log('here');
              setOption(prev => {
                return {
                  ...prev,
                  grid: !Boolean(prev.grid),
                };
              });
            }}
          >
            그리드 {getOption.grid ? '끄기' : '켜기'}
          </button>
        </div>
        {children}
      </div>
    );
  };

// export const ViewConstructor = (view: View) => ({
//     children
// }: {
//     children?: React.ReactNode
// }) => {
//     const TheCanvas = Viewport(view);
//     const TopViewController = ViewController(view);
//     const { getOption } = useViewportOption(view);

//     return <>
//         {getOption.show && <TheCanvas onCreated={state => {
//             state.camera.layers.enable(view);
//         }}>
//             {children}
//         </TheCanvas>}
//         <TopViewController></TopViewController>
//     </>
// }

// export const TopView = ViewConstructor(View.Top);
// export const FrontView = ViewConstructor(View.Front);
