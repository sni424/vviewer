import { SMAA as SMAAEffect } from '@react-three/postprocessing';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const defaultOption: { [key in string]: OptionTransformer } = {} as const;

export const {
  Component: SMAA,
  Controller: SMAAOption,
  atom: globalSMAAAtom,
} = OptionBuilder('SMAA', <SMAAEffect />, defaultOption);
