import type { RootState } from '@react-three/fiber';
import { atom, createStore, useAtom, useAtomValue, useSetAtom, WritableAtom } from 'jotai';
import { THREE, Vector3 } from './VTHREE';
import React from 'react';
import { set } from 'idb-keyval';
import { FileInfo, GLProps } from '../types';
import { DEFAULT_COLOR_TEMPERATURE } from '../Constants';

type AtomArgType<T> = T | ((prev: T) => T);
export type Store = ReturnType<typeof createStore>;
export const defaultStore = createStore();

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
export type MapDst = 'lightmap' | 'emissivemap';
export type ModelSource = { name: string; url: string; file: File; map?: File, mapDst?: MapDst };
export const sourceAtom = atom<
  ModelSource[]
>([]);
export const loadHistoryAtom = atom<
  Map<
    string,
    { name: string; start: number; end: number; file: File; uuid: string }
  >
>(new Map());
export const threeExportsAtom = atom<RootState>();

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
export const globalBrightnessContrastAtom = atom<{ on: boolean; brightnessValue: number; contrastValue: number }>({
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

export const globalGlAtom = atom<GLProps>({
  antialias: true,
  alpha: true,
  premultipliedAlpha: true,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  depth: true,
  failIfMajorPerformanceCaveat: false,
});

export const treeScrollToAtom = atom<string | null>(null);

export const Tabs = ['scene', 'tree', 'hotspot'] as const;
export type Tab = (typeof Tabs)[number];
export const panelTabAtom = atom<Tab>('scene');

export const treeSearchAtom = atom<string | undefined>();

//카메라 정보값
export const lastCameraInfoAtom = atom({
  position: new Vector3(0, 1, 0),
  direction: new Vector3(0, 1, -1),
  target: new Vector3(0, 1, -1),
});

export const cameraSettingAtom = atom({
  moveSpeed: 1,
  isoView: false,
});

//orbit세팅
export const orbitSettingAtom = atom({
  autoRotate: true,
  enable: false,
});


export enum LookType {
  None = "None",
  VERY_LOW_CONTRAST = 'Very Low Contrast',
  LOW_CONTRAST = 'Low Contrast',
  MEDIUM_CONTRAST = 'Medium Contrast',
  HIGH_CONTRAST = 'High Contrast',
  VERY_HIGH_CONTRAST = 'Very High Contrast'
}
export enum ViewTransform {
  Standard = "Standard",
  KhronosPBRNeutral = "KhronosPBRNeutral",
  AgX = "AgX",
  Filmic = "Filmic",
  FilmicLog = "FilmicLog",
  FalseColor = "FalseColor",
  Raw = "Raw",
}


export type ColorManagement = {
  exposure: number;
  gamma: number;
  look: LookType;
  viewTransform: ViewTransform;
};
export const globalColorManagementAtom = atom<{ on: boolean; value: ColorManagement }>({
  on: false, value: {
    exposure: 1.0,
    gamma: 1.0,
    look: LookType.HIGH_CONTRAST,
    viewTransform: ViewTransform.Raw,
  }
});