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
import React from 'react';
import { Pathfinding } from 'three-pathfinding';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { THREE } from 'VTHREE';
import { Catalogue } from '../components/DPC/DPCFileImporter.tsx';
import { DPConfiguratorMode } from '../components/DPC/DPConfigurator.tsx';
import {
  FileInfo,
  GLProps,
  Matrix4Array,
  SkyBoxState,
  View,
  ViewportOption,
  WallCreateOption,
  Walls,
} from '../types';
import ModelOption from './options/ModelOption.ts';
import ReflectionProbe from './ReflectionProbe.ts';

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

export type MaterialSlot =
  | 'lightMap'
  | 'map'
  | 'emissiveMap'
  | 'bumpMap'
  | 'normalMap'
  | 'displacementMap'
  | 'roughnessMap'
  | 'metalnessMap'
  | 'alphaMap'
  | 'envMap'
  | 'aoMap'
  | 'gradientMap'
  | 'specularMap'
  | 'specularColorMap'
  | 'specularIntensityMap'
  | 'clearcoatMap'
  | 'clearcoat';

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
export type MapDst = 'lightmap' | 'exr2sdr'; // exr2sdr = exr * 0.2한 이미지를 만든 후 렌더 시 * 5를 해서 렌더링
export type ModelSource = {
  name: string;
  file: File;
  map?: File;
  mapDst?: MapDst;
};
export const sourceAtom = atom<ModelSource[]>([]);
export const catalogueAtom = atom<Catalogue>({});
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
export const orbitControlAtom = atom<OrbitControls>();

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

export const minimapAtom = atom<{
  show: boolean;
  urls: string[];
  useIndex: number;
}>({
  show: false,
  urls: [
    'https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/images/miniMap',
    'https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/images/miniMap_expanded',
  ],
  useIndex: 0,
});

// export const envAtom = atom<Env>({ select: "none" });
export const envAtom = atom<Env>({
  select: 'none',
  rotation: { x: 0, y: 0, z: 0 },
});
export const cameraMatrixAtom = atom<THREE.Matrix4>();
export const cameraModeAtom = atom<'perspective' | 'iso'>('perspective');
export const ktxTexturePreviewCachedAtom = atom<{
  [key: string]: string;
}>({});

export const selectedAtom = atom<string[]>([]);
export const animationDurationAtom = atom<number>(1.5);
export const forceUpdateAtom = atom<number>(0);
export const setForceUpdate = () => {
  const setForceUpdateAtom = useSetAtom(forceUpdateAtom);
  setForceUpdateAtom(prev => prev + 1);
};
export const useForceUpdate = () => {
  const value = useAtomValue(forceUpdateAtom);
};

export const materialSelectedAtom = atom<THREE.Material | null>(null);

export const modalAtom = atom<
  React.FC<{ closeModal?: () => any }> | React.ReactNode | null
>(null);

export const onModalCloseAtom = atom<() => void>();

export const ToastAtom = atom<{ on: boolean; message: string }>({
  on: false,
  message: '',
});

export const useToast = () => {
  const [toast, setToast] = useAtom(ToastAtom);

  return {
    openToast: (
      message: string,
      {
        duration,
        autoClose,
        override,
      }: { duration?: number; autoClose?: boolean; override?: boolean } = {
        duration: 1,
        autoClose: true,
        override: false,
      },
    ) => {
      if (toast.on && !override) {
        console.warn('Toast is Progressing, abort');
        return false;
      }
      const time = duration || 1;
      setToast({ on: true, message });

      if (autoClose) {
        setTimeout(() => {
          setToast(pre => ({ ...pre, on: false }));
        }, time * 1000);
      }

      return true;
    },
    closeToast: () => {
      setToast(pre => ({ ...pre, on: false }));
    },
  };
};

export const useModal = () => {
  const setModal = useSetAtom(modalAtom);
  const setOnModalClose = useSetAtom(onModalCloseAtom);
  return {
    // ()=>Element instead of Element
    // openModal: (modal: React.ReactElement<{ closeModal?: () => any }>) => setModal(modal),
    openModal: (
      modal: React.FC<{ closeModal?: () => any }> | React.ReactNode,
      onModalClose?: () => void,
    ) => {
      setModal(modal);
      if (onModalClose) setOnModalClose(onModalClose);
    },
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

export const globalGlAtom = atom<GLProps>({
  antialias: true,
  alpha: true,
  premultipliedAlpha: true,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  depth: true,
  failIfMajorPerformanceCaveat: false,
  toneMappingExposure: 1,
  localClippingEnabled: false,
});

// REFLECTION PROBES
export const ProbeAtom = atom<ReflectionProbe[]>([]);
export const treeScrollToAtom = atom<string | null>(null);
export const lightMapContrastAtom = atom<{ use: boolean; value: number }>({
  use: false,
  value: 1,
});

export const Tabs = [
  'scene',
  'tree',
  'probe',
  'room',
  'tour',
  'hotspot',
  'option',
  'wall',
  'skyBox',
  'iso',
] as const;
export type Tab = (typeof Tabs)[number];
export const panelTabAtom = atom<Tab>('scene');

export const treeSearchAtom = atom<string | undefined>();

export const modelOptionClassAtom = atom<ModelOption[]>([]);
export const optionSelectedAtom = atom<{ [key: string]: string }>({});
export const optionProcessingAtom = atom<boolean>(false);

//카메라 정보값
export const lastCameraInfoAtom = atom<{
  matrix: number[];
}>({
  matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
});

export const cameraSettingAtom = atom<{
  moveSpeed: number;
  isoView: boolean;
  cameraY: number;
}>({
  moveSpeed: 3,
  isoView: false,
  cameraY: 1.5,
});

export const cameraActionAtom = atom<{
  tour: {
    isAnimation: boolean;
    roomIndex: number;
    animationSpeed: number;
  };
}>({
  tour: {
    isAnimation: false,
    roomIndex: 0,
    animationSpeed: 1,
  },
});

//orbit세팅
export const orbitSettingAtom = atom<{
  autoRotate: boolean;
  enabled: boolean;
  tempEnabled?: boolean;
}>({
  autoRotate: false,
  enabled: true,
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

// OptionBuilder를 이용해 추가한 atom들이 여기에 자동으로 등록
// * PostProcess.tsx에서 이들을 이용해 이펙트 리렌더링
// * useSettings에서 활용하여 세팅 저장/로드
export const postprocessAtoms = atom<{ [key in string]: PrimitiveAtom<any> }>(
  {},
);

export const forceRerenderPostProcessAtom = atom<number>(0);
export const forceRerenderPostProcess = () => {
  setAtomValue(forceRerenderPostProcessAtom, prev => prev + 1);
};

export const ModelSelectorAtom = atom<THREE.Object3D[]>([]);
export const DPAtom = atom<{ objects: THREE.Object3D[]; on: boolean }>({
  objects: [],
  on: false,
});

export const DPCModeAtom = atom<DPConfiguratorMode>('file');

export type Room = {
  index: number;
  name: string;
  tourMatrix: number[];
  border: [number, number][]; // [x, z]
};
export type RoomCreateOption = Room & {
  show?: boolean;
  creating?: boolean; // 생성중이면 좌표값의 배열
  color?: number;
};

export type newRoom = {
  show?: boolean;
  tourMatrix: number[];
  border: [number, number][]; // [x, z]
  index: string;
  creating?: boolean;
  visible: boolean;
  inCludeMesh: string[];
};

export type newRoomCreateOption = {
  color?: number;
  index: number;
  name: string;
  visible: boolean;
  roomInfo: newRoom[];
};
export const roomAtom = atom<RoomCreateOption[]>([]);
export const newRoomAtom = atom<newRoomCreateOption[]>([]);

export const [wallOptionAtom, getWallOptionAtom, setWallOptionAtom] =
  createAtomCombo<WallCreateOption>({
    points: [],
    walls: [],
    autoCreateWall: true,
  });

export const [wallCacheAtom, getWallCacheAtom, setWallCacheAtom] =
  createAtomCombo<{ [key: string]: Walls }>({});

export const [wallHighlightAtom, getWallHighlightAtom, setWallHighlightAtom] =
  createAtomCombo<{
    pointHighlights: string[];
    wallHighlights: string[];
  }>({
    pointHighlights: [],
    wallHighlights: [],
  });

// export const [wallAtom, getWallAtom, setWallAtom] = createAtomCombo<Walls>();

export const insideRoomAtom = atom<Room[]>([]);

export type Hotspot = {
  index: number;
  name: string;
  rooms: number[]; // 방에 들어갔을 때 표시, 방 인덱스
  target?: [number, number, number]; // x, y, z
  cameraMatrix?: Matrix4Array; // 16자리 매트릭스
  isoView: boolean;
  content: {
    title: string;
    header: string; // 모델
    headerDetail: string; // 품번
    footer: string[]; // array갯수만큼 그리드로 나눔
    image: string; // url
    price: string;
  };
};
export type HotspotCreateOption = Hotspot & {
  targetSetting?: boolean;
};
export const hotspotAtom = atom<HotspotCreateOption[]>([]);

export type tourInfoType = {
  name: string;
  matrix: number[];
};

export const tourAtom = atom<tourInfoType[]>([]);

export const uploadingAtom = atom<boolean>(false);

export type Settings = {
  hotspotSize: number;
  shotHotspots: boolean;
  detectHotspotRoom: boolean;
};
export const settingsAtom = atom<Settings>({
  hotspotSize: 0.12,
  shotHotspots: true,
  detectHotspotRoom: true,
});

export const materialSettingAtom = atom<{
  lightMapIntensity: number;
  aoMapIntensity: number;
  lightMapContrast: number;
}>({
  lightMapIntensity: 1,
  aoMapIntensity: 0,
  lightMapContrast: 1.25,
});

export const pathfindingAtom = atom<{
  pathfinding: Pathfinding;
  points: [number, number][]; // [x,z]
  geometry: THREE.BufferGeometry | THREE.ShapeGeometry;
}>();

export const moveToPointAtom = atom<{
  point?: THREE.Vector3;
  setting?: boolean;
}>();

export const lightMapAtom = atom<{
  [key: string]: {
    texture: THREE.Texture;
    image?: Blob;
  };
}>({});

export const testAtom = atom<{ useSkyBox: boolean; showSelectBox: boolean }>({
  useSkyBox: false,
  showSelectBox: true,
});

export const highlightBurnAtom = atom<{ use: boolean; value: number }>({
  use: true,
  value: 0.6,
});

export const BrightnessContrastAtom = atom<{
  use: boolean;
  brightnessValue: number;
  contrastValue: number;
}>({
  use: false,
  brightnessValue: 1.91,
  contrastValue: 1.14,
});

export const sharpenAtom = atom<{
  strength: number;
  opacity: number;
  isSharpen: boolean;
  isRatio: boolean;
  aliasing: number;
}>({
  strength: 0.25,
  opacity: 1.0,
  isSharpen: true,
  isRatio: true,
  aliasing: 8,
});

export const whiteBalanceAtom = atom<{
  use: boolean;
  uWhiteBalance: number;
}>({
  use: false,
  uWhiteBalance: 6500,
});

export const saturationAtom = atom<{
  use: boolean;
  uSaturation: number;
}>({
  use: false,
  uSaturation: 0.3,
});

export const skyBoxAtom = atom<SkyBoxState>({
  isSkyBox: false,
  type: 'mesh',
  flipY: false,
  visible: true,
  scene: {
    intensity: 1,
    rotation: { x: 0, y: 0, z: 0 },
  },
  mesh: {
    intensity: 1,
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
});

export type DrawablePoint = {
  point: THREE.Matrix4 | THREE.Vector3 | { x: number; z: number };
} & { color?: string | number; id?: string };
export const pointsAtom = atom<DrawablePoint[]>([]);

export const addPoints = (...points: DrawablePoint[]) => {
  setAtomValue(pointsAtom, prev => {
    // unique to id;
    const uniquePrev = prev.filter(p => !points.some(p2 => p2.id === p.id));
    return [...uniquePrev, ...points];
  });
};

export const anisotropyAtom = atom<number>(1);

export const IsoViewInfoAtom = atom<{
  cameraMatrix: number[];
  clippingValue: number;
  beforeClippingValue: number;
  boundingBox: {
    center: number[];
    size: number[];
  };
}>({
  cameraMatrix: [],
  clippingValue: 2.1,
  beforeClippingValue: 10,
  boundingBox: {
    center: [0, 0, 0],
    size: [0, 0, 0],
  },
});
