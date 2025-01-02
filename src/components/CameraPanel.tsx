import { useAtom, useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react';
import { roomColorString } from '../Constants';
import {
  cameraMatrixAtom,
  cameraSettingAtom,
  insideRoomAtom,
  lastCameraInfoAtom,
  orbitSettingAtom,
  threeExportsAtom,
} from '../scripts/atoms';
import { Quaternion, THREE, Vector3 } from '../scripts/VTHREE';

const CameraPanel = () => {
  const [isCameraPanel, setCameraPanel] = useState(true);

  const threeExports = useAtomValue(threeExportsAtom);
  const cameraMatrix = useAtomValue(cameraMatrixAtom);
  const [cameraSetting, setCameraSetting] = useAtom(cameraSettingAtom);

  const [isOrbit, setOrbit] = useAtom(orbitSettingAtom);
  const [lastCameraInfo, setLastCameraInfo] = useAtom(lastCameraInfoAtom);
  const posYRef = React.useRef(0);
  const lastSpace = React.useRef(0);
  const insideRoom = useAtomValue(insideRoomAtom);

  useEffect(() => {
    // space 입력 시 카메라 상승
    const handleKeydown = (e: KeyboardEvent) => {
      // 카메라 y값 상승
      const velocity = 0.1;
      if (e.key === ' ') {
        e.preventDefault();
        const tooSoon = Date.now() - lastSpace.current < 16;
        if (tooSoon) {
          return;
        }
        lastSpace.current = Date.now();
        const newY = Number((posYRef.current + velocity).toFixed(2));

        setCameraSetting(pre => ({
          ...pre,
          cameraY: Number((pre.cameraY + newY).toFixed(2)),
        }));
      }

      if (e.key.toLowerCase() === 'c') {
        if (e.ctrlKey) {
          return;
        }
        e.preventDefault();
        const tooSoon = Date.now() - lastSpace.current < 16;
        if (tooSoon) {
          return;
        }
        lastSpace.current = Date.now();
        const newY = Number((posYRef.current - velocity).toFixed(2));

        setCameraSetting(pre => ({
          ...pre,
          cameraY: Number((pre.cameraY + newY).toFixed(2)),
        }));
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  useEffect(() => {
    if (!threeExports) {
      return;
    }
    camera.position.y = cameraSetting.cameraY;
    camera.updateProjectionMatrix();
    setLastCameraInfo(pre => ({
      ...pre,
      position: camera.position.clone(),
    }));
  }, [cameraSetting.cameraY, threeExports]); // cameraY 값만 감지

  if (!threeExports) {
    return null; // early return
  }

  const { camera, scene } = threeExports;
  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  cameraMatrix?.decompose(position, rotation, scale);

  const cameraView = (value: boolean) => {
    if (value) {
      if (scene) {
        const boundingBox = new THREE.Box3().setFromObject(scene);
        const size = boundingBox.getSize(new THREE.Vector3()); // 모델 크기
        const center = boundingBox.getCenter(new THREE.Vector3()); // 모델 중심
        const centerPosition = new THREE.Vector3(
          center.x + size.x,
          center.y + size.y * 6,
          center.z + size.z,
        );
        camera.moveTo('linear', {
          linear: {
            target: centerPosition,
            direction: center,
            duration: cameraSetting.moveSpeed,
            fov: 45,
          },
        });
      } else {
        console.log('no scene');
      }
    } else {
      camera.moveTo('linear', {
        linear: {
          target: lastCameraInfo.position,
          direction: lastCameraInfo.target,
          duration: cameraSetting.moveSpeed,
          fov: 75,
        },
      });
    }
    setCameraSetting(pre => ({
      ...pre,
      isoView: value,
    }));
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        maxWidth: 180,
      }}
    >
      {isCameraPanel ? (
        <div style={{ backgroundColor: 'lightgray' }}>
          <section>
            <div
              style={{
                display: 'flex',
                width: '95%',
                margin: '0 auto',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <strong>카메라</strong>
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setCameraPanel(false);
                }}
              >
                X
              </div>
            </div>
            <div
              style={{
                margin: '0 auto',
                width: '90%',
                paddingBottom: '8px',
                fontSize: '14px',
              }}
            >
              <div className="text-sm">
                방 :
                {insideRoom ? (
                  <span
                    className="inline-block text-white"
                    style={{
                      backgroundColor: insideRoom
                        ? roomColorString(insideRoom?.index)
                        : undefined,
                    }}
                  >
                    {insideRoom.name}
                  </span>
                ) : (
                  '-'
                )}
              </div>
              <div>
                <label>isoView</label>
                <input
                  type="checkbox"
                  id="isoView"
                  name="isoView"
                  checked={cameraSetting.isoView}
                  onChange={e => {
                    cameraView(e.target.checked);
                  }}
                />
              </div>
              <div>
                <label>isOrbit</label>
                <input
                  type="checkbox"
                  id="autoRotate"
                  name="autoRotate"
                  checked={isOrbit.enabled}
                  onChange={e => {
                    // if (cameraSetting.isoView) {
                    //     window.alert("isoView에서는 orbit 비활성이 불가능 합니다.")
                    //     return
                    // }
                    setOrbit(pre => ({
                      ...pre,
                      enabled: e.target.checked,
                    }));
                  }}
                />
              </div>
              <div>
                <label>autoRotate</label>
                <input
                  type="checkbox"
                  id="autoRotate"
                  name="autoRotate"
                  checked={isOrbit.autoRotate}
                  onChange={e => {
                    setOrbit(pre => ({
                      ...pre,
                      autoRotate: e.target.checked,
                    }));
                  }}
                />
              </div>
              <button
                onClick={() => {
                  threeExports.set(state => {
                    const perCam = new THREE.OrthographicCamera(
                      -1,
                      1,
                      1,
                      -1,
                      0.1,
                      2000,
                    );
                    perCam.position.set(1, 200, 1);
                    perCam.updateProjectionMatrix();
                    return {
                      ...state,
                      camera: perCam,
                    };
                  });
                }}
              >
                Iso카메라
              </button>
              <div
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              >
                <label>카메라 높이</label>
                <input
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                  type="number"
                  value={cameraSetting.cameraY}
                  onChange={e => {
                    const newY =
                      Number(parseFloat(e.target.value).toFixed(2)) || 0;
                    setCameraSetting(pre => ({
                      ...pre,
                      cameraY: newY,
                    }));
                  }}
                />
              </div>
              <div
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              >
                <label>카메라 이동속도</label>
                <input
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                  type="number"
                  value={cameraSetting ? cameraSetting.moveSpeed : 0}
                  onChange={e => {
                    const newSpeed = parseFloat(e.target.value);
                    setCameraSetting(pre => ({
                      ...pre,
                      moveSpeed: newSpeed,
                    }));
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div
          style={{ display: 'flex', justifyContent: 'end', cursor: 'pointer' }}
          onClick={() => {
            setCameraPanel(true);
          }}
        >
          확대
        </div>
      )}
    </div>
  );
};

export default CameraPanel;
