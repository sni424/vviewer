import { useSetAtom } from 'jotai';
import { useAtom } from 'jotai/index';
import React, { Dispatch, useEffect, useState } from 'react';
import { DPCModeAtom, onModalCloseAtom, useModal } from '../scripts/atoms.ts';
import { formatNumber, readDirectory } from '../scripts/utils.ts';

const FileDragDiv = ({
  title,
  files,
  setFiles,
}: {
  title: string;
  files: ImportType[];
  setFiles: Dispatch<React.SetStateAction<ImportType[]>>;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const acceptedExtensions = ['.gltf', '.glb', '.hdr', '.exr'];
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
        alert('다음 확장자만 가능(대소문자구분) : .gltf, .glb, .hdr, .exr');
        return;
      }

      // Convert files to Blob URLs
      const fileUrls: ImportType[] = filteredFiles.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        file,
        size: file.size,
      }));

      const newFileNames = fileUrls.map(i => i.name);

      setFiles(prev => {
        // 이름 동일한 것은 새로 덮어씌우기
        const removeDuplicates = prev.filter(
          i => !newFileNames.includes(i.name),
        );
        return [...removeDuplicates, ...fileUrls];
      });

      event.dataTransfer.clearData();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '49%',
        height: '300px',
        border: isDragging ? '2px dashed black' : '1px solid black',
        padding: 16,
        borderRadius: 8,
        position: 'relative',
      }}
    >
      <button
        onClick={() => setFiles([])}
        style={{ position: 'absolute', fontSize: 12, zIndex: 1000 }}
      >
        모두 삭제
      </button>
      <p style={{ fontSize: 14, textAlign: 'center', marginBottom: 8 }}>
        {title}
      </p>
      <p style={{ fontSize: 13, textAlign: 'center' }}>
        업로드한 파일 {files.length}개
      </p>
      <div style={{ height: '80%', overflowY: 'auto' }}>
        {files.length > 0 &&
          files.map(importType => {
            const { name, size } = importType;
            return (
              <div className="flex items-center mt-[2px]">
                <span style={{ fontSize: 12, textAlign: 'center' }}>
                  {name} - {formatNumber(size / (1024 * 1024))}MB
                </span>
                <button
                  style={{
                    border: 'none',
                    borderRadius: 0,
                    fontSize: 12,
                    padding: '0 4',
                    marginLeft: 4,
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    setFiles(prev => prev.filter(file => file !== importType))
                  }
                >
                  X
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

type ImportType = { name: string; url: string; file: File; size: number };

const DPCFileImporter = () => {
  const [baseFiles, setBaseFiles] = useState<ImportType[]>([]);
  const [dpFiles, setDPFiles] = useState<ImportType[]>([]);
  const [duplicates, setDuplicates] = useState<ImportType[]>([]);
  const setDPCMode = useSetAtom(DPCModeAtom);
  const { closeModal } = useModal();
  const [onModalClose, setOnModalClose] = useAtom(onModalCloseAtom);

  useEffect(() => {
    setDuplicates(checkForDuplicates());
  }, [baseFiles, dpFiles]);

  const checkForDuplicates = () => {
    const seen = new Set<string>();

    // 첫 번째 배열의 name-size 조합을 Set에 저장
    baseFiles.forEach(item => {
      seen.add(`${item.name}-${item.size}`);
    });

    // 두 번째 배열에서 중복 확인
    return dpFiles.filter(item => {
      const key = `${item.name}-${item.size}`;
      return seen.has(key);
    });
  };

  return (
    <div
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        width: '100%',
      }}
    >
      <button
        className="text-sm px-3 mb-2"
        onClick={() => {
          if (baseFiles.length === 0 && dpFiles.length === 0) {
            setDPCMode('select');
          } else {
            if (confirm('모델 구성 모드 선택 화면으로 돌아가시겠어요?')) {
              setDPCMode('select');
            }
          }
        }}
      >
        돌아가기
      </button>
      <div className="w-full flex justify-between items-center">
        <FileDragDiv
          files={baseFiles}
          setFiles={setBaseFiles}
          title="Base 업로드"
        />
        <FileDragDiv files={dpFiles} setFiles={setDPFiles} title="DP 업로드" />
      </div>
      <div className="w-full flex justify-center items-center mt-3">
        <button
          disabled={
            baseFiles.length === 0 ||
            dpFiles.length === 0 ||
            duplicates.length > 0
          }
          className="text-sm px-3"
          onClick={() => {
            if (confirm('업로드 하시겠습니까?')) {
              // TODO Upload Logics

              if (onModalClose) {
                onModalClose();
                setOnModalClose(() => {});
              }
              closeModal?.();
            }
          }}
        >
          업로드
        </button>
      </div>
      <div className="mt-2">
        {/* Upload Disabled Messages */}
        {duplicates.length > 0 && (
          <>
            <p style={{ textAlign: 'center' }}>
              양쪽에 중복이 되는 파일이 있습니다. 중복 파일 목록
            </p>
            {duplicates.map(({ name }) => (
              <p style={{ textAlign: 'center' }}>{name}</p>
            ))}
          </>
        )}
        {baseFiles.length === 0 && (
          <p style={{ textAlign: 'center' }}>
            Base 업로드에 파일이 추가되지 않았습니다.
          </p>
        )}
        {dpFiles.length === 0 && (
          <p style={{ textAlign: 'center' }}>
            DP 업로드에 파일이 추가되지 않았습니다.
          </p>
        )}
      </div>
    </div>
  );
};

export default DPCFileImporter;
