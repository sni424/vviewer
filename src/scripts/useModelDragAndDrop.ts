import { useAtomValue, useSetAtom } from 'jotai';
import React, { useState } from 'react';
import { getMaxFileType, MaxFile, maxFileAtom } from 'src/pages/max/maxAtoms';
import { Walls } from '../types';
import {
  MapDst,
  ModelSource,
  setAtomValue,
  sourceAtom,
  threeExportsAtom,
  wallOptionAtom,
} from './atoms';
import { fileToJson, verifyWalls, wallsToWallOption } from './atomUtils';
import { readDirectory, splitExtension } from './utils';

const parse = (models: File[], maps: File[], mapDst: MapDst) => {
  const fileUrls = models.map(file => {
    const retval: ModelSource = {
      name: file.name,
      file,
      map: undefined as File | undefined,
    };
    const filenameWithoutExtension = splitExtension(file.name).name;

    // 모델명_Lightmap.png인 경우도 있고 모델명.png인 경우도 있다
    // .jpg인 경우는 게인맵이지만 여기서 처리하지 않고 Renderer에서 처리
    const map = maps.find(lightmap => {
      const lightmapName = splitExtension(lightmap.name).name;

      // 베이크했을 때 _Bake...가 붙어있는 경우
      return (
        filenameWithoutExtension === lightmapName.split('_Bake')[0] ||
        filenameWithoutExtension + '_Lightmap' === lightmapName ||
        filenameWithoutExtension === lightmapName.split('__')[0]
      );
    });
    if (map) {
      retval.map = map;
      retval.mapDst = mapDst;
    }

    return retval;
  });
  return fileUrls;
};

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
  if (acceptedExtensions.length > 0) {
    return files.filter(file =>
      acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
    );
  }
  return files;
};

const useModelDragAndDrop = () => {
  const [isDragging, setIsDragging] = useState(false);
  const setSourceUrls = useSetAtom(sourceAtom);
  const threeExports = useAtomValue(threeExportsAtom);

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

    const extensions = [
      '.gltf',
      '.glb',
      '.png',
      '.jpg',
      '.exr',
      '.ktx',
      '.json',
    ];
    const maxExtensions = ['.vrt', '.vri', '.vrg', '.vrm', '.vro'];
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      // 우선 파일 전부 가져오기
      const allFiles = await parseDroppedFiles(event, [
        ...extensions,
        ...maxExtensions,
      ]);
      if (allFiles.length === 0) {
        // alert(
        //   `다음 파일들만 가능 : ${[...extensions, ...maxExtensions].join(', ')}`,
        // );
        return;
      }
      // max 확장자가 하나라도 있는 경우
      const hasMax = allFiles.some(file =>
        maxExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
      );

      if (hasMax) {
        const maxFiles: MaxFile[] = allFiles
          .filter(file =>
            maxExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
          )
          .map(file => ({
            originalFile: file,
            name: file.name,
            type: getMaxFileType(file),
            loaded: false,
          }));
        setAtomValue(maxFileAtom, pre => [...pre, ...maxFiles]);
      }
      //glb파일
      else {
        const filteredFiles = allFiles.filter(file =>
          extensions.some(ext => file.name.toLowerCase().endsWith(ext)),
        );
        const wallFile = filteredFiles.find(file => file.name === 'walls.json');
        if (wallFile) {
          const walls = (await fileToJson(wallFile)) as Walls;
          if (verifyWalls(walls)) {
            const wallCreateOption = wallsToWallOption(walls);
            setAtomValue(wallOptionAtom, wallCreateOption);
          } else {
            alert('walls.json 파일이 잘못되었습니다.');
          }
          return;
        }

        // 1. 같은 이름의 glb, json, jpg(jgpeg) 확인
        const gltfs = filteredFiles.filter(
          file =>
            file.name.toLowerCase().endsWith('.gltf') ||
            file.name.toLowerCase().endsWith('.glb'),
        );

        const inputMaps = filteredFiles.filter(
          file =>
            file.name.toLowerCase().endsWith('.png') ||
            file.name.toLowerCase().endsWith('.exr') ||
            file.name.toLowerCase().endsWith('.ktx') || //라이트맵
            file.name.toLowerCase().endsWith('.jpg'), // 게인맵
        );

        // 이미지파일이 있으면 Lightmap에 넣을지 Emissive에 넣을지 등을 선택해야한다.
        const hasMaps = inputMaps.length > 0;

        // 2. 모델 + 이미지
        if (hasMaps) {
          // 게인맵 선택?
          // if (
          //   inputMaps.some(map => map.name.toLowerCase().endsWith('.exr'))
          // ) {
          //   openModal(<MapSelectorModal models={gltfs} maps={inputMaps} />);
          // } else {
          //   const sources = parse(gltfs, inputMaps, 'lightmap');
          //   setSourceUrls(sources);
          // }
          const sources = parse(gltfs, inputMaps, 'lightmap');
          setSourceUrls(sources);
        } else {
          // 3. 모델만
          const fileUrls = gltfs.map(file => ({
            name: file.name,
            file,
          }));

          // Renderer에서 모델 추가됨
          setSourceUrls(fileUrls);
        }
      }
      event.dataTransfer.clearData();
      // parseDroppedFiles(event, extensions)
      //   .then(async filteredFiles => {
      //     if (filteredFiles.length === 0) {
      //       alert(`다음 파일들만 가능 : ${extensions.join(', ')}`);
      //       return;
      //     }

      //     const wallFile = filteredFiles.find(
      //       file => file.name === 'walls.json',
      //     );
      //     if (wallFile) {
      //       const walls = (await fileToJson(wallFile)) as Walls;
      //       if (verifyWalls(walls)) {
      //         const wallCreateOption = wallsToWallOption(walls);
      //         setAtomValue(wallOptionAtom, wallCreateOption);
      //       } else {
      //         alert('walls.json 파일이 잘못되었습니다.');
      //       }
      //       return;
      //     }

      //     // 1. 같은 이름의 glb, json, jpg(jgpeg) 확인
      //     const gltfs = filteredFiles.filter(
      //       file =>
      //         file.name.toLowerCase().endsWith('.gltf') ||
      //         file.name.toLowerCase().endsWith('.glb'),
      //     );

      //     const inputMaps = filteredFiles.filter(
      //       file =>
      //         file.name.toLowerCase().endsWith('.png') ||
      //         file.name.toLowerCase().endsWith('.exr') ||
      //         file.name.toLowerCase().endsWith('.ktx') || //라이트맵
      //         file.name.toLowerCase().endsWith('.jpg'), // 게인맵
      //     );

      //     // 이미지파일이 있으면 Lightmap에 넣을지 Emissive에 넣을지 등을 선택해야한다.
      //     const hasMaps = inputMaps.length > 0;

      //     // 2. 모델 + 이미지
      //     if (hasMaps) {
      //       // 게인맵 선택?
      //       // if (
      //       //   inputMaps.some(map => map.name.toLowerCase().endsWith('.exr'))
      //       // ) {
      //       //   openModal(<MapSelectorModal models={gltfs} maps={inputMaps} />);
      //       // } else {
      //       //   const sources = parse(gltfs, inputMaps, 'lightmap');
      //       //   setSourceUrls(sources);
      //       // }
      //       const sources = parse(gltfs, inputMaps, 'lightmap');
      //       setSourceUrls(sources);
      //     } else {
      //       // 3. 모델만
      //       const fileUrls = gltfs.map(file => ({
      //         name: file.name,
      //         file,
      //       }));

      //       // Renderer에서 모델 추가됨
      //       setSourceUrls(fileUrls);
      //     }
      //   })
      //   .finally(() => {
      //     event.dataTransfer.clearData();
      //   });
    }
  };

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};

export default useModelDragAndDrop;
