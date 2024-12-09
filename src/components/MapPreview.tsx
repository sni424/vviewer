import React, { useEffect, useState } from "react";
import { THREE } from "../scripts/VTHREE";
import { useModal } from "../scripts/atoms";

interface MapPreviewProps {
    material: THREE.MeshStandardMaterial;
    mapKey: "lightMap" | "map" | "emissiveMap" | "bumpMap" | "normalMap" | "displacementMap" | "roughnessMap" | "metalnessMap" | "alphaMap" | "envMap" | "aoMap" | "gradientMap" | "lightMap" | "specularMap" | "clearcoatMap" | "clearcoat";
    width?: number;
    height?: number;
}

const MapPreview: React.FC<MapPreviewProps> = ({ material, width, height, mapKey }) => {
    const [mapSrc, setMapSrc] = useState<string | null>(null);
    const texture = material[mapKey as keyof THREE.MeshStandardMaterial] as THREE.Texture;
    const { openModal, closeModal } = useModal();

    useEffect(() => {
        if (texture && texture.image) {

            // Create a canvas to draw the texture
            const canvas = document.createElement("canvas");
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
        }
    }, [texture]);

    return <div style={{ width: mapSrc ? (width ?? 60) : undefined, height: mapSrc ? (height ?? 60) : undefined, backgroundClip: "gray", borderRadius: 8 }}>
        {mapSrc && <img style={{ cursor: "pointer", width: "100%", height: "100%", objectFit: "contain" }} src={mapSrc} alt="Light Map Preview" onClick={() => {
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
                        width:"100%",
                        height:"100%",
                        objectFit: "contain"
                    }} />
                </div>
            })
        }} />}
        {!mapSrc && "없음"}
    </div >
};

export default MapPreview;
