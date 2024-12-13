import React, { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { cameraMatrixAtom, cameraSettingAtom, lastCameraInfoAtom, orbitSettingAtom, threeExportsAtom, } from '../scripts/atoms';
import { Quaternion, THREE, Vector3 } from '../scripts/VTHREE';

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
        <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: "translate(-100%, 0)",
            maxWidth: 180,
        }}>
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
                            <button onClick={() => {
                                threeExports.set(state => {
                                    const perCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
                                    perCam.position.set(1, 200, 1);
                                    perCam.updateProjectionMatrix();
                                    return {
                                        ...state,
                                        camera: perCam
                                    }
                                })
                            }}>Iso카메라</button>
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

        </div>
    )
}


export default CameraPanel;