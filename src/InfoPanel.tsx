import React from 'react'
import { selectedAtom, threeExportsAtom } from './atoms';
import { useAtomValue } from 'jotai';
import ObjectViewer from './ObjectViewer';
import { THREE } from './VTHREE';

const ObjectView = ({ object }: { object: THREE.Object3D }) => {
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
            paddingLeft: 4
        }}>
            <div style={{ fontSize: 10 }}>{object.uuid}</div>
            <div style={{ fontSize: 11 }}>유저데이터
                <div style={{ fontSize: 10 }}>
                    {Object.entries(object.userData as Record<string, any>).map(([key, value]) => {
                        return <div style={{ paddingLeft: 4 }} key={`info-${object.uuid}-${key}`}>{key}: {JSON.stringify(value).replace(/\"/g, "")}</div>
                    })}
                </div>

            </div>
        </div>

    </div>
}

function InfoPanel() {
    const selecteds = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);

    if (selecteds.length === 0 || !threeExports) {
        return null;
    }

    const { scene } = threeExports;

    return (
        <div style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            width: 210,
            backgroundColor: "#bbbbbb99",
            padding: 8,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8
        }}>
            <div>{selecteds.length}개 선택됨</div>
            {selecteds.map(selected => {
                const found = scene.getObjectByProperty("uuid", selected);
                if (!found) {
                    return null;
                }
                return <ObjectView object={found}></ObjectView>
            })}
        </div >
    )
}

export default InfoPanel