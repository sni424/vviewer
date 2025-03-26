import { LUT } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useEffect, useState } from 'react';
import { forceRerenderPostProcess } from '../../scripts/atoms';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';
import {
  getLUTTexture,
  LUTPresets,
} from '../../scripts/postprocess/PostProcessUtils';
import { THREE } from '../../scripts/vthree/VTHREE';

const defaultColorLUTOption: { [key in string]: OptionTransformer } = {
  preset: {
    label: '프리셋',
    type: 'dropdown',
    value: 'neutral-2',
    values: LUTPresets.map(preset => ({
      label: preset,
      value: preset,
    })),
  },
  useTetrahedralFilter: {
    label: 'Tetrahedral Filter',
    type: 'onoff',
    value: false,
  },
} as const;

const ColorLUTEffect = ({
  preset,
  useTetrahedralFilter,
}: {
  preset: LUTPresets;
  useTetrahedralFilter: boolean;
}) => {
  // const [{ on, preset, texture, useTetrahedralFilter }, setLut] =
  //   useAtom(globalLUTAtom);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    console.log('presetChanged : ', preset);
    async function updateTexture() {
      getLUTTexture(preset).then(texture => {
        setTexture(texture);
        forceRerenderPostProcess();
      });
    }
    updateTexture();
  }, [preset]);

  if (!texture) {
    return null;
  }

  return (
    <LUT
      lut={texture}
      tetrahedralInterpolation={useTetrahedralFilter}
      blendFunction={BlendFunction.SRC}
    />
  );
};

export const {
  Component: ColorLUT,
  Controller: ColorLUTOption,
  // @ts-ignore
} = OptionBuilder('색상 LUT', <ColorLUTEffect />, defaultColorLUTOption);
