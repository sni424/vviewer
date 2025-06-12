import { useAtom } from 'jotai/index';
import { orbitSettingAtom } from 'src/scripts/atoms.ts';

const MaxPageBelowController = () => {
  const [isOrbit, setOrbit] = useAtom(orbitSettingAtom);
  return (
    <div
      className="absolute bg-transparent left-[50%] bottom-[16px] flex items-center gap-x-1"
      style={{ transform: 'translate(-50%, 0)' }}
    >
      <button className="p-1 rounded-none text-[12px]" onClick={() => {
        setOrbit(pre => ({...pre, enabled : !pre.enabled}))
      }}>{isOrbit.enabled ? 'Orbit Mode' : 'Moving Mode'}</button>
    </div>
  );
};

export default MaxPageBelowController;
