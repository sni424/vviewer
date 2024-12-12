import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import { cameraMatrixAtom, cameraSettingAtom, lastCameraInfoAtom, orbitSettingAtom } from '../../scripts/atoms';
import { THREE, Vector3 } from '../../scripts/VTHREE';


// Props 타입 정의
interface UnifiedCameraControlsProps {
    //회전 속도
    rotationSpeed?: number;
    //회전 감속 속도
    inertia?: number;
    //처음 카메라 위치
    baseCameraPosition?: number[];
}


const UnifiedCameraControls: React.FC<UnifiedCameraControlsProps> = ({
                                                                         rotationSpeed = 0.002,
                                                                         inertia = 0.9,
                                                                     }) => {
    
    const { camera, raycaster, pointer, scene, gl } = useThree();
    //카메라 회전 boolean
    const isRotateRef = useRef(false);
    // TransformControls 조작 ing boolean
    const isTransformControlMovingRef = useRef(false);
    //카메라 이동 애니메이션 작동 여부
    const [cameraAction, setCameraAction] = useState<boolean>(false);
    //이전 마우스 위치값 useState쓰면 이동할때마다 리렌더링 되어 ref로 변경
    const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
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
    //orbitControl
    const orbit = useRef<any>(null);
    
    //
    const cameraSetting = useAtomValue(cameraSettingAtom);
    //카메라 정보값 갱신
    const setCameraAtom = useSetAtom(cameraMatrixAtom);
    //마지막 카메라 정보값 isoView갔다가 walkView로 갈때 사용
    const [lastCameraInfo, setLastCameraInfo] = useAtom(lastCameraInfoAtom);
    //orbit카메라 세팅
    const [orbitSetting, setOrbitSetting] = useAtom(orbitSettingAtom);
    
    
    // 카메라 이동 및 회전시 카메라 데이터 저장장
    const updateCameraInfo = () => {
        const originalTarget = orbit.current.target;
        const cameraPosition = camera.position.clone();
        
        const distance = cameraPosition.distanceTo(originalTarget);
        
        // 카메라의 방향 벡터
        const direction = camera.getWorldDirection(new THREE.Vector3());
        
        // 목표 좌표 계산 (카메라 위치 + 방향 벡터)
        const target = calculateTargetPosition(cameraPosition, direction, distance);
        // 마지막 카메라 정보 업데이트
        setLastCameraInfo(pre => ({
            ...pre,
            position: cameraPosition,
            target,
        }));
    };
    
    function calculateTargetPosition(cameraPosition: THREE.Vector3, direction: THREE.Vector3, distance: number) {
        // direction이 정규화되지 않았을 경우 정규화
        const normalizedDirection = direction.clone().normalize();
        
        // 방향 벡터에 거리(distance)를 곱해 이동한 벡터 계산
        const offset = normalizedDirection.multiplyScalar(distance);
        
        // 카메라 위치에 offset을 더해 타겟 위치 계산
        return cameraPosition.clone().add(offset);
    }
    
    // OrbitControls 관련 설정 함수
    const updateOrbitTarget = (target: THREE.Vector3) => {
        if (orbit.current) {
            orbit.current.target.set(target.x, target.y, target.z);
            orbit.current.update();
        }
    };
    
    
    // 마우스 드래그로 카메라 회전
    const moveCameraRotation = (deltaX: number, deltaY: number): void => {
        velocity.current = { x: deltaX * rotationSpeed, y: deltaY * rotationSpeed };
        
        // X축과 Y축 회전을 위한 쿼터니언 생성
        const quaternionX = new THREE.Quaternion();
        const quaternionY = new THREE.Quaternion();
        
        // X축 회전 설정 (Y축을 중심으로 수평 회전)
        quaternionX.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * rotationSpeed);
        // Y축 회전 설정 (X축을 중심으로 수직 회전)
        quaternionY.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -deltaY * rotationSpeed);
        
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
        if (!isRotateRef.current && (Math.abs(velocity.current.x) > 0.001 || Math.abs(velocity.current.y) > 0.001)) {
            
            // 회전 속도에 관성을 곱해 점점 줄어들도록 설정
            velocity.current.x *= inertia;
            velocity.current.y *= inertia;
            
            // X축과 Y축 회전을 위한 쿼터니언 생성
            const quaternionX = new THREE.Quaternion();
            const quaternionY = new THREE.Quaternion();
            // 현재 회전 속도를 기반으로 X축(Y축 중심 회전) 쿼터니언 생성
            quaternionX.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -velocity.current.x);
            // 현재 회전 속도를 기반으로 Y축(X축 중심 회전) 쿼터니언 생성
            quaternionY.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -velocity.current.y);
            
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
    
    //모바일 새로운 위치로 카메라 이동
    const moveCameraPosition = (newVector: THREE.Vector3): void => {
        //현재 카메라 위치와 새로운 벡터 위치의 사이의 거리를 구함
        const distance = camera.position.distanceTo(newVector);
        //애니메이션 속도 설정
        const duration =
            distance > 8 ? distance * 0.9 : distance < 2 ? distance * 1.5 : distance;
        //애니메이션 실행
        gsap.to(camera.position, {
            x: newVector.x,
            //y값은 고정
            y: camera.position.y,
            z: newVector.z,
            duration,
            ease: 'power2.out',
            onUpdate: () => {
                updateCameraInfo();
            },
            onComplete: () => {
                console.log('Camera movement complete.');
            },
        });
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
        //앞으로 
        if (activeKeys.current.has('w')) moveDirection.add(forward);
        //뒤로
        if (activeKeys.current.has('s')) moveDirection.sub(forward);
        //왼쪽으로
        if (activeKeys.current.has('a')) moveDirection.sub(right);
        //오른쪽으로
        if (activeKeys.current.has('d')) moveDirection.add(right);
        
        if (moveDirection.length() > 0) {
            const movement = moveDirection.clone()
                .normalize()
                .multiplyScalar(cameraSetting.moveSpeed * deltaTime);
            camera.position.add(movement);
            camera.updateProjectionMatrix();
            updateCameraInfo();
        }
        
        if (cameraAction) {
            animationFrameId.current = requestAnimationFrame(animateCameraMovement);
        }
    };
    
    //isoView walkView 변환
    const switchCamera = (position: Vector3, target: Vector3, cameraFov: number) => {
        // 카메라 위치 애니메이션
        gsap.to(camera.position, {
            x: position.x,
            y: position.y,
            z: position.z,
            duration: 3,
            ease: 'power2.out',
            onUpdate: function() {
                // OrbitControls와 동기화
                camera.lookAt(target.x, target.y, target.z);
                updateOrbitTarget(target);
                
            },
            onComplete: () => {
                camera.lookAt(target.x, target.y, target.z);
                updateOrbitTarget(target);
                console.log('Camera position updated:', camera);
            },
        });
        if (!cameraSetting.isoView) {
            gsap.to(camera, {
                fov: cameraFov,
                duration: 3, // FOV가 변경되는 시간
                ease: 'power2.out',
                onUpdate: () => {
                    camera.updateProjectionMatrix(); // 애니메이션 중 프로젝션 매트릭스를 업데이트
                },
            });
        }
    };
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            activeKeys.current.add(event.key.toLowerCase());
            setCameraAction(true);
        };
        
        const handleKeyUp = (event: KeyboardEvent): void => {
            activeKeys.current.delete(event.key.toLowerCase());
            if (activeKeys.current.size === 0) setCameraAction(false);
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        document.addEventListener('control-dragged', (event) => {
            const { moving } = event.detail;
            isTransformControlMovingRef.current = moving;
            setOrbitSetting((pre) => {
                return { ...pre, enable: !moving };
            });
        });
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('control-dragged', () => {
            });
        };
    }, []);
    
    useEffect(() => {
        const element = document.getElementById('canvasDiv');
        if (!element) return;
        
        //마우스 클릭 눌렀을때 이벤트
        const handleMouseDown = (event: MouseEvent): void => {
            //회전 true
            if (!isTransformControlMovingRef.current) {
                isRotateRef.current = true;
            }
            //마우스 위치값 설정
            previousMousePosition.current = { x: event.clientX, y: event.clientY };
        };
        
        //마우스 이동 이벤트
        const handleMouseMove = (event: MouseEvent): void => {
            if (isRotateRef.current) {
                //현재 마우스 위치와 이전 마우스 위치 차이
                const deltaX = event.clientX - previousMousePosition.current.x;
                const deltaY = event.clientY - previousMousePosition.current.y;
                //카메라 회전 함수
                moveCameraRotation(deltaX, deltaY);
                //마우스 위치값 변경
                previousMousePosition.current = { x: event.clientX, y: event.clientY };
            }
        };
        //마우스 클릭 땠을때 이벤트
        const handleMouseUp = (): void => {
            //회전 멈춤
            isRotateRef.current = false;
            //감속 하면서 멈추는 함수
            applyInertia();
        };
        
        //모바일 터치땠을때 이벤트
        const handleTouchEnd = (): void => {
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
                if (intersects.length > 0) {
                    // 교차된 첫 번째 객체의 좌표를 기준으로 카메라 이동
                    moveCameraPosition(intersects[0].point);
                    
                }
            }
            // 마지막 터치 이벤트 시간 갱신
            prevTapTime.current = currentTime;
        };
        
        element.addEventListener('mousedown', handleMouseDown);
        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseup', handleMouseUp);
        element.addEventListener('touchend', handleTouchEnd);
        
        
        return () => {
            if (element) {
                element.removeEventListener('mousedown', handleMouseDown);
                element.removeEventListener('mousemove', handleMouseMove);
                element.removeEventListener('mouseup', handleMouseUp);
                element.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, []);
    
    
    useEffect(() => {
        if (cameraAction) {
            // 카메라 이동 애니메이션이 활성화되었을 때
            if (!animationFrameId.current && !orbitSetting.enable) {
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
    
    useEffect(() => {
        
        if (scene && scene.children.length > 0) {
            // const group = new THREE.Group()
            // scene.traverse((child: THREE.Object3D) => {
            //     // 타입 단언 사용
            //     if ((child as THREE.Mesh).isMesh) {
            //         const clone = child.clone();
            //         // 부모 변환을 적용하여 월드 좌표 기준으로 위치, 회전, 스케일 업데이트
            //         clone.applyMatrix4(child.matrixWorld);
            //         group.add(clone);
            //     }
            // });
            const boundingBox = new THREE.Box3().setFromObject(scene);
            const size = boundingBox.getSize(new THREE.Vector3()); // 모델 크기
            const center = boundingBox.getCenter(new THREE.Vector3()); // 모델 중심
            
            if (cameraSetting.isoView) {
                setOrbitSetting(pre => ({
                    ...pre,
                    enable: true,
                }));
                const position = new THREE.Vector3(
                    center.x + size.x,
                    center.y + size.y * 4,
                    center.z + size.z,
                );
                if (camera instanceof THREE.PerspectiveCamera) {
                    camera.fov = 25;
                    camera.updateProjectionMatrix();
                }
                // 카메라 전환
                switchCamera(position, center, 25);
            } else {
                setOrbitSetting(pre => ({
                    ...pre,
                    enable: false,
                }));
                
                switchCamera(
                    lastCameraInfo.position,
                    lastCameraInfo.target, 75,
                );
                
            }
        }
    }, [cameraSetting.isoView]);
    
    
    // isoView가 아닌 상태에서 OrbitControls이 활성화 되면 이전 바라보던 방향으로 설정
    useEffect(() => {
        if (!cameraSetting.isoView && orbit.current) {
            if (orbitSetting.enable) {
                updateOrbitTarget(lastCameraInfo.target);
            } else {
                updateCameraInfo();
            }
        }
    }, [orbitSetting.enable]);
    //
    
    return <OrbitControls ref={orbit} makeDefault
                          autoRotate={orbitSetting.autoRotate}
                          enabled={orbitSetting.enable}
                          onChange={e => {
                              console.log(e);
                              if (!cameraSetting.isoView) {
                                  const matrix = e?.target.object.matrix.clone();
                                  setCameraAtom(matrix);
                                  // if (orbitSetting.enable) {
                                  //     updateCameraInfo();
                                  // }
                              }
                          }}
    />;
};

export default UnifiedCameraControls;
