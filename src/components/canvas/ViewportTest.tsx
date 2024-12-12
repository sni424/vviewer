import { Canvas, useThree } from "@react-three/fiber";
import { useGetThreeExports, useSetThreeExports } from "./Viewport";
import { useEffect } from "react";
import { Box, Environment, OrbitControls } from "@react-three/drei";
import { THREE } from "../../scripts/VTHREE";


const MainRender = () => {
    const three = useThree();
    const setSharedThree = useSetThreeExports();

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
    const sharedExports = useGetThreeExports();

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
                {/* <TopView></TopView> */}
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
                {/* <FrontView></FrontView> */}
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