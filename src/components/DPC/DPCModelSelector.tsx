import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import objectHash from 'object-hash';
import { useEffect, useState } from 'react';
import * as THREE from 'VTHREE';
import { Layer } from '../../Constants.ts';
import {
  DPAtom,
  DPCModeAtom,
  ModelSelectorAtom,
  selectedAtom,
  threeExportsAtom,
} from '../../scripts/atoms.ts';
import {
  compressObjectToFile,
  isProbeMesh,
  isTransformControlOrChild,
} from '../../scripts/utils.ts';
import VGLTFExporter from '../../scripts/VGLTFExporter.ts';

export const SelectableNodes = ({
  data,
  depth = 0,
  keyword,
}: {
  data: THREE.Object3D;
  depth: number;
  keyword?: string;
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

  function findChildHasKeyword() {
    if (keyword && keyword.length > 0) {
      const lowered = keyword.toLowerCase();
      const matches: string[] = [];
      data.traverseAll(object => {
        const objectNameToLower = object.name.toLowerCase();
        if (objectNameToLower.includes(lowered)) {
          matches.push(object.name);
        }
      });

      return matches.length > 0;
    } else {
      return true;
    }
  }

  if (!findChildHasKeyword()) {
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
            {data.type === 'Scene' ? (
              <>
                <svg
                  fill="#000000"
                  height="24px"
                  width="24px"
                  version="1.1"
                  id="Capa_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 190.32 190.32"
                  xmlSpace="preserve"
                >
                  <path
                    d="M171.566,190.32H29.347c-5.445,0-9.875-4.43-9.875-9.875V92.52c0-0.051,0.002-0.101,0.006-0.151l-6.239-14.73
	c-0.003-0.006-0.005-0.012-0.008-0.019c-0.002-0.006-0.005-0.012-0.008-0.019l-3.562-8.41c-2.124-5.014,0.228-10.82,5.242-12.944
	L145.86,0.781c5.016-2.123,10.821,0.229,12.944,5.242l3.559,8.403c0.004,0.008,0.007,0.017,0.011,0.026
	c0.003,0.008,0.007,0.017,0.011,0.026l6.63,15.653c0.207,0.489,0.211,1.039,0.012,1.531c-0.199,0.492-0.585,0.884-1.074,1.091
	L31.564,90.52h19.879h0c0.001,0,0.001,0,0.002,0h58.129h0c0.001,0,0.001,0,0.001,0h58.117c0.008,0,0.018,0,0.028,0h11.719
	c1.104,0,2,0.896,2,2v87.925C181.441,185.89,177.011,190.32,171.566,190.32z M23.472,111.336v69.109
	c0,3.239,2.636,5.875,5.875,5.875h142.218c3.239,0,5.875-2.636,5.875-5.875v-69.109H23.472z M170.098,107.336h7.342V94.52h-8.786
	l-10.486,12.816H170.098z M129.527,107.336H153l10.486-12.816h-23.477L129.527,107.336z M100.037,107.336h24.323l10.459-12.789
	l-24.297-0.026L100.037,107.336z M71.397,107.336h23.472l10.486-12.816H81.878L71.397,107.336z M41.906,107.336h24.323
	l10.459-12.789l-24.297-0.026L41.906,107.336z M23.472,107.336h13.266L47.224,94.52H23.472V107.336z M17.694,77.902l4.998,11.801
	l22.78-9.648l-14.653-7.711L17.694,77.902z M35.578,70.328l14.896,7.839l21.614-9.155l-14.893-7.841L35.578,70.328z M149.703,4
	c-0.763,0-1.538,0.149-2.283,0.465L16.463,59.931c-2.983,1.263-4.382,4.718-3.118,7.701v0l2.79,6.587l13.978-5.92
	c0.013-0.005,0.025-0.011,0.037-0.016L83.658,45.62c0.006-0.002,0.012-0.005,0.019-0.008l53.509-22.664
	c0.007-0.003,0.014-0.005,0.021-0.008l20.705-8.77l-2.79-6.587C154.173,5.346,151.992,4,149.703,4z M61.985,59.172l14.619,7.697
	L99,57.383l-14.652-7.71L61.985,59.172z M89.106,47.656l14.896,7.839l21.614-9.154L110.724,38.5L89.106,47.656z M115.513,36.501
	l14.618,7.697l22.397-9.486l-14.652-7.71L115.513,36.501z M142.634,24.985l14.896,7.839l7.021-2.974l-5.082-11.997L142.634,24.985z
	 M100.456,180.893c-1.104,0-2-0.896-2-2v-20.761H36.561c-1.104,0-2-0.896-2-2s0.896-2,2-2h125.462c1.104,0,2,0.896,2,2s-0.896,2-2,2
	h-59.567v20.761C102.456,179.997,101.561,180.893,100.456,180.893z M162.023,138.428H36.561c-1.104,0-2-0.896-2-2s0.896-2,2-2
	h125.462c1.104,0,2,0.896,2,2S163.128,138.428,162.023,138.428z"
                  />
                </svg>
              </>
            ) : data.type === 'Group' || data.type === 'Object3D' ? (
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
      {isOpen ? (
        <>
          {data.children.map((child, idx) => (
            <SelectableNodes
              key={idx}
              data={child}
              depth={depth + 1}
              keyword={keyword}
            />
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

    DPObjectFromClonedScene.sort((a: any, b: any) => {
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
