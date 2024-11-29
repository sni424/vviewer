import { useAtom, useAtomValue } from 'jotai';
import React from 'react'
import { materialSelectedAtom, selectedAtom, threeExportsAtom } from './atoms';

function MaterialPanel() {
    const selecteds = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    const [mat, setMat] = useAtom(materialSelectedAtom);
    console.log("mat", mat);

    if (!mat || !threeExports) {
        return null;
    }

    const maps = Object.keys(mat).filter(key => key.toLowerCase().endsWith("map"));
    console.log(maps);

    return (
        <div style={{
            position: "absolute",
            left: 10,
            top: 10,
            maxHeight: selecteds.length > 0 ? "calc(50% - 20px)" : "calc(100% - 20px)",
            width: 240,
            backgroundColor: "#bbbbbb99",
            padding: 8,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            overflowY: "auto"
        }}>
            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div style={{ fontWeight: "bold", fontSize: 12 }}>
                    {mat.name}
                </div>
                <div style={{ fontSize: 10, color: "#444" }}>
                    {mat.type}
                </div>

            </div>
            {
                Object.entries(mat).map(([key, value]) => {
                    return <div key={`mat-${mat.uuid}` + key} style={{ fontSize: 10 }}>{key}: {JSON.stringify(value)}</div>
                })
            }
            <div style={{ position: "absolute", top: 5, right: 5, fontSize: 12, fontWeight: "bold", cursor: "pointer" }} onClick={() => {
                setMat(null);
            }}>X</div>
        </div >
    )
}

export default MaterialPanel