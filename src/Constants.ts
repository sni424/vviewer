import { ToneMappingMode } from 'postprocessing';
import { View } from './types';

export const EnvirontmentPresets = [
  'apartment',
  'city',
  'dawn',
  'forest',
  'lobby',
  'night',
  'park',
  'studio',
  'sunset',
  'warehouse',
] as const;
export type EnvirontmentPresets = (typeof EnvirontmentPresets)[number];

export const __UNDEFINED__ = '__UNDEFINED__' as const;

export const DEFAULT_COLOR_TEMPERATURE = 6500;

export const DEFAULT_TONEMAPPING_VALUES: {
  resolution: number;
  middleGrey: number;
  maxLuminance: number;
  averageLuminance: number;
  adaptationRate: number;
  mode: ToneMappingMode;
  opacity: number;
} = {
  resolution: 512,
  middleGrey: 0.6,
  maxLuminance: 16,
  averageLuminance: 1,
  adaptationRate: 1,
  mode: ToneMappingMode.NEUTRAL,
  opacity: 1,
};

export enum Layer {
  Model = 1,
  GizmoHelper = 11,
  Selected = 12,
  ReflectionBox = 13,
  Room = 14,
  Hotspot = 15,
  Wall = 16,
}

export const AOMAP_INTENSITY_MAX = 2 as const;
export const LIGHTMAP_INTENSITY_MAX = 20 as const;

export const ROOM_COLORS = [
  0xcc0033, 0x33cc00, 0x3333cc, 0x773300, 0x00ccf3, 0x8844aa, 0xaa8844,
  0xaa4444, 0x44aa44, 0x3399aa, 0x0033aa,
];

export const roomColor = (index: number) => {
  return ROOM_COLORS[index % ROOM_COLORS.length];
};

export const roomColorString = (index: number) => {
  return '#' + roomColor(index).toString(16).padStart(6, '0');
};

const base: string = import.meta.env.VITE_MODELS_CLOUDFRONT_URL as string;
const s3Base: string = import.meta.env.VITE_MODELS_URL as string;
export const ENV = {
  base,
  s3Base,
  latest: base + 'latest.glb',
  latestMobile: base + 'mobile/latest_mobile.glb',
  latestHash: s3Base + 'latest-hash',
  fileList: s3Base + 'uploads.json',
  baseHash: s3Base + 'base-hash',
  dpHash: s3Base + 'dp-hash',
  model_base: base + 'model_base.glb',
  model_dp: base + 'model_dp.glb',
  lut: base.replace('models/', '') + 'static/lut',
  navMesh: base + 'nav.glb',
};

export const HotspotIcon = {
  gearBlue: base + 'Frame+26893.png',
  gearBlack: base + 'Frame+26997.png',
  plusBlue: base + 'Frame+26998.png',
  circleGray: base + 'Frame+162727.png',
};

export const hotspotImage = (image?: string) => {
  if (image === undefined || image?.length === 0) {
    return undefined;
  }

  // 사용 전에 이미지를 S3에 업로드할 것
  return `${base}${image}.png`;
};
export const hotspotImages = {
  ac: hotspotImage('ac')!,
  cooktop: hotspotImage('cooktop')!,
  dishwasher: hotspotImage('dishwasher')!,
  fridge: hotspotImage('fridge')!,
  laundary: hotspotImage('laundary')!,
  oven: hotspotImage('oven')!,
  ventilator: hotspotImage('ventilator')!,
};

export const CameraDistance = 300 as const;
export const DefaultCameraPositions: {
  [key in View]: {
    position: [number, number, number];
    zoom: number;
    up: [number, number, number];
  };
} = {
  [View.Shared]: {
    position: [CameraDistance, CameraDistance, CameraDistance],
    zoom: 10,
    up: [0, 1, 0],
  },
  [View.Main]: {
    position: [CameraDistance, CameraDistance, CameraDistance],
    zoom: 10,
    up: [0, 1, 0],
  },
  [View.Top]: {
    position: [0, CameraDistance, 0],
    zoom: 10,
    up: [0, 0, -1],
  },

  [View.Front]: {
    position: [0, 0, CameraDistance],
    zoom: 10,
    up: [0, 1, 0],
  },

  [View.Right]: {
    position: [CameraDistance, 0, 0],
    zoom: 10,
    up: [0, 1, 0],
  },

  [View.Left]: {
    position: [-CameraDistance, 0, 0],
    zoom: 10,
    up: [0, 1, 0],
  },

  [View.Back]: {
    position: [0, 0, -CameraDistance],
    zoom: 10,
    up: [0, 1, 0],
  },

  [View.Bottom]: {
    position: [0, -CameraDistance, 0],
    zoom: 10,
    up: [0, 0, 1],
  },
} as const;


export const ViewName: { [key in View]: string } = {
  [View.Shared]: 'Shared',
  [View.Main]: 'Main',
  [View.Top]: 'Top',
  [View.Front]: 'Front',
  [View.Right]: 'Right',
  [View.Back]: 'Back',
  [View.Left]: 'Left',
  [View.Bottom]: 'Bottom',
} as const;