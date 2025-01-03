import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import objectHash from 'object-hash';
import { useEffect, useState } from 'react';
import { Layer } from '../Constants.ts';
import {
  DPAtom,
  DPCModeAtom,
  ModelSelectorAtom,
  selectedAtom,
  threeExportsAtom,
} from '../scripts/atoms.ts';
import {
  compressObjectToFile,
  isProbeMesh,
  isTransformControlOrChild,
} from '../scripts/utils.ts';
import VGLTFExporter from '../scripts/VGLTFExporter.ts';
import * as THREE from '../scripts/VTHREE.ts';

const SelectableNodes = ({
  data,
  depth = 0,
}: {
  data: THREE.Object3D;
  depth: number;
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const [isHover, setIsHover] = useState(false);
  const [selectedGroups, setSelectedGroups] = useAtom(ModelSelectorAtom);
  const setDPs = useSetAtom(DPAtom);
  const [isFocused, setFocused] = useState(
    selectedGroups.filter(o => o.uuid === data.uuid).length > 0,
  );

  useEffect(() => {
    setFocused(selectedGroups.filter(o => o.uuid === data.uuid).length > 0);
    setDPs(prev => {
      return { ...prev, objects: selectedGroups };
    });
  }, [selectedGroups]);

  function toggleGroup() {
    if (data.type !== 'Scene') {
      setSelectedGroups(prev => {
        const find = prev.filter(o => o.uuid === data.uuid);
        let result;
        if (find.length > 0) {
          const filterUuid = [data.uuid];
          if (data.children.length > 0) {
            data.traverse(object => {
              filterUuid.push(object.uuid);
            });
          }
          result = prev.filter(o => !filterUuid.includes(o.uuid));
        } else {
          result = [...prev, data];
          if (data.children.length > 0) {
            data.traverse(object => {
              if (object.uuid !== data.uuid) result.push(object);
            });
          }
        }
        return result;
      });
    }
  }

  function toggleOpen() {
    if (depth !== 0) {
      setIsOpen(!isOpen);
    }
  }

  const getNodeName = () => {
    if (data.type === 'Scene') {
      return '장면';
    }
    if (data.name && data.name.length > 0) {
      return data.name;
    }

    return '이름 없음';
  };

  if (!data.layers.isEnabled(Layer.Model)) {
    return null;
  }

  if (isProbeMesh(data) || isTransformControlOrChild(data)) {
    return null;
  }

  return (
    <>
      <div
        className={`group relative flex items-center gap-x-2.5 p-2 text-sm leading-6 cursor-pointer ${isFocused ? 'bg-yellow-100 hover:bg-yellow-50 ' : 'hover:bg-gray-50 '}`}
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          console.log(data);
          toggleGroup();
        }}
        style={{
          paddingLeft:
            depth > 0
              ? `${8 + depth * 8 + (!((data.type === 'Group' || data.type === 'Object3D') && data.children.length > 0) ? 26 : 0)}px`
              : '0.5rem',
        }}
      >
        {(data.type === 'Group' || data.type === 'Object3D') &&
        data.children.length > 0 ? (
          <>
            <div
              className="flex h-4 w-4 flex-none i  tems-center justify-center rounded-lg"
              onClick={e => {
                e.stopPropagation();
                toggleOpen();
              }}
            >
              <svg
                className="h-4 w-4 text-gray-600 group-hover:text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                {isOpen ? (
                  <>
                    <path stroke="none" d="M0 0h24v24H0z" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </>
                ) : (
                  <>
                    <path stroke="none" d="M0 0h24v24H0z" />
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </>
                )}
              </svg>
            </div>
          </>
        ) : null}
        <div>
          <svg
            className="h-5 w-5 text-gray-600 group-hover:text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            {data.type === 'Group' || data.type === 'Object3D' ? (
              <>
                <path stroke="none" d="M0 0h24v24H0z" />
                <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
              </>
            ) : (
              <>
                <path stroke="none" d="M0 0h24v24H0z" />
                <circle cx="6" cy="6" r="2" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="6" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
                <line x1="6" y1="8" x2="6" y2="16" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="18" x2="16" y2="18" />
                <line x1="18" y1="8" x2="18" y2="16" />
              </>
            )}
          </svg>
        </div>
        <div className="flex-auto">
          <span
            style={{
              maxWidth: isHover ? '80%' : '100%',
              overflowX: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className={`block font-semibold ${isFocused ? 'text-black-900' : 'text-gray-500'}`}
          >
            {getNodeName()}
          </span>
        </div>
        {isHover ? (
          <div
            className="absolute"
            style={{
              right: '16px',
              top: '50%',
              transform: 'translate(0, -50%)',
            }}
          >
            <span className="font-semibold text-gray-800">
              {data.type === 'Mesh'
                ? '메시'
                : data.type === 'Scene'
                  ? '메인 노드'
                  : '노드'}
            </span>
          </div>
        ) : null}
      </div>
      {isOpen && depth < 3 ? (
        <>
          {data.children.map(child => (
            <SelectableNodes data={child} depth={depth + 1} />
          ))}
        </>
      ) : null}
    </>
  );
};

const DPCModelSelector = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const setSelecteds = useSetAtom(selectedAtom);
  const [selectedGroups, setSelectedGroups] = useAtom(ModelSelectorAtom);
  const [updateOnView, setUpdateOnView] = useState<boolean>(false);
  const setDPCMode = useSetAtom(DPCModeAtom);
  if (!threeExports) {
    return;
  }

  const { scene, gl, camera } = threeExports;

  useEffect(() => {
    return () => {
      setSelectedGroups([]);
    };
  }, []);

  useEffect(() => {
    if (updateOnView) {
      setSelecteds(selectedGroups.map(o => o.uuid));
    }
  }, [selectedGroups]);

  function toggleDPs() {
    const dpArrays: THREE.Object3D[] = [];

    // 자식 선택
    scene.traverse(child => {
      if (child.name.toLowerCase().includes('line')) {
        const dpArraysToUuid = dpArrays.map(o => o.uuid);
        if (!dpArraysToUuid.includes(child.uuid)) {
          dpArrays.push(child);
        }
      }
    });

    const tempParents: THREE.Object3D[] = [];
    const dpArraysToUuid = dpArrays.map(o => o.uuid);

    // 부모 선택
    dpArrays.forEach(dp => {
      const parent = dp.parent;
      if (
        parent &&
        !dpArraysToUuid.includes(parent.uuid) &&
        !tempParents.includes(parent) &&
        parent.type !== 'Scene'
      ) {
        tempParents.push(parent);
      }
    });

    dpArrays.push(...tempParents);

    setSelectedGroups(prev => {
      const dpArraysToUuid = dpArrays.map(o => o.uuid);
      const without = prev.filter(o => !dpArraysToUuid.includes(o.uuid));
      return [...without, ...dpArrays];
    });
  }

  async function extractDPs() {
    const uploadUrl = import.meta.env.VITE_UPLOAD_URL;
    if (!uploadUrl) {
      alert('.env에 환경변수를 설정해주세요, uploadUrl');
      return;
    }
    const DPObjects = selectedGroups;
    const clonedScene = scene.clone(true);

    const DPObjectFromClonedScene = DPObjects.map(o => {
      return clonedScene.getObjectByName(o.name);
    });
    const dpScene = new THREE.Scene();

    const sortOrder: { [key: string]: number } = {
      Group: 1,
      Object3D: 2,
      Mesh: 3,
    };

    DPObjectFromClonedScene.sort((a, b) => {
      return sortOrder[a.type] - sortOrder[b.type];
    });

    DPObjectFromClonedScene.forEach(o => {
      if (o && !dpScene.getObjectByName(o.name)) {
        console.log('removing from Scene ... ', o.name);
        dpScene.add(o);
        clonedScene.remove(o);
      }
    });

    const exporter = new VGLTFExporter();

    console.log(dpScene);

    gl.render(dpScene, camera);
    const dpGLB = (await exporter.parseAsync(dpScene, {
      binary: true,
    })) as ArrayBuffer;
    gl.render(clonedScene, camera);
    const noDpGLB = (await exporter.parseAsync(clonedScene, {
      binary: true,
    })) as ArrayBuffer;

    const dpGLB_BLob = new Blob([dpGLB], { type: 'application/octet-stream' });
    const noDPGLB_Blob = new Blob([noDpGLB], {
      type: 'application/octet-stream',
    });
    const dpGLB_File = new File([dpGLB_BLob], 'model_dp.glb', {
      type: 'model/gltf-binary',
    });
    const noDPGLB_File = new File([noDPGLB_Blob], 'model_base.glb', {
      type: 'model/gltf-binary',
    });

    const fd = new FormData();
    fd.append('files', dpGLB_File);
    fd.append('files', noDPGLB_File);
    // latest 캐싱을 위한 hash
    const uploadHash = objectHash(new Date().toISOString());
    const hashData = {
      hash: uploadHash,
    };
    // convert object to File:
    const dphashFile = compressObjectToFile(hashData, 'dp-hash');
    const basehashFile = compressObjectToFile(hashData, 'base-hash');
    const hashFd = new FormData();
    hashFd.append('files', dphashFile);
    hashFd.append('files', basehashFile);
    Promise.all([
      fetch(uploadUrl, {
        method: 'POST',
        body: hashFd,
      }),
      fetch(uploadUrl, {
        method: 'POST',
        body: fd,
      }),
    ]).then(() => {
      alert('업로드 완료');
    });
  }

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button
        className="text-sm px-3 mb-2"
        onClick={() => {
          if (confirm('모델 구성 모드 선택 화면으로 돌아가시겠어요?')) {
            setDPCMode('select');
          }
        }}
      >
        돌아가기
      </button>
      <div
        style={{
          width: '100%',
          height: '20%',
          minHeight: '20%',
        }}
      >
        <span>{selectedGroups.length} 개 선택됨</span>
        <div
          style={{
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span>뷰포트 선택 동기화</span>
          <input
            key={Math.random()}
            className="on-off"
            type="checkbox"
            checked={updateOnView}
            style={{ marginLeft: 4 }}
            onChange={e => {
              console.log(e.target.checked);
              setUpdateOnView(e.target.checked);
            }}
          />
        </div>
        <div className="w-full flex items-center mt-2 gap-x-1">
          <button style={{ fontSize: 11 }} onClick={toggleDPs}>
            DP 토글
          </button>
          <button
            style={{ fontSize: 11 }}
            onClick={event => {
              setSelectedGroups([]);
            }}
          >
            모두 해제
          </button>
          <button
            style={{ fontSize: 11 }}
            disabled={selectedGroups.length === 0}
            onClick={extractDPs}
          >
            GLB 분리
          </button>
        </div>
      </div>
      <div
        style={{
          width: '100%',
          overflowY: 'auto',
          maxHeight: '80%',
          height: '50vh',
          marginTop: 16,
        }}
      >
        <SelectableNodes data={scene} depth={0} />
      </div>
    </div>
  );
};

export default DPCModelSelector;
