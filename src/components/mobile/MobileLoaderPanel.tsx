import { clear, get, set } from "idb-keyval";
import FileInfoList from "../FileInfoList";
import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { openLoaderAtom, sceneAnalysisAtom, threeExportsAtom, useBenchmark } from "../../scripts/atoms";
import useFilelist from "../../scripts/useFilelist";
import { decompressFileToObject, loadFile } from "../../scripts/utils";
import { THREE } from "../../scripts/VTHREE";
import { FileInfo } from "../../types";
import VGLTFLoader from "../../scripts/VGLTFLoader";

const MobileLoaderPanel = () => {
    const [loading, setLoading] = useState(false);
    const [openLoader, setOpenLoader] = useAtom(openLoaderAtom);
    const { filelist, loading: filelistLoading } = useFilelist();
    const [downloading, setDownloading] = useState(false);
    const { benchmark, addBenchmark } = useBenchmark();
    const threeExports = useAtomValue(threeExportsAtom);
    const setSceneAnalysis = useSetAtom(sceneAnalysisAtom);

    if (!openLoader) {
        return null;
    }

    if (loading || filelistLoading || !threeExports) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100dvh',
                fontSize: '2rem',
            }}>
                loading...
            </div>
        )
    }

    return <div style={{
        width: "80%",
        height: "60%",
        position: "absolute",
        top: "10%",
        left: "10%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "lightgray",
        padding: 16,
        boxSizing: "border-box",
        borderRadius: 8,
        overflow: "auto",
    }}>
        <button onClick={async () => {

            const latestHashUrl = import.meta.env.VITE_LATEST_HASH;
            const latestUrl = import.meta.env.VITE_LATEST;
            if (!latestUrl || !latestHashUrl) {
                alert(".env에 환경변수를 설정해주세요, latestUrl latestHashUrl");
                return;
            }
            addBenchmark("start");
            addBenchmark("downloadStart");
            setDownloading(true);

            const localLatestHash = await get("latest-hash");
            const remoteLatestHash = await (await decompressFileToObject<{ hash: string }>(latestHashUrl)).hash;

            const loadModel = async () => {
                if (!localLatestHash || localLatestHash !== remoteLatestHash) {
                    return decompressFileToObject(latestUrl).then(async (res) => {
                        // alert("decompressFileToObject+" + JSON.stringify(res))

                        await set("latest-hash", remoteLatestHash);
                        await set("latest", res);
                        // await set("latest", JSON.stringify(res));
                        return res;
                    }).catch((e) => {
                        alert("모델을 불러오는데 실패했습니다." + e.message);
                    })
                } else {
                    // return JSON.parse((await get("latest"))!);
                    return get("latest");
                }
            }

            loadModel().then((res) => {
                addBenchmark("downloadEnd");
                addBenchmark("parseStart");
                const loader = new THREE.ObjectLoader();
                const parsedScene = loader.parse(res);
                addBenchmark("parseEnd");

                const { scene } = threeExports;
                // threeExports.scene.add(parsedScene);

                const loadAsync = async () => {

                    // const obj = new THREE.ObjectLoader().parse(modelFiles[0].gltf);


                    scene.add(parsedScene);

                    const interval = setInterval(() => {
                        //@ts-ignore
                        const found = scene.getObjectByProperty("uuid", parsedScene.gltf.uuid);
                        if (found) {
                            // console.log("loaded", elapsed, "ms");

                            // 1초 후에 메시,버텍스, 트라이앵글 수 계산
                            setTimeout(() => {
                                let meshCount = 0;
                                let vertexCount = 0;
                                let triangleCount = 0;
                                let maxVertexInMesh = 0;
                                let maxTriangleInMesh = 0;
                                scene.traverse(obj => {
                                    if (obj instanceof THREE.Mesh) {
                                        meshCount++;
                                        vertexCount += obj.geometry.attributes.position.count;
                                        triangleCount += obj.geometry.index?.count ?? 0;
                                        maxVertexInMesh = Math.max(maxVertexInMesh, obj.geometry.attributes.position.count);
                                        maxTriangleInMesh = Math.max(maxTriangleInMesh, obj.geometry.index?.count ?? 0);
                                    }
                                });
                                console.log("mesh count", meshCount);
                                console.log("vertex count", vertexCount);
                                console.log("triangle count", triangleCount);
                                console.log("max vertex in mesh", maxVertexInMesh);
                                console.log("max triangle in mesh", maxTriangleInMesh);
                                setSceneAnalysis({
                                    meshCount,
                                    vertexCount,
                                    triangleCount,
                                    maxVertexInMesh,
                                    maxTriangleInMesh
                                });

                            }, 1000);

                            clearInterval(interval);
                            addBenchmark("sceneAddEnd");
                            addBenchmark("end");
                        }


                    }, 30);


                }
                return loadAsync();

            }).catch(e => {
                console.error(e);
                alert("모델을 불러오는데 실패했습니다. : " + e.message);
            }).finally(() => {
                setDownloading(false);
                setOpenLoader(false);
            })

        }}>최신업로드 불러오기</button><button onClick={() => {
            clear().then(() => {
                alert("캐시비우기완료")
            });
        }}>캐시비우기</button>

        <FileInfoList filelist={filelist.models} itemStyle={{ fontSize: 12, marginTop: 4, cursor:"pointer" }} itemProps={{
            onClick: e => {
                const fileinfo = JSON.parse(e.currentTarget.getAttribute("data-fileinfo")!) as FileInfo;
                addBenchmark("start");
                addBenchmark("downloadStart");
                loadFile(fileinfo).then(blob => {
                    setDownloading(false);
                    addBenchmark("downloadEnd");
                    addBenchmark("parseStart");
                    const url = URL.createObjectURL(blob);
                    const loader = new VGLTFLoader();
                    loader.load(url, gltf => {
                        addBenchmark("parseEnd");
                        addBenchmark("sceneAddStart");

                        const { scene } = threeExports;
                        threeExports.scene.add(gltf.scene);
                        const interval = setInterval(() => {
                            //@ts-ignore
                            const found = scene.getObjectByProperty("uuid", gltf.scene.uuid);
                            if (found) {
                                // console.log("loaded", elapsed, "ms");

                                // 1초 후에 메시,버텍스, 트라이앵글 수 계산
                                setTimeout(() => {
                                    let meshCount = 0;
                                    let vertexCount = 0;
                                    let triangleCount = 0;
                                    let maxVertexInMesh = 0;
                                    let maxTriangleInMesh = 0;
                                    scene.traverse(obj => {
                                        if (obj instanceof THREE.Mesh) {
                                            meshCount++;
                                            vertexCount += obj.geometry.attributes.position.count;
                                            triangleCount += obj.geometry.index?.count ?? 0;
                                            maxVertexInMesh = Math.max(maxVertexInMesh, obj.geometry.attributes.position.count);
                                            maxTriangleInMesh = Math.max(maxTriangleInMesh, obj.geometry.index?.count ?? 0);
                                        }
                                    });
                                    console.log("mesh count", meshCount);
                                    console.log("vertex count", vertexCount);
                                    console.log("triangle count", triangleCount);
                                    console.log("max vertex in mesh", maxVertexInMesh);
                                    console.log("max triangle in mesh", maxTriangleInMesh);
                                    setSceneAnalysis({
                                        meshCount,
                                        vertexCount,
                                        triangleCount,
                                        maxVertexInMesh,
                                        maxTriangleInMesh
                                    });

                                }, 1000);

                                clearInterval(interval);
                                addBenchmark("sceneAddEnd");
                                addBenchmark("end");
                            }


                        }, 30);
                    })
                }).finally(() => {
                    addBenchmark("sceneAddEnd");
                    addBenchmark("end");
                    setOpenLoader(false);
                })
            }
        }} />
    </div>

}

export default MobileLoaderPanel;