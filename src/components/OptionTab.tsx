import gsap from 'gsap';
import { useAtom, useSetAtom } from 'jotai';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
import {
  getAtomValue,
  modelOptionAtom,
  ModelSelectorAtom,
  selectedAtom,
  useModal,
} from '../scripts/atoms.ts';
import { loadOption, threes, uploadJson } from '../scripts/atomUtils.ts';
import {
  Effects,
  MeshEffect,
  ModelOption,
  ModelOptionState,
} from '../scripts/ModelOption.ts';
import { loadLatest } from '../scripts/utils.ts';
import * as THREE from '../scripts/VTHREE.ts';
import { SelectableNodes } from './DPC/DPCModelSelector.tsx';

const OptionConfigTab = () => {
  const [modelOptions, setModelOptions] = useAtom(modelOptionAtom);
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

  function loadOptions() {
    loadOption().then(res => setModelOptions(res));
  }

  return (
    <>
      <div className="flex gap-x-1 items-center">
        <button onClick={() => openModal(<OptionCreateModal />)}>
          옵션 생성하기
        </button>
        <button onClick={uploadOptionJSON}>업로드</button>
        <button onClick={loadOptions}>불러오기</button>
      </div>
      <div className="pt-2">
        {modelOptions.map(modelOption => (
          <Option modelOption={modelOption} />
        ))}
      </div>
    </>
  );
};

const OptionPreviewTab = () => {
  const [modelOptions, setModelOptions] = useAtom(modelOptionAtom);

  return (
    <div>
      {modelOptions.map(modelOption => (
        <OptionPreview option={modelOption} />
      ))}
    </div>
  );
};

const OptionPreview = ({ option }: { option: ModelOption }) => {
  const threeExports = threes();
  const [processedState, setProcessedState] = useState<string | null>(null);
  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;

  function processState(state: ModelOptionState) {
    setProcessedState(state.id);
    const meshEffects = state.meshEffects;
    meshEffects.map(meshEffect => {
      const object = scene.getObjectByName(
        meshEffect.targetMeshProperties.name,
      );
      if (object && object.type === 'Mesh') {
        const mesh = object as THREE.Mesh;
        const effects = meshEffect.effects;
        // Visible Control
        if (effects.useVisible) {
          const originTransparent = (mesh.material as THREE.Material)
            .transparent;
          const from = effects.visibleValue ? 0 : 1;
          const to = effects.visibleValue ? 1 : 0;
          console.log(from, to, effects.visibleValue);
          gsap.to(
            {
              t: 0,
            },
            {
              t: 1,
              duration: 1,
              onStart() {
                const mat = mesh.material as THREE.Material;
                mat.transparent = true;
                mat.opacity = from;
                mesh.visible = true;
              },
              onUpdate() {
                const progress = this.targets()[0].t;
                const mat = mesh.material as THREE.Material;
                mat.opacity = effects.visibleValue ? progress : 1 - progress;
                if (progress > 0.8) mat.depthWrite = effects.visibleValue;
                mat.needsUpdate = true;
              },
              onComplete() {
                const mat = mesh.material as THREE.Material;
                mat.transparent = originTransparent;
                mat.opacity = to;
                mesh.visible = effects.visibleValue;
                mat.depthWrite = true;
              },
            },
          );
        }

        // LightMap control
        if (effects.useLightMap) {
        }

        // Probe Control
        if (effects.useProbe) {
        }
      } else {
        console.warn(
          'no Mesh Found On state, passing By : ',
          meshEffect.targetMeshProperties,
        );
      }
    });
  }
  return (
    <div className="mt-2 border border-gray-600 p-2">
      <p className="text-sm font-bold text-center mb-2">{option.name}</p>
      <div className="flex items-center border-collapse">
        {option.states.map(state => (
          <button
            className="rounded-none"
            style={{ width: `calc(100%/${option.states.length})` }}
            onClick={() => processState(state)}
            disabled={processedState === state.id}
          >
            {state.stateName}
          </button>
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
          className="w-[50%] p-1 border-black border-r cursor-pointer"
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

const Option = ({ modelOption }: { modelOption: ModelOption }) => {
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
      console.log(t);
      return t;
    });
    console.log(states.map(state => state.stateName));
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
          {states.map(state => (
            <State state={state} setStates={setStates} />
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
        useProbe: false,
        visibleValue: false,
        lmValue: null,
        pValue: null,
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
            <button>값 일괄 적용하기</button>
          </div>
          {models.map(meshEffect => (
            <MeshEffectElem meshEffect={meshEffect} />
          ))}
        </div>
      )}
    </div>
  );
};

const MeshEffectElem = ({ meshEffect }: { meshEffect: MeshEffect }) => {
  const [use, setUse] = useState<{
    visible: boolean;
    lightMap: boolean;
    probe: boolean;
  }>({
    visible: meshEffect.effects.useVisible,
    lightMap: meshEffect.effects.useLightMap,
    probe: meshEffect.effects.useProbe,
  });
  const [expanded, setExpanded] = useState<boolean>(meshEffect.expanded);
  const threeExports = threes();
  if (!threeExports) {
    return null;
  }
  const setSelectedMeshes = useSetAtom(selectedAtom);

  const { scene, camera } = threeExports;

  const [visible, setVisible] = useState<boolean>(
    meshEffect.effects.visibleValue,
  );

  useEffect(() => {
    console.log(meshEffect);
    meshEffect.effects.visibleValue = visible;
  }, [visible]);

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

  return (
    <div className="pl-1 my-1.5 border-b border-b-gray-400 py-1">
      <div className="flex gap-x-1.5 items-center">
        <div className="max-w-[150px] text-nowrap overflow-ellipsis overflow-hidden">
          메시 : {meshEffect.targetMeshProperties.name}
        </div>
        <button
          onClick={() => {
            const mesh = scene.getObjectByProperty(
              'uuid',
              meshEffect.targetMeshProperties.uuid,
            );
            if (mesh) {
              camera.lookAt(mesh.position);
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
          <button>삭제</button>
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
            <div className="flex items-center gap-x-1.5 mt-1">
              <span>LightMap:</span>
              <span>사용</span>
              <input
                type="checkbox"
                checked={use.lightMap}
                onChange={e => {
                  updateUseBoolean('lightMap', e.target.checked);
                }}
              />
              {use.lightMap && <></>}
            </div>
            <div className="flex items-center gap-x-1.5 mt-1">
              <span>Probe:</span>
              <span>사용</span>
              <input
                type="checkbox"
                checked={use.probe}
                onChange={e => {
                  updateUseBoolean('probe', e.target.checked);
                }}
              />
              {use.probe && <></>}
            </div>
          </div>
        </div>
      )}
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
            scene.getObjectByProperty('uuid', m.targetMeshProperties.uuid),
          )
          .filter(m => m !== undefined),
      );
    }
  }, [models]);

  function confirm() {
    // 원래 있는 models array 확인 및 유지
    const m = [...models];
    const uuids = modelSelected.map(model => model.uuid);
    const filtered = m.filter(me =>
      uuids.includes(me.targetMeshProperties.uuid),
    );
    // filtered + modelSelected without filtered
    const filteredUuids = filtered.map(f => f.targetMeshProperties.uuid);
    const withouts = modelSelected
      .filter(m => !filteredUuids.includes(m.uuid))
      .map(w => {
        return {
          targetMeshProperties: {
            uuid: w.uuid,
            name: w.name,
          },
          effects: {
            useVisible: false,
            useLightMap: false,
            useProbe: false,
            visibleValue: false,
            lmValue: null,
            pValue: null,
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
    const selecteds = getAtomValue(selectedAtom);
    const meshes: THREE.Object3D[] = [];

    scene.traverseAll(o => {
      if (selecteds.includes(o.uuid)) {
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
    const newModelOption: ModelOption = {
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
