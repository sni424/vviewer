import { EffectComposer } from '@react-three/postprocessing';
import { useAtomValue, WritableAtom } from 'jotai';
import {
  forceRerenderPostProcessAtom,
  postprocessAtoms,
  sharpenAtom,
} from '../../scripts/atoms.ts';
import { Bloom } from './Bloom.tsx';
import { BrightnessContrast } from './BrightnessContrast.tsx';
import { ColorLUT } from './ColorLUT.tsx';
import { ColorTemperature } from './ColorTemperature.tsx';
import { FXAA } from './FXAA.tsx';
import { HueSaturation } from './HueSaturation.tsx';
import { SMAA } from './SMAA.tsx';
import { ToneMapping } from './ToneMapping.tsx';
import Sharpen from 'src/components/canvas/Sharpen.tsx';

// postprocessAtom : { key1:atom, key2:atom2 } 형태
// 하위 아톰의 변경 감지 후 리렌더링 촉발
const usePostprocessUpdate = () => {
  const forceUpdate = useAtomValue(forceRerenderPostProcessAtom);
  const postprocesses = useAtomValue(postprocessAtoms);
  const useInnerAtomUpdate = (atom: WritableAtom<any, any, any>) => {
    useAtomValue(atom);
  };
  Object.values(postprocesses).forEach(useInnerAtomUpdate);
};

function PostProcess() {
  // 각 컴포넌트 안에서 값만 바뀐다고 리렌더링되지 않음, 그냥 각 값이 바뀔 때 EffectComposer을 강제 리렌더링
  usePostprocessUpdate();
  const { use: useSharpen } = useAtomValue(sharpenAtom);

  return (
    <EffectComposer>
      <HueSaturation></HueSaturation>
      <ColorTemperature></ColorTemperature>
      <BrightnessContrast></BrightnessContrast>
      <Bloom></Bloom>
      <ColorLUT></ColorLUT>
      <ToneMapping></ToneMapping>
      <FXAA></FXAA>
      <SMAA></SMAA>
      {useSharpen ? <Sharpen /> : <></>}
    </EffectComposer>
  );
}

export default PostProcess;
