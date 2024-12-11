import React from 'react'
import useViewport from '../../scripts/useViewport';
import { Box, Environment, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { View } from '../../types';

const TopViewport = () => {
    const viewport = useViewport(View.Top);

    if (!viewport) {
        return null;
    }

    const { Viewport } = viewport;

    return <Viewport>
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
        <Box position={[2,0,0]} layers={View.Top}>
            <meshStandardMaterial color="blue" />
        </Box>
        <OrbitControls></OrbitControls>
        {/* <Environment files={"https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/dancing_hall_1k.hdr"}>
                </Environment> */}
    </Viewport>
}

function ViewportTest() {
    const { Viewport: MainViewport } = useViewport(View.Shared)!;

    return (
        <div style={{
            width: "100dvw",
            height: "100vh",
            position: "relative",
        }}>
            <MainViewport>
                <OrbitControls />
                <Box>
                    <meshStandardMaterial color="red" />
                </Box>
                <Environment files={"https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/dancing_hall_1k.hdr"}>
                </Environment>
            </MainViewport>
            <div style={{
                width: 200,
                height: 200,
                position: "absolute",
                padding: 10,
                top: 10,
                left: 10,
                backgroundColor: "lightgray",
                boxSizing: "border-box"
            }}>
                <TopViewport></TopViewport>
            </div>
        </div>
    )
}

export default ViewportTest