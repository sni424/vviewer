import React, { useState } from 'react';
import { formatNumber, readDirectory } from '../../scripts/utils.ts';
import { ENV } from '../../Constants.ts';
import { useModal } from '../../scripts/atoms.ts';

type FileUploadResponse = {
  success: boolean;
  responseType: 'success';
  data: {
    fileSize: number;
    fileType: null;
    fileUrl: string;
    filename: string;
  }[];
};

type UploaderConfig = {
  checkExtensions: string[];
  onConfirm: (files: File[]) => Promise<FileUploadResponse>;
};

const modelUploaderConfigs: UploaderConfig = {
  checkExtensions: ['glb', 'gltf'],
  onConfirm: async (files: File[]) => {
    const url = ENV.modelUpload;
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return fetch(url, { method: 'POST', body: formData }).then(res =>
      res.json(),
    ) as Promise<FileUploadResponse>;
  },
};
const imageUploaderConfigs: UploaderConfig = {
  checkExtensions: ['exr', 'jpg', 'png'],
  onConfirm: async files => {
    const exrURL = import.meta.env.VITE_KTX_URL;
    const pngURL = import.meta.env.VITE_PNG_KTX_URL;
    const jpgURL = ENV.modelUpload;
    const exrFormData = new FormData();
    const pngFormData = new FormData();
    const jpgFormData = new FormData();
    const exrFiles = files.filter(file =>
      file.name.toLowerCase().endsWith('.exr'),
    );
    const pngFiles = files.filter(file =>
      file.name.toLowerCase().endsWith('.png'),
    );
    const jpgFiles = files.filter(file =>
      file.name.toLowerCase().endsWith('.jpg'),
    );

    const promises = [];
    if (exrFiles.length > 0) {
      for (const file of exrFiles) {
        exrFormData.append('files', file);
      }
      promises.push(
        fetch(exrURL, {
          method: 'POST',
          body: exrFormData,
        }).then(res => res.json()) as Promise<FileUploadResponse>,
      );
    }

    if (pngFiles.length > 0) {
      for (const file of pngFiles) {
        pngFormData.append('files', file);
      }
      promises.push(
        fetch(pngURL, {
          method: 'POST',
          body: pngFormData,
        }).then(res => res.json()) as Promise<FileUploadResponse>,
      );
    }

    if (jpgFiles.length > 0) {
      for (const file of jpgFiles) {
        jpgFormData.append('files', file);
      }
      promises.push(
        fetch(jpgURL, {
          method: 'POST',
          body: jpgFormData,
        }).then(res => res.json()) as Promise<FileUploadResponse>,
      );
    }

    const responses = await Promise.all(promises);

    const successfulResponses = responses.filter(
      (res): res is FileUploadResponse => res !== null && res.success,
    );

    const failedCount = responses.length - successfulResponses.length;

    if (successfulResponses.length === 0) {
      // 전부 실패한 경우
      return {
        success: false,
        responseType: 'success',
        data: [],
      };
    }

    const merged: FileUploadResponse = {
      success: failedCount === 0, // 하나라도 실패하면 false
      responseType: 'success',
      data: successfulResponses.flatMap(res => res.data),
    };

    // TODO 분리 할건 분리해야함
    return merged;
  },
};

const FileUploader = () => {
  const [mode, setMode] = useState<'model' | 'image' | null>(null);
  const configs = {
    model: modelUploaderConfigs,
    image: imageUploaderConfigs,
  };

  return (
    <div className="w-[500px] bg-white h-[300px] p-2 rounded-lg">
      {mode ? (
        <FileDragDiv
          title={`${mode} 업로드`}
          checkExtensions={configs[mode].checkExtensions}
          showConfirm
          onCancel={() => setMode(null)}
          onConfirm={configs[mode].onConfirm}
        />
      ) : (
        <div
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <p style={{ textAlign: 'center', fontSize: 16 }}>
            뭐 업로드 하실래요
          </p>
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              justifyContent: 'space-around',
            }}
          >
            <button
              style={{ fontSize: 16, padding: 64 }}
              onClick={() => {
                setMode('model');
              }}
            >
              모델
            </button>
            <button
              style={{ fontSize: 16, padding: 80 }}
              onClick={() => {
                setMode('image');
              }}
            >
              이미지
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

type ImportType = { name: string; url: string; file: File; size: number };

const FileDragDiv = ({
  title,
  showConfirm,
  checkExtensions,
  onCancel,
  onConfirm,
}: {
  title: string;
  showConfirm: boolean;
  checkExtensions: string[];
  onCancel: () => void;
  onConfirm: (files: File[]) => Promise<FileUploadResponse>;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<ImportType[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const { closeModal } = useModal();

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
              checkExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
            ) {
              files.push(file);
            }
          } else if (entry.isDirectory) {
            const directoryFiles = await readDirectory(
              entry as FileSystemDirectoryEntry,
              checkExtensions,
            );
            files.push(...directoryFiles);
          }
        }
      }

      // Filter files by .gltf and .glb extensions
      const filteredFiles = files.filter(file =>
        checkExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
      );

      if (filteredFiles.length === 0) {
        alert('다음 확장자만 가능 : ' + checkExtensions.join(', '));
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

  async function confirmFunction() {
    const res = await onConfirm(files.map(i => i.file));
    if (res.success) {
      setResults(res.data.map(d => d.fileUrl));
    } else {
      alert('업로드 실패');
    }
  }

  function copyResults() {
    const toCopy = results.join('\n');
    copyText(toCopy);
  }

  function copyText(str?: string) {
    if (str) {
      navigator.clipboard
        .writeText(str)
        .then(() => alert('복사되었습니다'))
        .catch(err => {
          alert('복사에 실패했습니다.');
          console.error('복사 실패 : ', err);
        });
    }
  }

  return (
    <div
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: '100%',
          height: '250px',
          border: isDragging ? '2px dashed black' : '1px solid black',
          padding: 16,
          borderRadius: 8,
          position: 'relative',
        }}
      >
        <div className="flex">
          <button
            onClick={() => {
              if (showConfirm) {
                if (confirm(`${title}의 파일을 모두 삭제하시겠어요?`)) {
                  setFiles([]);
                }
              } else {
                setFiles([]);
              }
            }}
            style={{ fontSize: 12, zIndex: 1000 }}
          >
            모두 삭제
          </button>
          <span
            style={{ fontSize: 14, marginLeft: 'auto', marginRight: 'auto' }}
          >
            {title}
          </span>
          <span style={{ fontSize: 12 }}>업로드한 파일 {files.length}개</span>
        </div>

        <div style={{ height: '95%', overflowY: 'auto' }}>
          {files.length > 0 &&
            files.map(importType => {
              const { name, size } = importType;
              const hasResult =
                results.length > 0 &&
                results.find(result => result.endsWith(name)) !== undefined;
              const result = results.find(result => result.endsWith(name));
              return (
                <>
                  <div className="flex items-center mt-[2px]">
                    <span
                      style={{
                        fontSize: 12,
                        textAlign: 'left',
                      }}
                    >
                      {name} - {formatNumber(size / (1024 * 1024))}MB
                    </span>
                    <button
                      style={{
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 12,
                        padding: '0 4',
                        marginLeft: 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (showConfirm) {
                          if (
                            confirm(`${importType.name} 을 삭제하시겠어요?`)
                          ) {
                            setFiles(prev =>
                              prev.filter(file => file !== importType),
                            );
                          }
                        } else {
                          setFiles(prev =>
                            prev.filter(file => file !== importType),
                          );
                        }
                      }}
                    >
                      X
                    </button>
                    {hasResult && (
                      <button
                        className="ml-1 text-[10px] px-2 py-1"
                        onClick={() => copyText(result)}
                      >
                        복사
                      </button>
                    )}
                  </div>
                  {hasResult && (
                    <p
                      style={{
                        paddingLeft: 8,
                        fontSize: 11,
                        textAlign: 'left',
                        color: 'grey',
                      }}
                    >
                      {results.find(result => result.endsWith(name))}
                    </p>
                  )}
                </>
              );
            })}
        </div>
      </div>
      <div className="flex gap-x-1 justify-end py-2">
        {results.length > 0 ? (
          <>
            <button className="px-2 py-1 text-[12px]" onClick={copyResults}>
              결과 복사
            </button>
            <button className="px-2 py-1 text-[12px]" onClick={closeModal}>
              닫기
            </button>
          </>
        ) : (
          <>
            <button className="px-2 py-1 text-[12px]" onClick={onCancel}>
              취소
            </button>
            <button className="px-2 py-1 text-[12px]" onClick={confirmFunction}>
              확인
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
