import { useAtomValue } from 'jotai';
import { modelOptionClassAtom, optionSelectedAtom } from '../atoms.ts';

const useOptionManager = () => {
  const options = useAtomValue(modelOptionClassAtom);
  const selectedOptions = useAtomValue(optionSelectedAtom);
}

export default useOptionManager;