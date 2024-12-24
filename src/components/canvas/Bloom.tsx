import { Bloom as BloomEffect } from '@react-three/postprocessing';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const defaultBloomOption: { [key in string]: OptionTransformer } = {
  intensity: {
    label: '강도',
    type: 'number',
    value: 1,
    min: 0,
    max: 2,
    step: 0.01,
  },
  luminanceThreshold: {
    label: '임계값',
    type: 'number',
    value: 0.85,
    min: 0,
    max: 1,
    step: 0.01,
  },
  luminanceSmoothing: {
    label: '스무딩',
    type: 'number',
    value: 0.025,
    min: 0,
    max: 1,
    step: 0.01,
  },
} as const;

export const {
  Component: Bloom,
  Controller: BloomOption,
  atom: globalBloomAtom,
} = OptionBuilder('Bloom', <BloomEffect />, defaultBloomOption);
