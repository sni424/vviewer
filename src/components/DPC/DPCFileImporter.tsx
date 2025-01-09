import { useSetAtom } from 'jotai';
import { useAtom } from 'jotai/index';
import React, { Dispatch, useEffect, useState } from 'react';
import {
  catalogueAtom,
  DPCModeAtom,
  onModalCloseAtom,
  setAtomValue,
  useModal,
} from '../../scripts/atoms.ts';
import {
  formatNumber,
  readDirectory,
  splitExtension,
} from '../../scripts/utils.ts';

type ImportType = { name: string; url: string; file: File; size: number };
type GLBWithExrs = {
  glb: ImportType;
  type: 'DP' | 'BASE';
  dpOnTexture?: ImportType;
  dpOffTexture?: ImportType;
};

export type Catalogue = { [key: string]: GLBWithExrs };

const FileDragDiv = ({
  title,
  files,
  setFiles,
  showConfirm,
}: {
  title: string;
  files: ImportType[];
  setFiles: Dispatch<React.SetStateAction<ImportType[]>>;
  showConfirm: boolean;
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
        width: '100%',
        height: '200px',
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
        <span style={{ fontSize: 14, marginLeft: 'auto', marginRight: 'auto' }}>
          {title}
        </span>
        <span style={{ fontSize: 12 }}>업로드한 파일 {files.length}개</span>
      </div>

      <div style={{ height: '95%', overflowY: 'auto' }}>
        {files.length > 0 &&
          files.map(importType => {
            const { name, size } = importType;
            return (
              <div className="flex items-center mt-[2px]">
                <span
                  style={{
                    fontSize: 12,
                    textAlign: 'center',
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
                      if (confirm(`${importType.name} 을 삭제하시겠어요?`)) {
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
              </div>
            );
          })}
      </div>
    </div>
  );
};

const DPCFileImporter = () => {
  const [dpOffFiles, setDpOffFiles] = useState<ImportType[]>([]);
  const [dpOnFiles, setDpOnFiles] = useState<ImportType[]>([]);
  const setDPCMode = useSetAtom(DPCModeAtom);
  const { closeModal } = useModal();
  const [onModalClose, setOnModalClose] = useAtom(onModalCloseAtom);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [combinedCatalogues, setCombinedCatalogues] = useState<Catalogue>({});
  const [glbMissingTextures, setGlbMissingTextures] = useState<string[]>([]);
  const [catalogueSummary, setCatalogueSummary] = useState<{
    dp: number;
    base: number;
    texture: number;
  }>({ dp: 0, base: 0, texture: 0 });

  useEffect(() => {
    classifyFiles();
  }, [dpOffFiles, dpOnFiles]);

  useEffect(() => {
    updateSummary();
  }, [combinedCatalogues]);

  function updateShowConfirm(checked: boolean) {
    setShowConfirm(checked);
  }

  function updateSummary() {
    const catalogue = combinedCatalogues;
    let base: number = 0;
    let dp: number = 0;
    let texture: number = 0;
    Object.keys(catalogue).forEach(key => {
      const target = catalogue[key];
      if (target.type === 'BASE') {
        base += 1;
      } else if (target.type === 'DP') {
        dp += 1;
      }
      if (target.dpOffTexture) {
        texture += 1;
      }
      if (target.dpOnTexture) {
        texture += 1;
      }
    });

    setCatalogueSummary({
      base,
      dp,
      texture,
    });
  }

  function classifyFiles() {
    const start = Date.now();
    console.log('classify files Start');
    // Step 1. GLB 분리
    const glbFilter = (importType: ImportType) =>
      splitExtension(importType.name).ext.toLowerCase().endsWith('glb');
    const exrFilter = (importType: ImportType) =>
      splitExtension(importType.name).ext.toLowerCase().endsWith('exr');

    function expectedGLBName(fileName: string) {
      if (fileName.indexOf('.exr') < 0) {
        alert(
          '개발 오류. 이거 발생하면 새로고침하지 마시고 개발자들한테 말해주세요.',
        );
        console.log('expectedGLBName Error : ', fileName);
        throw new Error('EXR 파일 이름만 넣으세여');
      }
      const ext = '.glb';
      const splitPoint = fileName.indexOf('_Bake1');
      if (splitPoint === -1) {
        /**
         * CASE 1
         * _Bake1 마저 짤렸을 경우는 상헌씨가 원본 glb 이름으로 수정했을 거라고 간주 (약속됨)
         * 원본이름.glb
         * **/

        /** CASE 2
         * 이미 분류가 된 경우 (_dpOn / _dpOff)
         * 그냥 반환
         * **/
        const newSplitPoint = fileName.indexOf('_dp');
        if (newSplitPoint === -1) {
          // CASE 1
          return splitExtension(fileName).name + ext;
        } else {
          // CASE 2
          return fileName.slice(0, newSplitPoint) + ext;
        }
      }
      return fileName.slice(0, splitPoint) + ext;
    }

    const dpOFFGlbs = dpOffFiles.filter(glbFilter);
    const dpOnGlbs = dpOnFiles.filter(glbFilter);
    const dpOffGlbNames = dpOFFGlbs.map(i => i.name);

    // 구조체
    const duplicatedGlbs = dpOnGlbs.filter(importType =>
      dpOffGlbNames.includes(importType.name),
    );

    // DP
    const dpGlbs = dpOnGlbs.filter(importType => {
      return !dpOffGlbNames.includes(importType.name);
    });

    const glbCatalogue: Catalogue = {};

    const addToCatalogue = (items: ImportType[], type: 'DP' | 'BASE') => {
      items.forEach(importType => {
        glbCatalogue[importType.name] = {
          glb: importType,
          type: type,
        };
      });
    };

    // Add duplicated and DP GLBs
    addToCatalogue(duplicatedGlbs, 'BASE');
    addToCatalogue(dpGlbs, 'DP');

    // Step2 EXR 분리
    const dpOffExrs = dpOffFiles.filter(exrFilter);
    const dpOnExrs = dpOnFiles.filter(exrFilter);

    // GLB 못찾은 텍스쳐
    const noGLBTextures: string[] = [];

    const addToCatalogueTexture = (
      importType: ImportType,
      glbName: string,
      slot: 'dpOFF' | 'dpOn',
    ) => {
      const targetCatalogue = glbCatalogue[glbName];

      if (targetCatalogue) {
        // naming 수정
        const fileName = importType.name;
        const splitPoint = fileName.indexOf('_Bake1');
        if (splitPoint !== -1) {
          const ext = '.exr';
          if (targetCatalogue.type === 'BASE') {
            importType.name = fileName.slice(0, splitPoint) + '_' + slot + ext;
          } else {
            importType.name = fileName.slice(0, splitPoint) + ext;
          }
        }

        if (slot === 'dpOFF') {
          targetCatalogue.dpOffTexture = importType;
        } else if (slot === 'dpOn') {
          targetCatalogue.dpOnTexture = importType;
        } else {
          throw new Error('Invalid Slot : ' + slot);
        }
      } else {
        noGLBTextures.push(`${slot}/${importType.name}`);
      }
    };

    dpOffExrs.forEach(importType =>
      addToCatalogueTexture(
        importType,
        expectedGLBName(importType.name),
        'dpOFF',
      ),
    );
    dpOnExrs.forEach(importType =>
      addToCatalogueTexture(
        importType,
        expectedGLBName(importType.name),
        'dpOn',
      ),
    );

    const end = Date.now();
    console.log(`classify files Done : ${end - start}ms`);
    setCombinedCatalogues(glbCatalogue);
    setGlbMissingTextures(noGLBTextures);
  }

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
      <div className="flex items-center justify-between">
        <button
          className="text-sm px-3 mb-2"
          onClick={() => {
            if (dpOffFiles.length === 0 && dpOnFiles.length === 0) {
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
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={showConfirm}
            onChange={e => {
              updateShowConfirm(e.target.checked);
            }}
          />
          <span className="ml-1">삭제 확인 문구 띄우기</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-gray-500 pb-2">
        {/* File Upload Div */}
        <div className="w-[40%]">
          <div className="w-full flex justify-between gap-2 flex-col items-center">
            <FileDragDiv
              files={dpOffFiles}
              setFiles={setDpOffFiles}
              title="DP OFF 업로드"
              showConfirm={showConfirm}
            />
            <FileDragDiv
              files={dpOnFiles}
              setFiles={setDpOnFiles}
              title="DP ON 업로드"
              showConfirm={showConfirm}
            />
          </div>
        </div>
        {/* File Analysis Div */}
        <div className="w-[60%]">
          <div>
            {/* Upload Disabled Messages */}
            {dpOffFiles.length === 0 && (
              <p style={{ textAlign: 'center' }}>
                DP OFF 업로드에 파일이 추가되지 않았습니다.
              </p>
            )}
            {dpOnFiles.length === 0 && (
              <p style={{ textAlign: 'center' }}>
                DP ON 업로드에 파일이 추가되지 않았습니다.
              </p>
            )}
            {/* File Analysis */}
            {dpOffFiles.length > 0 &&
              dpOnFiles.length > 0 &&
              Object.keys(combinedCatalogues).length > 0 && (
                <div className="pl-2">
                  <span>
                    구조체 : {catalogueSummary.base}개 / DP :{' '}
                    {catalogueSummary.dp}개 / 텍스쳐 수 :{' '}
                    {catalogueSummary.texture}개 /{' '}
                    <span
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const arranged = glbMissingTextures.join('\n');
                        alert('GLB 없는 텍스쳐 목록\n\n' + arranged);
                      }}
                    >
                      모델 없는 텍스쳐 : {glbMissingTextures.length}개
                    </span>
                  </span>
                  <div className="h-[395px] py-1 border-collapse overflow-y-auto max-h-[100%] flex flex-wrap">
                    {Object.keys(combinedCatalogues).map(key => {
                      const target = combinedCatalogues[key];
                      return <FileAnalyzedDiv target={target} key={key} />;
                    })}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center items-center mt-3">
        <button
          disabled={dpOffFiles.length === 0 || dpOnFiles.length === 0}
          className="text-sm px-3"
          onClick={() => {
            // TODO Upload Logics
            setAtomValue(catalogueAtom, combinedCatalogues);
            // classifyFiles();
            if (onModalClose) {
              onModalClose();
              setOnModalClose(() => {});
            }
            closeModal?.();
          }}
        >
          씬에 올리기
        </button>
        <button
          disabled={dpOffFiles.length === 0 || dpOnFiles.length === 0}
          className="text-sm px-3 ml-2"
          onClick={() => {
            // TODO Upload Logics
            // classifyFiles();
            if (onModalClose) {
              onModalClose();
              setOnModalClose(() => {});
            }
            closeModal?.();
          }}
        >
          업로드
        </button>
      </div>
    </div>
  );
};

const FileAnalyzedDiv = ({ target }: { target: GLBWithExrs }) => {
  console.log(target);
  return (
    <div className="p-1 border border-gray-500 w-[50%] overflow-x-clip">
      <p>
        {target.glb.name}
        <span style={{ marginLeft: 4, color: 'blue', fontSize: 11 }}>
          {target.type === 'BASE' ? '구조체' : target.type}
        </span>
      </p>
      {!target.dpOnTexture && !target.dpOffTexture && (
        <p style={{ marginLeft: 8, fontSize: 11 }}>LightMap 없음</p>
      )}
      {target.dpOnTexture && (
        <>
          <p style={{ paddingLeft: 8, fontSize: 11 }}>
            {target.type === 'BASE' ? 'DP ON LightMap' : 'LightMap'} :
          </p>
          <p style={{ paddingLeft: 16, fontSize: 11, color: 'gray' }}>
            {target.dpOnTexture.name}
          </p>
        </>
      )}
      {target.dpOffTexture && (
        <>
          <p style={{ paddingLeft: 8, fontSize: 11 }}>DP OFF LightMap :</p>
          <p style={{ paddingLeft: 16, fontSize: 11, color: 'gray' }}>
            {target.dpOffTexture.name}
          </p>
        </>
      )}
    </div>
  );
};

export default DPCFileImporter;
