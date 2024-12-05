import { GizmoHelper, GizmoViewport, OrbitControls, } from '@react-three/drei'
import { Canvas, RootState, useThree } from '@react-three/fiber'
import VGLTFLoader from '../../scripts/VGLTFLoader';
import { useEffect, useRef } from 'react';
import { Scene, Texture, THREE } from '../../scripts/VTHREE';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { cameraMatrixAtom, loadHistoryAtom, materialSelectedAtom, selectedAtom, sourceAtom, threeExportsAtom } from '../../scripts/atoms';
import { TransformControlsPlane } from 'three/examples/jsm/Addons.js';
import { __UNDEFINED__ } from '../../Constants';
import MyEnvironment from './EnvironmentMap';
import SelectBox from './SelectBox';
import { getIntersects } from '../../scripts/utils';
import Gizmo from './Gizmo';

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
        <OrbitControls makeDefault onChange={e => {
            const matrix = e?.target.object.matrix.clone()
            setCameraAtom(matrix);
        }} />
        <MyEnvironment></MyEnvironment>
        <SelectBox></SelectBox>
        {/* <Gizmo></Gizmo> */}
        <GizmoHelper
            name='GizmoHelper'
            alignment="bottom-right" // widget alignment within scene
            margin={[80, 80]} // widget margins (X, Y)
            
        >
            <GizmoViewport name='GizmoHelper' axisColors={['red', 'green', 'blue']} labelColor="black" />
        </GizmoHelper>
    </>
}


function RendererContainer() {
    const threeExports = useAtomValue(threeExportsAtom);
    const [selected, setSelected] = useAtom(selectedAtom);
    const setMaterialSelected = useSetAtom(materialSelectedAtom);
    const lastClickRef = useRef<number>(0);

    useEffect(() => {
        if (!threeExports) {
            return;
        }
        const keyHandler = (e: KeyboardEvent) => {
            // on escape
            if (e.key === "Escape") {
                setSelected([]);
                setMaterialSelected(null);
                return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === "a") {
                e.preventDefault();
                const everyObject: string[] = [];
                threeExports?.scene.traverse(obj => {
                    if (obj.type === "BoxHelper") {
                        return;
                    }
                    everyObject.push(obj.uuid);
                });
                setSelected(everyObject);
                return;
            }

            if (e.key.toLowerCase() === "a") {
                const { scene } = threeExports;
                // get all objects in scene
                const everyObject: string[] = [];
                scene.traverse(obj => {
                    if (obj.type === "BoxHelper") {
                        return;
                    }
                    everyObject.push(obj.uuid);
                });
            }
        }

        window.addEventListener("keydown", keyHandler);
        return () => {
            window.removeEventListener("keydown", keyHandler);
        }
    }, [threeExports]);



    return (
        <div style={{
            width: "100%",
            height: "100%",
        }}>
            <Canvas
                onMouseDown={() => {
                    lastClickRef.current = Date.now();
                }}
                onMouseUp={(e) => {

                    if (!threeExports) {
                        return;
                    }

                    if (Date.now() - lastClickRef.current > 200) {
                        return;
                    }

                    const { intersects, mesh } = getIntersects(e, threeExports);

                    if (intersects.length > 0) {
                        // console.log(intersects[0].object.uuid);

                        if (e.ctrlKey) {
                            setSelected(selected => {
                                if (selected.includes(intersects[0].object.uuid)) {
                                    setMaterialSelected(null);
                                    return selected.filter(uuid => uuid !== intersects[0].object.uuid);
                                }
                                if (intersects[0].object.type === "Mesh") {
                                    setMaterialSelected((intersects[0].object as THREE.Mesh).material as THREE.Material);
                                }
                                return [...selected, intersects[0].object.uuid];
                            });
                        } else {
                            setSelected([intersects[0].object.uuid]);
                            if (intersects[0].object.type === "Mesh") {
                                setMaterialSelected((intersects[0].object as THREE.Mesh).material as THREE.Material);
                            }
                        }

                        // if riht 
                        // if (e.button === 2) {

                        // }
                    } else {
                        setSelected([]);
                        // console.log("none")
                    }
                }}
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