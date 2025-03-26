import { Layer } from '../Constants.ts';
import VMaterial from './material/VMaterial.ts';
import { ProbeMeshEventMap } from './ReflectionProbe.ts';
import { THREE } from './vthree/VTHREE.ts';

export type PlaneControlDirections = 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';

const _startPos = new THREE.Vector3();
const _startScale = new THREE.Vector3();
const _startPoint = new THREE.Vector3();
const _endPoint = new THREE.Vector3();
const _endPos = new THREE.Vector3();
const _endScale = new THREE.Vector3();
const _startMouse = new THREE.Vector2();
const _endMouse = new THREE.Vector2();
const _delta = new THREE.Vector3();

export default class CubePlaneControls {
  private mesh: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.Material,
    ProbeMeshEventMap
  > | null = null;
  private centerMeshes: {
    [key in PlaneControlDirections | string]: THREE.Mesh<
      THREE.BufferGeometry,
      VMaterial
    >;
  };
  private domElement: HTMLCanvasElement;
  private readonly camera: THREE.Camera;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private renderer: THREE.WebGLRenderer;
  private onControlDirection?: PlaneControlDirections | null;
  private dragging: boolean = false;
  private readonly directionVectors: {
    [key in PlaneControlDirections]: THREE.Vector3;
  };
  private readonly planes: { [key in 'forX' | 'forY' | 'forZ']: THREE.Plane } =
    {
      forX: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), // YZ 평면
      forY: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // XZ 평면
      forZ: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), // XY 평면
    };

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.raycaster.layers.enableAll();

    const centers: { [key in PlaneControlDirections]: THREE.Vector3 } = {
      'x+': new THREE.Vector3(0.5, 0, 0), // +X 면
      'x-': new THREE.Vector3(-0.5, 0, 0), // -X 면
      'y+': new THREE.Vector3(0, 0.5, 0), // +Y 면
      'y-': new THREE.Vector3(0, -0.5, 0), // -Y 면
      'z+': new THREE.Vector3(0, 0, 0.5), // +Z 면
      'z-': new THREE.Vector3(0, 0, -0.5), // -Z 면
    };

    this.directionVectors = Object.fromEntries(
      Object.entries(centers).map(([key, value]) => [
        key as PlaneControlDirections,
        value.clone().normalize(),
      ]),
    ) as { [key in PlaneControlDirections]: THREE.Vector3 };

    const centerMeshObject: {
      [key in PlaneControlDirections | string]: THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshStandardMaterial
      >;
    } = {};

    Object.entries(centers).map(([key, value]) => {
      const sm = createSampleMesh(value);
      sm.vUserData.isProbeMesh = true;
      sm.vUserData.probeMeshType = 'plane-controls';
      sm.vUserData.probeControlDirection = key as PlaneControlDirections;
      centerMeshObject[key] = sm;
      return sm;
    });

    this.camera = camera;
    this.renderer = renderer;
    this.domElement = renderer.domElement;
    this.centerMeshes = centerMeshObject;

    this.domElement.addEventListener('pointermove', event => {
      if (this.mesh) {
        this.onPointerHover(event);
      }
    });

    this.domElement.addEventListener('pointerdown', event => {
      if (this.mesh) {
        this.onPointerDown(event);
      }
    });

    this.domElement.addEventListener('pointerup', event => {
      if (this.mesh) {
        this.onPointerUp(event);
      }
    });
  }

  onPointerHover(event: PointerEvent | MouseEvent): void {
    this.pointHover(getPointer(event));
  }

  onPointerDown(event: PointerEvent | MouseEvent): void {
    this.pointerDown(getPointer(event));
  }

  onPointerUp(event: PointerEvent | MouseEvent): void {
    this.pointerUp(getPointer(event));
  }

  pointHover(pointer: THREE.Vector2) {
    this.updateArrowOpacity(pointer);
  }

  pointerDown(pointer: THREE.Vector2) {
    const mesh = this.mesh!!;
    if (!mesh.parent) {
      // mesh must be on scene
      console.warn(
        'CubePlaneControls.pointerDown() => 메시가 Scene 에 추가되지 않은 상황입니다.',
      );
      return;
    }

    _startPos.copy(mesh.position);
    _startScale.copy(mesh.scale);

    const caught = this.catchDirection(pointer);
    if (caught) {
      const { direction, point } = caught;
      this.onControlDirection = direction;
      this.updateDragging(true);
      _startPoint.copy(point);

      console.log(point);

      this.domElement.addEventListener('pointermove', event => {
        this.pointerMove(getPointer(event));
      });
    }
  }

  private getTargetPlane(direction: PlaneControlDirections) {
    if (direction.includes('x')) {
      return this.planes.forX;
    } else if (direction.includes('y')) {
      return this.planes.forY;
    } else if (direction.includes('z')) {
      return this.planes.forZ;
    } else {
      throw new Error('Invalid direction, direction : ' + direction);
    }
  }

  pointerMove(pointer: THREE.Vector2) {
    if (this.dragging) {
      if (this.onControlDirection) {
        // console.log(`dragging TO: `, this.onControlDirection, ', ', pointer);
        const directionVector = this.directionVectors[this.onControlDirection];
        const intersection = this.catchCoord(pointer, this.onControlDirection);
        _delta.copy(intersection).sub(_startPoint);
        console.log('delta : ', _delta.x, _delta.y, _delta.z);
        const changed = _delta.dot(directionVector);
        const mesh = this.mesh!!;
        const isMinus = this.onControlDirection.includes('-');
        const axis: 'x' | 'y' | 'z' = this.onControlDirection
          .replace('+', '')
          .replace('-', '') as 'x' | 'y' | 'z';
        const originalScale = mesh.scale;
        const originalOffset = calculatePositionScale(originalScale[axis]);
        console.log('changed : ', changed);
        mesh.scale[axis] += changed;
        let newOffset = calculatePositionScale(mesh.scale[axis]);
        if (isMinus) {
          newOffset = -newOffset;
        }

        mesh.position[axis] = mesh.position[axis] - originalOffset + newOffset;

        _startPoint.copy(intersection);
      } else {
        console.warn(
          'CubePlaneControls.pointerMove() => onControlDirection 세팅 안됨 => onPointerDown 확인',
        );
      }
    }
  }

  pointerUp(pointer: THREE.Vector2) {
    if (this.dragging) {
      this.updateDragging(false);
      this.domElement.removeEventListener('pointermove', event => {
        this.pointerMove(pointer);
      });
      this.updateArrowOpacity(pointer);
    }
  }

  updateDragging(dragging: boolean) {
    console.log('updateDragging : ', dragging);
    this.dragging = dragging;
    document.dispatchEvent(
      new CustomEvent('control-dragged', { detail: { moving: dragging } }),
    );
  }

  catchDirection(pointer: THREE.Vector2) {
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersects = intersectWithRay(this.mesh!!, this.raycaster);
    if (intersects) {
      const { object, point } = intersects;
      const direction = object.vUserData.probeControlDirection!!;
      return { targetArrow: object, direction, point };
    }
    return null;
  }

  catchCoord(pointer: THREE.Vector2, direction: PlaneControlDirections) {
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(
      this.getTargetPlane(direction),
      intersection,
    );

    console.log('좌표 : ', intersection.x, intersection.y, intersection.z);
    return intersection;
  }

  attach(mesh: THREE.Mesh) {
    if (
      !(mesh.vUserData.isProbeMesh && mesh.vUserData.probeMeshType === 'box')
    ) {
      // 현재 프로브 박스에만 두 요소가 존재
      throw new Error('TEST: 현재 Probe Mesh Box 에만 적용 가능합니다.');
    }

    // Mesh 할당
    this.mesh = mesh as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.Material,
      ProbeMeshEventMap
    >;
    // 컨트롤러 넣기 전 설정
    const centerMeshes = Object.values(this.centerMeshes).map(sm => {
      sm.scale.copy(mesh.scale.clone().revert());
      return sm;
    });

    // 컨트롤러 메시에 부착
    this.mesh.add(...centerMeshes);

    // 메시 변화 시 컨트롤러 scale 맞추기
    this.mesh.addEventListener('updated', event => {
      Object.values(this.centerMeshes).forEach(sm => {
        sm.scale.copy(mesh.scale.clone().revert());
      });
    });
  }

  detach() {
    if (this.mesh) {
      Object.values(this.centerMeshes).forEach(child => {
        child.removeFromParent();
      });
      this.mesh!!.removeEventListener('updated', () => { });
      this.mesh = null;
    } else {
      console.warn('CubePlaneControls.detach() occurred After detached');
    }
  }

  updateArrowOpacity(pointer: THREE.Vector2) {
    if (!this.dragging) {
      this.resetAllArrowOpacity();
      const caught = this.catchDirection(pointer);
      if (caught) {
        const { targetArrow } = caught;
        targetArrow.material.opacity = 0.5;
      }
    }
  }

  resetAllArrowOpacity() {
    Object.values(this.centerMeshes).forEach(o => {
      if (o.material.opacity !== 1) {
        o.material.opacity = 1;
      }
    });
  }
}

function intersectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster) {
  const allIntersections = raycaster.intersectObject(object, true);
  const onlyArrowMeshes = allIntersections.filter(o => {
    return (
      o.object.vUserData.isProbeMesh &&
      o.object.vUserData.probeMeshType === 'plane-controls' &&
      o.object.vUserData.probeControlDirection
    );
  });

  if (onlyArrowMeshes.length > 0) {
    return {
      object: onlyArrowMeshes[0].object as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshStandardMaterial
      >,
      point: onlyArrowMeshes[0].point,
    };
  } else {
    return null;
  }
}

function getPointer(event: PointerEvent | MouseEvent) {
  const mouse = new THREE.Vector2();
  const rect = event.currentTarget.getBoundingClientRect();
  const xRatio = (event.clientX - rect.left) / rect.width;
  const yRatio = (event.clientY - rect.top) / rect.height;

  mouse.x = xRatio * 2 - 1;
  mouse.y = -yRatio * 2 + 1;
  return mouse;
}

function createSampleMesh(position: THREE.Vector3) {
  const geometry = new THREE.SphereGeometry(0.1, 32, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.layers.set(Layer.ReflectionBox);
  return mesh;
}

function calculatePositionScale(scaleScalar: number) {
  return (scaleScalar - 1) / 2;
}
