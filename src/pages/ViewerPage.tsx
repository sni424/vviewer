import React, { useEffect, useRef } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { cameraMatrixAtom, cameraSettingAtom, lastCameraInfoAtom, loadHistoryAtom, MapDst, modalAtom, ModelSource, orbitSettingAtom, panelTabAtom, sourceAtom, Tabs, threeExportsAtom, useModal } from '../scripts/atoms';
import SceneInfo from '../components/SceneInfo';
import useFiles from '../scripts/useFiles';
import SceneTree from '../components/SceneTree';
import RendererContainer from '../components/canvas/Renderer';
import MeshInfoPanel from '../components/MeshInfoPanel';
import MaterialPanelContainer from '../components/MaterialPanel';
import Modal from '../components/Modal';
import { Quaternion, Scene, THREE, Vector3 } from '../scripts/VTHREE';

declare global {
    interface Map<K, V> {
        reduce<T>(callback: (accumulator: T, value: V, key: K, map: Map<K, V>) => T, initialValue: T): T;
    }
}



Map.prototype.reduce = function <K, V, T>(
    this: Map<K, V>,
    callback: (accumulator: T, value: V, key: K, map: Map<K, V>) => T,
    initialValue: T
): T {
    let accumulator = initialValue;
    for (const [key, value] of this) {
        accumulator = callback(accumulator, value, key, this);
    }
    return accumulator;
};

const ThePanel = () => {
    const loadHistory = useAtomValue(loadHistoryAtom);
    const [tab, setTab] = useAtom(panelTabAtom)

    return <div style={{
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
    }}>
        <div style={{
            height: 30,
            // display: "flex",
            // justifyContent: "space-between",
            // alignItems: "center",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))", /* Equal width for each element */
            width: "100%",
        }}>
            {Tabs.map((t) => {
                return <button style={{ height: "100%", textTransform: "capitalize", borderBottom: tab === t ? "none" : undefined, fontWeight: tab === t ? "bold" : undefined }} key={"tab-" + t} onClick={() => setTab(t)}>{t}</button>
            })}
        </div>
        <div style={{
            flex: 1,
            minHeight: 0,
        }}>
            {
                tab === "scene" ? <SceneInfo /> : <SceneTree></SceneTree>
            }
        </div>
    </div>
}

const CameraPanel = () => {

    const [isCameraPanel, setCameraPanel] = useState(true)
    const [positionY, setPositionY] = useState<number>(0);
    const threeExports = useAtomValue(threeExportsAtom);
    const cameraMatrix = useAtomValue(cameraMatrixAtom);
    const [cameraSetting, setCameraSetting] = useAtom(cameraSettingAtom)

    const [isOrbit, setOrbit] = useAtom(orbitSettingAtom)
    const setLastCameraInfo = useSetAtom(lastCameraInfoAtom)

    // useEffect는 항상 최상위에서 호출되도록 함
    useEffect(() => {
        if (threeExports && threeExports.camera) {
            const newY = Number(threeExports.camera.position.y.toFixed(2))
            setPositionY(newY);
        }
    }, [threeExports, cameraMatrix]);

    if (!threeExports) {
        return null; // early return
    }

    const { camera } = threeExports;
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    cameraMatrix?.decompose(position, rotation, scale);

    const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newY = Number(parseFloat(e.target.value).toFixed(2)) || 0;
        setPositionY(newY);
        camera.position.y = newY;
        camera.updateProjectionMatrix();
        setLastCameraInfo(pre => ({
            ...pre,
            position: camera.position.clone()
        }))
    };

    return (
        <>
            {isCameraPanel ?
                <div style={{ backgroundColor: "lightgray" }}>
                    <section >
                        <div style={{ display: "flex", width: "95%", margin: "0 auto", alignItems: "center", justifyContent: "space-between" }}>
                            <strong>카메라</strong>
                            <div style={{ cursor: "pointer" }}
                                onClick={() => {
                                    setCameraPanel(false)
                                }}
                            >X</div>
                        </div>
                        <div style={{
                            margin: "0 auto", width: "90%", paddingBottom: "8px"
                            , fontSize: "14px"
                        }}>
                            <div>
                                <label >isoView</label>
                                <input type="checkbox" id="isoView" name="isoView" onChange={e => {

                                    setCameraSetting(pre => ({
                                        ...pre,
                                        isoView: e.target.checked
                                    }))
                                }} />
                            </div>
                            <div>
                                <label >isOrbit</label>
                                <input type="checkbox" id="autoRotate" name="autoRotate"
                                    checked={isOrbit.enable}
                                    onChange={e => {
                                        if (cameraSetting.isoView) {
                                            window.alert("isoView에서는 orbit 비활성이 불가능 합니다.")
                                            return
                                        }
                                        setOrbit(pre => ({
                                            ...pre,
                                            enable: e.target.checked
                                        }))
                                    }} />
                            </div>
                            <div>
                                <label >autoRotate</label>
                                <input type="checkbox" id="autoRotate" name="autoRotate"
                                    defaultChecked
                                    onChange={e => {
                                        setOrbit(pre => ({
                                            ...pre,
                                            autoRotate: e.target.checked
                                        }))
                                    }} />
                            </div>
                            <div style={{
                                boxSizing: "border-box",
                                width: "100%"
                            }}>
                                <label>카메라 높이</label>
                                <input
                                    style={{
                                        boxSizing: "border-box",
                                        width: "100%"
                                    }}
                                    type="number"
                                    value={positionY}
                                    onChange={handleYChange}
                                />
                            </div>
                            <div style={{
                                boxSizing: "border-box",
                                width: "100%"
                            }}>
                                <label>카메라 이동속도</label>
                                <input
                                    style={{
                                        boxSizing: "border-box",
                                        width: "100%"
                                    }}
                                    type="number"
                                    value={cameraSetting ? cameraSetting.moveSpeed : 0}
                                    onChange={(e) => {
                                        const newSpeed = parseFloat(e.target.value)
                                        setCameraSetting(pre => ({
                                            ...pre,
                                            moveSpeed: newSpeed
                                        }))
                                    }}
                                />
                            </div>
                        </div>
                    </section>
                </div> : <div style={{ display: "flex", justifyContent: "end", cursor: "pointer" }}
                    onClick={() => {
                        setCameraPanel(true)
                    }}
                >확대</div>
            }

        </>
    )
}


const MapSelectModal = ({ gltfs, inputMaps, closeModal }: { closeModal?: () => any; gltfs: File[]; inputMaps: File[] }) => {
    const [mapDst, setMapDst] = useState<MapDst>("lightmap");
    const setSourceUrls = useSetAtom(sourceAtom);

    return <div
        style={{ boxSizing: "border-box", padding: 16, borderRadius: 8, backgroundColor: "#ffffffdd" }}
        onClick={e => {
            // e.preventDefault();
            e.stopPropagation();
        }}
    >
        <strong>맵 일괄적용</strong>
        <select value={mapDst} onChange={(e) => {
            setMapDst(e.target.value as MapDst);
        }}>
            <option value="lightmap">라이트맵</option>
            <option value="emissivemap">이미시브</option>
            {/* <option value="envmap">Env맵</option> */}
        </select>

        <div style={{ justifyContent: "end", width: "100%", display: "flex", marginTop: 12 }}>
            <button onClick={() => {
                setSourceUrls([]);
                closeModal?.();
            }}>취소</button>
            <button onClick={() => {

                const fileUrls = gltfs.map((file) => {
                    const retval: ModelSource = { name: file.name, url: URL.createObjectURL(file), file, map: undefined as File | undefined };
                    const filenameWithoutExtension = file.name.split(".")[0];
                    // 모델명_Lightmap.png인 경우도 있고 모델명.png인 경우도 있다
                    const map = inputMaps.find(lightmap => {
                        const lightmapeName = lightmap.name.split(".")[0];
                        return filenameWithoutExtension === lightmapeName || filenameWithoutExtension + "_Lightmap" === lightmapeName;
                    });
                    if (map) {
                        retval.map = map;
                        retval.mapDst = mapDst;
                    }
                    return retval;
                });
                setSourceUrls(fileUrls);

                closeModal?.();
            }}>확인</button>
        </div>
    </div>
}

const useModelDragAndDrop = () => {
    const [isDragging, setIsDragging] = useState(false);
    const setSourceUrls = useSetAtom(sourceAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    const { openModal, closeModal } = useModal();

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {

            const acceptedExtensions = ['.gltf', '.glb', ".json", "png"];
            const files = Array.from(event.dataTransfer.files);

            // Filter files by .gltf and .glb extensions
            const filteredFiles = files.filter((file) =>
                acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
            );

            if (filteredFiles.length === 0) {
                alert("Only .gltf and .glb, .json, .png files are accepted.");
                return;
            }

            // 1. 씬이 저장된 .json파일
            const jsons = filteredFiles.filter(file => file.name.toLowerCase().endsWith(".json"));
            if (threeExports && jsons.length > 0) {

                const loader = new THREE.ObjectLoader();
                jsons.forEach(jsonFile => {
                    // scene.toJSON()
                    const reader = new FileReader();
                    reader.readAsText(jsonFile);

                    const { scene } = threeExports;
                    reader.onload = function () {
                        const obj = JSON.parse(reader.result as string);
                        const parsedScene = loader.parse(obj);
                        scene.add(parsedScene);
                    }
                })

                // if (!filteredFiles.every(file => file.name.toLowerCase().endsWith(".json"))) {
                //     alert("JSON이 아닌 파일들은 무시되었음");
                // }

                // return;
            }

            const gltfs = filteredFiles.filter(file => file.name.toLowerCase().endsWith(".gltf") || file.name.toLowerCase().endsWith(".glb"));;
            const inputMaps = filteredFiles.filter(file => file.name.toLowerCase().endsWith(".png"));

            // 이미지파일이 있으면 Lightmap에 넣을지 Emissive에 넣을지 등을 선택해야한다.
            const hasMaps = inputMaps.length > 0;

            // 2. 모델 + 이미지
            if (hasMaps) {
                openModal((props) => <MapSelectModal {...props} gltfs={gltfs} inputMaps={inputMaps} />);
            } else {
                // 3. 모델만
                const fileUrls = gltfs.map((file) => ({ name: file.name, url: URL.createObjectURL(file), file }));
                setSourceUrls(fileUrls);
            }

            event.dataTransfer.clearData();
        }
    };

    return {
        isDragging,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    }
}



function Loading() {
    // const loadings = useAtomValue(loadingsAtom);
    // const loadingHistory = useAtomValue(loadHistoryAtom);
    const files = useFiles();
    const { loadingFiles } = files;
    const hasLoading = loadingFiles.length > 0;

    return <>
        {hasLoading && <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
        }}>
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                padding: 16,
                borderRadius: 8,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
            }}>
                <div style={{
                    fontSize: 20,
                    fontWeight: "bold",
                }}>
                    Loading {loadingFiles.length} files...
                </div>
                <div style={{
                    marginTop: 16,
                }}>
                    {loadingFiles.map(({ name }, index) => (
                        <div key={index}>{name}</div>
                    ))}
                </div>
            </div>



        </div>}
    </>
}

const MyModal = ({ closeModal }: { closeModal?: () => any }) => {

    return <div style={{ backgroundColor: "white", padding: 16, borderRadius: 8 }} onClick={(e) => {
        e.stopPropagation();
    }}>asdf <button onClick={(e) => {
        e.stopPropagation();
        closeModal?.()
    }}>close</button></div>;
}

const ControlPanel = () => {
    const threeExports = useAtomValue(threeExportsAtom);
    const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);
    // const { openModal } = useModal();
    const setModal = useSetAtom(modalAtom);

    if (!threeExports) {
        return null;
    }

    // return null;

    return <div
        style={{ position: "absolute", top: 8, left: 8, padding: 4, borderRadius: 4, backgroundColor: "rgba(0, 0, 0, 0.1)" }}>

        <button onClick={() => {
            setModal(MyModal);
        }}>Modal</button>

        {/* <button onClick={() => {
      //@ts-ignore
      threeExports.scene.children.forEach(child => {
        //@ts-ignore
        threeExports.scene.remove(child);
      })

      setLoadHistoryAtom(new Map());
    }}>Reset</button> */}
    </div>
}


const ViewerPage = () => {
    const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useModelDragAndDrop();
    // 오른쪽 패널을 
    const panelRef = useRef(null);
    const [rightOffset, setRightOffset] = useState("0px");

    useEffect(() => {
        const updateOffset = () => {
            if (panelRef.current) {
                // 패널의 실제 너비 계산
                const panelWidth = panelRef.current.getBoundingClientRect().width;
                setRightOffset(`${panelWidth}px`);
            }
        };

        // 초기 계산
        updateOffset();

        // 창 크기가 변경될 때도 다시 계산
        window.addEventListener("resize", updateOffset);
        return () => window.removeEventListener("resize", updateOffset);
    }, []);
    return <div style={{
        width: "100vw",
        height: "100vh",
        cursor: isDragging ? "copy" : "auto",
        position: "relative",
        display: "flex",
    }}

    >
        <div style={{
            flex: 1,
            minWidth: 0,
            height: "100%",

        }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <RendererContainer />
        </div>
        <div style={{
            position: "absolute",
            right: rightOffset,
            width: "10%",
            height: "10%",
        }}>
            <CameraPanel />
        </div>
        <div
            ref={panelRef}
            style={{
                width: "25%",
                maxWidth: "400px",
                minWidth: "240px",
                height: "100%",
            }}>

            <ThePanel />
        </div>
        {/* <ControlPanel></ControlPanel> */}
        <MaterialPanelContainer></MaterialPanelContainer>
        <MeshInfoPanel></MeshInfoPanel>
        <Modal></Modal>
        <Loading />
    </div>
}

export default ViewerPage;