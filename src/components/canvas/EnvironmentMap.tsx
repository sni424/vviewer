import { Environment } from '@react-three/drei';
import { __UNDEFINED__ } from '../../Constants';
import { useAtomValue } from 'jotai';
import { envAtom } from '../../scripts/atoms';
import { THREE } from '../../scripts/VTHREE';

function MyEnvironment() {
  const env = useAtomValue(envAtom);
  if (env.select === 'none') {
    return null;
  }

  const intensity = env.intensity ?? 1;

  const x = env.rotation?.x ?? 0;
  const y = env.rotation?.y ?? 0;
  const z = env.rotation?.z ?? 0;

  const rotation = new THREE.Euler(x, y, z);

  if (env.select === 'preset') {
    return (
      <Environment
        preset={env.preset ?? 'apartment'}
        environmentIntensity={intensity}
        environmentRotation={rotation}
      />
    );
  }

  if (env.select === 'custom' || env.select === 'url') {
    if (!env.url || env.url === __UNDEFINED__) {
      return null;
    }
    return (
      <Environment
        files={env.url}
        environmentIntensity={intensity}
        environmentRotation={rotation}
      />
    );
  }
}

export default MyEnvironment;
