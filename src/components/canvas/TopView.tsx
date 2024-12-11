import { Canvas, useFrame, useThree } from '@react-three/fiber'
import React, { useEffect, useRef } from 'react'
import { THREE } from '../../scripts/VTHREE';
import { threeExportsAtom } from '../../scripts/atoms';
import { useAtomValue } from 'jotai';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

function TopView() {
    const threeExports = useAtomValue(threeExportsAtom);
    // const { gl, scene } = useThree();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const orthoCameraRef = useRef<THREE.OrthographicCamera>()
    const topviewRenderer = useRef<THREE.WebGLRenderer>()
    const orbitControls = useRef<OrbitControls>()

    useEffect(() => {
        if (!canvasRef.current || !threeExports) {
            return;
        }

        const context = canvasRef.current.getContext('webgl2', { alpha: false });
        if (!context) {
            debugger;
            return;
        }

        // const aspect = window.innerWidth / window.innerHeight;
        // this element's parent
        const aspect = canvasRef.current.parentElement!.clientWidth / canvasRef.current.parentElement!.clientHeight;


        orthoCameraRef.current = new THREE.OrthographicCamera(
            -10 * aspect, // left
            10 * aspect,  // right
            10,           // top
            -10,          // bottom
            0.1,         // near
            1000         // far
        )
        orbitControls.current = new OrbitControls(orthoCameraRef.current, canvasRef.current);

        orthoCameraRef.current.position.set(0, 100, 0);
        orthoCameraRef.current.rotation.set(-Math.PI / 2, 0, 0);
        // orthoCameraRef.current.rotation.set(0, 0, 0);
        // orthoCameraRef.current.rotation.set(1, 1, 1);

        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
        topviewRenderer.current = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            context: context,

        });
        topviewRenderer.current.setSize(canvasRef.current.width, canvasRef.current.height);
        topviewRenderer.current.setPixelRatio(window.devicePixelRatio);


        let anim = 0;
        const render = () => {
            const { scene } = threeExports;
            let meshCount = 0;
            scene.traverse(obj => {
                if (obj.type === "Mesh") {
                    meshCount++;
                }
            })

            orbitControls.current!.update();

            topviewRenderer.current!.render(scene, orthoCameraRef.current!);
            console.log(meshCount);
            anim = requestAnimationFrame(render);
        }

        anim = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(anim);
        }
    }, [threeExports]);

    // useFrame(() => {
    //     if (!canvasRef.current || !topviewRenderer.current || !orthoCameraRef.current || !threeExports) { return; }
    //     const ctx = canvasRef.current.getContext('2d');
    //     if (!ctx) { return; }

    //     const { scene } = threeExports;

    //     topviewRenderer.current.render(scene, orthoCameraRef.current);
    // });

    return (
        <canvas style={{ width: "100%", height: "100%" }} ref={canvasRef}></canvas>
    )
}


export default TopView