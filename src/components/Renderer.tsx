import { Box, Environment, OrbitControls, OrthographicCamera } from '@react-three/drei'
import { Canvas, RootState, useThree } from '@react-three/fiber'
import VGLTFLoader from '../scripts/VGLTFLoader';
import { useEffect, useRef } from 'react';
import { Scene, Texture, THREE } from '../scripts/VTHREE';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { cameraMatrixAtom, envAtom, loadHistoryAtom, materialSelectedAtom, selectedAtom, sourceAtom, threeExportsAtom } from '../scripts/atoms';
import { TransformControlsPlane } from 'three/examples/jsm/Addons.js';
import { __UNDEFINED__ } from '../Constants';

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
        if (!env.url || env.url === __UNDEFINED__) {
            return null;
        }
        return <Environment files={env.url} environmentIntensity={intensity} />
    }

    if (env.select === "url") {
        if (!env.url || env.url === __UNDEFINED__) {
            return null;
        }
        return <Environment files={env.url} environmentIntensity={intensity} />
    }
}

const SelectBox = () => {
    const selecteds = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    if (!threeExports) {
        return null;
    }

    if (selecteds.length === 0) {
        const { scene } = threeExports;
        const deletes: string[] = [];
        scene.traverse(obj => {
            if (obj.userData.boxhelper) {
                deletes.push(obj.uuid);
            }
        })
        scene.remove(...deletes.map(uuid => scene.getObjectByProperty("uuid", uuid)!));
        return;
    }

    const { scene } = threeExports;
    const existings: string[] = [];
    scene.traverse(obj => {
        if (obj.userData.boxhelper) {
            existings.push(obj.uuid);
        }
    })
    const keeps: string[] = [];
    const deletes: string[] = [];
    const adds: string[] = [];
    selecteds.forEach(select => {
        // add to keeps, deletes, adds
        if (existings.includes(select)) {
            keeps.push(select);
        } else {
            adds.push(select);
        }
    })
    existings.forEach(existing => {
        if (!selecteds.includes(existing)) {
            deletes.push(existing);
        }
    });
    deletes.forEach(deleteUuid => {
        const helper = scene.getObjectByProperty("uuid", deleteUuid);
        if (helper) {
            scene.remove(helper);
        }
    });
    adds.forEach(addUuid => {
        const selectedObject = scene.getObjectByProperty("uuid", addUuid);
        if (!selectedObject) {
            return;
        }
        const helper = new THREE.BoxHelper(selectedObject, 0xff0000);
        helper.userData.boxhelper = true;
        scene.add(helper);
    });

    return null;

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
        <SelectBox></SelectBox>
    </>
}

const getIntersects = (
    e: React.MouseEvent,
    threeExports: RootState | null,
    raycaster: THREE.Raycaster = new THREE.Raycaster(),
    filterUserdataIgnoreRaycast = true, // Object3D.userData.ignoreRayCast가 true인 아이들은 무시
) => {

    if (!threeExports) {
        console.error(
            'Three가 셋업되지 않은 상태에서 Intersect가 불림 @useEditorInputEvents',
        );
        return {
            intersects: [],
            mesh: [],
            otherUserCameras: [],
            review: [],
        };
    }
    const { scene, camera } = threeExports;
    const mouse = new THREE.Vector2();
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    mouse.x = xRatio * 2 - 1;
    mouse.y = -yRatio * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const isGizmo = (obj: THREE.Object3D) =>
        ['translate', 'rotate', 'scale'].includes(
            (obj as TransformControlsPlane).mode,
        );
    const isBoxHelper = (obj: THREE.Object3D) => obj.type === 'BoxHelper';
    const dstObjects = filterUserdataIgnoreRaycast
        ? scene.children.filter(
            obj => !obj.getUserData().ignoreRaycast && !isGizmo(obj) && !isBoxHelper(obj),
        )
        : scene.children;
    const intersects = raycaster.intersectObjects(dstObjects, true) as THREE.Intersection[];

    const mesh = intersects.filter(obj => obj.object.type === 'Mesh') as THREE.Intersection<THREE.Mesh>[];

    return { intersects, mesh };
};

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
                        console.log(intersects[0].object.uuid);

                        if (e.ctrlKey) {
                            setSelected(selected => {
                                if (selected.includes(intersects[0].object.uuid)) {
                                    return selected.filter(uuid => uuid !== intersects[0].object.uuid);
                                }
                                return [...selected, intersects[0].object.uuid];
                            });
                        } else {
                            setSelected([intersects[0].object.uuid]);
                        }

                        // if riht 
                        if (e.button === 2) {
                            if (intersects[0].object.type === "Mesh") {
                                setMaterialSelected((intersects[0].object as THREE.Mesh).material as THREE.Material);
                            }
                        }
                    } else {
                        setSelected([]);
                        console.log("none")
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