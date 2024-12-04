import { useAtom, useAtomValue } from 'jotai';
import React, { useState } from 'react'
import { materialSelectedAtom, selectedAtom, threeExportsAtom } from '../atoms';
import { THREE } from '../VTHREE';
import { toNthDigit } from '../utils';
import useLightMapDragAndDrop from '../useLightMapDragAndDrop';

const MeshStandardMaterialPanel = ({ mat }: { mat: THREE.MeshStandardMaterial }) => {
    const { isDragging, handleDrop, handleDragOver, handleDragLeave } = useLightMapDragAndDrop(mat);
    const [lightMapIntensity, setLightMapIntensity] = useState(mat.lightMapIntensity);

    return <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid gray", padding: 8, borderRadius: 8, boxSizing: "border-box", cursor: isDragging ? "copy" : undefined }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <div>Lightmap : {mat.lightMap === null ? "없음" : mat.lightMap.name ?? "이름없음"}</div>
            {mat.lightMap && <div>
                <div>Intensity: {lightMapIntensity}</div>
                <div>Channel: {mat.lightMap.channel}</div>
                <div style={{ width: "100%" }}>
                    <input type="range" min={0} max={1} step={0.01} value={lightMapIntensity ?? 1} onChange={(e) => {
                        mat.lightMapIntensity = parseFloat(e.target.value);
                        setLightMapIntensity(mat.lightMapIntensity);
                    }}></input>
                    <span style={{ marginLeft: 8, fontSize: 12 }}>Intensity : {toNthDigit(lightMapIntensity ?? 1, 2)}</span>

                </div>
            </div>}
            {/* <LightMapPreview ></LightMapPreview> */}
        </div>
        {/* {Object.entries(mat).map(([key, value]) => {
            return <div key={`mat-${mat.uuid}` + key} style={{ fontSize: 10 }}>{key}: {JSON.stringify(value)}</div>
        })} */}
    </div >

    // return <div>
    //     <div>color: {JSON.stringify(mat.color)}</div>
    //     <div>emissive: {JSON.stringify(mat.emissive)}</div>
    //     <div>emissiveIntensity: {JSON.stringify(mat.emissiveIntensity)}</div>
    //     <div>emissiveMap: {JSON.stringify(mat.emissiveMap)}</div>
    //     <div>envMap: {JSON.stringify(mat.envMap)}</div>
    //     <div>lightMap: {JSON.stringify(mat.lightMap)}</div>
    //     <div>map: {JSON.stringify(mat.map)}</div>
    //     <div>metalness: {JSON.stringify(mat.metalness)}</div>
    //     <div>normalMap: {JSON.stringify(mat.normalMap)}</div>
    //     <div>roughness: {JSON.stringify(mat.roughness)}</div>
    //     <div>roughnessMap: {JSON.stringify(mat.roughnessMap)}</div>
    // </div>
}

const MaterialPanel = ({ mat }: { mat: THREE.Material }) => {
    // if (mat.type === "MeshStandardMaterial") {
    return <MeshStandardMaterialPanel mat={mat as THREE.MeshStandardMaterial} />
    // }

    // return <div style={{ display: "flex", flexDirection: "column" }}>
    //     <div style={{ display: "flex", flexDirection: "column" }}>
    //         <div>Lightmap</div>
    //         <div>{mat.lightMap}</div>
    //     </div>

    // </div >
    console.log(mat)
    return <> {Object.entries(mat).map(([key, value]) => {
        return <div key={`mat-${mat.uuid}` + key} style={{ fontSize: 10 }}>{key}: {JSON.stringify(value)}</div>
    })}</>
}


function MaterialPanelContainer() {
    const selecteds = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    const [mat, setMat] = useAtom(materialSelectedAtom);

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
            width: 300,
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
            <MaterialPanel mat={mat}></MaterialPanel>
            <div style={{ position: "absolute", top: 5, right: 5, fontSize: 12, fontWeight: "bold", cursor: "pointer" }} onClick={() => {
                setMat(null);
            }}>X</div>
        </div >
    )
}

export default MaterialPanelContainer