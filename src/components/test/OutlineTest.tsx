import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
// import { Bloom, EffectComposer, Outline, Selection, Select } from '@react-three/postprocessing'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Selection, Select } from "../canvas/Selection"
import { THREE } from '../../scripts/VTHREE'
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { BlendFunction, KernelSize, Resolution, EffectComposer as EffectComposerImpl, OutlineEffect } from 'postprocessing';
import React, { useEffect, useRef } from 'react';
import { Outline } from '../canvas/Outline_'

const selection = atom<THREE.Object3D[]>([]);

const Selections = ({ children }: { children?: React.ReactElement }) => {
    const [hovered, setHovered] = React.useState<number | null>(null);
    const composerRef = useRef<EffectComposerImpl>(null!);
    // const outlineRef = useRef<OutlineEffect>(null!);
    const threes = useThree();

    // useFrame(()=>{
    //     // composerRef.current?.render()
    //     // outlineRef.current?.update();
    // }, 1)

    return <Selection enabled>
        <EffectComposer autoClear={false} ref={composerRef}>
            <Outline
                blur edgeStrength={100}
                blendFunction={BlendFunction.SCREEN}
                visibleEdgeColor={0x00ff00}
                // blur
                // edgeStrength={100}
                // hiddenEdgeColor={0x0000ff}
                // selectionLayer={0}
            ></Outline>
            {/* <Bloom
                intensity={1.0} // The bloom intensity.
                blurPass={undefined} // A blur pass.
                kernelSize={KernelSize.LARGE} // blur kernel size
                luminanceThreshold={0.9} // luminance threshold. Raise this value to mask out darker elements in the scene.
                luminanceSmoothing={0.025} // smoothness of the luminance threshold. Range is [0, 1]
                mipmapBlur={false} // Enables or disables mipmap blur.
                resolutionX={Resolution.AUTO_SIZE} // The horizontal resolution.
                resolutionY={Resolution.AUTO_SIZE} // The vertical resolution.
                
            /> */}
        </EffectComposer>
        {/* <Select enabled> */}
        <Select enabled={hovered === 1} layers={0}>
            <mesh layers={0} onPointerOver={e => {
                console.log("here")
                setHovered(1);
            }}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color='red' emissive="red" emissiveIntensity={20} toneMapped={false} />
            </mesh>
        </Select>

        <Select enabled={hovered === 2} layers={0}>
            <mesh layers={0} position={[2, 0, 0]} onPointerOver={(e) => {
                setHovered(2);
            }}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color='hotpink' emissive="red" emissiveIntensity={20} toneMapped={false} />
            </mesh>
        </Select>


        {/* </Select> */}
        {/* <Select>
            <mesh onClick={(e) => {
                // setSelection([e.object as THREE.Object3D]);
            }}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color='red' emissive="red" emissiveIntensity={20} toneMapped={false} />
            </mesh>
        </Select>

        <Select>
            <mesh position={[2, 0, 0]} onClick={(e) => {
                // setSelection([e.object as THREE.Object3D]);
            }}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color='hotpink' emissive="red" emissiveIntensity={20} toneMapped={false} />
            </mesh>
        </Select> */}

    </Selection>
    // return <Outline
    //     // selection={selected}
    //     blendFunction={BlendFunction.SCREEN}
    //     visibleEdgeColor={0xff0000ff}
    //     blur
    //     // edgeStrength={10}
    //     width={0.01}
    // ></Outline>
}

const Renderer = () => {
    const setSelection = useSetAtom(selection);
    return <>
        <OrbitControls></OrbitControls>

        <Environment files={"https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/dancing_hall_1k.hdr"} />
        <Selections>
            {/* <Outline
                blendFunction={BlendFunction.SCREEN}
                visibleEdgeColor={0x00ff00}
                blur
                edgeStrength={100}
                hiddenEdgeColor={0x0000ff}
            ></Outline> */}
        </Selections>
        {/* </Select> */}

    </>
}

function OutlineTest() {

    return (
        <div className='w-dvw h-dvh'>
            <Canvas className='w-full h-full' onClick={() => {
                const rayCaster = new THREE.Raycaster();
            }}>
                <Renderer></Renderer>
            </Canvas>
        </div >
    )
}

export default OutlineTest