import React, { useState } from 'react'
import { materialSelectedAtom, selectedAtom, threeExportsAtom, useModal } from '../scripts/atoms';
import { useAtom, useAtomValue } from 'jotai';
import { THREE } from '../scripts/VTHREE';
import { groupInfo } from '../scripts/utils';
import ApplyLightMapComponent from './ApplyLightMapComponent';

const ObjectView = ({ object }: { object: THREE.Object3D }) => {

    const info = groupInfo(object);

    return <div style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4
    }}
        key={"infodetail-" + object.uuid}
    >
        <div style={{ fontSize: 13 }}>{object.name.length === 0 ? "이름없음" : object.name} - {object.type}</div>
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
                        return <div style={{ paddingLeft: 8 }} key={`info-${object.uuid}-${key}`}>{key}: {JSON.stringify(value).replace(/\"/g, "")}</div>
                    })}
                </div>
            </div>}

            {info.meshCount > 0 && <div style={{ fontSize: 11 }}>메쉬 {info.meshCount}개</div>}
            {info.triangleCount > 0 && <div style={{ fontSize: 11 }}>삼각형 {info.triangleCount}개</div>}
            {info.vertexCount > 0 && <div style={{ fontSize: 11 }}>버텍스 {info.vertexCount}개</div>}



        </div>

    </div>
}

function InfoPanel() {
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
            width: 240,
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
            <button onClick={() => {
                openModal(<ApplyLightMapComponent /> as any);
            }}> 라이트맵 일괄적용</button >
            {
                selecteds.map(selected => {
                    const found = scene.getObjectByProperty("uuid", selected);
                    if (!found) {
                        return null;
                    }
                    return <ObjectView key={`info-object-${found.uuid}`} object={found}></ObjectView>
                })
            }
            < div style={{ position: "absolute", top: 5, right: 5, fontSize: 12, fontWeight: "bold", cursor: "pointer" }} onClick={() => {
                setSelecteds([]);
            }}> X</div >
        </div >
    )
}

export default InfoPanel