import { Environment, OrbitControls, OrthographicCamera } from '@react-three/drei'
import { Canvas, RootState, useThree } from '@react-three/fiber'
import VGLTFLoader from './VGLTFLoader';
import { useEffect } from 'react';
import { Texture } from './VTHREE';
import { useAtomValue, useSetAtom } from 'jotai';
import { cameraMatrixAtom, envAtom, loadHistoryAtom, sourceAtom, threeExportsAtom } from './atoms';

function MyEnvironment() {
    const env = useAtomValue(envAtom);
    if (env.select === "none") {
        return null;
    }

    const intensity = env.intensity ?? 1;

    if (env.select === "preset") {
        return <Environment preset={env.preset ?? "apartment"} environmentIntensity={intensity} />
    }

    if (env.select === "custom") {
        if (!env.url) {
            return null;
        }
        return <Environment files={env.url} environmentIntensity={intensity} />
    }
}



function Renderer() {
    const threeExports = useThree();
    const sources = useAtomValue(sourceAtom);
    const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);
    const setThreeExportsAtom = useSetAtom(threeExportsAtom);
    const { scene, camera } = threeExports;
    const setCameraAtom = useSetAtom(cameraMatrixAtom);

    useEffect(() => {
        setThreeExportsAtom(threeExports);
        camera.position.set(1, 1, 1);
        const mat = camera.matrix.clone();
        setCameraAtom(mat);



        const emptyEnvironment = new Texture();
        const img = new ImageData(1, 1);
        img.data[0] = 255;
        img.data[1] = 0;
        img.data[2] = 0;
        emptyEnvironment.colorSpace = "sRGB";
        emptyEnvironment.image = img;
        emptyEnvironment.needsUpdate = true;
        scene.environment = emptyEnvironment;
        // scene.environment = 

    }, []);

    useEffect(() => {

        sources.forEach(source => {
            const { name, url, file } = source;
            // setLoadingsAtom(loadings => [...loadings, source]);
            setLoadHistoryAtom(history => {
                const newHistory = new Map(history);
                //@ts-ignore
                newHistory.set(url, { name, start: Date.now(), end: 0, file, uuid: null });
                return newHistory;
            })

            new VGLTFLoader().loadAsync(url).then(gltf => {
                gltf.scene.name = name + "-" + gltf.scene.name;
                scene.add(gltf.scene);
                // revoke object url
                URL.revokeObjectURL(url);
                setLoadHistoryAtom(history => {
                    const newHistory = new Map(history);
                    newHistory.get(url)!.end = Date.now();
                    newHistory.get(url)!.uuid = gltf.scene.uuid;
                    return newHistory;
                })
            })
        })
    }, [sources]);

    return <>
        {/* <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh> */}
        <OrbitControls onChange={e => {
            const matrix = e?.target.object.matrix.clone()
            setCameraAtom(matrix);
        }} />
        <MyEnvironment></MyEnvironment>
    </>
}

function RendererContainer() {


    return (
        <div style={{
            width: "100%",
            height: "100%",
        }}>
            <Canvas
                style={{
                    width: "100%",
                    height: "100%",
                }}
            >
                <Renderer></Renderer>
            </Canvas>
        </div>
    )
}

export default RendererContainer;