import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as THREE from 'VTHREE';
import {
  animationDurationAtom,
  getAtomValue,
  lightMapAtom,
  modelOptionClassAtom,
  ModelSelectorAtom,
  ProbeAtom,
  selectedAtom,
  useModal,
} from '../scripts/atoms.ts';
import { threes, uploadImage } from '../scripts/atomUtils.ts';
import { createLightmapCache } from '../scripts/loaders/VGLTFLoader.ts';
import { getVKTX2Loader } from '../scripts/loaders/VKTX2Loader.ts';
import MeshEffect from '../scripts/options/MeshEffect.ts';
import ModelOption from '../scripts/options/ModelOption.ts';
import useOptionManager from '../scripts/options/OptionManager.ts';
import OptionState, {
  FunctionEffects,
  FunctionEffectsBooleans,
  FunctionEffectsURLs,
} from '../scripts/options/OptionState.ts';
import { isImage, loadLatest, splitExtension } from '../scripts/utils.ts';
import { SelectableNodes } from './DPC/DPCModelSelector.tsx';
import FileUploader from './util/FileUploader.tsx';

const OptionConfigTab = () => {
  const [fileName, setFileName] = useState<string>('options_test.json');
  const { loadOptions, uploadOptionJSON, options } = useOptionManager();
  const { openModal } = useModal();

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex gap-x-1 items-center">
        <OptionManager />
        <button onClick={() => openModal(<OptionCreateModal />)}>
          옵션 생성하기
        </button>
        <button onClick={() => openModal(<FileUploader />)}>
          파일업로더 열기
        </button>
      </div>
      <div className="flex gap-x-1 items-center">
        <input
          type="text"
          className="px-1 py-0.5"
          value={fileName}
          onChange={e => setFileName(e.target.value)}
        />
        <button onClick={() => uploadOptionJSON(fileName)}>업로드</button>
        <button onClick={() => loadOptions(fileName)}>불러오기</button>
        <button onClick={() => setFileName('options.json')}>기본</button>
        <button onClick={() => setFileName('options_test.json')}>Test</button>
      </div>
      <div className="flex flex-col gap-y-1">
        {options.map((modelOption, idx) => (
          <Option key={idx} modelOption={modelOption} />
        ))}
      </div>
    </div>
  );
};

const OptionManager = () => {
  const { analyze } = useOptionManager();
  /**
   * 1. 하나의 옵션을 토글할 때 다른 옵션들의 상태를 체크
   * 2. 다른 옵션들의 토글 여부에 있는 겹쳐지는 메시를 체크
   * 3. 겹쳐지는 메시를 정리할 때 아래의 방식을 따라갈 것
   *    1) Visible 의 경우 모든 옵션에 대해 모두 visible On 일 때 최종 Visible = true / 그게 아니라면 Off
   *    2) LightMap 의 경우 현재 적용될 옵션에 맞춰서 LightMap On ? // TODO check 필요
   * **/

  return <button onClick={() => console.log(analyze())}>분석 사항 로그</button>;
};

const OptionPreviewTab = () => {
  const { options, isProcessing } = useOptionManager();
  const [animationDuration, setAnimationDuration] = useAtom<number>(
    animationDurationAtom,
  );
  const animationTimeInputConfig = {
    min: 0.2,
    max: 5,
    step: 0.1,
  };

  return (
    <div>
      <div className="w-full flex gap-x-1 mb-2">
        <span>애니메이션 시간</span>
        <input
          type="range"
          value={animationDuration}
          step={animationTimeInputConfig.step}
          min={animationTimeInputConfig.min}
          max={animationTimeInputConfig.max}
          onChange={e => {
            setAnimationDuration(parseFloat(e.target.value));
          }}
        />
        <input
          className="w-[40px] text-right"
          type="number"
          value={animationDuration}
          onChange={e => {
            setAnimationDuration(parseFloat(e.target.value));
          }}
          step={animationTimeInputConfig.step}
          min={animationTimeInputConfig.min}
          max={animationTimeInputConfig.max}
        />
        <span>초</span>
      </div>
      <div className="relative">
        {isProcessing && (
          <div className="absolute h-full w-full cursor-wait z-10"></div>
        )}
        {options.map(modelOption => (
          <OptionPreview
            key={'option_preview_' + Math.random().toString()}
            option={modelOption}
          />
        ))}
      </div>
    </div>
  );
};

const OptionPreview = ({ option }: { option: ModelOption }) => {
  const { processState, optionSelected } = useOptionManager();

  return (
    <div className="mt-2 border border-gray-600 p-2">
      <p className="text-sm font-bold text-center mb-2">{option.name}</p>
      <div className="flex items-center border-collapse relative">
        {option.states.map(state => (
          <div
            style={{ width: `calc(100%/${option.states.length})` }}
            key={Math.random()}
          >
            <button
              key={Math.random()}
              className="rounded-none w-full"
              onClick={() => processState(state)}
              disabled={
                optionSelected && optionSelected[option.id] === state.id
              }
            >
              {state.name}
            </button>
          </div>
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
      <div className="py-1 px-3 max-h-[calc(100%-20px)] h-[calc(100%-20px)]">
        {tabMode === 'config' ? <OptionConfigTab /> : <OptionPreviewTab />}
      </div>
    </div>
  );
};

const Option = ({ modelOption }: { modelOption: ModelOption }) => {
  const setModelOptions = useSetAtom(modelOptionClassAtom);
  const [states, setStates] = useState<OptionState[]>(modelOption.states);
  const [nameEditMode, setNameEditMode] = useState<boolean>(false);
  const [name, setName] = useState<string>(modelOption.name);
  const [defaultState, setDefaultState] = useState<string>(
    modelOption.defaultSelected,
  );

  useEffect(() => {
    // modelOption.states = states;
    console.log('state Updated');
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
    const newState = new OptionState(modelOption);
    setStates(pre => [...pre, newState]);
    if (!modelOption.expanded) {
      toggleOpen(true);
    }
  }

  function deleteOption() {
    setModelOptions(pre => pre.filter(p => p.id !== modelOption.id));
  }

  return (
    <div className="p-2 border border-gray-600">
      <div className="flex gap-x-2 items-center">
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
            className="hover:bg-gray-300"
            onDoubleClick={() => {
              setNameEditMode(true);
            }}
          >
            <strong>{name}</strong>
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
      <div className="my-1">
        <span>ID: {modelOption.id}</span>
      </div>
      {modelOption.expanded && (
        <>
          {states.map((state, idx) => (
            <State
              key={idx}
              defaultState={defaultState}
              setDefaultState={setDefaultState}
              state={state}
              setStates={setStates}
            />
          ))}
        </>
      )}
    </div>
  );
};

const State = ({
  defaultState,
  setDefaultState,
  state,
  setStates,
}: {
  defaultState: string;
  setDefaultState: Dispatch<SetStateAction<string>>;
  state: OptionState;
  setStates: Dispatch<SetStateAction<OptionState[]>>;
}) => {
  const threeExports = threes();
  const { openModal } = useModal();
  const [name, setName] = useState<string>(state.name);
  const [nameEditMode, setNameEditMode] = useState<boolean>(false);
  const [models, setModels] = useState<MeshEffect[]>(state.meshEffects);
  const [open, setOpen] = useState<boolean>(state.expanded);
  const [functionEffects, setFunctionEffects] = useState<FunctionEffects>(
    state.functionEffects,
  );

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
    const newState = state.copy();
    setStates(pre => [...pre, newState]);
  }

  useEffect(() => {
    state.expanded = open;
  }, [open]);

  useEffect(() => {
    setStates(pre => {
      const t = [...pre];
      const idx = t.findIndex(o => o.id === state.id);
      t[idx].name = name;
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

  useEffect(() => {
    console.log('functionEffects Updated');
    setStates(pre => {
      const t = [...pre];
      const idx = t.findIndex(o => o.id === state.id);
      t[idx].functionEffects = functionEffects;
      return t;
    });
  }, [functionEffects]);

  function openValueModal() {
    openModal(<ValueModal meshEffects={models} />);
  }

  function closeAll() {
    models.forEach((meshEffect: MeshEffect) => {
      meshEffect.expanded = false;
    });
  }

  function setDefault() {
    setDefaultState(state.id);
  }

  function openStateFunctionEffectChangeModal() {
    openModal(
      <StateFunctionEffectModal
        state={state}
        onComplete={functionEffects => setFunctionEffects(functionEffects)}
      />,
    );
  }

  return (
    <div className="px-2 py-1 border  border-gray-600 mb-1">
      <div className="flex gap-x-1.5 items-center relative">
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
            className="hover:bg-gray-300 px-1 py-1"
            onDoubleClick={() => setNameEditMode(true)}
          >
            <strong>{state.name}</strong>
          </div>
        )}
        {!nameEditMode && (
          <div className="flex items-center ml-auto gap-x-2">
            <div className="grid grid-cols-2 gap-x-1 text-[11px]">
              <span>
                <strong>메시</strong> {models.length}개
              </span>
              <span>
                <strong>미니맵</strong>{' '}
                {state.functionEffects.booleans.changeMinimap ? 'O' : 'X'}
              </span>
              <span>
                <strong>벽</strong>{' '}
                {state.functionEffects.booleans.changeWall ? 'O' : 'X'}
              </span>
              <span>
                <strong>Nav</strong>{' '}
                {state.functionEffects.booleans.changeNav ? 'O' : 'X'}
              </span>
              <span>
                <strong>Floor</strong>{' '}
                {state.functionEffects.booleans.changeFloor ? 'O' : 'X'}
              </span>
              <span>
                <strong>Probe</strong>{' '}
                {state.functionEffects.booleans.changeProbe ? 'O' : 'X'}
              </span>
            </div>
            <div className="grid gap-x-1 gap-y-0.5 grid-cols-2">
              <button disabled={defaultState === state.id} onClick={setDefault}>
                기본값
              </button>
              <button onClick={openMeshSelectModal}>메시 선택</button>
              <button onClick={openStateFunctionEffectChangeModal}>
                이벤트
              </button>
              <button onClick={copyState}>복사</button>
              {models.length > 0 && (
                <button onClick={() => setOpen(pre => !pre)}>
                  {open ? '접기' : '펼치기'}
                </button>
              )}
              <button onClick={deleteState}>삭제</button>
            </div>
          </div>
        )}
      </div>
      <div className="my-1">
        <span>ID: {state.id}</span>
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

const StateFunctionEffectModal = ({
  state,
  onComplete,
}: {
  state: OptionState;
  onComplete: (functionEffects: FunctionEffects) => void;
}) => {
  const { closeModal } = useModal();
  const functionEffects = state.functionEffects;
  const [uses, setUses] = useState<FunctionEffectsBooleans>(
    functionEffects.booleans,
  );
  const [values, setValues] = useState<FunctionEffectsURLs>(
    functionEffects.urls,
  );

  console.log('values : ', values);
  const [probeTextures, setProbeTextures] = useState<
    { blob: Blob; url: string; name: string; id: string }[]
  >([]);
  const probes = useAtomValue(ProbeAtom);
  const [loading, setLoading] = useState(false);

  const [previewMinimap, setPreviewMinimap] = useState<{
    show: boolean;
    error: boolean;
    url: string | null;
  }>({ show: false, error: false, url: null });

  async function updateMinimap() {
    if (!uses.changeMinimap) {
      return;
    }
    const minimapUrl = values.minimap;
    if (await isImage(minimapUrl)) {
      setPreviewMinimap({ show: true, error: false, url: minimapUrl });
    } else {
      setPreviewMinimap({ show: true, error: true, url: minimapUrl });
    }
  }

  function confirm() {
    state.functionEffects = {
      booleans: uses,
      urls: values,
    };
    onComplete(state.functionEffects);
    closeModal();
  }

  async function loadNowProbeTextures() {
    setLoading(true);
    const textures = await Promise.all(
      probes.map(async probe => {
        const canvas = probe.getCanvas()!;
        console.log('canvas w h : ', canvas.width, canvas.height);
        const blob = await canvasToBlobAsync(canvas);
        return {
          blob: blob,
          url: URL.createObjectURL(blob),
          name: probe.getName(),
          id: probe.getId(),
        };
      }),
    );
    setLoading(false);
    setProbeTextures(textures);
  }

  async function applyTextures() {
    const files = probeTextures.map(({ blob, name, id }) => {
      const fileName = `${name}_${id}_equirectangular_${state.id}.jpg`;
      return new File([blob], fileName, { type: blob.type });
    });

    const res = await uploadImage(files);
    const fileUrls = res.data.map(f => decodeURI(f.fileUrl));
    const results = fileUrls.map(url => {
      const { probeId, stateId } = extractIDsFromURL(url);
      return { probeId, stateId, url };
    });
    setValues(pre => {
      return { ...pre, probe: results };
    });
    alert('완료');
  }

  function extractIDsFromURL(url: string) {
    const fileName = decodeURIComponent(url.split('/').pop() || '');
    const regex =
      /_(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})_equirectangular_(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})\.jpg$/;

    const match = fileName.match(regex);
    console.log(fileName);
    if (!match) {
      throw new Error('파일 이름 형식이 올바르지 않습니다.');
    }

    const [_, probeId, stateId] = match;
    return { probeId, stateId };
  }

  function canvasToBlobAsync(
    canvas: HTMLCanvasElement,
    type = 'image/jpeg',
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob() failed'));
      }, type);
    });
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
        <strong style={{ fontSize: 16 }}>
          Event States - [{state.parent.name} : {state.name}]
        </strong>
      </div>
      {/* Body */}
      <div className="w-full mb-4 flex flex-col gap-y-2 h-fit">
        <div className="mt-1">
          <strong className="mr-1">미니맵</strong>
          <button
            onClick={() =>
              setUses(pre => ({
                ...pre,
                changeMinimap: !uses.changeMinimap,
              }))
            }
          >
            {uses.changeMinimap ? '사용' : '미사용'}
          </button>
          {uses.changeMinimap && (
            <div>
              {previewMinimap.show && (
                <div>
                  {previewMinimap.error ? (
                    <span>URL이 올바르지 않습니다.</span>
                  ) : (
                    <img src={previewMinimap.url!!} alt="" />
                  )}
                </div>
              )}
              <div className="flex mt-1 gap-x-1">
                <input
                  className="py-1 px-0.5 border border-black rounded w-[80%]"
                  type="text"
                  value={values.minimap}
                  onChange={e =>
                    setValues(pre => ({ ...pre, minimap: e.target.value }))
                  }
                />
                <button onClick={updateMinimap}>미리보기</button>
                <button
                  onClick={() =>
                    setValues(pre => ({
                      ...pre,
                      minimap: functionEffects.urls.minimap,
                    }))
                  }
                >
                  초기화
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-1">
          <strong className="mr-1">벽</strong>
          <button
            onClick={() =>
              setUses(pre => ({
                ...pre,
                changeWall: !uses.changeWall,
              }))
            }
          >
            {uses.changeWall ? '사용' : '미사용'}
          </button>
          <div className="flex mt-1 justify-between">
            {uses.changeWall && (
              <>
                <input
                  className="py-1 px-0.5 border border-black rounded w-[90%]"
                  type="text"
                  value={values.walls}
                  onChange={e =>
                    setValues(pre => ({ ...pre, walls: e.target.value }))
                  }
                />
                <button
                  onClick={() =>
                    setValues(pre => ({
                      ...pre,
                      walls: functionEffects.urls.walls,
                    }))
                  }
                >
                  초기화
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-1">
          <strong className="mr-1">Nav Mesh</strong>
          <button
            onClick={() =>
              setUses(pre => ({
                ...pre,
                changeNav: !uses.changeNav,
              }))
            }
          >
            {uses.changeNav ? '사용' : '미사용'}
          </button>
          <div className="flex mt-1 justify-between">
            {uses.changeNav && (
              <>
                <input
                  className="py-1 px-0.5 border border-black rounded w-[90%]"
                  type="text"
                  value={values.nav}
                  onChange={e =>
                    setValues(pre => ({ ...pre, nav: e.target.value }))
                  }
                />
                <button
                  onClick={() =>
                    setValues(pre => ({
                      ...pre,
                      nav: functionEffects.urls.nav,
                    }))
                  }
                >
                  초기화
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-1">
          <strong className="mr-1">Floor Mesh</strong>
          <button
            onClick={() =>
              setUses(pre => ({
                ...pre,
                changeFloor: !uses.changeFloor,
              }))
            }
          >
            {uses.changeFloor ? '사용' : '미사용'}
          </button>
          <div className="flex mt-1 justify-between">
            {uses.changeFloor && (
              <>
                <input
                  className="py-1 px-0.5 border border-black rounded w-[90%]"
                  type="text"
                  value={values.floor}
                  onChange={e =>
                    setValues(pre => ({ ...pre, floor: e.target.value }))
                  }
                />
                <button
                  onClick={() =>
                    setValues(pre => ({
                      ...pre,
                      floor: functionEffects.urls.floor,
                    }))
                  }
                >
                  초기화
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-1">
          <strong className="mr-1">Probe Textures</strong>
          <button
            onClick={() =>
              setUses(pre => ({
                ...pre,
                changeProbe: !uses.changeProbe,
              }))
            }
          >
            {uses.changeProbe ? '사용' : '미사용'}
          </button>
          <div className="mt-1">
            {uses.changeProbe && (
              <>
                <button onClick={loadNowProbeTextures}>
                  현재 프로브 텍스쳐 띄우기
                </button>
                <button onClick={applyTextures}>해당 텍스쳐 할당</button>
                {loading && (
                  <div className="w-full flex justify-center">로딩 중</div>
                )}
                <div className="grid mt-1 grid-cols-1 gap-y-1 gap-x-1 overflow-auto max-h-[300px] p-1">
                  {values.probe.length > 0 &&
                    values.probe.map(({ probeId, stateId, url }) => {
                      return (
                        <div className="w-full">
                          <p className="mb-1">
                            <strong>프로브 ID: </strong>
                            {probeId}
                          </p>
                          <p className="mb-1">
                            <strong>URL</strong>
                            {url}
                          </p>
                        </div>
                      );
                    })}
                  {probeTextures.length > 0 &&
                    probeTextures.map(({ url, name, id }) => {
                      return (
                        <div className="w-full aspect-[2/1]">
                          <p className="mb-1">
                            {name} - {id}
                          </p>
                          <img
                            className="w-full aspect-[2/1]"
                            src={url}
                            alt=""
                          />
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button className="py-1.5 px-3 text-md" onClick={confirm}>
          저장
        </button>
      </div>
    </div>
  );
};

const ValueModal = ({ meshEffects }: { meshEffects: MeshEffect[] }) => {
  const { closeModal } = useModal();
  const [useVisible, setUseVisible] = useState<boolean>(false);
  const [visibleValue, setVisibleValue] = useState<boolean>(false);

  function confirm() {
    meshEffects.forEach(meshEffect => {
      meshEffect.useVisible = useVisible;
      meshEffect.visibleValue = visibleValue;
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
  const modelOptions = useAtomValue(modelOptionClassAtom);
  const [use, setUse] = useState<{
    visible: boolean;
    lightMap: boolean;
  }>({
    visible: meshEffect.useVisible,
    lightMap: meshEffect.useLightMap,
  });
  const threeExports = threes();
  if (!threeExports) {
    return null;
  }
  const { scene, camera } = threeExports;

  const object = scene
    .getObjectsByProperty('name', meshEffect.name)
    .find(o => o.type === 'Mesh');

  const setSelectedMeshes = useSetAtom(selectedAtom);
  const mesh = object!! as THREE.Mesh;
  const { openModal } = useModal();

  function getOtherModelOptionAndStates(): {
    id: string;
    name: string;
    states: { state: OptionState; name: string; id: string }[];
  }[] {
    const parent = meshEffect.grandParent;
    const otherOptions = modelOptions.filter(m => m.id !== parent.id);
    return otherOptions.map(m => {
      const states = m.states.map(state => ({
        state: state,
        name: state.name,
        id: state.id,
      }));
      return {
        name: m.name,
        id: m.id,
        states,
      };
    });
  }

  const [expanded, setExpanded] = useState<boolean>(meshEffect.expanded);
  const [visible, setVisible] = useState<boolean>(meshEffect.visibleValue);
  const [_, setRenderVersion] = useState<number>(0); // 임시
  useEffect(() => {
    meshEffect.visibleValue = visible;
  }, [visible]);

  useEffect(() => {
    meshEffect.expanded = expanded;
  }, [expanded]);

  function updateUseBoolean(target: 'visible' | 'lightMap', value: boolean) {
    setUse(pre => {
      const newP = { ...pre };
      newP[target] = value;
      return newP;
    });
    const key = 'use' + target.charAt(0).toUpperCase() + target.slice(1);
    // @ts-ignore
    meshEffect[key] = value;
  }

  function openLightMapModal(state: {
    state: OptionState;
    name: string;
    id: string;
  }) {
    openModal(
      <LightMapSelector
        mesh={mesh}
        onConfirm={str => {
          const targetState = state.state;
          meshEffect.setLightMapValues(targetState, str);
          // 연관된 상대 옵션에도 같이 넣기
          const targetEffect = targetState.meshEffects.find(
            m => m.meshProperty.name === meshEffect.meshProperty.name,
          );
          if (targetEffect) {
            if (!targetEffect.useLightMap) {
              targetEffect.useLightMap = true;
            }
            targetEffect.setLightMapValues(meshEffect.parent, str);
          }

          setRenderVersion(pre => pre + 1);
        }}
      />,
    );
  }

  function deleteThis() {
    setMeshEffects(pre => pre.filter(p => p.name !== meshEffect.name));
  }

  if (!object) {
    return null;
  }

  return (
    <div className="pl-1 my-1.5 border-b border-b-gray-400 py-1">
      <div className="flex gap-x-1.5 items-center">
        <div className="max-w-[150px] text-nowrap overflow-ellipsis overflow-hidden">
          {meshEffect.name}
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
                    {getOtherModelOptionAndStates().map(o => {
                      const lightMapValues = meshEffect.effect.lightMapValues;
                      let keys: string[] = [];
                      if (lightMapValues) {
                        keys.push(...Object.keys(lightMapValues));
                      }
                      return (
                        <div>
                          <span>{o.name}</span>
                          <div className="mt-1 ml-2 flex flex-col gap-y-1">
                            {o.states.map(stateObject => {
                              const state = stateObject.state;
                              const option = state.parent;
                              return (
                                <div>
                                  <div className="flex gap-x-1 items-center">
                                    <span className="text-gray-600">
                                      - {stateObject.name}
                                    </span>
                                    <button
                                      onClick={() => {
                                        openLightMapModal(stateObject);
                                      }}
                                    >
                                      변경
                                    </button>
                                  </div>
                                  {lightMapValues &&
                                    keys.includes(option.id) && (
                                      <div className="max-w-full overflow-ellipsis overflow-hidden text-nowrap">
                                        {getNameFromURL(
                                          lightMapValues[option.id][state.id],
                                        )}
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
  onConfirm,
}: {
  mesh: THREE.Mesh;
  onConfirm: (url: string) => void;
}) => {
  const [lightMaps, setLightMaps] = useAtom(lightMapAtom);
  const [selected, setSelected] = useState<string>('');
  const [customURL, setCustomURL] = useState<string>('');
  const { closeModal } = useModal();
  const inputRef = useRef<HTMLInputElement>(null);
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
        const gl = new THREE.WebGLRenderer();
        const obj = await createLightmapCache(map, gl);
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
    onConfirm(selected);
    closeModal();
  }

  function openInput() {
    console.log(inputRef.current);
    if (inputRef.current) {
      inputRef.current.click();
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);
      const hasAnother = files.some(
        file => splitExtension(file.name).ext.toLowerCase() !== 'exr',
      );
      if (hasAnother) {
        alert('EXR 파일만 업로드 가능합니다.');
        return;
      } else {
      }
    }
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
          <button className="ml-auto" onClick={() => openInput()}>
            업로드
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            onChange={onInputChange}
            onClick={e => {
              e.stopPropagation();
            }}
          />
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

  if (!image) {
    return (
      <div className="rounded-[8px] w-[60px] h-[60px] border-black border flex items-center justify-center">
        <p className="text-center">No Preview</p>
      </div>
    );
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
  state: OptionState;
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
          .map(m => scene.getObjectByProperty('name', m.name))
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
    const filtered = m.filter(me => names.includes(me.name));
    // filtered + modelSelected without filtered
    const filteredNames = filtered.map(f => f.name);
    const withouts = modelSelected
      .filter(m => !filteredNames.includes(m.name))
      .map(w => {
        return new MeshEffect(
          state,
          { uuid: w.uuid, name: w.name },
          w as THREE.Mesh,
        );
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

  function selectAll() {
    // 현재 화면에 보일 목록 전체 선택 (키워드 필터까지)
    const meshes: THREE.Mesh[] = [];
    scene.traverseAll(o => {
      if (o.type === 'Mesh') {
        if (keyword === '') {
          meshes.push(o as THREE.Mesh);
        } else if (
          keyword !== '' &&
          o.name.toLocaleLowerCase().includes(keyword.toLowerCase())
        ) {
          meshes.push(o as THREE.Mesh);
        }
      }
    });

    setModelSelected(meshes);
  }

  function addAll() {
    const meshes: THREE.Mesh[] = [];
    const modelSelectedUuids = modelSelected.map(m => m.uuid);
    scene.traverseAll(o => {
      if (o.type === 'Mesh') {
        if (keyword === '') {
          if (!modelSelectedUuids.includes(o.uuid))
            meshes.push(o as THREE.Mesh);
        } else if (
          keyword !== '' &&
          o.name.toLocaleLowerCase().includes(keyword.toLowerCase()) &&
          !modelSelectedUuids.includes(o.uuid)
        ) {
          meshes.push(o as THREE.Mesh);
        }
      }
    });

    setModelSelected(pre => [...pre, ...meshes]);
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
        <strong style={{ fontSize: 16 }}>메시 선택 - {state.name}</strong>
        <button className="ml-auto" onClick={load}>
          최신 업로드 불러오기
        </button>
      </div>
      <div className="my-2">
        <div className="flex w-full justify-between items-center mb-2">
          <div className="flex gap-x-1.5 items-center">
            <span>{modelSelected.length}개 선택됨</span>
            <button className="text-xs" onClick={selectAll}>
              목록 전체 선택
            </button>
            <button className="text-xs" onClick={addAll}>
              선택 목록 추가
            </button>
            <button className="text-xs" onClick={() => setModelSelected([])}>
              전체 해제
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
  const [mcOptions, setMcOptions] = useAtom(modelOptionClassAtom);
  const [name, setName] = useState<string>('');
  const { closeModal } = useModal();
  const inputRef = useRef<HTMLInputElement>(null);

  function checkNameDuplicate(n: string): boolean {
    return mcOptions.some(model => model.name === n);
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

    const newModelOption = new ModelOption();
    newModelOption.name = name;
    setMcOptions(prev => [...prev, newModelOption]);
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
