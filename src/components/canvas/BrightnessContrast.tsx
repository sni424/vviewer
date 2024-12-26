import { BrightnessContrast as BrightnessContrastEffect } from '@react-three/postprocessing';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const defaultBCOption: { [key in string]: OptionTransformer } = {
  brightness: {
    label: '밝기',
    type: 'number',
    value: 0.0,
    min: -1,
    max: 1,
  },
  contrast: {
    label: '대비',
    type: 'number',
    value: 0.0,
    min: -1,
    max: 1,
    step: 0.01,
  },
} as const;

export const {
  Component: BrightnessContrast,
  Controller: BrightnessContrastOption,
  atom: globalBrightnessContrastAtom,
} = OptionBuilder('밝기/대비', <BrightnessContrastEffect />, defaultBCOption);
