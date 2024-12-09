import React, { useState } from 'react'
import { materialSelectedAtom, panelTabAtom, selectedAtom, threeExportsAtom, treeScrollToAtom, useModal } from '../scripts/atoms';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { THREE } from '../scripts/VTHREE';
import { groupInfo } from '../scripts/utils';
import ApplyLightMapComponent from './ApplyLightMapComponent';

const MeshView = ({ object, index }: { object: THREE.Object3D; index: number }) => {

    const info = groupInfo(object);
    const [selectedMaterial, setSelectedMaterial] = useAtom(materialSelectedAtom);
    const currentMat = (((object as THREE.Mesh)?.material) as THREE.MeshStandardMaterial);
    const isSelectedMaterialThisMesh = currentMat && (selectedMaterial?.uuid === currentMat?.uuid);
    const setSelecteds = useSetAtom(selectedAtom);
    const setTab = useSetAtom(panelTabAtom);
    const setTreeScrollTo = useSetAtom(treeScrollToAtom);

    return <div style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4
    }}
        key={"infodetail-" + object.uuid}
    >
        <div>

        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><div>
            {index + 1}. <span style={{ textDecoration: "underline" }}>{object.name.length === 0 ? "이름없음" : object.name}</span></div>
        </div>
        {/* <div style={{ display: "grid" }}> */}
        <div>
            <button style={{ fontSize: 11 }} onClick={() => {
                setSelecteds([object.uuid]);
            }}>단일선택</button>
            <button style={{ fontSize: 11 }} onClick={() => {
                setSelecteds(prev => prev.filter(uuid => uuid !== object.uuid));
            }}>제외</button>
            <button style={{ fontSize: 11 }} onClick={() => {
                setTab("tree");
                setTreeScrollTo(object.uuid);
            }}>트리에서 보기</button>
            {currentMat && <button style={{ fontSize: 11 }} onClick={() => {
                setSelectedMaterial((object as THREE.Mesh).material as THREE.Material);
            }} disabled={isSelectedMaterialThisMesh}>{isSelectedMaterialThisMesh ? "재질선택됨" : "재질"}</button>}
        </div>
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            paddingLeft: 8
        }}>
            <div style={{ fontSize: 10 }}>{object.uuid}</div>
            {Object.keys(object.userData).length > 0 && <div style={{ fontSize: 11 }}>유저데이터
                <div style={{ fontSize: 10 }}>
                    {Object.entries(object.userData as Record<string, any>).map(([key, value]) => {
                        
                        if (key === 'probe') {
                            return null;
                        }
                        return <div style={{ paddingLeft: 8 }} key={`info-${object.uuid}-${key}`}>{key}: {JSON.stringify(value).replace(/\"/g, "")}</div>
                    })}
                </div>
            </div>}

            <div style={{ fontSize: 11 }}>
                {info.meshCount > 0 && <div >메쉬 {info.meshCount}개</div>}
                {info.triangleCount > 0 && <div>삼각형 {info.triangleCount}개</div>}
                {info.vertexCount > 0 && <div>버텍스 {info.vertexCount}개</div>}
            </div>




        </div>

    </div>
}

function MeshInfoPanel() {
    const [selecteds, setSelecteds] = useAtom(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    const materialSelected = useAtomValue(materialSelectedAtom);
    const { openModal, closeModal } = useModal();


    if (selecteds.length === 0 || !threeExports) {
        return null;
    }

    const { scene } = threeExports;

    return (
        <div style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            maxHeight: materialSelected ? "calc(50% - 20px)" : "calc(100% - 20px)",
            width: 300,
            backgroundColor: "#bbbbbb99",
            padding: 8,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto",
        }}


        >
            <div>{selecteds.length}개 선택됨</div>
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
            }}>
                <button style={{ fontSize: 11 }} onClick={() => {
                    openModal(<ApplyLightMapComponent /> as any);
                }}> 라이트맵 일괄적용</button >
                <button style={{ fontSize: 11 }} onClick={() => {
                    setSelecteds(prev => {
                        return prev.filter(uuid => {
                            const found = scene.getObjectByProperty("uuid", uuid);
                            if (!found) {
                                return false;
                            }
                            return found.type !== "Mesh";
                        });
                    })
                }}>하위메시제외</button>
            </div>

            {
                selecteds.map((selected, index) => {
                    const found = scene.getObjectByProperty("uuid", selected);
                    if (!found) {
                        return null;
                    }
                    return <MeshView key={`info-object-${found.uuid}`} object={found} index={index}></MeshView>
                })
            }
            < div style={{ position: "absolute", top: 5, right: 5, fontSize: 12, fontWeight: "bold", cursor: "pointer" }} onClick={() => {
                setSelecteds([]);
            }}> X</div >
        </div >
    )
}

export default MeshInfoPanel