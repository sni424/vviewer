import { useThree } from '@react-three/fiber';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import { THREE } from 'VTHREE';
import {
  cameraMatrixAtom,
  cameraSettingAtom,
  insideRoomAtom,
  lastCameraInfoAtom,
  orbitControlAtom,
  setAtomValue,
} from '../../scripts/atoms';
import { cameraInRoom } from '../../scripts/atomUtils';
 
interface UnifiedCameraControlsProps {
  //회전 속도
  rotationSpeed?: number;
  //회전 감속 속도
  inertia?: number;
}

const CameraManager: React.FC<UnifiedCameraControlsProps> = ({
  rotationSpeed = 0.002,
  inertia = 0.9,
}) => {
  //threejs 객체 가져오기
  const { camera, raycaster, pointer, scene } = useThree();
  //카메라 회전 boolean
  const isRotateRef = useRef(false);
  // TransformControls 조작 ing boolean
  const isTransformControlMovingRef = useRef(false);
  //카메라 이동 애니메이션 작동 여부
  const [cameraAction, setCameraAction] = useState<boolean>(false);
  //이전 마우스 위치값 useState쓰면 이동할때마다 리렌더링 되어 ref로 변경
  const previousMousePosition = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  // 마지막 회전 속도 저장
  const velocity = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // 카메라 이동 애니메이션 프레임 ID 저장
  const animationFrameId = useRef<number | null>(null);
  //카메라 이동을 위해 누른 키보드 키값
  const activeKeys = useRef<Set<string>>(new Set());
  // 시간 추적을 위한 타임스탬프 추가 이전 프레임
  const prevFrameTime = useRef<number | null>(null);
  //모바일에서 더블탭 했을때 첫번째 클리과 두번째 클릭 시간 차이를 위한 변수
  const prevTapTime = useRef<number>(0);

  //카메라 세팅
  const cameraSetting = useAtomValue(cameraSettingAtom);
  //orbitControl atom에 저장
  const orbitControl = useAtomValue(orbitControlAtom);

  const setLastCameraInfo = useSetAtom(lastCameraInfoAtom);

  // 카메라 이동 및 회전시 카메라 데이터 저장장
  const updateCameraInfo = () => {
    if (
      !orbitControl?.enabled &&
      !cameraSetting.isoView &&
      !cameraSetting.topView
    ) {
      setLastCameraInfo(pre => ({
        ...pre,
        matrix: camera.matrix.toArray(),
      }));
    }

    // 방 업데이트
    setAtomValue(insideRoomAtom, cameraInRoom(camera.matrix));
    setAtomValue(cameraMatrixAtom, camera.matrix);
  };

  // 마우스 드래그로 카메라 회전
  const moveCameraRotation = (deltaX: number, deltaY: number): void => {
    velocity.current = { x: deltaX * rotationSpeed, y: deltaY * rotationSpeed };

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
  };

  // 관성 효과 적용
  const applyInertia = (): void => {
    // 회전 중이 아니고, 현재 회전 속도가 특정 임계값(0.001)보다 클 경우에만 관성 적용
    if (
      !isRotateRef.current &&
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

  //pc에서 카메라 위치 이동 함수
  const animateCameraMovement = (currentTime: number): void => {
    //시간에 따라 일정한 속도를 유지하기위해 현재 프레임과 이전 프레임 사이의 시간을 구한다.
    const deltaTime = prevFrameTime.current
      ? (currentTime - (prevFrameTime.current || 0)) / 1000
      : 0;
    //이전 프레임에 현재 시간을 저장
    prevFrameTime.current = currentTime;

    //방향을 위한 변수
    const forward = new THREE.Vector3();
    //현재 카메라의 방향을 구한다.
    camera.getWorldDirection(forward);
    //y값 높이는 일정하게
    forward.y = 0;
    //정규화 하여 방향에 사용이 가능하게
    forward.normalize();

    //오른쪽 방향 설정 forward값으로 설정 가능
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    //카메라가 움직일 방향 설정
    const moveDirection = new THREE.Vector3();

    let scale = 1;

    const activeKey = activeKeys.current;

    //앞으로
    if (activeKey.has('KeyW')) moveDirection.add(forward);
    //뒤로
    if (activeKey.has('KeyS')) moveDirection.sub(forward);
    //왼쪽으로
    if (activeKey.has('KeyA')) moveDirection.sub(right);
    //오른쪽으로
    if (activeKey.has('KeyD')) moveDirection.add(right);

    if (activeKey.has('ShiftLeft')) scale *= 1.5;

    if (moveDirection.length() > 0) {
      const movement = moveDirection
        .clone()
        .normalize()
        .multiplyScalar(cameraSetting.moveSpeed * scale * deltaTime);
      camera.position.add(movement);
      camera.updateProjectionMatrix();
      window.dispatchEvent(
        new CustomEvent('camera-move', {
          detail: { position: camera.position },
        }),
      );
      updateCameraInfo();
    }

    if (cameraAction) {
      animationFrameId.current = requestAnimationFrame(animateCameraMovement);
    }
  };

  const downEventFun = (event: MouseEvent | TouchEvent) => {
    if (!isTransformControlMovingRef.current && !orbitControl?.enabled) {
      // 회전 true
      isRotateRef.current = true;

      if (event instanceof MouseEvent) {
        // 마우스 이벤트
        previousMousePosition.current = { x: event.clientX, y: event.clientY };
      } else if (event instanceof TouchEvent) {
        // 터치 이벤트
        const touch = event.touches[0]; // 첫 번째 터치 추출
        previousMousePosition.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const moveEventFun = (event: MouseEvent | TouchEvent) => {
    let clientX = 0;
    let clientY = 0;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        return; // 터치가 없으면 무시
      }
    }

    if (isRotateRef.current && !orbitControl?.enabled) {
      // 현재 위치와 이전 위치 차이 계산
      const deltaX = clientX - previousMousePosition.current.x;
      const deltaY = clientY - previousMousePosition.current.y;

      // 카메라 회전 함수 호출
      moveCameraRotation(deltaX, deltaY);

      // 이전 위치 업데이트
      previousMousePosition.current = { x: clientX, y: clientY };
    }
  };

  useEffect(() => {
    const element = document.getElementById('canvasDiv');
    if (!element) return;

    //마우스 클릭 눌렀을때 이벤트
    const handleMouseDown = (event: MouseEvent): void => {
      downEventFun(event);
    };

    //마우스 이동 이벤트
    const handleMouseMove = (event: MouseEvent): void => {
      moveEventFun(event);
    };
    //마우스 클릭 땠을때 이벤트
    const handleMouseUp = (event: MouseEvent): void => {
      if (!orbitControl?.enabled) {
        //회전 멈춤
        isRotateRef.current = false;
        //감속 하면서 멈추는 함수
        applyInertia();
      }
    };

    //모바일 터치했을때 이벤트
    const handlePointerDown = (event: TouchEvent): void => {
      downEventFun(event);
    };

    const handlePointerMove = (event: TouchEvent): void => {
      moveEventFun(event);
    };

    //모바일 터치땠을때 이벤트
    const handleTouchEnd = (): void => {
      if (!orbitControl?.enabled) {
        //회전 멈춤
        isRotateRef.current = false;
        //감속 하면서 멈추는 함수
        applyInertia();
        //현재 시간
        const currentTime = Date.now();
        // 이전 터치 이벤트와 현재 터치 이벤트 사이의 시간 간격
        const tapInterval = currentTime - prevTapTime.current;
        // 터치 간격이 300ms 미만이면 더블 탭으로 간주
        if (tapInterval < 300 && tapInterval > 0) {
          //raycaster 설정
          raycaster.setFromCamera(pointer, camera);
          // 광선과 씬의 객체들과의 교차점을 확인
          const intersects = raycaster.intersectObjects(scene.children, true);
          //교차점이 있고 orbit이 비활성화 됬을때

          if (intersects.length > 0 && !orbitControl?.enabled) {
            // 교차된 첫 번째 객체의 좌표를 기준으로 카메라 이동
            const targetPoint = intersects[0].point;
            //좌표를 이용해 Matrix4로 변경
            const targetMatrix = new THREE.Matrix4().makeTranslation(
              targetPoint.x,
              cameraSetting.cameraY, // 높이 고정
              targetPoint.z,
            );

            camera.moveTo({
              pathFinding: {
                matrix: targetMatrix.toArray(),
              },
            });
          } else {
            console.log(
              'intersects.length : ',
              intersects.length > 0,
              'oribitControl.enabled :',
              orbitControl?.enabled,
            );
          }
        }
        // 마지막 터치 이벤트 시간 갱신
        prevTapTime.current = currentTime;
      }
    };

    //컨텍스트 메뉴가 나오면서 다른 이벤트들이 안먹는 이슈 방지지
    const handleContextMenu = (event: MouseEvent): void => {
      event.preventDefault(); // 기본 컨텍스트 메뉴 방지
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchstart', handlePointerDown);
    element.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      if (element) {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
        element.removeEventListener('touchend', handleTouchEnd);
        element.addEventListener('touchstart', handlePointerDown);
        element.addEventListener('touchmove', handlePointerMove);
        window.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [orbitControl, cameraSetting.isoView]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const activeElement = document.activeElement;

      if (activeElement) {
        const isInputFocused =
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA';
        if (isInputFocused) {
          animationFrameId.current = null;
          return; // 이벤트 핸들링 종료
        }
      }
      activeKeys.current.add(event.code);
      setCameraAction(true);
    };
    const handleKeyUp = (event: KeyboardEvent): void => {
      activeKeys.current.delete(event.code);
      if (activeKeys.current.size === 0) setCameraAction(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('control-dragged', event => {
      const { moving } = (event as unknown as { detail: { moving: boolean } })
        .detail;
      console.log('moving', moving);
      isTransformControlMovingRef.current = moving;
    });

    return () => {
      console.log('removed camera Events');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('control-dragged', () => {});
    };
  }, []);

  useEffect(() => {
    if (cameraAction) {
      // 카메라 이동 애니메이션이 활성화되었을 때
      if (!animationFrameId.current && !orbitControl?.enabled) {
        // 이전 프레임 시간을 초기화
        prevFrameTime.current = null;
        // `animateCameraMovement`를 애니메이션 루프로 실행
        animationFrameId.current = requestAnimationFrame(animateCameraMovement);
      }
    } else {
      // 카메라 이동 애니메이션이 비활성화되었을 때
      if (animationFrameId.current) {
        // 애니메이션 루프를 중단
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
  }, [cameraAction]);

  // 렌더링 없이 로직만 관리
  return null;
};

export default CameraManager;
