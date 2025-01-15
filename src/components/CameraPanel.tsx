import { RootState } from '@react-three/fiber';
import { useAtom, useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react';
import { roomColorString } from '../Constants';
import {
  cameraMatrixAtom,
  cameraSettingAtom,
  getAtomValue,
  insideRoomAtom,
  lastCameraInfoAtom,
  moveToPointAtom,
  orbitSettingAtom,
  panelTabAtom,
  setAtomValue,
  threeExportsAtom,
} from '../scripts/atoms';
import { Quaternion, THREE, Vector3 } from '../scripts/VTHREE';
import Clipping from './clipping/Clipping';

const CameraPanel = () => {
  const [isCameraPanel, setCameraPanel] = useState(true);

  const threeExports = useAtomValue(threeExportsAtom);
  const cameraMatrix = useAtomValue(cameraMatrixAtom);
  const [cameraSetting, setCameraSetting] = useAtom(cameraSettingAtom);

  const [isOrbit, setOrbit] = useAtom(orbitSettingAtom);
  const [lastCameraInfo, setLastCameraInfo] = useAtom(lastCameraInfoAtom);
  const posYRef = React.useRef(0);
  const lastSpace = React.useRef(0);
  const insideRooms = useAtomValue(insideRoomAtom);

  const topView = (value: boolean) => {
    if (!threeExports) return;

    setAtomValue(cameraSettingAtom, pre => ({ ...pre, topView: value }));

    const element = document.getElementById('canvasDiv');
    if (!element) return;

    const createCamera = (isTopView: boolean): THREE.Camera => {
      const boundingBox = new THREE.Box3().setFromObject(scene);
      const size = boundingBox.getSize(new THREE.Vector3()); // 모델 크기
      const center = boundingBox.getCenter(new THREE.Vector3()); // 모델 중심

      const lastMatrixArray = lastCameraInfo.matrix;

      const threeMatrix = new THREE.Matrix4().fromArray(lastMatrixArray);
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      threeMatrix.decompose(position, quaternion, scale);
      if (isTopView) {
        const orthoCam = new THREE.OrthographicCamera(
          element.offsetWidth / -2,
          element.offsetWidth / 2,
          element.offsetHeight / 2,
          element.offsetHeight / -2,
          10,
          1000,
        );
        orthoCam.position.set(0, 100, 0);

        // 위에서 아래를 바라보는 회전값 설정
        const lookDirection = new THREE.Vector3(0, -1, 0); // -Y 방향
        const upVector = new THREE.Vector3(0, 0, -1); // 카메라의 기본 위 방향
        const topQuaternion = new THREE.Quaternion().setFromUnitVectors(
          upVector,
          lookDirection,
        );

        setTimeout(() => {
          orthoCam.quaternion.copy(topQuaternion);
        }, 10);

        orthoCam.zoom = Math.round(size.y * 20);
        orthoCam.updateProjectionMatrix();
        orthoCam.updateMatrix();
        orthoCam.updateMatrixWorld(true);
        return orthoCam;
      } else {
        const perCam = new THREE.PerspectiveCamera(
          75,
          element.offsetWidth / element.offsetHeight,
          0.1,
          1000,
        );
        perCam.position.copy(position);
        setTimeout(() => {
          perCam.quaternion.copy(quaternion);
        }, 10);

        perCam.updateProjectionMatrix();
        perCam.updateMatrix();
        perCam.updateMatrixWorld(true);
        return perCam;
      }
    };

    const newCamera = createCamera(value);
    threeExports.set((state: RootState) => {
      const updatedState: RootState = {
        ...state,
        camera: newCamera as THREE.PerspectiveCamera & { manual?: boolean },
      };
      return updatedState;
    });

    // threeExports.camera = newCamera;
  };

  useEffect(() => {
    // space 입력 시 카메라 상승
    const handleKeydown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement) {
        const isInputFocused =
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA';

        if (isInputFocused) {
          return; // 이벤트 핸들링 종료
        }
      }
      if (getAtomValue(panelTabAtom) === 'hotspot') {
        return;
      }

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
      matrix: camera.matrix.toArray(),
    }));
  }, [cameraSetting.cameraY, threeExports]); // cameraY 값만 감지

  if (!threeExports) {
    return null; // early return
  }

  const { camera, scene, gl } = threeExports;
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

        // 모델 중심을 향하는 방향 계산
        const direction = center.clone().sub(centerPosition).normalize();

        // 회전 계산: 카메라의 기본 방향을 기준으로 모델 중심 방향으로 설정
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1), // 카메라의 기본 "앞 방향"
          direction, // 모델 중심 방향
        );

        // Matrix4에 회전(quaternion)과 위치(centerPosition) 설정
        const matrix = new THREE.Matrix4()
          .makeRotationFromQuaternion(quaternion)
          .setPosition(centerPosition);
        camera.moveTo({
          linear: {
            matrix: matrix.toArray(),
            duration: cameraSetting.moveSpeed,
            fov: 45,
          },
        });
      } else {
        console.log('no scene');
      }
    } else {
      camera.moveTo({
        linear: {
          matrix: lastCameraInfo.matrix,
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
        zIndex: 2,
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
                {insideRooms.length === 0
                  ? '-'
                  : insideRooms.map(room => (
                      <span
                        key={`roomname-${room.index}`}
                        className="inline-block text-white"
                        style={{
                          backgroundColor: insideRooms
                            ? roomColorString(room.index)
                            : undefined,
                        }}
                      >
                        {room.name}
                      </span>
                    ))}
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
              <div className="pb-1">
                <label>topView</label>
                <input
                  type="checkbox"
                  id="topView"
                  name="topView"
                  checked={cameraSetting.topView}
                  onChange={e => {
                    const value = e.target.checked;
                    topView(value);
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const element = document.getElementById('canvasDiv');
                  if (element) {
                    threeExports.set(state => {
                      const perCam = new THREE.OrthographicCamera(
                        element.offsetWidth / -2,
                        element.offsetWidth / 2,
                        element.offsetHeight / 2,
                        element.offsetHeight / -2,
                        10,
                        1000,
                      );
                      perCam.position.set(1, 100, 1);
                      perCam.zoom = 65;
                      perCam.updateProjectionMatrix();

                      // 최신 카메라로 동기화
                      threeExports.camera = perCam;
                      return {
                        ...state,
                        camera: perCam,
                      };
                    });
                  }
                }}
              >
                Iso카메라
              </button>
              <button
                onClick={() => {
                  setAtomValue(moveToPointAtom, {
                    point: undefined,
                    setting: true,
                  });
                }}
              >
                지점으로이동
              </button>
              <button
                onClick={() => {
                  if (
                    threeExports.camera.type === 'PerspectiveCamera' &&
                    camera
                  ) {
                    camera.position.set(1, cameraSetting.cameraY, 1);
                    // 목표 방향 계산
                    const target = new THREE.Vector3(
                      1,
                      cameraSetting.cameraY,
                      1,
                    );
                    const direction = target
                      .clone()
                      .sub(camera.position)
                      .normalize();

                    // 카메라의 "앞 방향"(`-Z`)을 목표 방향으로 회전
                    const quaternion =
                      new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 0, -1), // 기본 카메라의 앞 방향
                        direction,
                      );

                    // 카메라의 회전값 적용
                    camera.quaternion.copy(quaternion);
                    camera.fov = 75;
                    camera.near = 0.1;
                  } else {
                    threeExports.set(state => {
                      const perCam = new THREE.PerspectiveCamera(
                        75,
                        window.innerWidth / window.innerHeight,
                        0.1,
                        1000,
                      );
                      perCam.position.set(1, cameraSetting.cameraY, 1);

                      const target = new THREE.Vector3(
                        1,
                        cameraSetting.cameraY,
                        1,
                      );
                      const direction = target
                        .clone()
                        .sub(perCam.position)
                        .normalize();

                      // 카메라의 "앞 방향"(`-Z`)을 목표 방향으로 회전
                      const quaternion =
                        new THREE.Quaternion().setFromUnitVectors(
                          new THREE.Vector3(0, 0, -1), // 기본 카메라의 앞 방향
                          direction,
                        );

                      // 카메라의 회전값 적용
                      perCam.quaternion.copy(quaternion);
                      perCam.updateProjectionMatrix();
                      threeExports.camera = perCam;
                      return {
                        ...state,
                        camera: perCam,
                      };
                    });
                  }
                }}
              >
                카메라 위치 초기화
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
            <Clipping />
          </section>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'end',
            cursor: 'pointer',
            border: '1px solid gray',
            padding: '4px 8px',
          }}
          onClick={() => {
            setCameraPanel(true);
          }}
        >
          카메라
        </div>
      )}
    </div>
  );
};

export default CameraPanel;
