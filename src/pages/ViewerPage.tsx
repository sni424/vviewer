import React from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { loadHistoryAtom, modalAtom, panelTabAtom, sourceAtom, Tabs, threeExportsAtom, useModal } from '../scripts/atoms';
import SceneInfo from '../components/SceneInfo';
import useFiles from '../scripts/useFiles';
import SceneTree from '../components/SceneTree';
import RendererContainer from '../components/canvas/Renderer';
import MeshInfoPanel from '../components/MeshInfoPanel';
import MaterialPanelContainer from '../components/MaterialPanel';
import Modal from '../components/Modal';
import { Scene, THREE } from '../scripts/VTHREE';

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




const useModelDragAndDrop = () => {
    const [isDragging, setIsDragging] = useState(false);
    const setSourceUrls = useSetAtom(sourceAtom);
    const threeExports = useAtomValue(threeExportsAtom);

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

            const gltfs = filteredFiles.filter(file => file.name.toLowerCase().endsWith(".gltf") || file.name.toLowerCase().endsWith(".glb"));;
            const lightmaps = filteredFiles.filter(file => file.name.toLowerCase().endsWith(".png"));

            const fileUrls = gltfs.map((file) => {
                const retval = { name: file.name, url: URL.createObjectURL(file), file, lightmap: undefined as File | undefined };
                const filenameWithoutExtension = file.name.split(".")[0];
                // 모델명_Lightmap.png인 경우도 있고 모델명.png인 경우도 있다
                const lightmap = lightmaps.find(lightmap => {
                    const lightmapeName = lightmap.name.split(".")[0];
                    return filenameWithoutExtension === lightmapeName || filenameWithoutExtension + "_Lightmap" === lightmapeName;
                });
                if (lightmap) {
                    retval.lightmap = lightmap;
                }
                return retval;
            });
            setSourceUrls(fileUrls);



            if (threeExports) {
                const jsons = filteredFiles.filter(file => file.name.toLowerCase().endsWith(".json"));

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