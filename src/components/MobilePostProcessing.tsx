import { EffectComposer } from '@react-three/postprocessing';
import { useAtomValue, WritableAtom } from 'jotai/index';
import {
  forceRerenderPostProcessAtom,
  postprocessAtoms,
} from '../scripts/atoms.ts';
import { Bloom } from './canvas/Bloom.tsx';
import { ToneMapping } from './canvas/ToneMapping.tsx';

const usePostprocessUpdate = () => {
  const forceUpdate = useAtomValue(forceRerenderPostProcessAtom);
  const postprocesses = useAtomValue(postprocessAtoms);
  const useInnerAtomUpdate = (atom: WritableAtom<any, any, any>) => {
    useAtomValue(atom);
  };
  Object.values(postprocesses).forEach(useInnerAtomUpdate);
};

const MobilePostProcessing = () => {
  return (
    <EffectComposer>
      <Bloom></Bloom>
      <ToneMapping></ToneMapping>
    </EffectComposer>
  );
};

export default MobilePostProcessing;
