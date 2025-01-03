import { ToneMappingMode } from 'postprocessing';
import { ToneMappingResolutions } from './scripts/atoms.ts';

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
  resolution: ToneMappingResolutions;
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
}

export const AOMAP_INTENSITY_MAX = 2 as const;
export const LIGHTMAP_INTENSITY_MAX = 100 as const;

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

const base: string = import.meta.env.VITE_MODELS_URL as string;
export const ENV = {
  latest: base + 'latest.glb',
  latestHash: base + 'latest-hash',
  fileList: base + 'uploads.json',
  baseHash: base + 'base-hash',
  dpHash: base + 'dp-hash',
  model_base: base + 'model_base.glb',
  model_dp: base + 'model_dp.glb',
  lut: base.replace('models/', '') + 'static/lut',
};
