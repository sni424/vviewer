import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei'
import { Canvas, RootState, useThree } from '@react-three/fiber'
import { atom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect } from 'react'

const threeExportsAtom = atom<RootState>();

const Render = () => {
    const threeExports = useThree();
    const setThreeExportsAtom = useSetAtom(threeExportsAtom);

    useEffect(() => {
        setThreeExportsAtom(threeExports);
    }, []);

    return <>
        <OrbitControls makeDefault></OrbitControls>
        <GizmoHelper
            alignment="bottom-right" // widget alignment within scene
            margin={[80, 80]} // widget margins (X, Y)

        >
            <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="black" />
        </GizmoHelper>
    </>
}

function TestPage() {
    const threeExports = useAtomValue(threeExportsAtom);

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
            <Canvas>
                <Render></Render>
            </Canvas>
            <div style={{ position: "absolute", right: 10, bottom: 10 }}>
                <button onClick={() => {
                    if (!threeExports) {
                        return;
                    }

                    const { scene } = threeExports;
                    scene.traverse(console.log);

                }}>Scene</button>
            </div>
        </div>

    )
}

export default TestPage