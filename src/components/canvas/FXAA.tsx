import { FXAA as FXAAEffect } from '@react-three/postprocessing';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const defaultOption: { [key in string]: OptionTransformer } = {} as const;

export const {
  Component: FXAA,
  Controller: FXAAOption,
  atom: globalFXAAAtom,
} = OptionBuilder('FXAA', <FXAAEffect />, defaultOption);
