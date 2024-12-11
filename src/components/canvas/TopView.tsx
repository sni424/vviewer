import { Canvas, useFrame, useThree } from '@react-three/fiber'
import React, { useEffect, useRef } from 'react'
import { THREE } from '../../scripts/VTHREE';
import { getTestCameraPos, mainCameraPosAtom, mainCameraProjectedAtom, threeExportsAtom } from '../../scripts/atoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

function TopView() {
    const threeExports = useAtomValue(threeExportsAtom);
    // const { gl, scene } = useThree();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const orthoCameraRef = useRef<THREE.OrthographicCamera>()
    const topviewRenderer = useRef<THREE.WebGLRenderer>()
    const orbitControls = useRef<OrbitControls>()
    const testCameraPos = useAtomValue(mainCameraPosAtom);
    const setMainCameraProjected = useSetAtom(mainCameraProjectedAtom);
    // const testCameraPosRef = useRef<[number, number]>();
    // const testCameraSphereRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>>(
    //     new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffff00 }))
    // );

    // useEffect(() => {
    //     if (!testCameraPos) {
    //         return;
    //     }
    //     if (!testCameraPosRef.current) {
    //         testCameraPosRef.current = testCameraPos;
    //     }
    // }, [testCameraPos]);

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
        const parentWidth = canvasRef.current.parentElement!.clientWidth;
        const parentHeight = canvasRef.current.parentElement!.clientHeight;
        const aspect = parentWidth / parentHeight;

        const camRatio = 11;
        orthoCameraRef.current = new THREE.OrthographicCamera(
            -camRatio * aspect, // left
            camRatio * aspect,  // right
            camRatio,           // top
            -camRatio,          // bottom
            0.1,         // near
            1000         // far
        )
        orbitControls.current = new OrbitControls(orthoCameraRef.current, canvasRef.current);

        orthoCameraRef.current.position.set(0, 10, 0);
        orthoCameraRef.current.rotation.set(-Math.PI / 2, 0, 0);
        // orthoCameraRef.current.rotation.set(0, 0, 0);
        // orthoCameraRef.current.rotation.set(1, 1, 1);

        canvasRef.current.width = parentWidth;
        canvasRef.current.height = parentHeight;
        topviewRenderer.current = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            context: context,

        });
        topviewRenderer.current.setSize(parentWidth, parentHeight);
        topviewRenderer.current.setPixelRatio(window.devicePixelRatio);


        let anim = 0;
        const render = () => {
            anim = requestAnimationFrame(render);
            const { scene } = threeExports;
            orbitControls.current!.update();

            const camPos = (testCameraPos) as unknown as THREE.Vector3;
            if (camPos) {
                // console.log(testCameraPosRef.current.screenPosition(orthoCameraRef.current!, parentWidth, parentHeight))
                // console.log(testCameraPosRef.current);
                const sp = camPos.screenPosition(orthoCameraRef.current!, parentWidth, parentHeight);
                // let {x, y} = sp;
                // x = (x/camRatio/aspect)*2 - 1;
                // y = (y/camRatio)*2 - 1;
                // console.log(sp);
                setMainCameraProjected([sp.x, sp.y]);
            }

            topviewRenderer.current!.render(scene, orthoCameraRef.current!);
        }

        anim = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(anim);
        }
    }, [threeExports, testCameraPos]);

    // useFrame(() => {
    //     if (!canvasRef.current || !topviewRenderer.current || !orthoCameraRef.current || !threeExports) { return; }
    //     const ctx = canvasRef.current.getContext('2d');
    //     if (!ctx) { return; }

    //     const { scene } = threeExports;

    //     topviewRenderer.current.render(scene, orthoCameraRef.current);
    // });

    return (
        <>
            <canvas style={{ width: "100%", height: "100%" }} ref={canvasRef}></canvas>
        </>

    )
}


export default TopView