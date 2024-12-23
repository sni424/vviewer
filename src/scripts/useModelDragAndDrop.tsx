import { useAtomValue, useSetAtom } from 'jotai';
import React, { useState } from 'react';
import {
  MapDst,
  ModelSource,
  sourceAtom,
  threeExportsAtom,
} from '../scripts/atoms';
import { readDirectory } from './utils';
import VObjectLoader from './VObjectLoader.ts';

const MapSelectModal = ({
  gltfs,
  inputMaps,
  closeModal,
}: {
  closeModal?: () => any;
  gltfs: File[];
  inputMaps: File[];
}) => {
  const [mapDst, setMapDst] = useState<MapDst>('lightmap');
  const setSourceUrls = useSetAtom(sourceAtom);

  return (
    <div
      style={{
        boxSizing: 'border-box',
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#ffffffdd',
      }}
      onClick={e => {
        // e.preventDefault();
        e.stopPropagation();
      }}
    >
      <strong>맵 일괄적용</strong>
      <select
        value={mapDst}
        onChange={e => {
          setMapDst(e.target.value as MapDst);
        }}
      >
        <option value="lightmap">라이트맵</option>
        <option value="emissivemap">이미시브</option>
        {/* <option value="envmap">Env맵</option> */}
      </select>

      <div
        style={{
          justifyContent: 'end',
          width: '100%',
          display: 'flex',
          marginTop: 12,
        }}
      >
        <button
          onClick={() => {
            setSourceUrls([]);
            closeModal?.();
          }}
        >
          취소
        </button>
        <button
          onClick={() => {
            const fileUrls = gltfs.map(file => {
              const retval: ModelSource = {
                name: file.name,
                url: URL.createObjectURL(file),
                file,
                map: undefined as File | undefined,
              };
              const filenameWithoutExtension = file.name.split('.')[0];
              // 모델명_Lightmap.png인 경우도 있고 모델명.png인 경우도 있다
              const map = inputMaps.find(lightmap => {
                const lightmapeName = lightmap.name.split('.')[0];
                return (
                  filenameWithoutExtension === lightmapeName ||
                  filenameWithoutExtension + '_Lightmap' === lightmapeName
                );
              });
              if (map) {
                retval.map = map;
                retval.mapDst = mapDst;
              }
              return retval;
            });
            setSourceUrls(fileUrls);

            closeModal?.();
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
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

    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      const acceptedExtensions = [
        '.gltf',
        '.glb',
        '.json',
        '.png',
        '.jpg',
        '.exr',
      ];
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
              acceptedExtensions.some(ext =>
                file.name.toLowerCase().endsWith(ext),
              )
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

      if (filteredFiles.length === 0) {
        alert('Only .gltf and .glb, .json, .png, .exr files are accepted.');
        return;
      }

      // 1. gainmap부터 확인 - 같은 이름의 glb, json, jpg(jgpeg) 확인
      const gltfs = filteredFiles.filter(
        file =>
          file.name.toLowerCase().endsWith('.gltf') ||
          file.name.toLowerCase().endsWith('.glb'),
      );

      // 1. 씬이 저장된 .json파일
      const jsons = filteredFiles.filter(file =>
        file.name.toLowerCase().endsWith('.json'),
      );
      if (threeExports && jsons.length > 0) {
        const loader = new VObjectLoader();
        jsons.forEach(jsonFile => {
          // scene.toJSON()
          const reader = new FileReader();
          reader.readAsText(jsonFile);

          reader.onload = function () {
            const obj = JSON.parse(reader.result as string);
            threeExports.scene.add(loader.parse(obj));
          };
        });

        // if (!filteredFiles.every(file => file.name.toLowerCase().endsWith(".json"))) {
        //     alert("JSON이 아닌 파일들은 무시되었음");
        // }

        // return;
      }

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
        const fileUrls = gltfs.map(file => {
          const retval: ModelSource = {
            name: file.name,
            url: URL.createObjectURL(file),
            file,
            map: undefined as File | undefined,
          };
          const filenameWithoutExtension = file.name.split('.')[0];
          // 모델명_Lightmap.png인 경우도 있고 모델명.png인 경우도 있다
          // .jpg인 경우는 게인맵이지만 여기서 처리하지 않고 Renderer에서 처리
          const map = inputMaps.find(lightmap => {
            const lightmapeName = lightmap.name.split('.')[0];
            return (
              filenameWithoutExtension === lightmapeName ||
              filenameWithoutExtension + '_Lightmap' === lightmapeName
            );
          });
          if (map) {
            retval.map = map;
            retval.mapDst = 'lightmap';
          }
          return retval;
        });

        // Renderer에서 모델 추가됨
        setSourceUrls(fileUrls);
        // openModal(props => (
        //   <MapSelectModal {...props} gltfs={gltfs} inputMaps={inputMaps} />
        // ));
      } else {
        // 3. 모델만
        const fileUrls = gltfs.map(file => ({
          name: file.name,
          url: URL.createObjectURL(file),
          file,
        }));

        // Renderer에서 모델 추가됨
        setSourceUrls(fileUrls);
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

export default useModelDragAndDrop;
