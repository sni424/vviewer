import React, { useEffect, useMemo, useRef, useState } from 'react'
import useViewport, { DefaultCameraPositions, useThreeAtom } from '../../scripts/useViewport';
import { Box, Environment, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { View } from '../../types';
import { THREE } from '../../scripts/VTHREE';
import { Canvas, CanvasProps, RootState, useFrame, useThree } from '@react-three/fiber';
import { useAtomValue, useSetAtom } from 'jotai';
import { Threes } from '../../scripts/atoms';
import Grid from './Grid';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/Addons.js';


const ViewportRenderer = (view: View) => ({ children }: {
    children?: React.ReactNode
}) => {
    const localThreeExports = useThree();

    useEffect(() => {
        const { camera, gl } = localThreeExports;
        const orbitControls = new OrbitControlsImpl(camera, gl.domElement);
        localThreeExports.controls = orbitControls;
        window.setThree(view, localThreeExports);
    }, [localThreeExports]);

    const { position, zoom } = DefaultCameraPositions[View.Top];



    return <>
        <OrthographicCamera makeDefault position={position} zoom={zoom} />
        {/* <OrbitControls></OrbitControls> */}
        {children}
    </>
}

const Viewport = (view: View) => ({ children, onCreated, ...rest }: {
    children?: React.ReactNode,
    onCreated?: CanvasProps["onCreated"],
    rest?: CanvasProps
}) => {
    const sharedExports = useAtomValue(Threes[View.Shared]);
    const Renderer = ViewportRenderer(view);
    // const localThreeExports = useAtomValue(Threes[view]);
    // const Renderer = useMemo(() => ViewportRenderer(view), [localThreeExports]);

    if (!sharedExports) {
        return null;
    }

    return <Canvas id={`canvas-${view}`} scene={sharedExports.scene} {...rest} onCreated={state => {
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
    }}>
        <Renderer>{children}</Renderer>
    </Canvas>
}


const MainRender = () => {
    const three = useThree();
    const setSharedThree = useSetAtom(Threes[View.Shared]);

    useEffect(() => {
        setSharedThree(three);
    }, []);

    return <>
        <OrbitControls />
        <Box>
            <meshStandardMaterial color="red" />
        </Box>
        <Environment files={"https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/dancing_hall_1k.hdr"}>
        </Environment>
    </>
}

const useThreeExports = (view: View) => {
    const [threeExports, setThreeExports] = useState<RootState | undefined>(undefined);
    useEffect(() => {
        const int = setInterval(() => {
            const found = window.getThree(view);
            if (found) {
                setThreeExports(found);
                clearInterval(int);
            }
        }, 50);

        return () => {
            clearInterval(int);
        }
    }, []);

    return threeExports;
}


const ViewName: { [key in View]: string } = {
    [View.Shared]: "Shared",
    [View.Main]: "Main",
    [View.Top]: "Top",
    [View.Front]: "Front",
    [View.Right]: "Right",
    [View.Back]: "Back",
    [View.Left]: "Left",
    [View.Bottom]: "Bottom",
} as const;

const ViewController = (view: View) => ({ children }: {
    children?: React.ReactNode
}) => {
    const localThreeExports = useThreeExports(view);
    if (!localThreeExports) {
        return null;
    }

    const { camera, scene, controls } = localThreeExports;

    return <div style={{
        position: "absolute",
        top: 0,
        left: 0,
    }}>
        <div>
            <span style={{
                backgroundColor: "black",
                color: "white",
                cursor: "pointer"
            }}
                onClick={() => {
                    console.log(controls)


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

                    if(controls instanceof OrbitControlsImpl){
                        controls.target.set(0, 0, 0);
                        controls.update();
                    } 

                }}
            >{ViewName[view]}</span>
            <button style={{ width: 16, height: 16, fontSize: 12 }} onClick={() => {
                const { camera } = localThreeExports;
                camera.zoom *= 0.85;
                camera.updateProjectionMatrix();
            }}>-</button>
            <button style={{ width: 16, height: 16, fontSize: 12 }} onClick={() => {
                const { camera } = localThreeExports;
                camera.zoom *= 1.15;
                camera.updateProjectionMatrix();
            }}>+</button>
        </div>
        {children}
    </div>
}

export const TopView = ({
    children
}: {
    children?: React.ReactNode

}) => {
    const view = View.Top;
    const TheCanvas = Viewport(view);
    const TopViewController = ViewController(view);

    return <>
        <TheCanvas onCreated={state => {
            state.camera.layers.enable(view);
        }}>
            <Grid layers={view}></Grid>
            {children}
        </TheCanvas>
        <TopViewController></TopViewController>
    </>
}


export const FrontView = ({
    children
}: {
    children?: React.ReactNode

}) => {
    const view = View.Front;
    const TheCanvas = Viewport(view);
    const TopViewController = ViewController(view);

    return <>
        <TheCanvas>
            <Grid layers={view} axis='xy'></Grid>
            {children}
        </TheCanvas>
        <TopViewController></TopViewController>
    </>
}

function ViewportTest() {
    const sharedExports = useAtomValue(Threes[View.Shared]);


    return (
        <div style={{
            width: "100dvw",
            height: "100vh",
            position: "relative",
        }}>
            <Canvas>
                <MainRender></MainRender>
            </Canvas>
            <div style={{
                width: 200,
                height: 200,
                position: "absolute",
                top: 10,
                left: 10,
                backgroundColor: "efefef",
                boxSizing: "border-box",
                border: "1px solid #3f3f3fdd",

            }}>
                <TopView></TopView>
            </div>
            <div style={{
                width: 200,
                height: 200,
                position: "absolute",
                top: 10,
                left: 220,
                backgroundColor: "efefef",
                boxSizing: "border-box",
                border: "1px solid #3f3f3fdd",
            }}>
                <FrontView></FrontView>
            </div>
            <div style={{
                position: "absolute",
                left: 10,
                bottom: 10,
                backgroundColor: "#efefef",
            }}>
                <div>
                    <button onClick={() => {
                        const scene = sharedExports?.scene;
                        if (scene) {
                            const boxRange = 20;
                            // to 6 digits
                            const randomHexColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                            const randomBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: `#${randomHexColor}` }));
                            randomBox.position.set(Math.random() * boxRange - (boxRange * 0.5), Math.random() * boxRange - (boxRange * 0.5), Math.random() * boxRange - (boxRange * 0.5));
                            scene.add(randomBox);
                        }
                    }}>
                        박스추가
                    </button>
                </div>

            </div>
        </div>
    )
}

export default ViewportTest