import gsap from 'gsap';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { ENV } from '../Constants.ts';
import {
  getAtomValue,
  lightMapAtom,
  modelOptionAtom,
  ModelSelectorAtom,
  ProbeAtom,
  selectedAtom,
  useModal,
} from '../scripts/atoms.ts';
import { loadOption, threes, uploadJson } from '../scripts/atomUtils.ts';
import { createLightmapCache } from '../scripts/loaders/VGLTFLoader.ts';
import { getVKTX2Loader } from '../scripts/loaders/VKTX2Loader.ts';
import {
  Effects,
  MeshEffect,
  ModelOptionObject,
  ModelOptionState,
} from '../scripts/ModelOptionObject.ts';
import {
  changeMeshLightMapWithTransition,
  changeMeshVisibleWithTransition,
  loadLatest,
} from '../scripts/utils.ts';
import * as THREE from '../scripts/VTHREE.ts';
import { SelectableNodes } from './DPC/DPCModelSelector.tsx';

const OptionConfigTab = () => {
  const [modelOptions, setModelOptions] = useAtom(modelOptionAtom);
  const [lightMaps, setLightMaps] = useAtom(lightMapAtom);
  const { openModal } = useModal();

  function uploadOptionJSON() {
    uploadJson('options.json', modelOptions)
      .then(res => res.json())
      .then(res => {
        if (res?.success === true) {
          alert('업로드 완료');
        } else {
          throw res;
        }
      })
      .catch(err => {
        console.log(err);
        alert('업로드 실패');
      });
  }

  function uploadAlphaRoomOptionJSON() {
    uploadJson('optionAlpha.json', modelOptions)
      .then(res => res.json())
      .then(res => {
        if (res?.success === true) {
          alert('업로드 완료');
        } else {
          throw res;
        }
      })
      .catch(err => {
        console.log(err);
        alert('업로드 실패');
      });
  }

  async function loadAlphaRoomOption() {
    setModelOptions([]);
    const options = (await loadOption('optionAlpha.json')) as ModelOptionObject[];
    const keys = Object.keys(lightMaps);
    const keysToLoad: string[] = [];
    options.forEach(option => {
      const states = option.states;
      states.forEach(state => {
        const meshEffects = state.meshEffects;
        meshEffects.forEach(effect => {
          const lm = effect.effects.lmValue;
          if (lm && !keys.includes(lm)) {
            keysToLoad.push(lm);
          }
        });
      });
    });

    if (keysToLoad.length > 0) {
      const loader = getVKTX2Loader();
      const map = new Map<string, THREE.Texture>();
      await Promise.all(
        keysToLoad.map(async key => {
          const texture = await loader.loadAsync(key);
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.channel = 1;
          texture.vUserData.mimeType = 'image/ktx2';
          map.set(decodeURI(key), texture);
        }),
      );

      const obj = await createLightmapCache(map);

      setLightMaps(pre => {
        return { ...pre, ...obj };
      });
    }

    setModelOptions(options);
  }

  async function loadOptions() {
    setModelOptions([]);
    const options = (await loadOption()) as ModelOptionObject[];
    const keys = Object.keys(lightMaps);
    const keysToLoad: string[] = [];
    options.forEach(option => {
      const states = option.states;
      states.forEach(state => {
        const meshEffects = state.meshEffects;
        meshEffects.forEach(effect => {
          const lm = effect.effects.lmValue;
          if (lm && !keys.includes(lm)) {
            keysToLoad.push(lm);
          }
        });
      });
    });

    if (keysToLoad.length > 0) {
      const loader = getVKTX2Loader();
      const map = new Map<string, THREE.Texture>();
      await Promise.all(
        keysToLoad.map(async key => {
          const texture = await loader.loadAsync(key);
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.channel = 1;
          texture.vUserData.mimeType = 'image/ktx2';
          map.set(decodeURI(key), texture);
        }),
      );

      const obj = await createLightmapCache(map);

      setLightMaps(pre => {
        return { ...pre, ...obj };
      });
    }

    setModelOptions(options);
  }

  return (
    <>
      <div className="flex gap-x-1 items-center">
        <button onClick={() => openModal(<OptionCreateModal />)}>
          옵션 생성하기
        </button>
        <button onClick={uploadOptionJSON}>업로드</button>
        <button onClick={loadOptions}>불러오기</button>
        <button onClick={uploadAlphaRoomOptionJSON}>알파룸 업로드</button>
        <button onClick={loadAlphaRoomOption}>알파룸 불러오기</button>
      </div>
      <div className="pt-2">
        {modelOptions.map((modelOption, idx) => (
          <Option key={idx} modelOption={modelOption} />
        ))}
      </div>
    </>
  );
};

const OptionPreviewTab = () => {
  const modelOptions = useAtomValue(modelOptionAtom);

  return (
    <div>
      {modelOptions.map((modelOption, idx) => (
        <OptionPreview key={idx} option={modelOption} />
      ))}
    </div>
  );
};

const OptionPreview = ({ option }: { option: ModelOptionObject }) => {
  const threeExports = threes();
  const [processedState, setProcessedState] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;
  const probes = useAtomValue(ProbeAtom);
  const setSelecteds = useSetAtom(selectedAtom);

  function processState(state: ModelOptionState) {
    if (isProcessing) {
      console.warn('processState is On Processing');
      return;
    }
    setSelecteds([]);
    const animationDuration = 1; // 1s
    setProcessedState(state.id);
    setIsProcessing(true);
    const meshEffects = state.meshEffects;
    let hasAnimation = false;
    let visibleAnimation: gsap.core.Tween | null = null;
    let lightMapAnimation: gsap.core.Tween | null = null;
    const probesToRender: string[] = [];
    meshEffects.map(meshEffect => {
      const objects = scene
        .getObjectsByProperty('name', meshEffect.targetMeshProperties.name)
        .filter(o => o.type === 'Mesh');
      const object = objects[0];
      if (object) {
        const mesh = object as THREE.Mesh;
        const effects = meshEffect.effects;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        // Visible Control
        if (effects.useVisible) {
          visibleAnimation = changeMeshVisibleWithTransition(
            mesh,
            animationDuration,
            effects.visibleValue,
          );
        }

        // LightMap control
        if (effects.useLightMap) {
          const lightMapCache = getAtomValue(lightMapAtom);
          const keys = Object.keys(lightMapCache);
          let target = effects.lmValue
            ? effects.lmValue
            : mat.vUserData.lightMap;

          if (target && !target.startsWith('https')) {
            target = ENV.base + target;
          }

          if (!target) {
            mat.lightMap = null;
          } else if (keys.includes(target)) {
            const { texture } = lightMapCache[target];
            texture.flipY = false;
            lightMapAnimation = changeMeshLightMapWithTransition(
              mesh,
              animationDuration,
              texture,
            );
          } else {
            // TODO fetch
          }
        }

        const probeId = mat.vUserData.probeId;
        if (probeId) {
          // 그냥 해당 프로브 리렌더
          if (!probesToRender.includes(probeId)) {
            probesToRender.push(probeId);
          }
        }
      } else {
        console.warn(
          'no Mesh Found On state, passing By : ',
          meshEffect.targetMeshProperties,
        );
      }
    });

    function processAfter() {
      probes.forEach(probe => {
        probe.renderCamera(true);
      });
      setIsProcessing(false);
    }

    hasAnimation = visibleAnimation !== null || lightMapAnimation !== null;

    if (hasAnimation) {
      if (visibleAnimation) (visibleAnimation as gsap.core.Tween).play(0);
      if (lightMapAnimation) (lightMapAnimation as gsap.core.Tween).play(0);

      setTimeout(() => {
        processAfter();
      }, animationDuration * 1000);
    } else {
      processAfter();
    }
  }

  return (
    <div className="mt-2 border border-gray-600 p-2">
      <p className="text-sm font-bold text-center mb-2">{option.name}</p>
      <div className="flex items-center border-collapse relative">
        {option.states.map(state => (
          <>
            {isProcessing && (
              <div
                key={Math.random()}
                className="absolute w-full h-full bg-transparent cursor-progress"
              ></div>
            )}
            <button
              key={Math.random()}
              className="rounded-none w-full"
              style={{ width: `calc(100%/${option.states.length})` }}
              onClick={() => processState(state)}
              disabled={processedState === state.id}
            >
              {state.stateName}
            </button>
          </>
        ))}
      </div>
    </div>
  );
};

export const OptionTab = () => {
  const [tabMode, setTabMode] = useState<'preview' | 'config'>('config');

  return (
    <div className="overflow-y-auto max-h-full h-full">
      <div className="flex w-full mb-2" style={{ borderCollapse: 'collapse' }}>
        <div
          className="w-[50%] p-1 border-black cursor-pointer"
          onClick={() => setTabMode('preview')}
          style={{
            backgroundColor: tabMode === 'preview' ? 'wheat' : 'lightgray',
            borderBottom: tabMode === 'preview' ? '2px solid' : 'none',
          }}
        >
          <p className="text-center">미리보기</p>
        </div>
        <div
          className="w-[50%] p-1 border-black cursor-pointer"
          onClick={() => setTabMode('config')}
          style={{
            backgroundColor: tabMode === 'config' ? 'wheat' : 'lightgray',
            borderBottom: tabMode === 'config' ? '2px solid' : 'none',
          }}
        >
          <p className="text-center">Config</p>
        </div>
      </div>
      <div className="p-3 max-h-[calc(100%-20px)] h-[calc(100%-20px)]">
        {tabMode === 'config' ? <OptionConfigTab /> : <OptionPreviewTab />}
      </div>
    </div>
  );
};

const Option = ({ modelOption }: { modelOption: ModelOptionObject }) => {
  const setModelOptions = useSetAtom(modelOptionAtom);
  const [states, setStates] = useState<ModelOptionState[]>(modelOption.states);
  const [nameEditMode, setNameEditMode] = useState<boolean>(false);
  const [name, setName] = useState<string>(modelOption.name);

  useEffect(() => {
    // modelOption.states = states;
    setModelOptions(pre => {
      const t = [...pre];
      const idx = t.findIndex(o => o.id === modelOption.id);
      t[idx].states = states;
      return t;
    });
  }, [states]);

  useEffect(() => {
    setModelOptions(pre => {
      const t = [...pre];
      const idx = t.findIndex(p => p.id === modelOption.id);
      t[idx].name = name;
      return t;
    });
  }, [name]);

  function toggleOpen(open: boolean) {
    setModelOptions(pre => {
      const t = [...pre];
      const idx = t.findIndex(p => p.id === modelOption.id);
      t[idx].expanded = open;
      return t;
    });
  }

  function createNewState() {
    const newState: ModelOptionState = {
      id: v4(),
      stateName: 'new state',
      expanded: true,
      meshEffects: [],
    };
    setStates(pre => [...pre, newState]);
    if (!modelOption.expanded) {
      toggleOpen(true);
    }
  }

  function deleteOption() {
    setModelOptions(pre => pre.filter(p => p.id !== modelOption.id));
  }

  return (
    <div className="p-2 border border-gray-600 mb-1">
      <div className="flex gap-x-2 items-center mb-2">
        {nameEditMode ? (
          <TextEditor
            value={name}
            setValue={setName}
            onClose={() => {
              setNameEditMode(false);
            }}
          />
        ) : (
          <div
            onDoubleClick={() => {
              setNameEditMode(true);
            }}
          >
            옵션 명: {name}
          </div>
        )}
        <button onClick={createNewState}>state 생성</button>
        <div className="flex items-center ml-auto gap-x-1">
          {states.length > 0 && (
            <button onClick={() => toggleOpen(!modelOption.expanded)}>
              {modelOption.expanded ? '접기' : '펼치기'}
            </button>
          )}
          <button onClick={deleteOption}>삭제</button>
        </div>
      </div>
      {modelOption.expanded && (
        <>
          {states.map((state, idx) => (
            <State key={idx} state={state} setStates={setStates} />
          ))}
        </>
      )}
    </div>
  );
};

const State = ({
  state,
  setStates,
}: {
  state: ModelOptionState;
  setStates: Dispatch<SetStateAction<ModelOptionState[]>>;
}) => {
  const threeExports = threes();
  const { openModal } = useModal();
  const [name, setName] = useState<string>(state.stateName);
  const [nameEditMode, setNameEditMode] = useState<boolean>(false);
  const [models, setModels] = useState<MeshEffect[]>(state.meshEffects);
  const [open, setOpen] = useState<boolean>(state.expanded);

  function openMeshSelectModal() {
    if (!threeExports) {
      alert('아직 scene 이 준비되지 않았습니다.');
      return;
    }

    openModal(
      <MeshSelectModal state={state} models={models} setModels={setModels} />,
    );
  }

  function deleteState() {
    setStates(pre => {
      const t = [...pre];
      const idx = t.findIndex(o => o.id === state.id);
      t.splice(idx, 1);
      return t;
    });
  }

  function copyState() {
    const newEffects: MeshEffect[] = [];
    state.meshEffects.map(meshEffect => {
      const defaultEffect: Effects = {
        useVisible: false,
        useLightMap: false,
        visibleValue: false,
        lmValue: null,
      };
      const resultEffect = {
        ...defaultEffect,
        ...meshEffect.effects,
      };

      const newEffect: MeshEffect = {
        ...meshEffect,
        effects: resultEffect,
      };
      newEffects.push(newEffect);
    });
    const newState = {
      ...state,
      meshEffects: newEffects,
      id: v4(),
    };
    setStates(pre => [...pre, newState]);
  }

  useEffect(() => {
    state.expanded = open;
  }, [open]);

  useEffect(() => {
    setStates(pre => {
      const t = [...pre];
      const idx = t.findIndex(o => o.id === state.id);
      t[idx].stateName = name;
      return t;
    });
  }, [name]);

  useEffect(() => {
    setStates(pre => {
      const t = [...pre];
      const idx = t.findIndex(o => o.id === state.id);
      t[idx].meshEffects = models;
      return t;
    });
  }, [models]);

  function openValueModal() {
    openModal(<ValueModal meshEffects={models} />);
  }

  function closeAll() {
    models.forEach((meshEffect: MeshEffect) => {
      meshEffect.expanded = false;
    });
  }

  return (
    <div className="px-2 py-1 border  border-gray-600 mb-1">
      <div className="flex gap-x-1.5 items-center">
        {nameEditMode ? (
          <TextEditor
            value={name}
            setValue={setName}
            onClose={() => {
              setNameEditMode(false);
            }}
          />
        ) : (
          <div onDoubleClick={() => setNameEditMode(true)}>
            {state.stateName}
          </div>
        )}
        {!nameEditMode && (
          <div className="flex items-center ml-auto gap-x-1">
            <button onClick={openMeshSelectModal}>메시 선택하기</button>
            <button onClick={copyState}>복사</button>
            {models.length > 0 && (
              <button onClick={() => setOpen(pre => !pre)}>
                {open ? '접기' : '펼치기'}
              </button>
            )}
            <button onClick={deleteState}>삭제</button>
          </div>
        )}
      </div>
      {open && models.length > 0 && (
        <div className="mt-1">
          <div className="flex items-center gap-x-1">
            <button onClick={openValueModal}>값 일괄 적용하기</button>
            <button onClick={closeAll}>모두 접기</button>
          </div>
          {models.map((meshEffect, idx) => (
            <MeshEffectElem
              key={idx}
              meshEffect={meshEffect}
              setMeshEffects={setModels}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ValueModal = ({ meshEffects }: { meshEffects: MeshEffect[] }) => {
  const { closeModal } = useModal();
  const [useVisible, setUseVisible] = useState<boolean>(false);
  const [visibleValue, setVisibleValue] = useState<boolean>(false);

  function confirm() {
    meshEffects.forEach(meshEffect => {
      meshEffect.effects.useVisible = useVisible;
      meshEffect.effects.visibleValue = visibleValue;
    });
    closeModal();
  }

  return (
    <div
      className="w-[30%] bg-white px-4 py-3"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="py-1 w-full mb-2">
        <strong style={{ fontSize: 16 }}>값 일괄 적용</strong>
      </div>
      {/* Body */}
      <div className="w-full mb-2 flex flex-col gap-y-2">
        <div className="flex items-center gap-x-1.5 mt-1">
          <div
            className="flex items-center gap-x-1"
            // onClick={() => setUseVisible(pre => !pre)}
          >
            <span>Visible:</span>
            <button onClick={() => setUseVisible(pre => !pre)}>
              {useVisible ? '사용함' : '사용안함'}
            </button>
          </div>
          {useVisible && (
            <div className="flex items-center gap-x-1">
              <span>value</span>
              <button onClick={() => setVisibleValue(pre => !pre)}>
                {visibleValue ? 'true' : 'false'}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button className="py-1.5 px-3 text-md" onClick={confirm}>
          생성
        </button>
      </div>
    </div>
  );
};

const MeshEffectElem = ({
  meshEffect,
  setMeshEffects,
}: {
  meshEffect: MeshEffect;
  setMeshEffects: Dispatch<SetStateAction<MeshEffect[]>>;
}) => {
  const [use, setUse] = useState<{
    visible: boolean;
    lightMap: boolean;
  }>({
    visible: meshEffect.effects.useVisible,
    lightMap: meshEffect.effects.useLightMap,
  });
  const threeExports = threes();
  if (!threeExports) {
    return null;
  }
  const { scene, camera } = threeExports;

  const objects = scene
    .getObjectsByProperty('name', meshEffect.targetMeshProperties.name)
    .filter(o => o.type === 'Mesh');

  const setSelectedMeshes = useSetAtom(selectedAtom);
  const mesh = objects[0]!! as THREE.Mesh;
  const { openModal } = useModal();

  const [expanded, setExpanded] = useState<boolean>(meshEffect.expanded);
  const [visible, setVisible] = useState<boolean>(
    meshEffect.effects.visibleValue,
  );
  const [lmValue, setLMValue] = useState<string | null>(
    meshEffect.effects.lmValue,
  );
  useEffect(() => {
    meshEffect.effects.visibleValue = visible;
  }, [visible]);
  useEffect(() => {
    meshEffect.effects.lmValue = lmValue;
  }, [lmValue]);
  useEffect(() => {
    meshEffect.expanded = expanded;
  }, [expanded]);

  function updateUseBoolean(
    target: 'visible' | 'lightMap' | 'probe',
    value: boolean,
  ) {
    setUse(pre => {
      const newP = { ...pre };
      newP[target] = value;
      return newP;
    });
    const key = 'use' + target.charAt(0).toUpperCase() + target.slice(1);
    // @ts-ignore
    meshEffect.effects[key] = value;
  }

  function openLightMapModal() {
    openModal(<LightMapSelector mesh={mesh} setLMValue={setLMValue} />);
  }

  function resetToMeshDefault() {
    setLMValue(null);
  }

  function deleteThis() {
    setMeshEffects(pre =>
      pre.filter(
        p =>
          p.targetMeshProperties.name !== meshEffect.targetMeshProperties.name,
      ),
    );
  }

  if (objects.length <= 0) {
    return null;
  }

  return (
    <div className="pl-1 my-1.5 border-b border-b-gray-400 py-1">
      <div className="flex gap-x-1.5 items-center">
        <div className="max-w-[150px] text-nowrap overflow-ellipsis overflow-hidden">
          {meshEffect.targetMeshProperties.name}
        </div>
        <button
          onClick={() => {
            function setBestCameraView(
              mesh: THREE.Mesh,
              camera: THREE.PerspectiveCamera,
            ) {
              const box = new THREE.Box3().setFromObject(mesh);
              const center = new THREE.Vector3();
              box.getCenter(center); // Mesh 중심
              const size = new THREE.Vector3();
              box.getSize(size); // Mesh 크기
              const maxDim = Math.max(size.x, size.y, size.z); // 가장 큰 축 찾기
              const fov = camera.fov * (Math.PI / 180); // FOV를 라디안으로 변환

              const distance = maxDim / 2 / Math.tan(fov / 2); // 거리 계산

              // 카메라 위치 설정 (Z축 방향에서 Mesh를 바라보도록 설정)
              camera.lookAt(center);
              camera.position.set(
                center.x,
                camera.position.y,
                center.z + distance,
              );
              camera.lookAt(center);
            }

            if (mesh) {
              setBestCameraView(mesh, camera as THREE.PerspectiveCamera);
              setSelectedMeshes([mesh.uuid]);
            }
          }}
        >
          보기
        </button>
        <div className="flex ml-auto gap-x-1">
          <button onClick={() => setExpanded(pre => !pre)}>
            {expanded ? '접기' : '펼치기'}
          </button>
          <button onClick={deleteThis}>삭제</button>
        </div>
      </div>
      {expanded && (
        <div className="mt-1">
          <span>속성</span>
          <div className="pl-2 pt-0.5">
            <div className="flex items-center gap-x-1.5 mt-1">
              <span>Visible:</span>
              <span>사용</span>
              <input
                type="checkbox"
                checked={use.visible}
                onChange={e => {
                  updateUseBoolean('visible', e.target.checked);
                }}
              />
              {use.visible && (
                <>
                  <span>value</span>
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={e => {
                      setVisible(e.target.checked);
                    }}
                  />
                </>
              )}
            </div>
            <div className="mt-1">
              <div className="flex items-center gap-x-1">
                <span>LightMap:</span>
                <span>사용</span>
                <input
                  type="checkbox"
                  checked={use.lightMap}
                  onChange={e => {
                    updateUseBoolean('lightMap', e.target.checked);
                  }}
                />
              </div>
              {use.lightMap && (
                <div className="flex items-center gap-x-2 mt-1 pl-1">
                  <div className="max-w-[70%] overflow-ellipsis overflow-hidden text-nowrap">
                    {lmValue ? getNameFromURL(lmValue) : '메시 기본 값'}
                  </div>
                  {lmValue && (
                    <button onClick={resetToMeshDefault}>리셋</button>
                  )}
                  <button onClick={openLightMapModal}>변경</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LightMapSelector = ({
  mesh,
  setLMValue,
}: {
  mesh: THREE.Mesh;
  setLMValue: Dispatch<SetStateAction<string | null>>;
}) => {
  const [lightMaps, setLightMaps] = useAtom(lightMapAtom);
  const [selected, setSelected] = useState<string>('');
  const [customURL, setCustomURL] = useState<string>('');
  const { closeModal } = useModal();
  const meshLightMap = getNameFromURL(
    (mesh.material as THREE.Material).vUserData.lightMap,
  );

  async function downloadFromURL() {
    console.log('downloadFromURL');
    if (customURL.trim().length === 0) {
      alert('URL 입력하십쇼');
      return;
    } else if (!customURL.startsWith('https')) {
      alert('올바른 URL 을 입력하세요.');
      return;
    } else {
      const keys = Object.keys(lightMaps);
      if (!keys.includes(customURL.trim())) {
        const loader = getVKTX2Loader();
        const texture = await loader.loadAsync(customURL);
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.channel = 1;
        texture.vUserData.mimeType = 'image/ktx2';
        const map = new Map<string, THREE.Texture>();
        map.set(decodeURI(customURL), texture);
        const obj = await createLightmapCache(map);
        setLightMaps(pre => {
          return { ...pre, ...obj };
        });
        setCustomURL('');
      } else {
        alert('이미 존재합니다.');
        return;
      }
    }
  }

  function confirm() {
    setLMValue(selected);
    closeModal();
  }

  return (
    <div
      className="bg-white border border-gray-600 rounded p-2"
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="py-1 w-full mb-2">
        <div className="flex">
          <strong style={{ fontSize: 16 }}>
            LightMap Select : {mesh.name}
          </strong>
          <button className="ml-auto">업로드</button>
        </div>
        <p>
          Scene 에 업로드 된 라이트맵 갯수 : {Object.keys(lightMaps).length}개
        </p>
      </div>
      <div className="w-full h-[400px] max-h-[400px] overflow-y-auto mb-2">
        {Object.entries(lightMaps).map(([key, { texture, image }]) => (
          <div
            key={key}
            className="hover-opacity cursor-pointer flex items-center gap-x-2 mb-1"
            style={
              selected === key
                ? { backgroundColor: 'rgba(128,128,128,0.65)' }
                : {}
            }
            onClick={() => setSelected(key)}
          >
            <KTXPreview texture={texture} image={image} />
            <div>
              <p>{getNameFromURL(key)}</p>
              {meshLightMap === getNameFromURL(key) && (
                <span className="text-gray-500">현재 메시의 기본 라이트맵</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <div className="mr-auto flex items-center gap-x-2">
          <input
            type="text"
            className="border border-gray-600 rounded"
            value={customURL}
            onChange={e => {
              setCustomURL(e.target.value);
            }}
          />
          <button className="mr-auto" onClick={downloadFromURL}>
            url 입력
          </button>
        </div>
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button
          className="py-1.5 px-3 text-md"
          disabled={selected === ''}
          onClick={confirm}
        >
          적용
        </button>
      </div>
    </div>
  );
};

const KTXPreview = ({
  texture,
  image,
}: {
  texture: THREE.Texture;
  image: Blob;
}) => {
  const isKtx = texture.vUserData.mimeType === 'image/ktx2';

  if (!isKtx) {
    return <span>KTX2 이미지 아님</span>;
  }

  return (
    <div className="rounded-[8px] w-[60px] h-[60px] bg-gray-700">
      <img alt="" src={URL.createObjectURL(image)} className="w-full h-full" />
    </div>
  );
};

const TextEditor = ({
  value,
  setValue,
  onClose,
}: {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string>(value);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  function onConfirm() {
    setValue(text);
    onClose();
  }

  function onCancel() {
    onClose();
  }

  return (
    <div className="flex gap-x-1.5 items-center">
      <input
        ref={ref}
        type="text"
        value={text}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onConfirm();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        onChange={e => setText(e.target.value)}
      />
      <button onClick={onConfirm}>변경</button>
      <button onClick={onCancel}>취소</button>
    </div>
  );
};

const MeshSelectModal = ({
  state,
  models,
  setModels,
}: {
  state: ModelOptionState;
  models: MeshEffect[];
  setModels: Dispatch<SetStateAction<MeshEffect[]>>;
}) => {
  const threeExports = threes();
  if (!threeExports) {
    return null;
  }

  const [loading, setLoading] = useState(false);

  async function load() {
    if (!threeExports) {
      alert('아직 Scene 이 준비되지 않았음');
      return;
    }
    setLoading(true);
    await loadLatest({ threeExports });
    setLoading(false);
  }

  const { scene } = threeExports;

  const { closeModal } = useModal();

  const [keyword, setKeyword] = useState<string>('');
  const [modelSelected, setModelSelected] = useAtom(ModelSelectorAtom);

  useEffect(() => {
    if (models.length > 0) {
      setModelSelected(
        models
          .map(m =>
            scene.getObjectByProperty('name', m.targetMeshProperties.name),
          )
          .filter(m => m !== undefined),
      );
    }
  }, [models]);

  function confirm() {
    // 원래 있는 models array 확인 및 유지
    const m = [...models];
    const names = modelSelected
      .filter(model => model.type === 'Mesh')
      .map(model => model.name);
    const filtered = m.filter(me =>
      names.includes(me.targetMeshProperties.name),
    );
    // filtered + modelSelected without filtered
    const filteredNames = filtered.map(f => f.targetMeshProperties.name);
    const withouts = modelSelected
      .filter(m => !filteredNames.includes(m.name))
      .map(w => {
        return {
          targetMeshProperties: {
            uuid: w.uuid,
            name: w.name,
          },
          effects: {
            useVisible: false,
            useLightMap: false,
            visibleValue: false,
            lmValue: null,
          },
          expanded: true,
        } as MeshEffect;
      });

    setModels([...filtered, ...withouts]);
    closeModal();
  }

  function close() {
    setModelSelected([]);
    closeModal();
  }

  function syncScene() {
    const selects = getAtomValue(selectedAtom);
    const meshes: THREE.Object3D[] = [];

    scene.traverseAll(o => {
      if (selects.includes(o.uuid)) {
        meshes.push(o);
      }
    });

    setModelSelected(meshes);
  }

  return (
    <div
      className="w-[40%] bg-gray-100 rounded p-3 relative"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {loading && (
        <div className="absolute z-10 left-0 top-0 w-full h-full bg-[rgba(65,65,65,0.43)] flex justify-center items-center">
          <div>
            <p className="font-bold text-center text-black text-lg">
              모델 로딩 중...
            </p>
            <p className="font-bold text-center text-black text-sm">
              창을 종료해도 로딩이 진행됩니다.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="py-1 w-full mb-2 border-b-2 flex">
        <strong style={{ fontSize: 16 }}>메시 선택 - {state.stateName}</strong>
        <button className="ml-auto" onClick={load}>
          최신 업로드 불러오기
        </button>
      </div>
      <div className="my-2">
        <div className="flex w-full justify-between items-center mb-2">
          <div className="flex gap-x-1.5 items-center">
            <span>{modelSelected.length}개 선택됨</span>
            <button className="text-xs">전체 선택</button>
            <button className="text-xs" onClick={() => setModelSelected([])}>
              전체 해제
            </button>
            <button className="text-xs" onClick={syncScene}>
              장면 선택과 동기화
            </button>
          </div>
          <div className="flex justify-end items-center">
            <span className="text-sm mr-1.5">검색: </span>
            <input
              type="text"
              value={keyword}
              className="px-2 py-0.5 border-gray-600 border rounded"
              onKeyDown={e => {
                e.stopPropagation();
              }}
              onChange={e => {
                setKeyword(e.target.value);
              }}
            />
            <button className="ml-1.5 text-xs" onClick={() => setKeyword('')}>
              초기화
            </button>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <SelectableNodes data={scene} depth={0} keyword={keyword} />
        </div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2 border-t-2 pt-3">
        <button className="py-1.5 px-3 text-md" onClick={close}>
          취소
        </button>
        <button className="py-1.5 px-3 text-md" onClick={confirm}>
          선택
        </button>
      </div>
    </div>
  );
};

const OptionCreateModal = () => {
  const [modelOptions, setModelOptions] = useAtom(modelOptionAtom);
  const [name, setName] = useState<string>('');
  const { closeModal } = useModal();
  const inputRef = useRef<HTMLInputElement>(null);

  function checkNameDuplicate(n: string): boolean {
    return modelOptions.some(model => model.name === n);
  }

  function confirm() {
    if (name.trim().length === 0) {
      alert('이름을 입력해주세요.');
      return;
    }
    if (checkNameDuplicate(name)) {
      alert('이미 존재하는 이름입니다.');
      return;
    }
    const newModelOption: ModelOptionObject = {
      id: v4(),
      states: [],
      name: name,
      expanded: false,
    };
    setModelOptions(prev => [...prev, newModelOption]);
    closeModal();
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div
      className="w-[30%] bg-white px-4 py-3"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="py-1 w-full mb-2">
        <strong style={{ fontSize: 16 }}>옵션 생성</strong>
      </div>
      {/* Body */}
      <div className="w-full mb-2 flex flex-col gap-y-2">
        <div className="flex w-full gap-x-2 text-sm items-center">
          <span>옵션 이름 : </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              ref={inputRef}
              className="border border-black w-full py-1 px-2 rounded"
              type="text"
              value={name}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  confirm();
                }
              }}
              onInput={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onChange={e => {
                setName(e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button className="py-1.5 px-3 text-md" onClick={confirm}>
          생성
        </button>
      </div>
    </div>
  );
};

function getNameFromURL(url?: string): string | undefined {
  if (!url) {
    return url;
  }
  if (url.indexOf('/') === -1) {
    return url;
  }
  return url.substring(url.lastIndexOf('/') + 1);
}
