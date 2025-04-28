import React, { useEffect, useState } from 'react';

import { parseDroppedFiles } from 'src/scripts/useModelDragAndDrop.ts';
import { useAtom } from 'jotai';
import { getMaxFileType, MaxFile, maxFileAtom } from 'src/pages/max/maxAtoms.ts';

const useMaxFileController = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useAtom(maxFileAtom);

  useEffect(() => {
    console.log('file Changed : ', files);
  }, [files]);

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
      const extensions = ['.vrt', '.vri', '.vrg', '.vrm', '.vro'];
      parseDroppedFiles(event, extensions)
        .then(async filteredFiles => {
          if (filteredFiles.length === 0) {
            alert(`다음 파일들만 가능 : ${extensions.join(', ')}`);
            return;
          }

          const maxFiles: MaxFile[] = filteredFiles.map(file => {
            return {
              originalFile: file,
              type: getMaxFileType(file),
              loaded: false
            } as MaxFile
          })

          setFiles(pre => [...pre, ...maxFiles]);
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
  };
};

export default useMaxFileController;
