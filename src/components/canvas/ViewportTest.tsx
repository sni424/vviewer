import React, { useEffect, useRef } from 'react'
import useViewport, { DefaultCameraPositions, useThreeAtom } from '../../scripts/useViewport';
import { Box, Environment, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { View } from '../../types';
import { THREE } from '../../scripts/VTHREE';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { cameraFar, Vector3, vertexColor } from 'three/webgpu';
import { useAtomValue, useSetAtom } from 'jotai';
import { frontThreeAtom, sharedThreeAtom, Threes } from '../../scripts/atoms';

const TopRenderer = () => {
    const localThreeExports = useThree();
    const sharedExports = useAtomValue(Threes[View.Shared]);
    const setThree = useSetAtom(Threes[View.Top]);

    useEffect(() => {
        setThree(localThreeExports);
    }, [localThreeExports]);

    return <>
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={20} />
        <OrbitControls></OrbitControls>
    </>
}

const TopViewport = () => {
    // const viewport = useViewport(View.Top);
    const view = View.Top;
    const sharedExports = useAtomValue(Threes[View.Shared]);
    const localExports = useAtomValue(Threes[view]);


    if (!sharedExports) {
        return null;
    }


    return <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
    }}>

        <Canvas scene={sharedExports.scene}>
            <TopRenderer />
        </Canvas>
        <div style={{ position: "absolute", top: 3, left: 3, padding: 4, backgroundColor: "#202020", color: "white", cursor: "pointer" }}
            onClick={() => {
                if (localExports) {
                    const { camera } = localExports;

                    // camera.position.set(0, 0, 100);
                    camera.position.addScalar(1);
                    // camera.zoom = camera.zoom + 20;
                    camera.updateProjectionMatrix();
                    console.log("top fixview", camera.uuid);
                }
            }}
        >Top</div>
    </div>
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
                backgroundColor: "lightgray",
                boxSizing: "border-box"
            }}>
                <TopViewport></TopViewport>
            </div>
            {/* <div style={{
                width: 200,
                height: 200,
                position: "absolute",
                top: 10,
                left: 220,
                backgroundColor: "lightgray",
                boxSizing: "border-box"
            }}>
                <FrontViewport></FrontViewport>
            </div> */}
            <div style={{
                position: "absolute",
                left: 10,
                bottom: 10,
                backgroundColor: "lightgray",
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