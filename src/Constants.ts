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
}

export const AOMAP_INTENSITY_MAX = 2 as const;
export const LIGHTMAP_INTENSITY_MAX = 100 as const;