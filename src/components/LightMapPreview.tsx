import React, { useEffect, useState } from "react";
import * as THREE from "three";

interface LightMapPreviewProps {
    material: THREE.MeshStandardMaterial;
    width?: number;
    height?: number;
}

const LightMapPreview: React.FC<LightMapPreviewProps> = ({ material, width, height }) => {
    const [lightMapSrc, setLightMapSrc] = useState<string | null>(null);

    useEffect(() => {
        if (material.lightMap && material.lightMap.image) {
            const texture = material.lightMap;

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
                setLightMapSrc(dataUrl);
            }
        }
    }, [material.lightMap]);

    return lightMapSrc ? (
        <img width={width ?? 60} height={height ?? 60} src={lightMapSrc} alt="Light Map Preview" />
    ) : (
        <p>No light map available.</p>
    );
};

export default LightMapPreview;
