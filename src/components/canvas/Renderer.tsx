import { GizmoHelper, GizmoViewport, } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import VGLTFLoader from '../../scripts/VGLTFLoader';
import { useEffect, useRef, useState } from 'react';
import { THREE } from '../../scripts/VTHREE';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
    cameraMatrixAtom,
    globalGlAtom,
    loadHistoryAtom,
    materialSelectedAtom,
    selectedAtom,
    sourceAtom,
    threeExportsAtom,
    treeScrollToAtom,
} from '../../scripts/atoms';
import { __UNDEFINED__ } from '../../Constants';
import MyEnvironment from './EnvironmentMap';
import SelectBox from './SelectBox';
import { getIntersects, loadScene, saveScene } from '../../scripts/utils';
import GlobalContrast from './GlobalContrast';
import GlobalColorTemperature from './GlobalColorTemperature';
import GlobalSaturationCheck from './GlobalSaturationCheck';
import UnifiedCameraControls from '../camera/UnifiedCameraControls';
import PostProcess from './PostProcess';
import { useSetThreeExports } from './Viewport';

function Renderer() {
    // useStats();
    const threeExports = useThree();
    const sources = useAtomValue(sourceAtom);
    const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);
    const setThreeExportsAtom = useSetAtom(threeExportsAtom);
    // const setSharedExports = useSetAtom(sharedThreeAtom);
    const setSharedExports = useSetThreeExports();
    const { scene, camera } = threeExports;
    const setCameraAtom = useSetAtom(cameraMatrixAtom);

    const [model, setModel] = useState<any>(null)

    useEffect(() => {
        setThreeExportsAtom(threeExports);
        camera.position.set(1, 1, 1);
        const mat = camera.matrix.clone();
        setCameraAtom(mat);
        setSharedExports(threeExports);
        // setSharedExports(threeExports);

        // const emptyEnvironment = new Texture();
        // const img = new ImageData(1, 1);
        // img.data[0] = 255;
        // img.data[1] = 0;
        // img.data[2] = 0;
        // emptyEnvironment.colorSpace = "sRGB";
        // emptyEnvironment.image = img;
        // emptyEnvironment.needsUpdate = true;
        // scene.environment = emptyEnvironment;
        // scene.environment = 

    }, []);

    useEffect(() => {

        sources.forEach(source => {
            const { name, url, file, map, mapDst } = source;
            // setLoadingsAtom(loadings => [...loadings, source]);
            setLoadHistoryAtom(history => {
                const newHistory = new Map(history);
                //@ts-ignore
                newHistory.set(url, { name, start: Date.now(), end: 0, file, uuid: null });
                return newHistory;
            })

            new VGLTFLoader().loadAsync(url).then(gltf => {
                gltf.scene.name = name + "-" + gltf.scene.name;

                if (map) {
                    const texture = new THREE.TextureLoader().load(URL.createObjectURL(map));
                    texture.flipY = !texture.flipY;
                    texture.channel = 1;
                    texture.needsUpdate = true;
                    gltf.scene.traverse((obj) => {
                        if (obj.type === "Mesh") {
                            const material = ((obj as THREE.Mesh).material as THREE.MeshStandardMaterial);
                            if (!material) {
                                (obj as THREE.Mesh).material = new THREE.MeshStandardMaterial();
                            }
                            if (mapDst === "lightmap" || !mapDst) {
                                material.lightMap = texture;
                            } else if (mapDst === "emissivemap") {
                                //three.js 특성상 emissiveMap을 적용하려면 emissive를 설정해야함
                                material.emissive = new THREE.Color(0xffffff);
                                material.emissiveMap = texture;
                                material.emissiveIntensity = 0.5;
                            } else {
                                throw new Error("Invalid mapDst @Renderer");
                            }

                            material.needsUpdate = true;
                        }
                    })
                }
                scene.add(gltf.scene);
                setModel(gltf.scene)
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
        {/* <OrbitControls makeDefault onChange={e => {
            const matrix = e?.target.object.matrix.clone()
            setCameraAtom(matrix);
        }} /> */}
        <UnifiedCameraControls />
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
        <GlobalContrast></GlobalContrast>
        {/*<GlobalToneMapping></GlobalToneMapping> */}
        <GlobalColorTemperature></GlobalColorTemperature>
        <GlobalSaturationCheck></GlobalSaturationCheck>
        <PostProcess></PostProcess>
    </>
}


function RendererContainer() {
    const threeExports = useAtomValue(threeExportsAtom);
    const [selected, setSelected] = useAtom(selectedAtom);
    const setMaterialSelected = useSetAtom(materialSelectedAtom);
    const setScrollTo = useSetAtom(treeScrollToAtom);
    const gl = useAtomValue(globalGlAtom);
    const lastClickRef = useRef<number>(0);
    const cameraLayer = new THREE.Layers();
    cameraLayer.enableAll();
    const mouseDownPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    // 드래그로 간주할 최소 거리
    const dragThreshold = 5;

    useEffect(() => {
        if (!threeExports) {
            return;
        }

        const { scene } = threeExports;
        const keyHandler = (e: KeyboardEvent) => {
            // on escape
            if (e.key === "Escape") {
                setSelected([]);
                setMaterialSelected(null);
                setScrollTo(null);
                return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === "a") {
                e.preventDefault();
                const everyObject: string[] = [];
                scene.traverse(obj => {
                    if (obj.type === "BoxHelper") {
                        return;
                    }
                    everyObject.push(obj.uuid);
                });
                setSelected(everyObject);
                return;
            }

            if (e.key === "Delete") {
                e.preventDefault();
                let deletes: THREE.Object3D[] = [];
                scene.traverse(obj => {
                    if (selected.includes(obj.uuid)) {
                        deletes.push(obj);
                    }
                })
                console.log(deletes)

                deletes.forEach(obj => {
                    obj.removeFromParent();
                });
                deletes = [];

                const { gl } = threeExports;
                gl.renderLists.dispose()
                setSelected([]);
                return;
            }

            // ctrl s
            if (e.ctrlKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                saveScene(scene).then(() => {
                    alert("저장 완료")
                })
                return;
            }

            // ctrl l
            if (e.ctrlKey && (e.key.toLowerCase() === "l")) {
                e.preventDefault();
                loadScene().then(loaded => {
                    if (loaded) {
                        scene.removeFromParent();
                        scene.add(loaded);
                        alert("로드 완료")
                    }
                }).catch(e => {
                    alert("로드 실패")
                })
            }
        }

        window.addEventListener("keydown", keyHandler);
        return () => {
            window.removeEventListener("keydown", keyHandler);
        }
    }, [threeExports, selected]);

    return (
        <div
            id='canvasDiv'
            style={{
                width: "100%",
                height: "100%",
            }}>
            <Canvas
                // gl={{
                //     antialias: true,
                //     alpha: true,
                //     powerPreference: "high-performance",
                //     stencil: false,
                //     depth: true,
                //     logarithmicDepthBuffer: true,
                //     premultipliedAlpha: false,
                //     preserveDrawingBuffer: true,
                //     autoClear: false,
                //     autoClearColor: false,
                //     autoClearDepth: false,
                //     autoClearStencil: false,
                //     extensions: null,
                //     forceContextLoss: false,
                //     maxLights: 4,
                //     physicallyCorrectLights: false,
                //     pixelRatio: 1,
                //     precision: "highp",
                //     shadowMapType: THREE.PCFSoftShadowMap,
                //     toneMapping: THREE.LinearToneMapping,
                //     toneMappingExposure: 1,
                //     toneMappingWhitePoint: 1
                // }}
                // gl={gl}
                gl={gl}
                camera={{ layers: cameraLayer }}
                onMouseDown={(e) => {
                    lastClickRef.current = Date.now();
                    // 마우스 다운 시 위치 저장
                    mouseDownPosition.current = { x: e.clientX, y: e.clientY };
                }}
                onMouseUp={(e) => {

                    if (!threeExports) {
                        return;
                    }

                    // 마우스 업 시 이동 거리 계산
                    const xGap = Math.abs(e.clientX - mouseDownPosition.current.x);
                    const yGap = Math.abs(e.clientY - mouseDownPosition.current.y);



                    // 이동 거리가 임계값 이상이면 드래그로 간주
                    if (xGap > dragThreshold ||
                        yGap > dragThreshold || Date.now() - lastClickRef.current > 200) {
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
                                    setScrollTo(intersects[0].object.uuid);
                                }
                                return [...selected, intersects[0].object.uuid];
                            });
                        } else {
                            if (!intersects[0].object.userData.isProbeMesh) {
                                setSelected([intersects[0].object.uuid]);
                                setScrollTo(intersects[0].object.uuid);
                                if (intersects[0].object.type === "Mesh") {
                                    setMaterialSelected((intersects[0].object as THREE.Mesh).material as THREE.Material);
                                }
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