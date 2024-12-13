import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import useFiles from '../scripts/useFiles';
import { cached, compressObjectToFile, formatNumber, groupInfo, isProbeMesh, isTransformControlOrChild, loadLatest, loadScene, saveScene, toNthDigit } from '../scripts/utils';

import { cameraMatrixAtom, globalColorTemperatureAtom, globalBrightnessContrastAtom, globalSaturationCheckAtom, selectedAtom, sourceAtom, threeExportsAtom, useEnvParams, useModal, globalColorManagementAtom, LookType, ViewTransform } from '../scripts/atoms';
import { useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { Euler, Quaternion, THREE, Vector3 } from '../scripts/VTHREE';
import { GLTFExporter } from 'three/examples/jsm/Addons.js';
import { useNavigate } from 'react-router-dom';
import useFilelist from '../scripts/useFilelist';
import { __UNDEFINED__, DEFAULT_COLOR_TEMPERATURE } from '../Constants';
import objectHash from 'object-hash';
import GlobalRenderOptions from './canvas/GlobalRenderOptions';
import UploadPage from './UploadModal';

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

const CameraInfoSection = () => {
    const threeExports = useAtomValue(threeExportsAtom);
    const cameraMatrix = useAtomValue(cameraMatrixAtom);
    if (!threeExports) {
        return null;
    }

    const { scene, camera } = threeExports;
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    cameraMatrix?.decompose(position, rotation, scale);

    return (
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

            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div>Position
                    {/* <div style={{ paddingLeft: 8 }}>X: {toNthDigit(position.x, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Y: {toNthDigit(position.y, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Z: {toNthDigit(position.z, 4)}</div> */}

                    <div style={{ paddingLeft: 8 }}>X:
                        {camera.position.x.toFixed(2)}
                    </div>
                    <div style={{ paddingLeft: 8 }}>Y:
                        {camera.position.y.toFixed(2)}
                    </div>
                    <div style={{ paddingLeft: 8 }}>Z:
                        {camera.position.z.toFixed(2)}
                    </div>
                </div>
                <div>Rotation
                    {/* <div style={{ paddingLeft: 8 }}>X: {toNthDigit(rotationEuler.x, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Y: {toNthDigit(rotationEuler.y, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Z: {toNthDigit(rotationEuler.z, 4)}</div> */}
                    <div style={{ paddingLeft: 8 }}>X: {camera.rotation.x.toFixed(2)}</div>
                    <div style={{ paddingLeft: 8 }}>Y: {camera.rotation.y.toFixed(2)}</div>
                    <div style={{ paddingLeft: 8 }}>Z: {camera.rotation.z.toFixed(2)}</div>
                </div>
            </div>
        </section>
    )
}

const SceneInfo = () => {
    const { files, loadingFiles } = useFiles();
    // const [env, setEnv] = useAtom(envAtom);
    const [env, setEnv] = useEnvParams();
    const threeExports = useAtomValue(threeExportsAtom);
    const [envUrl, setEnvUrl] = useEnvUrl();
    const [hasSaved, setHasSaved] = useState(false);

    const [selecteds, setSelecteds] = useAtom(selectedAtom);
    const { openModal, closeModal } = useModal();
    const navigate = useNavigate();
    const { filelist, loading } = useFilelist();
    const setSource = useSetAtom(sourceAtom);
    const [brightnessContrast, setGlobalContrast] = useAtom(globalBrightnessContrastAtom)
    // const { on: brightnessContrastOn, brightnessValue, contrastValue } = brightnessContrast;
    const [globalSaturationCheckOn, setGlobalSaturationCheck] = useAtom(globalSaturationCheckAtom);
    const [globalColorTemperature, setGlobalColorTemperature] = useAtom(globalColorTemperatureAtom)
    const [cm, setCm] = useAtom(globalColorManagementAtom);
    const { on: cmOn, value: cmValue } = cm;
    const [aoValue, setAoValue] = useState(0);

    useEffect(() => {
        get("savedScene").then(val => {
            if (val) {
                setHasSaved(true);
            }
        })
    }, []);

    if (!threeExports) {
        return null;
    }

    const { scene } = threeExports;
    const totals = groupInfo(scene);



    return <div style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 12
    }}>
        <section style={{ width: "100%", display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <button onClick={() => {
                navigate("/mobile");
            }}>모바일</button>
            <button style={{ fontSize: 10 }} disabled={scene.children.length === 0} onClick={() => {

                new GLTFExporter().parseAsync(threeExports.scene).then(result => {
                    if (result instanceof ArrayBuffer) {
                        saveArrayBuffer(result, `scene-${new Date().toISOString()}.glb`);
                    } else {
                        const output = JSON.stringify(result, null, 2);
                        saveString(output, `scene-${new Date().toISOString()}.gltf`);
                    }
                })
            }}>GLTF 내보내기</button>
            <button style={{ fontSize: 10 }} onClick={() => {
                // navigate("/upload");
                openModal(() => <div style={{ width: "80%", height: "80%", backgroundColor: "#ffffffcc", padding: 16, borderRadius: 8, boxSizing: "border-box", position: "relative" }}>
                    <UploadPage></UploadPage>
                </div>)
            }}>모델추가&업로드</button>
            <button style={{ fontSize: 10 }} onClick={() => { saveScene(scene) }}>씬 저장(Ctrl S)</button>
            <button style={{ fontSize: 10 }} onClick={() => {
                loadScene().then(loaded => {
                    if (loaded) {
                        scene.removeFromParent();
                        scene.add(loaded);
                    }
                }).catch(() => {
                    alert("씬 불러오기 실패");
                })
            }} disabled={!hasSaved}>씬 불러오기 Ctrl L</button>
            <button style={{ fontSize: 10 }} onClick={() => {
                saveString(JSON.stringify(scene.toJSON(), null, 2), `scene-${new Date().toISOString()}.json`);
            }}>씬 json으로 내보내기</button>
            <button style={{ fontSize: 10 }} onClick={() => {
                const uploadUrl = import.meta.env.VITE_UPLOAD_URL;
                if (!uploadUrl) {
                    alert(".env에 환경변수를 설정해주세요, uploadUrl");
                    return;
                }

                const uploadData = scene.toJSON();
                const file = compressObjectToFile(uploadData, "latest");
                const fd = new FormData();
                fd.append("file", file);

                // latest 캐싱을 위한 hash
                const uploadHash = objectHash(uploadData);
                const hashData = {
                    hash: uploadHash
                };
                // convert object to File:
                const hashFile = compressObjectToFile(hashData, "latest-hash");
                const hashFd = new FormData();
                hashFd.append("file", hashFile);
                fetch(uploadUrl, {
                    method: "POST",
                    body: hashFd
                }).then(() => {
                    // 해시부터 업로드하고
                    fetch(uploadUrl, {
                        method: "POST",
                        body: fd
                    }).then(res => res.json()).then(() => {
                        // 그 다음에 파일업로드
                        alert("업로드 완료");
                    });
                })

            }}>씬 업로드</button>
            <button onClick={() => {
                loadLatest({ threeExports }).catch(e => {
                    console.error(e);
                    alert("최신 업로드 불러오기 실패");
                })
            }}>업로드한 씬 불러오기</button>
        </section>
        <section className='w-full'>
            <strong>재질 일괄 설정</strong>
            <div className='flex'>
                <div className='mr-3'>AO</div>
                <input className='flex-1 min-w-0' type="range" value={aoValue} onChange={e => {
                    const allMeshes: THREE.Mesh[] = [];
                    scene.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            allMeshes.push(child);
                        }
                    }
                    )
                    allMeshes.forEach(mesh => {
                        //@ts-ignore
                        mesh.material.aoMapIntensity = parseFloat(e.target.value);
                    })
                    setAoValue(parseFloat(e.target.value));
                }} min={0} max={1} step={0.01} ></input>
                <input type="number" value={aoValue} onChange={e => {
                    const allMeshes: THREE.Mesh[] = [];
                    scene.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            allMeshes.push(child);
                        }
                    }
                    )
                    allMeshes.forEach(mesh => {
                        //@ts-ignore
                        mesh.material.aoMapIntensity = parseFloat(e.target.value);
                    })
                    setAoValue(parseFloat(e.target.value));
                }}
                    min={0} max={1} step={0.01}
                ></input>
            </div>
        </section>

        <section style={{ width: "100%" }}>
            <strong>환경맵</strong>
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column" }}>
                <div >
                    <select
                        value={env.select}
                        onChange={(e) => {
                            setEnv(prev => ({ select: e.target.value as "none" | "preset" | "custom" | "url", rotation: prev.rotation }));
                        }}>
                        <option value="none">없음</option>
                        <option value="preset">프리셋</option>
                        <option value="custom">업로드한 환경맵</option>
                        <option value="url">URL</option>
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
                    display: env.select === "custom" ? "flex" : "none",
                    flexDirection: "column",
                    marginTop: 4,
                }}>
                    <select value={env.url ?? __UNDEFINED__} onChange={e => {
                        setEnv(prev => ({ select: "custom", url: e.target.value, rotation: prev.rotation }));
                    }}>
                        <option value={__UNDEFINED__}>선택</option>
                        {filelist.envs.map(fileinfo => {
                            return <option key={`customenvmap-${fileinfo.fileUrl}`} value={fileinfo.fileUrl}>{fileinfo.filename}</option>
                        }
                        )}
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
            {env.select === "url" && <>
                <div style={{
                    width: "100%"
                }}>
                    Url :
                    <input type="text" value={envUrl ?? ""} onChange={(e) => {
                        setEnvUrl((e.target.value)?.trim());
                    }}></input>
                    <button onClick={() => {
                        if (envUrl) {
                            setEnv(prev => ({ select: "custom", url: envUrl, rotation: prev.rotation }));
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
            {env.select !== "none" && <div style={{ width: "100%", marginLeft: 8, fontSize: 11 }}>
                <button style={{ fontSize: 11 }} onClick={() => {
                    setEnv(prev => ({ ...prev, rotation: { x: 0, y: 0, z: 0 } }));
                }}>회전리셋</button>
                <div>
                    X : <input type="range" min={-Math.PI} max={Math.PI} step={0.01} value={env.rotation?.x ?? 0} onChange={(e) => {
                        setEnv(prev => ({ ...prev, rotation: { x: parseFloat(e.target.value), y: prev.rotation?.y ?? 0, z: prev.rotation?.z ?? 0 } }));
                    }}></input>
                    {toNthDigit(((env.rotation?.x ?? 0) / Math.PI) * 90, 2)}
                </div>
                <div>
                    Y : <input type="range" min={-Math.PI} max={Math.PI} step={0.01} value={env.rotation?.y ?? 0} onChange={(e) => {
                        setEnv(prev => ({ ...prev, rotation: { x: prev.rotation?.x ?? 0, y: parseFloat(e.target.value), z: prev.rotation?.z ?? 0 } }));
                    }}></input>
                    {toNthDigit(((env.rotation?.y ?? 0) / Math.PI) * 90, 2)}
                </div>z
                <div>
                    Z : <input type="range" min={-Math.PI} max={Math.PI} step={0.01} value={env.rotation?.z ?? 0} onChange={(e) => {
                        setEnv(prev => ({ ...prev, rotation: { x: prev.rotation?.x ?? 0, y: prev.rotation?.y ?? 0, z: parseFloat(e.target.value) } }));
                    }}></input>
                    {toNthDigit(((env.rotation?.z ?? 0) / Math.PI) * 90, 2)}
                </div>
            </div>}
        </section>

        <section style={{ marginTop: 16, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
            {/* <div>
                <strong>밝기/대비</strong>
                <input type="checkbox" checked={brightnessContrastOn} onChange={(e) => {
                    console.log(e.target.checked);
                    setGlobalContrast(prev => ({ ...prev, on: e.target.checked }));
                }
                } />
                {brightnessContrastOn && <>
                    <div style={{ paddingLeft: 12, boxSizing: "border-box", width: "100%" }}>
                        <div>밝기 : {brightnessValue ?? 0} <button style={{ fontSize: 11 }} onClick={() => {
                            setGlobalContrast(prev => ({ ...prev, brightnessValue: 0 }));
                        }}>초기화</button></div>
                        <input style={{ width: "100%" }} type="range" min={-1} max={1} step={0.01} value={brightnessValue ?? 0} onChange={(e) => {
                            setGlobalContrast(prev => ({ ...prev, brightnessValue: parseFloat(e.target.value) }));
                        }} />
                        <div>대비 : {contrastValue ?? 0} <button style={{ fontSize: 11 }} onClick={() => {
                            setGlobalContrast(prev => ({ ...prev, contrastValue: 0 }));
                        }}>초기화</button></div>
                        <input style={{ width: "100%" }} type="range" min={-1} max={1} step={0.01} value={contrastValue ?? 0} onChange={(e) => {
                            setGlobalContrast(prev => ({ ...prev, contrastValue: parseFloat(e.target.value) }));
                        }} />

                    </div>

                </>}

            </div> */}
            <div>
                <strong>새츄레이션보기</strong>
                <input type="checkbox" checked={globalSaturationCheckOn} onChange={(e) => {
                    setGlobalSaturationCheck(e.target.checked);
                }
                } />
            </div>
            <div>
                <strong>Color Management</strong>
                <input type="checkbox" checked={cmOn} onChange={(e) => {
                    setCm(prev => ({ ...prev, on: e.target.checked }));
                }
                } />
                {cmOn && <div>
                    <div style={{ width: "100%" }}>
                        Exposure : <div style={{ maxWidth: 40 }}>{toNthDigit(cmValue.exposure, 2)}</div> <input type="range" min={0.0} max={3} step={0.01} value={cmValue.exposure} onChange={e => {
                            setCm(prev => ({
                                ...prev, value: {
                                    ...prev.value,
                                    exposure: parseFloat(e.target.value)
                                }
                            }))
                        }} />
                    </div>
                    <div style={{ width: "100%" }}>
                        Gamma : <div style={{ maxWidth: 40 }}>{toNthDigit(cmValue.gamma, 2)}</div> <input type="range" min={0.0} max={3} step={0.01} value={cmValue.gamma} onChange={e => {
                            setCm(prev => ({
                                ...prev, value: {
                                    ...prev.value,
                                    gamma: parseFloat(e.target.value)
                                }
                            }))
                        }} />
                    </div>
                    <div>
                        <strong>Contrast</strong> :
                        <select value={cmValue.look} onChange={e => {
                            setCm(prev => ({
                                ...prev, value: {
                                    ...prev.value,
                                    look: e.target.value as LookType
                                }
                            }))
                        }}>
                            <option value={LookType.VERY_HIGH_CONTRAST}>Very High</option>
                            <option value={LookType.HIGH_CONTRAST}>High</option>
                            <option value={LookType.MEDIUM_CONTRAST}>Medium</option>
                            <option value={LookType.LOW_CONTRAST}>Low</option>
                            <option value={LookType.VERY_LOW_CONTRAST}>Very Low</option>
                        </select>
                    </div>

                    <div>
                        <strong>View Transform</strong> :
                        <select value={cmValue.viewTransform} onChange={e => {
                            setCm(prev => ({
                                ...prev, value: {
                                    ...prev.value,
                                    viewTransform: e.target.value as ViewTransform
                                }
                            }))
                        }}>
                            <option value={ViewTransform.Standard}>Standard</option>
                            <option value={ViewTransform.KhronosPBRNeutral}>KhronosPBRNeutral</option>
                            <option value={ViewTransform.AgX}>AgX</option>
                            <option value={ViewTransform.Filmic}>Filmic</option>
                            <option value={ViewTransform.FilmicLog}>FilmicLog</option>
                            <option value={ViewTransform.FalseColor}>FalseColor</option>
                            <option value={ViewTransform.Raw}>Raw</option>
                        </select>
                    </div>

                </div>}
            </div>
            {/* <div>
                <div>
                    <strong>색온도</strong>{globalColorTemperatureOn && <span>: {globalColorTemperatureValue}K </span>}
                </div>

                <input type="checkbox" checked={globalColorTemperatureOn} onChange={(e) => {
                    setGlobalColorTemperature({ on: e.target.checked, value: globalColorTemperatureValue ?? DEFAULT_COLOR_TEMPERATURE });
                }
                } />
                {globalColorTemperatureOn && <input type="range" min={3000} max={10000} step={10} value={globalColorTemperatureValue ?? DEFAULT_COLOR_TEMPERATURE} onChange={(e) => {
                    setGlobalColorTemperature({ on: true, value: parseInt(e.target.value) });
                }} />}
            </div> */}
            {/* <GlobalRenderOptions></GlobalRenderOptions> */}
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
                    if (child.type === "BoxHelper") {
                        return null;
                    }

                    if (isProbeMesh(child)) {
                        return null;
                    }

                    if (isTransformControlOrChild(child)) {
                        return null;
                    }

                    const info = groupInfo(child);
                    if (info.nodeCount === 0) {
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
        <CameraInfoSection></CameraInfoSection>
    </div>
}

export default SceneInfo;