import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import useFiles from './useFiles';
import { formatNumber, groupInfo, toNthDigit } from './utils';
import { cameraMatrixAtom, cameraModeAtom, envAtom, selectedAtom, threeExportsAtom } from './atoms';
import { useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { Euler, Quaternion, THREE, Vector3 } from './VTHREE';
import { GLTFExporter } from 'three/examples/jsm/Addons.js';

const useEnvUrl = () => {
    const [envUrl, setEnvUrl] = useState<string | null>(null);

    useEffect(() => {
        get("envUrl").then((url) => {
            setEnvUrl(url);
        })
    }, []);
    return [envUrl, setEnvUrl] as const;
}

function save(blob: Blob, filename: string) {
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link); // Firefox workaround, see #6594
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);

}

function saveString(text: string, filename: string) {

    save(new Blob([text], { type: 'text/plain' }), filename);

}


function saveArrayBuffer(buffer: ArrayBuffer, filename: string) {

    save(new Blob([buffer], { type: 'application/octet-stream' }), filename);

}

const SceneInfo = () => {
    const { files, loadingFiles } = useFiles();
    const [env, setEnv] = useAtom(envAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    const [envUrl, setEnvUrl] = useEnvUrl();
    const cameraMatrix = useAtomValue(cameraMatrixAtom);
    const [selecteds, setSelecteds] = useAtom(selectedAtom);

    if (!threeExports) {
        return null;
    }

    const { scene } = threeExports;
    const totals = groupInfo(scene);
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    cameraMatrix?.decompose(position, rotation, scale);
    const rotationEuler = new Euler().setFromQuaternion(rotation);



    return <div style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        padding: 8,
    }}>
        <section style={{ width: "100%" }}>
            <div>
                <button disabled={scene.children.length === 0} onClick={() => {

                    new GLTFExporter().parseAsync(threeExports.scene).then(result => {
                        if (result instanceof ArrayBuffer) {
                            saveArrayBuffer(result, `scene-${new Date().toISOString()}.glb`);
                        } else {
                            const output = JSON.stringify(result, null, 2);
                            saveString(output, `scene-${new Date().toISOString()}.gltf`);
                        }
                    })
                }}>GLTF 내보내기</button>
            </div>


            <strong>환경맵</strong>
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column" }}>
                <div >
                    <select
                        value={env.select}
                        onChange={(e) => {
                            setEnv({ select: e.target.value as "none" | "preset" | "custom" });
                        }}>
                        <option value="none">없음</option>
                        <option value="preset">프리셋</option>
                        <option value="custom">URL</option>
                    </select>
                </div>
            </div>
            {env.select === "preset" && <>
                <div style={{
                    display: env.select === "preset" ? "flex" : "none",
                    flexDirection: "column",
                    marginTop: 4,
                }}>
                    <select
                        style={{ width: "50%" }}
                        value={env.preset}
                        onChange={(e) => {
                            setEnv({ ...env, preset: e.target.value as "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse" });
                        }}>
                        <option value="apartment">아파트</option>
                        <option value="city">도시</option>
                        <option value="dawn">새벽</option>
                        <option value="forest">숲</option>
                        <option value="lobby">로비</option>
                        <option value="night">밤</option>
                        <option value="park">공원</option>
                        <option value="studio">스튜디오</option>
                        <option value="sunset">일몰</option>
                        <option value="warehouse">창고</option>
                    </select>
                    <div style={{ width: "100%" }}>
                        <input type="range" min={0} max={1} step={0.01} value={env.intensity ?? 1} onChange={(e) => {
                            setEnv({
                                ...env,
                                intensity: parseFloat(e.target.value)
                            })
                        }}></input>
                        <span style={{ marginLeft: 8, fontSize: 12 }}>Intensity : {toNthDigit(env.intensity ?? 1, 2)}</span>

                    </div>
                </div>
            </>}
            {env.select === "custom" && <>
                <div style={{
                    width: "100%"
                }}>
                    Url :
                    <input type="text" value={envUrl ?? ""} onChange={(e) => {
                        setEnvUrl((e.target.value)?.trim());
                    }}></input>
                    <button onClick={() => {
                        if (envUrl) {
                            setEnv({ select: "custom", url: envUrl });
                            set("envUrl", envUrl);
                        } else {
                            alert("URL을 입력해주세요.");
                        }

                    }} disabled={Boolean(envUrl) && env.url === envUrl}>{Boolean(envUrl) && env.url === envUrl ? "적용됨" : "적용하기"}</button>
                    <div style={{ width: "100%" }}>
                        <input type="range" min={0} max={1} step={0.01} value={env.intensity ?? 1} onChange={(e) => {
                            setEnv({
                                ...env,
                                intensity: parseFloat(e.target.value)
                            })
                        }}></input>
                        <span style={{ marginLeft: 8, fontSize: 12 }}>Intensity : {toNthDigit(env.intensity ?? 1, 2)}</span>

                    </div>
                </div>
            </>}
        </section>

        <section style={{ marginTop: 16 }}>
            <strong>파일정보</strong> <span style={{ color: "gray" }}>{files.length}개</span>
            <ul style={{ paddingLeft: 4 }}>
                {files.map(({ file, name, start, end }, index) => {
                    return <li key={`파일로드-${index}-${name}`} style={{ marginTop: 6, fontSize: 14 }}>
                        <div>{name}({Math.round(file.size / (1024 * 1024))}mb){end === 0 ? " : loading..." : ` : ${formatNumber(end - start)}ms`}</div>
                    </li>
                })}
            </ul>
        </section>
        <section style={{ marginTop: 16 }}>
            <strong>Scene</strong>
            <div style={{ paddingLeft: 4 }}>
                총 노드 : {formatNumber(totals.nodeCount)}개
            </div>
            <div style={{ paddingLeft: 4 }}>
                총 오브젝트3D : {formatNumber(totals.object3dCount)}개
            </div>
            <div style={{ paddingLeft: 4 }}>
                총 메쉬 : {formatNumber(totals.meshCount)}개
            </div>
            <div style={{ paddingLeft: 4 }}>
                총 삼각형 : {formatNumber(totals.triangleCount)}개
            </div>
            <div style={{ paddingLeft: 4 }}>
                총 버텍스 : {formatNumber(totals.vertexCount)}개
            </div>

            <ul style={{ paddingLeft: 4, marginTop: 8 }}>
                {scene.children.map((child, index) => {
                    if(child.type === "BoxHelper"){
                        return null;
                    }

                    const info = groupInfo(child);
                    if(info.nodeCount === 0){
                        console.log(child);
                        return null;
                    }

                    return <li key={"info-" + child.uuid} style={{ cursor: "pointer", fontSize: 13, border: selecteds.includes(child.uuid) ? "1px solid #888" : undefined }} onClick={() => {
                        setSelecteds(prev => {
                            if (prev.length === 1 && prev[0] === child.uuid) {
                                return [];
                            } else {
                                return [child.uuid];
                            }
                        });
                    }}>
                        {/* <div>{child.uuid}</div> */}
                        <div style={{ fontSize: 14, fontWeight: "bold" }} >{child.name}</div>
                        <div style={{ paddingLeft: 8 }}>
                            노드 : {formatNumber(info.nodeCount)}개
                        </div>
                        <div style={{ paddingLeft: 8 }}>
                            오브젝트3D : {formatNumber(info.object3dCount)}개
                        </div>
                        <div style={{ paddingLeft: 8 }}>
                            메쉬 : {formatNumber(info.meshCount)}개
                        </div>
                        <div style={{ paddingLeft: 8 }}>
                            삼각형 : {formatNumber(info.triangleCount)}개
                        </div>
                        <div style={{ paddingLeft: 8 }}>
                            버텍스 : {formatNumber(info.vertexCount)}개
                        </div>
                    </li>
                })}
            </ul>
        </section>

        <section style={{ marginTop: 16 }}>
            <strong>카메라</strong>
            {/* <select
                style={{ textTransform: "capitalize" }}
                value={cameraMode}
                onChange={(e) => {
                    // setEnv({ select: e.target.value as "none" | "preset" | "custom" });
                    setCameraMode(e.target.value as "perspective" | "iso");
                }}>
                <option value="perspective">투시</option>
                <option value="iso">아이소</option>
            </select> */}


            <div>Position</div>
            <div style={{ paddingLeft: 8 }}>X: {toNthDigit(position.x, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Y: {toNthDigit(position.y, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Z: {toNthDigit(position.z, 4)}</div>

            <div>Rotation</div>
            <div style={{ paddingLeft: 8 }}>X: {toNthDigit(rotationEuler.x, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Y: {toNthDigit(rotationEuler.y, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Z: {toNthDigit(rotationEuler.z, 4)}</div>


        </section>
    </div>
}

export default SceneInfo;