import { OrbitControls } from '@react-three/drei';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useRef } from 'react';
import {
  cameraMatrixAtom,
  cameraSettingAtom,
  lastCameraInfoAtom,
  orbitSettingAtom,
  oribitControlAtom,
} from '../../scripts/atoms';
import { THREE } from '../../scripts/VTHREE';

const OrbitManager: React.FC = () => {
  const orbitRef = useRef<any>(null);
  const [orbitSetting, setOrbitSetting] = useAtom(orbitSettingAtom);
  //카메라 세팅
  const cameraSetting = useAtomValue(cameraSettingAtom);
  //카메라 정보값 갱신
  const setCameraAtom = useSetAtom(cameraMatrixAtom);
  //orbitControl atom에 저장
  const setOribitControl = useSetAtom(oribitControlAtom);
  //마지막 카메라 정보
  const lastCameraInfo = useAtomValue(lastCameraInfoAtom);

  // OrbitControls 관련 설정 함수
  const updateOrbitTarget = (target: THREE.Vector3) => {
    if (orbitRef.current) {
      orbitRef.current.target.set(target.x, target.y, target.z);
      orbitRef.current.update();
    }
  };

  // isoView가 아닌 상태에서 OrbitControls이 활성화 되면 이전 바라보던 방향으로 설정
  useEffect(() => {
    if (!cameraSetting.isoView && orbitRef.current) {
      if (orbitSetting.enabled) {
        updateOrbitTarget(lastCameraInfo.target);
      }
    }
  }, [orbitSetting.enabled]);

  useEffect(() => {
    document.addEventListener('control-dragged', event => {
      const { moving } = event.detail;
      setOrbitSetting(pre => {
        return { ...pre, enable: !moving };
      });
    });
    return () => {
      document.removeEventListener('control-dragged', () => {});
    };
  }, []);

  useEffect(() => {
    if (orbitRef.current) {
      setOribitControl(orbitRef.current);
    }
  }, [orbitRef.current]);

  return (
    <OrbitControls
      ref={orbitRef}
      enabled={orbitSetting.enabled}
      autoRotate={orbitSetting.autoRotate}
      onChange={e => {
        if (!cameraSetting.isoView) {
          const matrix = e?.target.object.matrix.clone();
          setCameraAtom(matrix);
        }
      }}
    />
  );
};

export default OrbitManager;