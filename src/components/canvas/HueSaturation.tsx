import { HueSaturation as HueSaturationEffect } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const defaultHueSaturationOption: { [key in string]: OptionTransformer } = {
  hue: {
    label: 'Hue',
    type: 'number',
    value: 0,
    min: -1,
    max: 1,
    step: 0.01,
  },
  saturation: {
    label: 'Saturation',
    type: 'number',
    value: 0,
    min: -1,
    max: 1,
    step: 0.01,
  },
} as const;

export const {
  Component: HueSaturation,
  Controller: HueSaturationOption,
  atom: globalHueSaturationAtom,
} = OptionBuilder(
  'Hue/Saturation',
  <HueSaturationEffect blendFunction={BlendFunction.SRC} />,
  defaultHueSaturationOption,
);
