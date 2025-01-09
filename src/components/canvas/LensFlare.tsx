import { LensFlare as LensFlareEffect } from '@react-three/postprocessing';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const defaultBCOption: { [key in string]: OptionTransformer } = {
  flareSize: {
    label: '플레어 크기',
    type: 'number',
    value: 0.01,
    min: 0,
    max: 1.0,
    step: 0.001,
  },
  glareSize: {
    label: '글레어 크기',
    type: 'number',
    value: 0.2,
    min: 0,
    max: 2.0,
    step: 0.005,
  },
} as const;

export const {
  Component: LensFlare,
  Controller: LensFlareOption,
  atom: globalLensFlareAtom,
} = OptionBuilder('렌즈플레어', <LensFlareEffect />, defaultBCOption);
