import {
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  ToneMapping,
} from '@react-three/postprocessing';
import { useAtomValue } from 'jotai';
import { BlendFunction, BlendMode } from 'postprocessing';
import { useEffect, useRef } from 'react';
import {
  globalBrightnessContrastAtom,
  globalColorManagementAtom,
  globalHueSaturationAtom,
  globalSaturationCheckAtom,
  globalToneMappingAtom,
} from '../../scripts/atoms';
import GlobalSaturationCheck from './GlobalSaturationCheck';

const BrightnessContrastEffect = () => {
  const { on, brightnessValue, contrastValue } = useAtomValue(
    globalBrightnessContrastAtom,
  );

  if (!on) {
    return null;
  }

  return (
    <BrightnessContrast brightness={brightnessValue} contrast={contrastValue} />
  );
};

const GlobalToneMappingEffect = () => {
  const {
    on,
    resolution,
    middleGrey,
    maxLuminance,
    averageLuminance,
    adaptationRate,
    mode,
    opacity,
  } = useAtomValue(globalToneMappingAtom);
  const blendMode = useRef(new BlendMode(BlendFunction.NORMAL, 1));

  useEffect(() => {
    if (on) {
      // blendMode.current.blendFunction = BlendFunction.ADD;
      blendMode.current.setOpacity(opacity);
    }
  }, [on, opacity]);

  if (!on) {
    return null;
  }

  return (
    <ToneMapping
      adaptive={true}
      resolution={resolution}
      middleGrey={middleGrey}
      maxLuminance={maxLuminance}
      averageLuminance={averageLuminance}
      adaptationRate={adaptationRate}
      mode={mode}
      blendMode={blendMode.current}
    />
  );
};

const GlobalHueSaturationEffect = () => {
  const { on, hue, saturation } = useAtomValue(globalHueSaturationAtom);

  // folder.addBinding(effect, "hue", { min: 0, max: 2 * Math.PI, step: 1e-3 });
  // folder.addBinding(effect, "saturation", { min: -1, max: 1, step: 1e-3 });

  if (!on) {
    return null;
  }

  return (
    <HueSaturation
      blendFunction={BlendFunction.NORMAL}
      hue={hue}
      saturation={saturation}
    />
  );
};

function PostProcess() {
  // 각 컴포넌트 안에서 값만 바뀐다고 리렌더링되지 않음, 그냥 각 값이 바뀔 때 EffectComposer을 강제 리렌더링
  const _gbc = useAtomValue(globalBrightnessContrastAtom);
  const _gSat = useAtomValue(globalSaturationCheckAtom);
  const _gcm = useAtomValue(globalColorManagementAtom);
  const _gtm = useAtomValue(globalToneMappingAtom);
  const _gsh = useAtomValue(globalHueSaturationAtom);
  // console.log(_gcm.value)

  return (
    <EffectComposer>
      <BrightnessContrastEffect></BrightnessContrastEffect>
      {/* <GlobalColorManagement></GlobalColorManagement> */}
      <GlobalToneMappingEffect></GlobalToneMappingEffect>
      <GlobalHueSaturationEffect></GlobalHueSaturationEffect>
      <GlobalSaturationCheck></GlobalSaturationCheck>
    </EffectComposer>
  );
}

export default PostProcess;
