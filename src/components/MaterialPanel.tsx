import { useAtom, useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react'
import { materialSelectedAtom, selectedAtom, threeExportsAtom } from '../scripts/atoms';
import { THREE } from '../scripts/VTHREE';
import { toNthDigit } from '../scripts/utils';
import useLightMapDragAndDrop from '../scripts/useLightMapDragAndDrop';
import MapPreview, { MapPreviewProps } from './MapPreview';

interface MapInfoProps extends MapPreviewProps {
    materialRange?: {
        matKey: string;
        onChange: (value: number) => any;
        min?: number; // default : 0
        max?: number; // default : 1
        step?: number; // default : (max-min)/100
    };
    textureRange?: {
        texKey: string;
        onChange: (value: number) => any;
        min?: number; // default : 0
        max?: number; // default : 1
        step?: number; // default : (max-min)/100
    };
    label?: string;
}

const MapInfo = (props: MapInfoProps) => {
    const { label, material, matKey: mapKey, materialRange, textureRange } = props;
    const texture = material[mapKey as keyof THREE.MeshStandardMaterial] as THREE.Texture;
    const [channel, setChannel] = useState(texture?.channel ?? -1);


    const materialRangeKey = materialRange?.matKey as keyof THREE.MeshStandardMaterial;
    const materialValue = materialRangeKey ? material[materialRangeKey] : undefined;
    const [materialRangeValue, setMaterialRangeValue] = useState((materialValue as number) ?? -1);
    const materialMin = materialRange?.min ?? 0;
    const materialMax = materialRange?.max ?? 1;
    const materialStep = materialRange?.step ?? (materialMax - materialMin) / 100;


    const textureRangeKey = textureRange?.texKey as keyof THREE.Texture;
    const textureValue = textureRangeKey ? texture[textureRangeKey] : undefined;
    const [textureRangeValue, setTextureRangeValue] = useState(textureValue ?? -1);
    const textureMin = textureRange?.min ?? 0;
    const textureMax = textureRange?.max ?? 1;
    const textureStep = textureRange?.step ?? (textureMax - textureMin) / 100;


    return <div style={{ fontSize: 11, width: "100%" }}>
        {label && <strong style={{ fontSize: 12 }}>{label}</strong>}
        <MapPreview {...props}></MapPreview>
        {channel !== -1 && <div style={{ fontSize: 11, display: "flex" }}>
            <div>Channel: {String(channel)}</div>
            <button style={{ fontSize: 11, height: 18 }} onClick={() => {
                setChannel(prev => Math.max(prev - 1, 0));
                texture.channel = Math.max(texture.channel - 1, 0);
                material.needsUpdate = true;
            }}>-1</button>
            <button style={{ fontSize: 11, height: 18 }} onClick={() => {
                setChannel(prev => prev + 1);
                texture.channel = texture.channel + 1
                material.needsUpdate = true;
            }}>+1</button>
        </div>}
        {
            materialRange && materialValue !== undefined && (
                <div style={{ display: "flex", width: "100%" }}>
                    <div style={{
                        flex: 1, minWidth: 0
                    }}>
                        <input style={{ width: "100%" }} type="range" min={materialMin} max={materialMax} step={materialStep} value={materialRangeValue} onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            materialRange.onChange(value);
                            setMaterialRangeValue(value);
                        }} />
                    </div>

                    <div style={{ width: 25 }}>
                        {toNthDigit(materialRangeValue, 2)}
                    </div>
                </div>

            )
        }
        {
            textureRange && textureValue !== undefined && (
                <div style={{ display: "flex", width: "100%" }}>
                    <div style={{
                        flex: 1, minWidth: 0
                    }}>
                        <input style={{
                            width: "100%"
                        }} type="range" min={textureMin} max={textureMax} step={textureStep} value={textureRangeValue} onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            textureRange.onChange(value);
                            setTextureRangeValue(value);
                        }} />
                    </div>
                    <div style={{ width: 25 }}>
                        {toNthDigit(textureRangeValue, 2)}
                    </div>
                </div>
            )

        }
    </div>
}

const MapSection = ({ mat }: { mat: THREE.MeshStandardMaterial }) => {
    const { isDragging, handleDrop, handleDragOver, handleDragLeave } = useLightMapDragAndDrop(mat);
    const [lightMapIntensity, setLightMapIntensity] = useState(mat.lightMapIntensity);
    const [lightmapChannel, setLightmapChannel] = useState<number>(mat.lightMap?.channel ?? 0);

    useEffect(() => {
        if (mat.lightMap) {
            console.log("Changing mat lightmap, channel", mat.lightMap.channel, ", uuid:", mat.uuid.substring(0, 5));
            setLightmapChannel(mat.lightMap.channel);
        }
    }, [mat.uuid, lightmapChannel]);

    return <section style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", border: "1px solid gray", padding: 8, borderRadius: 8, boxSizing: "border-box", cursor: isDragging ? "copy" : undefined, fontSize: 13 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >

            {/* <div style={{ marginBottom: 12 }}>
                <strong>Lightmap : {mat.lightMap === null ? "없음" : mat.lightMap.name ?? "이름없음"}</strong>
                {mat.lightMap && <div>
                    <MapInfo material={mat} matKey="lightMap"></MapInfo>
                    <div style={{ width: "100%" }}>
                        <input type="range" min={0} max={1} step={0.01} value={lightMapIntensity ?? 1} onChange={(e) => {
                            mat.lightMapIntensity = parseFloat(e.target.value);
                            setLightMapIntensity(mat.lightMapIntensity);
                        }}></input>
                        <span style={{ marginLeft: 8, fontSize: 12 }}>Intensity : {toNthDigit(lightMapIntensity ?? 1, 2)}</span>

                    </div>
                </div>}
            </div> */}

            <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 12 }}>
                <MapInfo label="Light Map" material={mat} matKey="lightMap" materialRange={{
                    matKey: "lightMapIntensity",
                    onChange: (value) => {
                        mat.lightMapIntensity = value;
                        mat.needsUpdate = true;
                    }
                }}>
                </MapInfo>

                <MapInfo label="Diffuse" material={mat} matKey="map"></MapInfo>
                <MapInfo label="Normal" material={mat} matKey="normalMap"></MapInfo>
                <MapInfo label="Roughness" material={mat} matKey="roughnessMap" materialRange={{
                    matKey: "roughness",
                    onChange: (value) => {
                        mat.roughness = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo label="Metalness" material={mat} matKey="metalnessMap" materialRange={{
                    matKey: "metalness",
                    onChange: (value) => {
                        mat.metalness = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo label="AO" material={mat} matKey="aoMap" materialRange={{
                    matKey: "aoMapIntensity",
                    onChange: (value) => {
                        mat.aoMapIntensity = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo label="Emissive" material={mat} matKey="emissiveMap" materialRange={{
                    matKey: "emissiveIntensity",
                    onChange: (value) => {
                        mat.emissiveIntensity = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo label="Env Map" material={mat} matKey="envMap" materialRange={{
                    matKey: "envMapIntensity",
                    onChange: (value) => {
                        mat.envMapIntensity = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
            </div>
            {/* <LightMapPreview ></LightMapPreview> */}
        </div>
        {/* {Object.entries(mat).map(([key, value]) => {
            return <div key={`mat-${mat.uuid}` + key} style={{ fontSize: 10 }}>{key}: {JSON.stringify(value)}</div>
        })} */}
    </section >

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
    return <MapSection key={"lightmapsection-" + mat.uuid} mat={mat as THREE.MeshStandardMaterial} />
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
            overflowY: "auto",
            boxSizing: "border-box"
        }}>
            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div style={{ fontWeight: "bold", fontSize: 12 }}>
                    {mat.name}
                </div>
                <div style={{ fontSize: 10, color: "#444" }}>
                    {mat.type}
                </div>

            </div>
            {/* <MaterialPanel style={{width:"100%"}} mat={mat}></MaterialPanel> */}
            <MapSection mat={mat as THREE.MeshStandardMaterial} />
            <div style={{ position: "absolute", top: 5, right: 5, fontSize: 12, fontWeight: "bold", cursor: "pointer" }} onClick={() => {
                setMat(null);
            }}>X</div>
        </div >
    )
}

export default MaterialPanelContainer