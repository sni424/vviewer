import { useAtom, useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react'
import { materialSelectedAtom, selectedAtom, threeExportsAtom } from '../scripts/atoms';
import { THREE } from '../scripts/VTHREE';
import { loadHDRTexture, toNthDigit } from '../scripts/utils';
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
    forceUpdate?: () => any;
}

const setMap = (material: THREE.MeshStandardMaterial, mapKey: string, texture: THREE.Texture | null) => {
    const dstKey = mapKey as keyof THREE.MeshStandardMaterial;
    if (dstKey === "lightMap") {
        material.lightMap = texture;
    } else if (dstKey === "map") {
        material.map = texture;
    } else if (dstKey === "emissiveMap") {
        material.emissiveMap = texture;
    } else if (dstKey === "bumpMap") {
        material.bumpMap = texture;
    } else if (dstKey === "normalMap") {
        material.normalMap = texture;
    } else if (dstKey === "displacementMap") {
        material.displacementMap = texture;
    } else if (dstKey === "roughnessMap") {
        material.roughnessMap = texture;
    } else if (dstKey === "metalnessMap") {
        material.metalnessMap = texture;
    } else if (dstKey === "alphaMap") {
        material.alphaMap = texture;
    } else if (dstKey === "envMap") {

        material.envMap = texture;
    } else if (dstKey === "aoMap") {
        material.aoMap = texture;
    } else {
        throw new Error("Invalid mapKey @MaterialPanel");
    }
    material.needsUpdate = true;
}

const MapInfo = (props: MapInfoProps) => {
    if (props.matKey === "lightMap") {
        console.log("Lightmap rendered");
    }

    const { label, material, matKey: mapKey, materialRange, textureRange, forceUpdate } = props;
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

    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            if ((file.name.endsWith(".hdr") || file.name.endsWith(".exr")) && mapKey === "envMap") {
                loadHDRTexture(URL.createObjectURL(file)).then((texture) => {
                    setMap(material, mapKey, texture);
                })
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const texture = new THREE.TextureLoader().load(e.target?.result as string);
                    texture.flipY = !texture.flipY;
                    setMap(material, mapKey, texture);
                    forceUpdate?.();
                }
                reader.readAsDataURL(file);
            }

        }
    }


    return <div
        style={{ fontSize: 11, width: "100%", boxSizing: "border-box", border: isDragging ? "1px dashed black" : undefined }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
    >
        <div style={{ display: "flex", gap: 8 }}>
            {label && <strong style={{ fontSize: 12 }}>{label}</strong>}
            <button style={{ fontSize: 10 }} onClick={() => {
                setMap(material, mapKey, null);
                forceUpdate?.();
            }}>삭제</button>
        </div>

        <MapPreview key={`mappreview-${props.matKey}-${props.material.uuid}`} {...props}></MapPreview>
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

                    {/* <div style={{ width: 25 }}>
                        {toNthDigit(materialRangeValue, 2)}
                    </div> */}
                    <input style={{width:35, borderRadius:4}} type="number" min={materialMin} max={materialMax} step={materialStep} value={materialRangeValue} onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        materialRange.onChange(value);
                        setMaterialRangeValue(value);
                    }} />
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
                    {/* <div style={{ width: 25 }}>
                        {toNthDigit(textureRangeValue, 2)}
                    </div> */}
                    <input style={{width:35, borderRadius:4}} type="number" min={textureMin} max={textureMax} step={textureStep} value={textureRangeValue} onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        textureRange.onChange(value);
                        setTextureRangeValue(value);
                    }} />
                </div>
            )

        }
    </div>
}

const MapSection = ({ mat, forceUpdate }: { mat: THREE.MeshStandardMaterial; forceUpdate: () => any }) => {


    return <section style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", border: "1px solid gray", padding: 8, borderRadius: 8, boxSizing: "border-box", fontSize: 13 }}
        >

            <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 12 }}>
                <MapInfo forceUpdate={forceUpdate} label="Light Map" material={mat} matKey="lightMap" materialRange={{
                    matKey: "lightMapIntensity",
                    onChange: (value) => {
                        mat.lightMapIntensity = value;
                        mat.needsUpdate = true;
                    },
                    max: 10
                }}>
                </MapInfo>

                <MapInfo forceUpdate={forceUpdate} label="Diffuse" material={mat} matKey="map"></MapInfo>
                <MapInfo forceUpdate={forceUpdate} label="Normal" material={mat} matKey="normalMap"></MapInfo>
                <MapInfo forceUpdate={forceUpdate} label="Roughness" material={mat} matKey="roughnessMap" materialRange={{
                    matKey: "roughness",
                    onChange: (value) => {
                        mat.roughness = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo forceUpdate={forceUpdate} label="Metalness" material={mat} matKey="metalnessMap" materialRange={{
                    matKey: "metalness",
                    onChange: (value) => {
                        mat.metalness = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo forceUpdate={forceUpdate} label="AO" material={mat} matKey="aoMap" materialRange={{
                    matKey: "aoMapIntensity",
                    onChange: (value) => {
                        mat.aoMapIntensity = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo forceUpdate={forceUpdate} label="Emissive" material={mat} matKey="emissiveMap" materialRange={{
                    matKey: "emissiveIntensity",
                    onChange: (value) => {
                        mat.emissiveIntensity = value;
                        mat.needsUpdate = true;
                    }
                }}></MapInfo>
                <MapInfo forceUpdate={forceUpdate} label="Env Map" material={mat} matKey="envMap" materialRange={{
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

function MaterialPanelContainer() {
    const selecteds = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    const [mat, setMat] = useAtom(materialSelectedAtom);
    const forceUpdate = () => {
        if (mat) {
            setMat(mat.clone());
        }
    }

    if (!mat || !threeExports) {
        return null;
    }

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
                <button style={{fontSize: 12}} onClick={() => {
                    const toJSON = mat.toJSON();
                    console.log(toJSON);
                }}>toJSON</button>
            </div>
            {/* <MaterialPanel style={{width:"100%"}} mat={mat}></MaterialPanel> */}
            <MapSection mat={mat as THREE.MeshStandardMaterial} forceUpdate={forceUpdate} />
            <div style={{ position: "absolute", top: 5, right: 5, fontSize: 12, fontWeight: "bold", cursor: "pointer" }} onClick={() => {
                setMat(null);
            }}>X</div>
        </div >
    )
}

export default MaterialPanelContainer