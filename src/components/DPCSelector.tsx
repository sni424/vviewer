import { useAtom } from 'jotai/index';
import { DPCModeAtom } from '../scripts/atoms.ts';
import { DPConfiguratorMode } from './DPConfigurator.tsx';

const DPCSelector = () => {
  const [mode, setMode] = useAtom<DPConfiguratorMode>(DPCModeAtom);
  return (
    <div
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <p style={{ textAlign: 'center', fontSize: 16 }}>
        DP 업로드 모드를 선택하세요.
      </p>
      <div
        style={{
          display: 'flex',
          marginTop: 24,
          justifyContent: 'space-around',
        }}
      >
        <button
          style={{ fontSize: 16, padding: 64 }}
          onClick={() => {
            setMode('tree');
          }}
        >
          장면 트리에서 업로드
        </button>
        <button
          style={{ fontSize: 16, padding: 80 }}
          onClick={() => {
            setMode('file');
          }}
        >
          파일로 업로드
        </button>
      </div>
    </div>
  );
};

export default DPCSelector;
