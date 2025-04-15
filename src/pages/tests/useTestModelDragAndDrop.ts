import React, { useState } from 'react';
import { readDirectory } from 'src/scripts/utils';

export const parseDroppedFiles = async (
  event: React.DragEvent<HTMLDivElement>,
  acceptedExtensions: string[],
) => {
  const items = Array.from(event.dataTransfer.items).map(item => ({
    entry: item.webkitGetAsEntry?.(),
    file: item.getAsFile(),
  }));

  const files: File[] = [];

  for (const item of items) {
    const { entry, file } = item;
    if (entry) {
      if (entry.isFile) {
        if (
          file &&
          acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
        ) {
          files.push(file);
        }
      } else if (entry.isDirectory) {
        const directoryFiles = await readDirectory(
          entry as FileSystemDirectoryEntry,
          acceptedExtensions,
        );
        files.push(...directoryFiles);
      }
    }
  }
  // Filter files by .gltf and .glb extensions
  const filteredFiles = files.filter(file =>
    acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
  );
  return filteredFiles;
};

const useTestModelDragAndDrop = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      const extensions = [
        '.gltf',
        '.glb',
        '.png',
        '.jpg',
        '.exr',
        '.ktx',
        '.json',
      ];
      parseDroppedFiles(event, extensions)
        .then(async filteredFiles => {
          if (filteredFiles.length === 0) {
            alert(`다음 파일들만 가능 : ${extensions.join(', ')}`);
            return;
          }

          // filteredFiles
          //   .filter(f => f.name.endsWith('.exr'))
          //   .map(file =>
          //     file.arrayBuffer().then(ab => {
          //       const exr = new EXRLoader().parse(ab);
          //       debugger;
          //     }),
          //   );

          setFiles(prev => [...prev, ...filteredFiles]);
        })
        .finally(() => {
          event.dataTransfer.clearData();
        });
    }
  };

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    files,
  };
};

export default useTestModelDragAndDrop;
