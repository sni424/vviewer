import { Pathfinding } from 'three-pathfinding';
import gsap from 'gsap';

import { Object3D, THREE } from '../../scripts/VTHREE';

interface MoveActionOptions {
  pathfinding?: {
    target: THREE.Vector3; // 이동할 경로 (Pathfinding)
    direction: THREE.Vector3; //도착했을때 카메라가 바라볼 방향
    speed: number; // 이동 속도
    model: THREE.Object3D; //바닥 모델델
  };
  linear?: {
    target: THREE.Vector3; // 목표 좌표 (Linear)
    duration: number; // 애니메이션 시간
  };
  teleport?: {
    target: THREE.Vector3; // 목표 좌표 (Teleport)
  };
} // 타입 정의
type MoveActionType = 'pathfinding' | 'linear' | 'teleport';

const rotateCameraSmoothly = (
  startDirection: THREE.Vector3,
  endDirection: THREE.Vector3,
  t: number,
) => {
  startDirection.y = 0;
  endDirection.y = 0;
  startDirection.normalize();
  endDirection.normalize();

  const quaternionA = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    endDirection,
  );
  const quaternionB = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    startDirection,
  );

  return new THREE.Quaternion().slerpQuaternions(quaternionB, quaternionA, t);
};

const handlePathfindingMove = (
  camera: Object3D,
  path: THREE.Vector3[],
  speed: number,
  direction: THREE.Vector3,
) => {
  if (path.length === 0) return; // 종료 조건 추가

  const startPosition = camera.position.clone(); // 초기 카메라 위치
  const startDirection = camera
    .getWorldDirection(new THREE.Vector3())
    .normalize(); // 초기 카메라 방향
  const newVector = new THREE.Vector3(path[0].x, 1, path[0].z); // 이동할 좌표
  const endDirection = newVector.clone().sub(startPosition).normalize(); // 이동할 방향
  const distance = camera.position.distanceTo(newVector); // 거리 계산

  // 애니메이션 실행
  const animation = gsap.to(camera.position, {
    x: newVector.x,
    y: 1,
    z: newVector.z,
    duration:
      distance > 8
        ? distance * (0.9 + speed)
        : distance < 2
          ? distance * (1.5 + speed)
          : distance + speed,
    onUpdate: function () {
      // 0에서 1까지 보간 값
      const progress = this.progress();
      // 회전이 빨리 끝나도록 설정
      const ratio = 0.6;
      // progress를 압축
      const adjustedProgress = Math.min(this.progress() / ratio, 1);
      //앞으로 남은 경로가 있을때 거의 다다랐을때 다음 경로 실행

      if (progress >= 0.9 && path.length > 1) {
        path.shift();

        handlePathfindingMove(camera, path, speed, direction); // 재귀 호출로 다음 경로 처리
        animation.kill();
        return;
      } else {
        //마지막 경로에서 카메라 방향 설정
        if (path.length === 1) {
          const quaternion = rotateCameraSmoothly(
            startDirection,
            direction,
            adjustedProgress,
          );
          camera.quaternion.copy(quaternion);
        } else {
          //이동하는 경로에따라 카메라 방향 설정
          const quaternion = rotateCameraSmoothly(
            startDirection,
            endDirection,
            adjustedProgress,
          );
          camera.quaternion.copy(quaternion);
        }
      }
    },
    onComplete: () => {
      path.shift(); // 현재 경로 제거
      animation.kill(); // 애니메이션 중지
    },
  });
};

const handleLinearMove = (
  camera: THREE.Camera,
  target: THREE.Vector3,
  duration: number,
) => {
  gsap.to(camera.position, {
    x: target.x,
    y: target.y,
    z: target.z,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      camera.lookAt(target);
    },
  });
};

const handleTeleportMove = (camera: THREE.Camera, target: THREE.Vector3) => {
  camera.position.set(target.x, target.y, target.z);
  camera.lookAt(target);
};

export const moveTo = (
  camera: THREE.Camera,
  action: MoveActionType,
  options: MoveActionOptions,
) => {
  switch (action) {
    case 'pathfinding':
      if (options.pathfinding) {
        const { target, speed, model, direction } = options.pathfinding;
        const ZONE = 'level';

        const pathFinding = new Pathfinding();

        const navMesh = model.getObjectByName('84B3_DP') as THREE.Mesh;

        if (navMesh) {
          const zone = Pathfinding.createZone(navMesh.geometry);
          pathFinding.setZoneData(ZONE, zone);

          const groupID = pathFinding.getGroup(ZONE, camera.position);
          const targetGroupID = pathFinding.getGroup(ZONE, target);
          const closestStartNode = pathFinding.getClosestNode(
            camera.position,
            'level',
            groupID,
          );
          const closestTargetNode = pathFinding.getClosestNode(
            target,
            'level',
            targetGroupID,
          );

          const path = pathFinding.findPath(
            closestStartNode.centroid,
            closestTargetNode.centroid,
            ZONE,
            groupID,
          );

          if (path) {
            handlePathfindingMove(camera, path, speed, direction);
          }
        }
      }
      break;

    case 'linear':
      if (options.linear) {
        handleLinearMove(
          camera,
          options.linear.target,
          options.linear.duration,
        );
      }
      break;

    case 'teleport':
      if (options.teleport) {
        handleTeleportMove(camera, options.teleport.target);
      }
      break;

    default:
      console.error('Invalid action type');
  }
};
