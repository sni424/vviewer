import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

const Renderer = () => {
    return <>
        <OrbitControls></OrbitControls>
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color='hotpink' />
        </mesh>
        <Environment files={"https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/dancing_hall_1k.hdr"} />
    </>
}

function OutlineTest() {
    return (
        <div className='w-dvw h-dvh'>
            <Canvas className='w-full h-full'>
                <Renderer></Renderer>
            </Canvas>
        </div >
    )
}

export default OutlineTest