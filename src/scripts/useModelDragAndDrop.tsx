import { useAtomValue, useSetAtom } from 'jotai';
import React, { useState } from 'react';
import { __UNDEFINED__ } from '../Constants';
import {
  MapDst,
  ModelSource,
  sourceAtom,
  threeExportsAtom,
  useModal,
} from '../scripts/atoms';
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
        filenameWithoutExtension + '_Lightmap' === lightmapName
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

const MapSelectorModal = ({
  closeModal,
  models,
  maps,
}: {
  closeModal?: Function;
  models: File[];
  maps: File[];
}) => {
  const setSourceUrls = useSetAtom(sourceAtom);
  const [target, setTarget] = useState<MapDst | typeof __UNDEFINED__>(
    '__UNDEFINED__',
  );

  const uniqueMaps = () => {
    // 같은 이름의 exr, png, jpg가 존재할 때 우선순위 : exr > png > jpg
    const exrs = maps.filter(file => file.name.toLowerCase().endsWith('.exr'));
    const pngs = maps
      .filter(file => file.name.toLowerCase().endsWith('.png'))
      .filter(png => {
        return !exrs.some(
          exr =>
            splitExtension(exr.name).name === splitExtension(png.name).name ||
            splitExtension(exr.name).name.split('_Bake')[0] ===
              splitExtension(png.name).name ||
            splitExtension(exr.name).name ===
              splitExtension(png.name).name.split('_Bake')[0],
        );
      });
    const jpgs = maps
      .filter(file => file.name.toLowerCase().endsWith('.jpg'))
      .filter(jpg => {
        return (
          !exrs.some(
            exr =>
              splitExtension(exr.name).name === splitExtension(jpg.name).name ||
              splitExtension(exr.name).name.split('_Bake')[0] ===
                splitExtension(jpg.name).name ||
              splitExtension(exr.name).name ===
                splitExtension(jpg.name).name.split('_Bake')[0],
          ) ||
          !pngs.some(
            png =>
              splitExtension(png.name).name === splitExtension(jpg.name).name ||
              splitExtension(png.name).name.split('_Bake')[0] ===
                splitExtension(jpg.name).name ||
              splitExtension(png.name).name ===
                splitExtension(jpg.name).name.split('_Bake')[0],
          )
        );
      });

    return [...exrs, ...pngs, ...jpgs];
  };
  maps = uniqueMaps();

  return (
    <div
      className="w-80 h-80 bg-white rounded-md flex flex-col items-center justify-center gap-3"
      onClick={e => {
        e.stopPropagation();
      }}
    >
      <button
        className="text-lg p-2"
        onClick={() => {
          const sources = parse(models, maps, 'gainmap');
          setSourceUrls(sources);
          closeModal?.();
        }}
      >
        게인맵
      </button>
      <button
        className="text-lg p-2"
        onClick={() => {
          const sources = parse(models, maps, 'lightmap');
          setSourceUrls(sources);
          closeModal?.();
        }}
      >
        라이트맵
      </button>
    </div>
  );
};

const parseDroppedFiles = async (
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

const useModelDragAndDrop = () => {
  const [isDragging, setIsDragging] = useState(false);
  const setSourceUrls = useSetAtom(sourceAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  const { openModal, closeModal } = useModal();

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
      const extensions = ['.gltf', '.glb', '.png', '.jpg', '.exr'];
      parseDroppedFiles(event, extensions)
        .then(filteredFiles => {
          if (filteredFiles.length === 0) {
            alert(`다음 파일들만 가능 : ${extensions.join(', ')}`);
            return;
          }

          // 1. gainmap부터 확인 - 같은 이름의 glb, json, jpg(jgpeg) 확인
          const gltfs = filteredFiles.filter(
            file =>
              file.name.toLowerCase().endsWith('.gltf') ||
              file.name.toLowerCase().endsWith('.glb'),
          );

          const inputMaps = filteredFiles.filter(
            file =>
              file.name.toLowerCase().endsWith('.png') ||
              file.name.toLowerCase().endsWith('.exr') ||
              file.name.toLowerCase().endsWith('.jpg'), // 게인맵
          );

          // 이미지파일이 있으면 Lightmap에 넣을지 Emissive에 넣을지 등을 선택해야한다.
          const hasMaps = inputMaps.length > 0;

          // 2. 모델 + 이미지
          if (hasMaps) {
            if (
              inputMaps.some(map => map.name.toLowerCase().endsWith('.exr'))
            ) {
              openModal(<MapSelectorModal models={gltfs} maps={inputMaps} />);
            } else {
              const sources = parse(gltfs, inputMaps, 'lightmap');
              setSourceUrls(sources);
            }
          } else {
            // 3. 모델만
            const fileUrls = gltfs.map(file => ({
              name: file.name,
              file,
            }));

            // Renderer에서 모델 추가됨
            setSourceUrls(fileUrls);
          }
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

export default useModelDragAndDrop;
