import type { RootState } from '@react-three/fiber';
import { set } from 'idb-keyval';
import {
  atom,
  createStore,
  getDefaultStore,
  PrimitiveAtom,
  useAtom,
  useAtomValue,
  useSetAtom,
  WritableAtom,
} from 'jotai';
import { LookupTexture, ToneMappingMode } from 'postprocessing';
import React from 'react';
import { Texture } from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import {
  DEFAULT_COLOR_TEMPERATURE,
  DEFAULT_TONEMAPPING_VALUES,
} from '../Constants';
import { FileInfo, GLProps, View, ViewportOption } from '../types';
import ReflectionProbe from './ReflectionProbe.ts';
import { THREE, Vector3 } from './VTHREE';
import { LUTPresets } from './postprocess/PostProcessUtils.ts';

type AtomArgType<T> = T | ((prev: T) => T);
export type Store = ReturnType<typeof createStore>;
// export const defaultStore = createStore();
export const defaultStore = getDefaultStore();

export function getAtomValue<T = any>(atom: PrimitiveAtom<T>): T {
  const store = getDefaultStore();
  return store.get(atom);
}

export function setAtomValue<T = any>(
  atom: PrimitiveAtom<T>,
  value: T | ((prev: T) => T),
) {
  const store = getDefaultStore();
  store.set(atom, value);
}

// 훅 내부가 아닌 일반 함수에서 전달받아서 사용하기 위헤 store.get
// 사용방법: const [atom, getAtom, setAtom] = createAtomCombo<타입>(초기값?, store?);
// 이렇게 선언된 atom은 컴포넌트에서 useAtom(atom) 형태로도 사용 가능하다
// 예를 들면 EditorFlowChannelHandler.ts 참조
export const createAtomCombo = <T = any>(
  initalValue?: T,
  store?: Store,
): [
    WritableAtom<T, unknown[], unknown>,
    () => T | undefined,
    (arg: AtomArgType<T>) => void,
  ] => {
  const dstStore = store ?? defaultStore;
  // @ts-ignore
  const theAtom = atom<T>(initalValue);
  return [
    theAtom,
    (() => dstStore.get(theAtom)) as () => T | undefined,
    ((arg: AtomArgType<T>) => dstStore.set(theAtom, arg)) as (
      arg: AtomArgType<T>,
    ) => void,
  ];
};

// export type MapDst = 'lightmap' | 'emissivemap' | 'envmap'; // hdr적용은 추후 필요하면 추가
export type MapDst = 'lightmap' | 'emissivemap' | 'gainmap';
export type ModelSource = {
  name: string;
  url: string;
  file: File;
  map?: File | File[];
  mapDst?: MapDst;
};
export const sourceAtom = atom<ModelSource[]>([]);
export const loadHistoryAtom = atom<
  Map<
    string,
    {
      name: string;
      start: number;
      end: number;
      file: File;
      uuid: string | null;
    }
  >
>(new Map());
export const threeExportsAtom = atom<RootState>();
export const oribitControlAtom = atom<OrbitControls>();

export type Env = {
  select: 'none' | 'preset' | 'custom' | 'url';
  preset?:
  | 'apartment'
  | 'city'
  | 'dawn'
  | 'forest'
  | 'lobby'
  | 'night'
  | 'park'
  | 'studio'
  | 'sunset'
  | 'warehouse';
  url?: string;
  intensity?: number;
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
};
// export const envAtom = atom<Env>({ select: "none" });
export const envAtom = atom<Env>({
  select: 'none',
  rotation: { x: 0, y: 0, z: 0 },
});
export const cameraMatrixAtom = atom<THREE.Matrix4>();
export const cameraModeAtom = atom<'perspective' | 'iso'>('perspective');

export const selectedAtom = atom<string[]>([]);
export const forceUpdateAtom = atom<number>(0);
export const setForceUpdate = () => {
  const setForceUpdateAtom = useSetAtom(forceUpdateAtom);
  setForceUpdateAtom(prev => prev + 1);
};
export const useForceUpdate = () => {
  const value = useAtomValue(forceUpdateAtom);
};

export const materialSelectedAtom = atom<THREE.Material | null>(null);

export const modalAtom = atom<React.FC<{ closeModal?: () => any }> | null>(
  null,
);

export const useModal = () => {
  const setModal = useSetAtom(modalAtom);
  return {
    // ()=>Element instead of Element
    // openModal: (modal: React.ReactElement<{ closeModal?: () => any }>) => setModal(modal),
    openModal: (modal: React.FC<{ closeModal?: () => any }>) => setModal(modal),
    closeModal: () => setModal(null),
  };
};

export const useEnvParams = () => {
  const [env, _setEnv] = useAtom(envAtom);
  const setEnv = (param: Env | ((prev: Env) => Env)) => {
    let retval: Env = env;
    if (typeof param === 'function') {
      _setEnv(prev => {
        retval = param(prev);
        return retval;
      });
    } else {
      _setEnv(param);
      retval = param;
    }
    set('envParam', { ...retval });
  };
  return [env, setEnv] as const;
};

export const GizmoModes = ['translate', 'rotate', 'scale'] as const;
export type GizmoMode = (typeof GizmoModes)[number];
export const mouseModeAtom = atom<'select' | GizmoMode>('select');

// 값은 -1.0 ~ 1.0
export const globalBrightnessContrastAtom = atom<{
  on: boolean;
  brightnessValue: number;
  contrastValue: number;
}>({
  on: false,
  brightnessValue: 0,
  contrastValue: 0,
});

export const sceneAnalysisAtom = atom<{
  meshCount: number;
  vertexCount: number;
  triangleCount: number;
  maxVertexInMesh: number;
  maxTriangleInMesh: number;
}>();

export type BenchMark = {
  start?: number;
  end?: number;
  downloadStart?: number;
  downloadEnd?: number;
  parseStart?: number;
  parseEnd?: number;
  sceneAddStart?: number;
  sceneAddEnd?: number;
};
export const benchmarkAtom = atom<BenchMark>({});

export const useBenchmark = () => {
  const benchmark = useAtomValue(benchmarkAtom);
  const setBenchmark = useSetAtom(benchmarkAtom);
  const addBenchmark = (
    key: keyof typeof benchmark,
    value: number = Date.now(),
  ) => {
    console.log('addBenchmark -> ', key);
    setBenchmark(prev => ({ ...prev, [key]: value }));
  };
  const loading =
    benchmark && benchmark.sceneAddStart && !benchmark.sceneAddEnd;
  const clearBenchmark = () => {
    setBenchmark({});
  };
  return { benchmark, setBenchmark, loading, addBenchmark, clearBenchmark };
};
export const openLoaderAtom = atom<boolean>(true);

export const filelistAtom = atom<{
  all: FileInfo[];
  models: FileInfo[];
  envs: FileInfo[];
  scenes: FileInfo[];
}>({ all: [], models: [], envs: [], scenes: [] });

export const globalSaturationCheckAtom = atom<boolean>(false);

export const globalColorTemperatureAtom = atom<{
  on: boolean;
  value: number;
}>({
  on: false,
  value: DEFAULT_COLOR_TEMPERATURE,
});

const TONEMAPPING_RESOLUTIONS = [4, 8, 16, 64, 128, 256, 512, 1024] as const;
export type ToneMappingResolutions = (typeof TONEMAPPING_RESOLUTIONS)[number];

export const globalToneMappingAtom = atom<{
  on: boolean;
  resolution: ToneMappingResolutions;
  middleGrey: number;
  maxLuminance: number;
  averageLuminance: number;
  adaptationRate: number;
  mode: ToneMappingMode;
  opacity: number;
}>({
  on: false,
  ...DEFAULT_TONEMAPPING_VALUES,
});

export const globalHueSaturationAtom = atom<{
  on: boolean;
  hue: number;
  saturation: number;
}>({
  on: false,
  hue: 0,
  saturation: 0,
});

export const globalLUTAtom = atom<{
  on: boolean;
  preset: LUTPresets;
  texture: Texture;
  useTetrahedralFilter: boolean;
}>({
  on: false,
  preset: 'neutral-2',
  texture: LookupTexture.createNeutral(2),
  useTetrahedralFilter: false,
});

export const globalGlAtom = atom<GLProps>({
  antialias: true,
  alpha: true,
  premultipliedAlpha: true,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  depth: true,
  failIfMajorPerformanceCaveat: false,
  toneMapping: THREE.NeutralToneMapping,
  toneMappingExposure: 1,
});

// REFLECTION PROBES
export const ProbeAtom = atom<ReflectionProbe[]>([]);
export const treeScrollToAtom = atom<string | null>(null);

export const Tabs = ['scene', 'tree', 'probe', 'hotspot'] as const;
export type Tab = (typeof Tabs)[number];
export const panelTabAtom = atom<Tab>('scene');

export const treeSearchAtom = atom<string | undefined>();

//카메라 정보값
export const lastCameraInfoAtom = atom<{
  position: THREE.Vector3;
  direction: THREE.Vector3;
  target: THREE.Vector3;
}>({
  position: new Vector3(0, 1, 0),
  direction: new Vector3(0, 1, -1),
  target: new Vector3(0, 1, -1),
});

export const cameraSettingAtom = atom<{
  moveSpeed: number;
  isoView: boolean;
  cameraY: number
  tour: {
    isAnimation: boolean,
    roomIndex: number
    animationSpeed: number
  }
}>({
  moveSpeed: 3,
  isoView: false,
  cameraY: 1.5,
  tour: {
    isAnimation: false,
    roomIndex: 0,
    animationSpeed: 1
  }
});

//orbit세팅
export const orbitSettingAtom = atom<{
  autoRotate: boolean;
  enabled: boolean;
}>({
  autoRotate: false,
  enabled: true,
});

export enum LookType {
  None = 'None',
  VERY_LOW_CONTRAST = 'Very Low Contrast',
  LOW_CONTRAST = 'Low Contrast',
  MEDIUM_CONTRAST = 'Medium Contrast',
  HIGH_CONTRAST = 'High Contrast',
  VERY_HIGH_CONTRAST = 'Very High Contrast',
}
export enum ViewTransform {
  Standard = 'Standard',
  KhronosPBRNeutral = 'KhronosPBRNeutral',
  AgX = 'AgX',
  Filmic = 'Filmic',
  FilmicLog = 'FilmicLog',
  FalseColor = 'FalseColor',
  Raw = 'Raw',
}

export type ColorManagement = {
  exposure: number;
  gamma: number;
  look: LookType;
  viewTransform: ViewTransform;
};
export const globalColorManagementAtom = atom<{
  on: boolean;
  value: ColorManagement;
}>({
  on: false,
  value: {
    exposure: 1.0,
    gamma: 1.0,
    look: LookType.HIGH_CONTRAST,
    viewTransform: ViewTransform.Raw,
  },
});

// export const testCameraPosAtom = atom<[number, number]>();
export const [mainCameraPosAtom, getTestCameraPos, setTestCameraPos] =
  createAtomCombo<THREE.Vector3>();
export const mainCameraProjectedAtom = atom<[number, number]>();

type WithInitialValue<Value> = {
  init: Value;
};
export type ThreeAtom = PrimitiveAtom<RootState | undefined> &
  WithInitialValue<RootState | undefined>;
export const sharedThreeAtom = atom<RootState>();
export const mainThreeAtom = atom<RootState>();
export const topThreeAtom = atom<RootState>();
export const frontThreeAtom = atom<RootState>();
export const rightThreeAtom = atom<RootState>();
export const backThreeAtom = atom<RootState>();
export const leftThreeAtom = atom<RootState>();
export const bottomThreeAtom = atom<RootState>();
export const Threes: { [key in View]: ThreeAtom } = {
  [View.Shared]: sharedThreeAtom,
  [View.Main]: mainThreeAtom,
  [View.Top]: topThreeAtom,
  [View.Front]: frontThreeAtom,
  [View.Right]: rightThreeAtom,
  [View.Back]: backThreeAtom,
  [View.Left]: leftThreeAtom,
  [View.Bottom]: bottomThreeAtom,
} as const;

export const viewportOptionAtom = atom<{
  [key in View]: ViewportOption;
}>({
  [View.Shared]: {},
  [View.Main]: {},
  [View.Top]: {},
  [View.Front]: {},
  [View.Right]: {},
  [View.Back]: {},
  [View.Left]: {},
  [View.Bottom]: {},
});

export const useViewportOption = (view: View = View.Shared) => {
  const [options, setOptions] = useAtom(viewportOptionAtom);

  const getOption = options[view] as ViewportOption;

  // 알아서 머지하도록 설정
  const setOption = (
    option: ViewportOption | ((prev: ViewportOption) => ViewportOption),
    _view: View = view,
  ) => {
    return setOptions(prev => {
      if (typeof option === 'function') {
        const setStateAction = option as (
          prev: ViewportOption,
        ) => ViewportOption;
        return {
          ...prev,
          [_view]: {
            ...prev[_view],
            ...setStateAction(prev[_view]),
          },
        };
      }

      return {
        ...prev,
        [_view]: {
          ...prev[_view],
          ...option,
        },
      };
    });
  };

  return {
    getOption,
    setOption,
    allOptions: options,
  };
};

export const viewGridAtom = atom<boolean>(true);
export const toggleGrid = (value?: boolean) => {
  if (value !== undefined) {
    setAtomValue(viewGridAtom, value);
  } else {
    setAtomValue(viewGridAtom, prev => !prev);
  }
};
