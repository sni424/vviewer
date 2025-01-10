import { useAtom } from 'jotai';
import { DPCModeAtom } from '../../scripts/atoms.ts';
import DPCFileImporter from './DPCFileImporter.tsx';
import DPCModelSelector from './DPCModelSelector.tsx';
import DPCSelector from './DPCSelector.tsx';

export type DPConfiguratorMode = 'select' | 'tree' | 'file';

const DPConfigurator = () => {
  const [mode, setMode] = useAtom<DPConfiguratorMode>(DPCModeAtom);

  const renderContent = {
    select: <DPCSelector />,
    tree: <DPCModelSelector />,
    file: <DPCFileImporter />,
  };

  return <>{renderContent[mode]}</>;
};

export default DPConfigurator;
