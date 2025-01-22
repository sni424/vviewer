import { ToneMapping as ToneMappingEffect } from '@react-three/postprocessing';
import { useSetAtom } from 'jotai';
import { BlendFunction, BlendMode, ToneMappingMode } from 'postprocessing';
import { useEffect, useMemo } from 'react';
import { globalGlAtom } from '../../scripts/atoms';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const defaultToneMappingOption: { [key in string]: OptionTransformer } = {
  mode: {
    label: '모드',
    type: 'dropdown',
    parse: 'integer',
    value: ToneMappingMode.AGX,
    values: [
      {
        label: '리니어',
        value: ToneMappingMode.LINEAR,
      },
      {
        label: '라인하르트',
        value: ToneMappingMode.REINHARD,
      },
      {
        label: '라인하르트2',
        value: ToneMappingMode.REINHARD2,
      },
      {
        label: '라인하르트2 Adaptive',
        value: ToneMappingMode.REINHARD2_ADAPTIVE,
      },
      {
        label: '언차티드2',
        value: ToneMappingMode.UNCHARTED2,
      },
      {
        label: '씨네온 (OPTIMIZED)',
        value: ToneMappingMode.OPTIMIZED_CINEON,
      },
      {
        label: '씨네온',
        value: ToneMappingMode.CINEON,
      },
      {
        label: 'ACES Filmic',
        value: ToneMappingMode.ACES_FILMIC,
      },
      {
        label: 'AGX',
        value: ToneMappingMode.AGX,
      },
      {
        label: '뉴트럴',
        value: ToneMappingMode.NEUTRAL,
      },
    ],
  },
  exposure: {
    type: 'number',
    value: 1,
    label: '노출',
    min: 0.1,
    max: 6.0,
    step: 0.01,
  },
  opacity: {
    type: 'number',
    value: 1,
    label: '적용',
    min: 0,
    max: 1,
    step: 0.01,
  },

  // resolution: {
  //   label: '해상도',
  //   type: 'dropdown',
  //   parse: 'integer',
  //   value: 1024,
  //   values: [
  //     {
  //       label: '4',
  //       value: 4,
  //     },
  //     {
  //       label: '8',
  //       value: 8,
  //     },
  //     {
  //       label: '16',
  //       value: 16,
  //     },
  //     {
  //       label: '64',
  //       value: 64,
  //     },
  //     {
  //       label: '128',
  //       value: 128,
  //     },
  //     {
  //       label: '256',
  //       value: 256,
  //     },
  //     {
  //       label: '512',
  //       value: 512,
  //     },
  //     {
  //       label: '1024',
  //       value: 1024,
  //     },
  //   ],
  // },

  // maxLuminance: {
  //   type: 'number',
  //   value: 1,
  //   label: '최대밝기',
  //   min: 0,
  //   max: 10,
  //   step: 0.1,
  // },
  // averageLuminance: {
  //   type: 'number',
  //   value: 1,
  //   label: '평균밝기',
  //   min: 0,
  //   max: 10,
  //   step: 0.1,
  // },
} as const;

const ToneMappingComponent = ({
  exposure,
  opacity,
  mode,
}: {
  mode: ToneMappingMode;
  exposure: number;
  opacity: number;
}) => {
  const setGl = useSetAtom(globalGlAtom);

  const blendMode = useMemo(() => {
    return new BlendMode(BlendFunction.NORMAL, opacity);
  }, [opacity]);

  useEffect(() => {
    setGl(prev => ({
      ...prev,
      toneMappingExposure: exposure,
    }));
  }, [exposure]);

  return (
    <ToneMappingEffect
      adaptive={true}
      mode={mode}
      blendMode={blendMode}
    ></ToneMappingEffect>
  );
};

export const {
  Component: ToneMapping,
  Controller: ToneMappingOption,
  atom: globalToneMappingAtom,
} = OptionBuilder(
  '톤매핑',
  //@ts-ignore
  <ToneMappingComponent></ToneMappingComponent>,
  defaultToneMappingOption,
);
