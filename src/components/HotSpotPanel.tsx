import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { cameraSettingAtom, threeExportsAtom } from '../scripts/atoms';

function HotSpotPanel() {
  const threeExports = useAtomValue(threeExportsAtom);
  const setCameraSetting = useSetAtom(cameraSettingAtom);
  useEffect(() => {
    if (!threeExports) {
      return;
    }
    setCameraSetting(prev => ({ ...prev, isoView: true }));
    const { camera } = threeExports;
    // topview
    camera.position.set(0, 10, 0);
    camera.rotation.set(-Math.PI / 2, 0, 0);
  }, []);

  return <div>HotSpotPanel</div>;
}

export default HotSpotPanel;
