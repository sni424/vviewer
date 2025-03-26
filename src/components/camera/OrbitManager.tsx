import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import {
  cameraMatrixAtom,
  cameraSettingAtom,
  insideRoomAtom,
  orbitControlAtom,
  orbitSettingAtom,
  setAtomValue,
} from '../../scripts/atoms';
import { cameraInRoom } from '../../scripts/atomUtils';
import { calculateTargetPosition } from '../../scripts/utils';
import { THREE } from '../../scripts/vthree/VTHREE';

const OrbitManager: React.FC = () => {
  const orbitRef = useRef<any>(null);
  //threejs 객체 가져오기
  const { camera } = useThree();
  const [orbitSetting, setOrbitSetting] = useAtom(orbitSettingAtom);
  const orbitSettingRef = useRef(orbitSetting);
  //카메라 세팅
  const cameraSetting = useAtomValue(cameraSettingAtom);
  //카메라 정보값 갱신
  const setCameraAtom = useSetAtom(cameraMatrixAtom);
  //orbitControl atom에 저장
  const setOrbitControl = useSetAtom(orbitControlAtom);

  // 외부 이벤트에 의해 핸들링 되고있는지에 대한 상태
  const [outControlled, setOutControlled] = useState(false);

  // OrbitControls 관련 설정 함수
  const updateOrbitTarget = (target: THREE.Vector3) => {
    if (orbitRef.current) {
      orbitRef.current.target.set(target.x, target.y, target.z);
      orbitRef.current.update();
    }
  };

  useEffect(() => {
    orbitSettingRef.current = orbitSetting;
  }, [orbitSetting]);

  // isoView가 아닌 상태에서 OrbitControls이 활성화 되면 이전 바라보던 방향으로 설정
  useEffect(() => {
    if (orbitRef.current) {
      if (orbitSetting.enabled) {
        if (outControlled) {
          setOutControlled(false);
        } else {
          const originalTarget = orbitRef.current.target;
          const cameraPosition = camera.position.clone();

          const distance = cameraPosition.distanceTo(originalTarget);

          // 카메라의 방향 벡터
          const direction = camera.getWorldDirection(new THREE.Vector3());

          // 목표 좌표 계산 (카메라 위치 + 방향 벡터)
          const target = calculateTargetPosition(
            cameraPosition,
            direction,
            distance,
          );
          updateOrbitTarget(target);
        }
      }
    }
  }, [orbitSetting.enabled]);

  useEffect(() => {
    document.addEventListener('control-dragged', event => {
      const { moving } = (event as unknown as { detail: { moving: boolean } })
        .detail;
      const copied = { ...orbitSettingRef.current };

      setOutControlled(true);
      if (moving) {
        copied.tempEnabled = copied.enabled;
        copied.enabled = false;
      } else {
        copied.enabled = copied.tempEnabled ?? true;
        delete copied.tempEnabled;
      }
      setOrbitSetting(copied);
    });
    return () => {
      document.removeEventListener('control-dragged', () => {});
    };
  }, []);

  useEffect(() => {
    if (orbitRef.current) {
      setOrbitControl(orbitRef.current);
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
          setAtomValue(insideRoomAtom, cameraInRoom(matrix));
        }
      }}
    />
  );
};

export default OrbitManager;
