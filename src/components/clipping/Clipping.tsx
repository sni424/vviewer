import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { globalGlAtom, threeExportsAtom } from '../../scripts/atoms';
import { THREE } from '../../scripts/vthree/VTHREE';

const Clipping = () => {
  const [glSetting, setGlSetting] = useAtom(globalGlAtom);
  const threeExports = useAtomValue(threeExportsAtom);

  const [clippingY, setClippingY] = useState(3);

  const globalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 5);
  if (!threeExports) {
    return null;
  }

  const { gl } = threeExports;
  useEffect(() => {
    if (gl) {
      if (!glSetting.localClippingEnabled) {
        gl.clippingPlanes = [];
      } else {
        globalPlane.constant = clippingY;
        gl.clippingPlanes = [globalPlane];
      }
    }
  }, [clippingY, glSetting.localClippingEnabled]);
  return (
    <div>
      <div>
        <strong>Clipping</strong>
        <input
          type="checkbox"
          checked={glSetting.localClippingEnabled}
          onChange={e => {
            setGlSetting(pre => ({
              ...pre,
              localClippingEnabled: !pre.localClippingEnabled,
            }));
          }}
        />
      </div>
      {glSetting.localClippingEnabled && (
        <div>
          <input
            className="flex-1 min-w-0"
            type="range"
            value={clippingY}
            onChange={e => {
              setClippingY(Number(e.target.value));
            }}
            min={-1}
            max={10}
            step={0.1}
          />
          <input
            type="number"
            value={clippingY}
            onChange={e => {
              setClippingY(Number(e.target.value));
            }}
            min={-1}
            max={10}
            step={0.1}
          />
        </div>
      )}
    </div>
  );
};

export default Clipping;
