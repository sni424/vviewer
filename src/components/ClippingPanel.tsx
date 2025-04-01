import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';

import { loadClipping, uploadJson } from '../scripts/atomUtils';

import { THREE } from 'VTHREE';
import { globalGlAtom, threeExportsAtom } from '../scripts/atoms';

const ClippingPanel = () => {
  const [glSetting, setGlSetting] = useAtom(globalGlAtom);
  const threeExports = useAtomValue(threeExportsAtom);

  const [clippingY, setClippingY] = useState(3);

  const [clippingObject, setClippingObject] = useState<string>('');

  const globalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 5);
  if (!threeExports) {
    return null;
  }

  const uploadClipping = async () => {
    const parsed = JSON.parse(clippingObject);

    uploadJson('clipping.json', parsed)
      .then(res => res.json())
      .then(res => {
        if (res?.success === true) {
          alert('업로드 완료');
        } else {
          throw res;
        }
      })
      .catch(err => {
        console.error(err);
        alert('업로드 실패');
      });
  };

  const loadClippingFun = async () => {
    loadClipping()
      .then(res => {
        setClippingObject(JSON.stringify(res));
        alert('클리핑핑 로드완료');
      })
      .catch(err => {
        console.error(err);
        alert('클리핑 로드실패');
      });
  };

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
      <div>
        <p>clipping Mesh</p>
        <button
          onClick={() => {
            uploadClipping();
          }}
        >
          업로드
        </button>
        <button
          onClick={() => {
            loadClippingFun();
          }}
        >
          불러오기
        </button>
        <div>
          <textarea
            value={clippingObject}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setClippingObject(e.target.value);
            }}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default ClippingPanel;
