import { EffectComposer } from '@react-three/postprocessing';
import { useAtomValue } from 'jotai';
import { Bloom, globalBloomAtom } from './Bloom.tsx';
import {
  BrightnessContrast,
  globalBrightnessContrastAtom,
} from './BrightnessContrast.tsx';
import { ColorLUT, globalColorLUTAtom } from './ColorLUT.tsx';
import {
  ColorTemperature,
  globalColorTemperatureAtom,
} from './ColorTemperature.tsx';
import { globalHueSaturationAtom, HueSaturation } from './HueSaturation.tsx';
import { globalToneMappingAtom, ToneMapping } from './ToneMapping.tsx';

function PostProcess() {
  // 각 컴포넌트 안에서 값만 바뀐다고 리렌더링되지 않음, 그냥 각 값이 바뀔 때 EffectComposer을 강제 리렌더링
  const _gbc = useAtomValue(globalBrightnessContrastAtom);
  const _bloom = useAtomValue(globalBloomAtom);
  const _gtm = useAtomValue(globalToneMappingAtom);
  const _ghs = useAtomValue(globalHueSaturationAtom);
  const _gct = useAtomValue(globalColorTemperatureAtom);
  const _glut = useAtomValue(globalColorLUTAtom);

  return (
    <EffectComposer>
      <HueSaturation></HueSaturation>
      <ColorTemperature></ColorTemperature>
      <BrightnessContrast></BrightnessContrast>
      <Bloom></Bloom>
      <ColorLUT></ColorLUT>
      <ToneMapping></ToneMapping>
    </EffectComposer>
  );
}

export default PostProcess;
