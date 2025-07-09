import React, { useEffect, useState } from 'react';

import { useAtom } from 'jotai';
import VRGLoader from 'src/pages/max/loaders/VRGLoader.ts';
import VRILoader from 'src/pages/max/loaders/VRILoader.ts';
import VRMLoader from 'src/pages/max/loaders/VRMLoader.ts';
import VROLoader from 'src/pages/max/loaders/VROLoader.ts';
import VRTLoader from 'src/pages/max/loaders/VRTLoader.ts';
import {
  getMaxFileType,
  MaxFile,
  maxFileAtom,
} from 'src/pages/max/maxAtoms.ts';
import { parseDroppedFiles } from 'src/scripts/useModelDragAndDrop.ts';

const useMaxFileController = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useAtom(maxFileAtom);

  async function handleMaxFile(maxFile: MaxFile) {
    const { type, originalFile, loaded, resultData } = maxFile;
    if (loaded && resultData) {
      console.log('already loaded');
      return;
    }

    let loader;

    switch (type) {
      case 'geometry':
        loader = new VRGLoader();
        break;
      case 'object':
        loader = new VROLoader();
        break;
      case 'material':
        loader = new VRMLoader();
        break;
      case 'texture':
        loader = new VRTLoader();
        break;
      case 'image':
        loader = new VRILoader();
        break;
    }

    if (!loader) {
      alert('Not yet Supported Type : ' + type);
      return null;
    }

    const result = await loader.load(maxFile);
    // console.log('result : ', result);

    return result;
  }

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
              loaded: false,
            } as MaxFile;
          });

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
    handleMaxFile,
  };
};

export default useMaxFileController;
