import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  cameraSettingAtom,
  lastCameraInfoAtom,
  oribitControlAtom,
  threeExportsAtom,
} from '../../scripts/atoms';

const MobileCameraManager = ({
  rotationSpeed = 0.002,
  moveSpeed = 0.001,
  inertia = 0.9,
}) => {
  const threeExports = useAtomValue(threeExportsAtom);
  //orbitControl atom
  const oribitControl = useAtomValue(oribitControlAtom);
  //카메라 세팅
  const cameraSetting = useAtomValue(cameraSettingAtom);
  // 기본값으로 camera가 없을 경우 처리
  const setLastCameraInfo = useSetAtom(lastCameraInfoAtom);
  const camera = threeExports?.camera || null;

  //드래그 확인
  const [isDragging, setIsDragging] = useState(false);
  //처음 클릭 좌표
  const [mouseStart, setMouseStart] = useState({
    x: 0,
    y: 0,
  });
  //마우스 이동 좌표
  const movePosition = useRef({ x: 0, y: 0 });
  // UI 업데이트용
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  //애니메이션 작동 여부
  const [cameraAction, setCameraAction] = useState(false); // 카메라 액션 상태
  // 애니메이션 프레임 ID 저장
  const animationFrameId = useRef(null);
  //카메라 회전 boolean
  const isRotateRef = useRef(false);
  //이전 마우스 위치값 useState쓰면 이동할때마다 리렌더링 되어 ref로 변경
  const previousMousePosition = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  // 마지막 회전 속도 저장
  const velocity = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: TouchEvent) => {
    // 모든 터치 이벤트를 배열로 변환
    const touches = Array.from(e.touches);

    // 조이스틱 터치 찾기
    const joystickTouch = touches.find(
      touch => (touch.target as HTMLElement).id === 'joystick',
    );

    // 캔버스 터치 찾기 (tagName으로 구분)
    const canvasTouch = touches.find(
      touch => (touch.target as HTMLElement).tagName.toLowerCase() === 'canvas',
    );

    // 조이스틱 터치 처리
    if (joystickTouch) {
      setIsDragging(true);
      setCameraAction(true);
      setMouseStart({
        x: joystickTouch.clientX,
        y: joystickTouch.clientY,
      });
    }

    // 캔버스 터치 처리
    if (canvasTouch && !oribitControl?.enabled) {
      isRotateRef.current = true;
      previousMousePosition.current = {
        x: canvasTouch.clientX,
        y: canvasTouch.clientY,
      };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touches = Array.from(e.touches);

    // 조이스틱 터치 찾기
    const joystickTouch = touches.find(
      touch => (touch.target as HTMLElement).id === 'joystick',
    );

    // 캔버스 터치 찾기 (tagName으로 구분)
    const canvasTouch = touches.find(
      touch => (touch.target as HTMLElement).tagName.toLowerCase() === 'canvas',
    );

    // 조이스틱 처리
    if (joystickTouch && isDragging) {
      const rect = document
        .getElementById('joystickArea')
        ?.getBoundingClientRect();
      if (!rect) return;

      const offsetX = joystickTouch.clientX - mouseStart.x;
      const offsetY = joystickTouch.clientY - mouseStart.y;

      const maxRadius = rect.width / 2;
      const distance = Math.hypot(offsetX, offsetY);
      const clampedDistance = Math.min(distance, maxRadius);
      const angle = Math.atan2(offsetY, offsetX);

      const moveX = Math.cos(angle) * clampedDistance;
      const moveY = Math.sin(angle) * clampedDistance;

      movePosition.current = { x: moveX, y: moveY };

      setJoystickPosition({ x: moveX, y: moveY });
    }

    // 캔버스 처리
    if (canvasTouch && isRotateRef.current && !oribitControl?.enabled) {
      const deltaX = canvasTouch.clientX - previousMousePosition.current.x;
      const deltaY = canvasTouch.clientY - previousMousePosition.current.y;

      moveCameraRotation(deltaX, deltaY);

      previousMousePosition.current = {
        x: canvasTouch.clientX,
        y: canvasTouch.clientY,
      };
    }
  };
  const handleTouchEnd = (e: TouchEvent) => {
    const changedTouches = Array.from(e.changedTouches);

    // 조이스틱 터치 찾기
    const joystickTouch = changedTouches.find(
      touch => (touch.target as HTMLElement).id === 'joystick',
    );

    // 캔버스 터치 찾기 (tagName으로 구분)
    const canvasTouch = changedTouches.find(
      touch => (touch.target as HTMLElement).tagName.toLowerCase() === 'canvas',
    );

    if (joystickTouch) {
      setIsDragging(false);
      // joystick을 중앙으로 복귀
      //마우스 이동거리
      movePosition.current = { x: 0, y: 0 };
      // UI
      setJoystickPosition({ x: 0, y: 0 });
      //마우스 첫 위치
      setMouseStart({ x: 0, y: 0 });
      setCameraAction(false);
    }
    if (canvasTouch) {
      //회전 멈춤
      isRotateRef.current = false;
      //감속 하면서 멈추는 함수
      applyInertia();
    }
  };

  const animateCamera = () => {
    if (!cameraAction) {
      // cameraAction이 false이면 애니메이션 중단
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }
    if (camera) {
      // 카메라 방향 계산
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      right.normalize();
      // 정규화된 이동 벡터 기반으로 카메라 이동
      const movement = new THREE.Vector3();
      movement.add(
        forward
          .clone()
          .normalize()
          .multiplyScalar(-movePosition.current.y * moveSpeed),
      ); // 전방/후방
      movement.add(
        right
          .clone()
          .normalize()
          .multiplyScalar(movePosition.current.x * moveSpeed),
      ); // 좌/우
      camera.position.add(movement);

      //updateProjectionMatrix 넣은 이유 카메라 회전했을때 방향 맞추기 위해
      camera.updateProjectionMatrix();
      animationFrameId.current = requestAnimationFrame(animateCamera);
    }
  };

  //  드래그로 카메라 회전
  const moveCameraRotation = (deltaX: number, deltaY: number): void => {
    velocity.current = { x: deltaX * rotationSpeed, y: deltaY * rotationSpeed };
    if (camera) {
      // X축과 Y축 회전을 위한 쿼터니언 생성
      const quaternionX = new THREE.Quaternion();
      const quaternionY = new THREE.Quaternion();

      // X축 회전 설정 (Y축을 중심으로 수평 회전)
      quaternionX.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -deltaX * rotationSpeed,
      );
      // Y축 회전 설정 (X축을 중심으로 수직 회전)
      quaternionY.setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -deltaY * rotationSpeed,
      );

      // 카메라의 현재 쿼터니언에 X축 회전을 적용
      camera.quaternion.multiplyQuaternions(quaternionX, camera.quaternion);
      // 카메라의 업데이트된 쿼터니언에 Y축 회전을 추가로 적용
      camera.quaternion.multiplyQuaternions(camera.quaternion, quaternionY);
      // 카메라의 월드 변환 행렬 업데이트
      camera.updateMatrixWorld(true);
    }
  };

  // 관성 효과 적용
  const applyInertia = (): void => {
    // 회전 중이 아니고, 현재 회전 속도가 특정 임계값(0.001)보다 클 경우에만 관성 적용
    if (
      !isRotateRef.current &&
      camera &&
      (Math.abs(velocity.current.x) > 0.001 ||
        Math.abs(velocity.current.y) > 0.001)
    ) {
      // 회전 속도에 관성을 곱해 점점 줄어들도록 설정
      velocity.current.x *= inertia;
      velocity.current.y *= inertia;

      // X축과 Y축 회전을 위한 쿼터니언 생성
      const quaternionX = new THREE.Quaternion();
      const quaternionY = new THREE.Quaternion();
      // 현재 회전 속도를 기반으로 X축(Y축 중심 회전) 쿼터니언 생성
      quaternionX.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -velocity.current.x,
      );
      // 현재 회전 속도를 기반으로 Y축(X축 중심 회전) 쿼터니언 생성
      quaternionY.setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -velocity.current.y,
      );

      // 카메라의 현재 쿼터니언에 X축 회전 적용
      camera.quaternion.multiplyQuaternions(quaternionX, camera.quaternion);
      // 카메라의 업데이트된 쿼터니언에 Y축 회전 추가로 적용
      camera.quaternion.multiplyQuaternions(camera.quaternion, quaternionY);

      camera.updateMatrixWorld(true);
      updateCameraInfo();
      // 다음 프레임에서 applyInertia를 호출하여 관성을 지속적으로 적용
      requestAnimationFrame(applyInertia);
    }
  };

  // 카메라 이동 및 회전시 카메라 데이터 저장
  const updateCameraInfo = () => {
    if (oribitControl && camera && !cameraSetting.isoView) {
      setLastCameraInfo(pre => ({
        ...pre,
        matrix: camera.matrix.toArray(),
      }));
    }

    // // 방 업데이트
    // setAtomValue(insideRoomAtom, cameraInRoom(camera.matrix));
  };

  useEffect(() => {
    if (cameraAction) {
      // cameraAction이 true일 때만 애니메이션 시작
      if (!animationFrameId.current) {
        animationFrameId.current = requestAnimationFrame(animateCamera);
      }
    } else {
      // cameraAction이 false일 때 애니메이션 중단
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
  }, [cameraAction]);

  useEffect(() => {
    const joystickArea = document.getElementById('joystickArea');
    const joystick = document.getElementById('joystick');
    const element = document.getElementById('mobileCanvasDiv');
    if (!element || !joystick || !joystickArea) return;
    if (camera) {
      joystick.addEventListener('touchstart', handleTouchStart);
      joystick.addEventListener('touchmove', handleTouchMove);
      joystick.addEventListener('touchend', handleTouchEnd);
      joystickArea.addEventListener('touchend', handleTouchEnd);
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchmove', handleTouchMove);
      element.addEventListener('touchend', handleTouchEnd);
    }
  }, [isDragging, camera]);

  return (
    <div
      id="joystickArea"
      className="absolute bottom-[95px] left-5  w-28 h-28 
        rounded-full border-2 border-gray-500 flex items-center justify-center"
    >
      <div
        id="joystick"
        className="w-3/5 h-3/5 rounded-full 
            bg-gray-500 cursor-pointer transition duration-150 ease-out"
        style={{
          transform: isDragging
            ? `translateX(${joystickPosition.x}px) translateY(${joystickPosition.y}px)`
            : 'translateX(0px) translateY(0px)',
        }}
      />
    </div>
  );
};

export default MobileCameraManager;
