import { useState } from 'react';
import { THREE } from './VTHREE';

const useLightMapDragAndDrop = (
  mat: THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[],
) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const acceptedExtensions = ['.png', '.jpg'];
      const files = Array.from(event.dataTransfer.files);

      // Filter files by .gltf and .glb extensions
      const filteredFiles = files.filter(file =>
        acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
      );

      if (filteredFiles.length === 0) {
        alert('Only .png and .jpg files are accepted.');
        return;
      }

      // Convert files to Blob URLs
      const fileUrls = filteredFiles.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        file,
      }));

      if (fileUrls.length > 0) {
        const texture = new THREE.TextureLoader().load(fileUrls[0].url);
        texture.flipY = !texture.flipY;
        console.log(texture);

        if (Array.isArray(mat)) {
          mat.forEach(m => {
            m.lightMap = texture;
            m.lightMap.channel = 1;
          });
        } else {
          mat.lightMap = texture;
          mat.lightMap.channel = 1;
        }
      }

      event.dataTransfer.clearData();
    }
  };

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};

export default useLightMapDragAndDrop;
