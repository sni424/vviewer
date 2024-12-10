import React, { useEffect, useState } from "react";
import { THREE } from "../scripts/VTHREE";
import { useModal } from "../scripts/atoms";

export interface MapPreviewProps {
    material: THREE.MeshStandardMaterial;
    matKey: "lightMap" | "map" | "emissiveMap" | "bumpMap" | "normalMap" | "displacementMap" | "roughnessMap" | "metalnessMap" | "alphaMap" | "envMap" | "aoMap" | "gradientMap" | "lightMap" | "specularMap" | "clearcoatMap" | "clearcoat";
    width?: number;
    height?: number;
}

const MapPreview: React.FC<MapPreviewProps> = ({ material, width, height, matKey: mapKey }) => {
    const [mapSrc, setMapSrc] = useState<string | null | undefined>(undefined);
    const texture = material[mapKey as keyof THREE.MeshStandardMaterial] as THREE.Texture;
    const { openModal, closeModal } = useModal();

    useEffect(() => {
        if(mapKey === "envMap"){
            // HDR이미지를 보여줄 수가 없다
            return;
        }

        const previewCanvasId = "map-preview-canvas";
        if (texture && texture.image) {

            let canvas = document.getElementById(previewCanvasId) as HTMLCanvasElement;
            if (!canvas) {
                canvas = document.createElement("canvas");
                canvas.id = previewCanvasId;
            }

            // Create a canvas to draw the texture
            const context = canvas.getContext("2d");

            // Set the canvas size to the texture size
            const { width, height } = texture.image;
            canvas.width = width;
            canvas.height = height;

            // Draw the texture onto the canvas
            if (context) {
                context.drawImage(texture.image, 0, 0, width, height);

                // Convert the canvas content to a data URL
                const dataUrl = canvas.toDataURL();
                setMapSrc(dataUrl);
            }
        } else {
            setMapSrc(null);
        }

        return () => {
            document.getElementById(previewCanvasId)?.remove();
        }
    }, [texture]);

    if(mapKey==="envMap"){
        if(texture){
            return <div style={{fontSize:11, color:"#555"}}>envMap표시불가</div>
        } else {
            return <div>없음</div>
        }
    }

    return <div style={{ width: (mapSrc !== null) ? (width ?? 60) : undefined, height: (mapSrc !== null) ? (height ?? 60) : undefined, backgroundClip: "gray", borderRadius: 8 }}>
        {mapSrc && <img style={{ cursor: "pointer", width: "100%", height: "100%", objectFit: "contain" }} src={mapSrc} alt={`${mapKey} preview`} onClick={() => {
            openModal(() => {
                return <div style={{
                    maxHeight: 800,
                    maxWidth: 800,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 20, boxSizing: "border-box"
                }}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        closeModal();
                    }}
                >
                    <img src={mapSrc} alt="Light Map Preview" style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain"
                    }} />
                </div>
            })
        }} />}
        {(mapSrc === null) && "없음"}
    </div >
};

export default MapPreview;
