import { RootState } from '@react-three/fiber';
import gsap from 'gsap';
import { get, set } from 'idb-keyval';
import * as THREE from './vthree/VTHREE.ts';

import objectHash from 'object-hash';
import pako from 'pako';
import { TransformControls } from 'three-stdlib';
import { EXRLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { v4 } from 'uuid';
import { ENV, Layer } from '../Constants';
import { FileInfo, MoveActionOptions, View, WallPoint, WallPointView, WallView } from '../types.ts';
import {
  addPoints,
  BenchMark,
  cameraSettingAtom,
  getAtomValue,
  getWallOptionAtom,
  lastCameraInfoAtom,
  pathfindingAtom,
  selectedAtom,
  threeExportsAtom,
} from './atoms';
import { uploadExrToKtx } from './atomUtils.ts';
import VGLTFLoader from './loaders/VGLTFLoader.ts';
import ReflectionProbe from './ReflectionProbe.ts';
import VGLTFExporter from './VGLTFExporter.ts';
import { VUserData } from './vthree/VTHREETypes.ts';

export const groupInfo = (
  group: THREE.Group | { scene: THREE.Group } | THREE.Scene | THREE.Object3D,
) => {
  // triangle, vertices, mesh count
  const scene = ((group as GLTF).scene ?? group) as THREE.Group;
  let triangleCount = 0;
  let vertexCount = 0;
  let meshCount = 0;
  let object3dCount = 0;
  let nodeCount = 0;
  scene.traverse((node: THREE.Object3D) => {
    if (node.isSystemGenerated()) {
      return;
    }

    // if (isGizmo(node)) {
    //     return;
    // }

    // if (node.type === "BoxHelper") {
    //     return;
    // }
    if (node instanceof THREE.Mesh) {
      try {
        const geometry = node.geometry;
        if (geometry instanceof THREE.BufferGeometry) {
          triangleCount += geometry.index!.count / 3;
          vertexCount += geometry.attributes.position.count;
          meshCount++;
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (node instanceof THREE.Object3D) {
      object3dCount++;
    }
    nodeCount++;
  });
  return { triangleCount, vertexCount, meshCount, nodeCount, object3dCount };
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const toNthDigit = (num: number, digit: number): string => {
  const isNegative = num < 0;
  const positivePart = Math.abs(num);

  // add dot with pad
  const multiplied = Math.round(positivePart * Math.pow(10, digit));
  const padded = multiplied.toString().padStart(digit, '0');
  const integerPart = padded.slice(0, -digit);
  const decimalPart = padded.slice(-digit);

  return `${isNegative ? '-' : ''}${integerPart.length === 0 ? '0' : integerPart}.${decimalPart}`;
};

export const getIntersectLayer = (
  e: React.MouseEvent,
  threeExports: RootState | null,
  layer: Layer,
  raycaster: THREE.Raycaster = new THREE.Raycaster(),
) => {
  if (!threeExports) {
    console.error(
      'Three가 셋업되지 않은 상태에서 Intersect가 불림 @useEditorInputEvents',
    );
    return [];
  }
  const { scene, camera } = threeExports;
  const mouse = new THREE.Vector2();
  const rect = e.currentTarget.getBoundingClientRect();
  const xRatio = (e.clientX - rect.left) / rect.width;
  const yRatio = (e.clientY - rect.top) / rect.height;

  mouse.x = xRatio * 2 - 1;
  mouse.y = -yRatio * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  raycaster.layers.set(layer);

  return raycaster.intersectObjects(scene.children, true);
};

export const getIntersects = (
  e: React.MouseEvent,
  threeExports: RootState | null,
  raycaster: THREE.Raycaster = new THREE.Raycaster(),
) => {
  if (!threeExports) {
    console.error(
      'Three가 셋업되지 않은 상태에서 Intersect가 불림 @useEditorInputEvents',
    );
    return {
      intersects: [],
      mesh: [],
    };
  }
  const { scene, camera } = threeExports;
  const mouse = new THREE.Vector2();
  const rect = e.currentTarget.getBoundingClientRect();
  const xRatio = (e.clientX - rect.left) / rect.width;
  const yRatio = (e.clientY - rect.top) / rect.height;

  mouse.x = xRatio * 2 - 1;
  mouse.y = -yRatio * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const defaultFilteredObjects = scene.children.filter(
    obj => !obj.isTransformControl() && !obj.isBoxHelper(),
  );
  const intersects = (
    raycaster.intersectObjects(
      defaultFilteredObjects,
      true,
    ) as THREE.Intersection[]
  ).filter(
    intersect => intersect.object.visible && intersect.object.isParentVisible(),
  );

  const mesh = intersects.filter(
    obj => obj.object.type === 'Mesh',
  ) as THREE.Intersection<THREE.Mesh>[];

  return { intersects, mesh };
};

export const saveScene = async (scene: THREE.Scene) => {
  return new Promise(async (resolve, reject) => {
    const glbArr = (await new VGLTFExporter().parseAsync(scene, {
      binary: true,
    })) as ArrayBuffer;
    const blob = new Blob([glbArr], { type: 'application/octet-stream' });
    const key = 'savedScene';

    set(key, blob)
      .then(() => {
        resolve(true);
        return true;
      })
      .catch(e => {
        console.error(e);
        reject(false);
      });
  });
};

// Object 가 TransformControls 의 객체 중 일부인지?
export const isTransformControlOrChild = (object: THREE.Object3D) => {
  let current = object;
  while (current) {
    if (
      current instanceof TransformControls ||
      current.vUserData.isTransformControls
    ) {
      return true; // Skip if it's part of TransformControls
    }
    //@ts-ignore
    current = current.parent;
  }
  return false;
};

// Object 가 Probe 의 Mesh 인지?
export const isProbeMesh = (object: THREE.Object3D) => {
  return object.vUserData.isProbeMesh !== undefined;
};

export const loadScene = async (): Promise<THREE.Object3D | undefined> => {
  return new Promise(async (resolve, reject) => {
    const key = 'savedScene';
    get(key)
      .then(async blob => {
        if (!blob) {
          reject(undefined);
          return;
        }
        // const loader = new THREE.ObjectLoader();
        // const scene = loader.parse(json);
        const loader = VGLTFLoader.instance;
        const url = URL.createObjectURL(blob);
        const gltf = await loader.loadAsync(url);
        resolve(gltf.scene);
      })
      .catch(e => {
        console.error(e);
        reject(undefined);
      });
  });
};

export function compressObjectToFile(obj: object, fileName: string): File {
  // Convert the object to a JSON string
  const jsonString = JSON.stringify(obj);

  // Compress the JSON string using pako
  const compressed = pako.gzip(jsonString);

  // Create a Blob from the compressed data
  const blob = new Blob([compressed], { type: 'application/gzip' });

  // Return a File instance
  return new File([blob], fileName, { type: 'application/gzip' });
}

export async function decompressFileToObject<T = any>(url: string): Promise<T> {
  return fetch(url, {
    cache: 'no-store',
  })
    .then(res => res.arrayBuffer())
    .then(buffer => {
      const decompressed = pako.ungzip(buffer, { to: 'string' });
      return JSON.parse(decompressed) as T;
    });
}

export async function cached(file: FileInfo): Promise<boolean> {
  return get(objectHash(file)).then(data => {
    return Boolean(data);
  });
}

export async function loadFile(file: FileInfo): Promise<Blob> {
  const hash = objectHash(file);
  return get(hash).then(data => {
    if (!data) {
      return fetch(file.fileUrl)
        .then(res => res.blob())
        .then(data => {
          return set(hash, data).then(_ => {
            return data;
          });
        });
    }
    return data;
  });
}

async function validateHash() {
  const latestHashUrl = ENV.latestHash;
  if (!latestHashUrl) {
    throw new Error('.env Error : latestHash');
  }

  // Get Local Hash
  const localLatestHash = await get('latest-hash');
  // Get Remote Hash
  const remoteLatestHash = JSON.parse(
    // -> JSON.parse()
    pako.ungzip(
      // pako.ungzip
      await (await fetch(latestHashUrl, { cache: 'no-store' })).arrayBuffer(), // 호출 후 result -> arrayBuffer
      { to: 'string' },
    ),
  );
  const localEmpty = !localLatestHash; // 로컬 해시 없을 때
  const areDifferent = localLatestHash !== remoteLatestHash; // Remote Hash 랑 다를 때
  const result = localEmpty || areDifferent;

  if (areDifferent) {
    await set('latest-hash', remoteLatestHash);
  }

  return result;
}

function getGLTFLoader(gl: THREE.WebGLRenderer) {
  if (VGLTFLoader.instance) {
    return VGLTFLoader.instance;
  } else {
    return new VGLTFLoader(gl);
  }
}

export const loadLatest = async ({
  threeExports,
  mobile,
  addBenchmark: _addBenchmark,
  closeToast,
}: {
  threeExports: RootState;
  mobile?: boolean;
  addBenchmark?: (key: keyof BenchMark, value?: number) => void;
  closeToast?: () => void;
}) => {
  const addBenchMark = _addBenchmark ?? (() => { });
  const base = ENV.base;
  if (!base) {
    alert('.env에 환경변수를 설정해주세요, VITE_MODELS_URL');
    return;
  }
  const latestUrl = mobile ? ENV.latestMobile : ENV.latest;
  if (!threeExports) {
    alert('threeExports 분기 문제');
    return;
  }
  addBenchMark('start');
  const { scene, gl } = threeExports;

  /** Model Load **/
  const loadModel = async () => {
    let blob;
    addBenchMark('downloadStart');
    if (await validateHash()) {
      // CACHE UPDATE
      blob = await fetch(latestUrl, { cache: 'no-store' }).then(res =>
        res.blob(),
      );
      await set('latest', blob);
    } else {
      blob = await get('latest');
    }
    addBenchMark('downloadEnd');
    const url = URL.createObjectURL(blob);
    const loader = getGLTFLoader(threeExports.gl);
    addBenchMark('parseStart');
    const info = getGLStatus(gl);
    console.log('before load : ', info.geometries, info.textures);
    return loader.loadAsync(url);
  };

  /** Model Apply On Scene **/
  const applyModel = (glTF: GLTF) => {
    addBenchMark('parseEnd');
    addBenchMark('sceneAddStart');
    const parsedScene = glTF.scene;
    setAsModel(parsedScene);
    const info = getGLStatus(gl);
    console.log('before add : ', info.geometries, info.textures);
    scene.add(parsedScene);
    const afterInfo = getGLStatus(gl);
    parsedScene.traverseAll(t => {
      if (t.type === 'Mesh') {
        const m = t as THREE.Mesh;
        m.geometry.dispose();
        const mat = m.material as THREE.Material;
        disposeMaterial(mat as THREE.Material);
      }
    });
    console.log('after add : ', afterInfo.geometries, afterInfo.textures);
    addBenchMark('sceneAddEnd');
  };

  function disposeMaterial(material: THREE.Material) {
    if (!material) return;

    // 사용된 모든 텍스처를 dispose
    const textureKeys = [
      'map',
      'lightMap',
      'aoMap',
      'emissiveMap',
      'bumpMap',
      'normalMap',
      'displacementMap',
      'roughnessMap',
      'metalnessMap',
      'alphaMap',
      'envMap',
      'clearcoatMap',
      'clearcoatNormalMap',
      'clearcoatRoughnessMap',
      'sheenColorMap',
      'sheenRoughnessMap',
      'specularMap',
      'specularColorMap',
      'transmissionMap',
      // 'thicknessMap',
    ];

    textureKeys.forEach(key => {
      if ((material as any)[key]) {
        ((material as any)[key] as { dispose: () => void }).dispose(); // 텍스처 메모리 해제
        // material[key] = null;     // 참조 제거
      }
    });

    // material 자체 dispose
    material.dispose();
  }

  /** Process **/
  return loadModel()
    .then(applyModel)
    .catch(e => {
      console.error(e);
      alert('모델을 불러오는데 실패했습니다. : ' + e.message);
    })
    .finally(() => {
      addBenchMark('end');
      closeToast?.();
    });
};

export const listFilesFromDrop = async (
  dataTransferItems: DataTransferItemList,
  acceptedExtensions: string[] = [],
) => {
  const items = Array.from(dataTransferItems).map(item => ({
    entry: item.webkitGetAsEntry?.(),
    file: item.getAsFile(),
  }));

  const files: File[] = [];

  for (const item of items) {
    const { entry, file } = item;
    if (entry) {
      if (entry.isFile) {
        if (
          file &&
          acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
        ) {
          files.push(file);
        }
      } else if (entry.isDirectory) {
        const directoryFiles = await readDirectory(
          entry as FileSystemDirectoryEntry,
          acceptedExtensions,
        );
        files.push(...directoryFiles);
      }
    }
  }

  return files;
};

export const loadPNGAsENV = (
  path: string,
  gl: THREE.WebGLRenderer,
): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const pmremGenerator = new THREE.PMREMGenerator(gl);
        pmremGenerator.compileEquirectangularShader();
        const compiled = pmremGenerator.fromEquirectangular(texture).texture;
        compiled.vUserData.isCustomEnvMap = true;

        texture.dispose();
        resolve(compiled);
      },
      undefined,
      error => reject(error),
    );
  });
};

export const loadHDRTexture = (path: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    // const loader = new RGBELoader();
    const loader = new EXRLoader();
    loader.load(
      path,
      texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      error => reject(error),
    );
  });
};

export const zoomToSelected = (obj?: THREE.Object3D) => {
  // const three = getAtomValue(threeExportsAtom);
  const three = window.getThree(View.Shared);
  if (!three) {
    return;
  }
  const { scene, camera, orbitControls } = three as typeof three & {
    orbitControls?: OrbitControls;
  };

  let dst: THREE.Object3D = obj!;
  if (!dst) {
    const uuid = getAtomValue(selectedAtom)[0];
    if (!uuid) {
      return;
    }
    dst = scene.getObjectByProperty('uuid', uuid)!;
    if (!dst) {
      return;
    }
  }

  const box = new THREE.Box3().setFromObject(dst);
  const center = box.getCenter(new THREE.Vector3());

  // zoom out to fit the box into view
  const size = box.getSize(new THREE.Vector3()).length();
  const dist = size;
  const dir = camera.position.clone().sub(center).normalize();
  dir.multiplyScalar(dist * 0.8);
  camera.position.copy(center).add(dir);
  camera.lookAt(center);
  if (orbitControls instanceof OrbitControls) {
    orbitControls.target = center;
    orbitControls.update();
  }
  camera.updateProjectionMatrix();
};

//카메라 moveTo함수시 카메라 회전 함수
const rotateCameraSmoothly = (
  startQuaternion: THREE.Quaternion,
  endQuaternion: THREE.Quaternion,
  t: number,
  preventFlip: boolean = true, // 카메라 뒤집힘 방지 옵션
) => {
  // 두 쿼터니언 간 부드러운 회전 보간
  const result = new THREE.Quaternion().slerpQuaternions(
    startQuaternion,
    endQuaternion,
    t,
  );

  if (preventFlip) {
    // 회전값 각도로 변환하여 Z축 회전 방지
    const euler = new THREE.Euler().setFromQuaternion(result, 'YXZ');
    euler.z = 0;
    result.setFromEuler(euler);
  }

  return result;
};
// 현재 애니메이션 인스턴스를 저장
let currentAnimation: gsap.core.Tween | null = null;
// 이미 세그먼트를 바꿨는지 여부
let didShift = false;

/**
 사전 세팅
 */
function setupPathData(
  camera: THREE.Object3D,
  target: THREE.Vector3,
  initialPath: THREE.Vector3[],
) {
  if (!initialPath || initialPath.length === 0) {
    return {
      pathPoints: [],
      segments: [],
      totalDistance: 0,
      ratiosSumOne: [], // 전체 합이 1이 되는 비율 배열
    };
  }

  // 경로 점들 설정
  const pathPoints = [
    camera.position.clone(),
    ...initialPath.map(p => new THREE.Vector3(p.x, target.y, p.z)),
  ];

  // 세그먼트와 전체 거리 계산
  const segments: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    distance: number;
  }[] = [];
  let totalDistance = 0;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const start = pathPoints[i];
    const end = pathPoints[i + 1];
    const dist = start.distanceTo(end);
    segments.push({ start, end, distance: dist });
    totalDistance += dist;
  }

  // "각 구간 비율" = 구간 길이 / 전체 길이
  // --> 이 배열 원소들을 전부 더하면 이론상 1이어야 함.
  let ratios = segments.map(seg => {
    if (totalDistance === 0) return 0;
    return seg.distance / totalDistance;
  });

  // 혹시 부동소수점 오차가 있으면 마지막 원소를 보정해서 합이 정확히 1이 되도록
  const sum = ratios.reduce((acc, r) => acc + r, 0);
  if (ratios.length > 0) {
    const diff = 1 - sum;
    // 강제로 맞추기
    ratios[ratios.length - 1] += diff;
  }

  return {
    // 3D 좌표들
    pathPoints,
    // start, end, distance 등
    segments,
    // 총 거리
    totalDistance,
    // 총거리에 따른 비율율
    ratiosSumOne: ratios,
  };
}

//경로 이동
const handlePathFindingMove = (
  camera: THREE.Object3D,
  target: THREE.Vector3,
  initialPath: THREE.Vector3[],
  speed: number,
  quaternion?: THREE.Quaternion,
  onComplete: gsap.Callback = () => { },
) => {
  // path없으면 동작x
  if (initialPath.length === 0) return;

  // 경로 세팅 (한 번만)
  const { segments } = setupPathData(camera, target, initialPath);
  //  세그먼트를 순차로 이동
  let currentSegmentIndex = 0;
  const speedFactor = Math.max(0.1, 1 / speed);

  function moveToNextSegment() {
    if (currentSegmentIndex >= segments.length) {
      console.log('All path segments completed');
      return;
    }

    const { start, end, distance } = segments[currentSegmentIndex];

    const isLastSegment = currentSegmentIndex === segments.length - 1;
    // 각 세그먼트의 회전 계산
    //현재 카메라의 회전값값
    const startQuat = camera.quaternion.clone();
    //끝점과 시작점을 이용해 normalize로 바라볼 방향을 결정
    const segDirection = end.clone().sub(start).normalize();
    //setFromUnitVectors로 두 벡터 간의 회전을 정의하는 쿼터니언을 생성
    const segQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, -1), // 카메라 기본 방향
      segDirection,
    );

    //마지막 경로면 quaternion설정해둔 회전값 그게 아니면 segQuat 생성한 회전값
    const endQuat = isLastSegment && quaternion ? quaternion : segQuat;

    currentAnimation = gsap.to(
      { t: 0 },
      {
        t: 1,
        duration: distance * speedFactor,
        ease: 'power2.inOut',
        onStart() {
          // 새로운 세그먼트를 시작할 때마다 false 리셋
          didShift = false;
        },
        onUpdate() {
          const progress = this.targets()[0].t;
          // 90% 도달 & 아직 세그먼트 전환 안했다면
          if (
            progress > 0.99 &&
            !didShift &&
            currentSegmentIndex < segments.length - 1
          ) {
            // 중복호출 방지
            didShift = true;
            if (currentAnimation) {
              currentAnimation.kill();
              // 세그먼트 인덱스 하나 증가
              currentSegmentIndex++;
              // 다음 세그먼트 시작
              moveToNextSegment();
            }
            return;
          }

          // 카메라 이동
          const pos = new THREE.Vector3().lerpVectors(start, end, progress);
          camera.position.copy(pos);
          //카메라 회전
          if (quaternion) {
            const newQuat = rotateCameraSmoothly(startQuat, endQuat, progress);
            camera.quaternion.copy(newQuat);
          }
        },
        onComplete,
      },
    );
  }

  // 최초 호출
  moveToNextSegment();
};

//직선거리 이동

const handleLinearMove = (
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  quaternion: THREE.Quaternion,
  speed: number,
  cameraFov?: number,
  onComplete: gsap.Callback = () => { },
) => {
  const startPosition = camera.position.clone();
  const timeline = gsap.timeline();

  const startQuat = camera.quaternion.clone();
  // 카메라 이동
  timeline.to(
    { t: 0 },
    {
      t: 1,
      duration: speed,
      ease: 'power2.inOut',
      onUpdate: function () {
        const progress = this.targets()[0].t;
        //카메라 이동
        const pos = new THREE.Vector3().lerpVectors(
          startPosition,
          target,
          progress,
        );
        camera.position.copy(pos);

        // 카메라 회전
        const newQuat = rotateCameraSmoothly(startQuat, quaternion, progress);
        camera.quaternion.copy(newQuat);
      },
      onComplete,
    },
  );

  //카메라 fov값 변경경
  if (cameraFov !== undefined) {
    timeline.to(
      camera,
      {
        fov: cameraFov,
        duration: speed,
        ease: 'power2.out',
        onUpdate: () => {
          camera.updateProjectionMatrix();
        },
      },
      0, // 첫 번째 애니메이션과 동시에(혹은 "<" 사용)
    );
  }
};

const handleTeleportMove = (
  camera: THREE.PerspectiveCamera,
  matrix: number[],
) => {
  //배열을 matrix4로 변형
  const threeMatrix = new THREE.Matrix4().fromArray(matrix);

  //매트릭스 일 경우 포지션 이동
  camera.position.setFromMatrixPosition(threeMatrix);
  camera.updateMatrixWorld(true);
  // camera.position.set(target.x, target.y, target.z);
  //메트릭스 일경우
  camera.rotation.setFromRotationMatrix(threeMatrix);
  camera.matrixWorldNeedsUpdate = true;
  //방향일경우
  // const newTarget = camera.position.clone().add(direction);
  // camera.lookAt(newTarget);
  //좌표일경우
  // camera.lookAt(target)
};

//카메라 moveTo함수
export const moveTo = (
  camera: THREE.PerspectiveCamera,
  action: MoveActionOptions,
) => {
  if (action.pathFinding) {
    const { stopAnimation, matrix } = action.pathFinding;
    const cameraSetting = getAtomValue(cameraSettingAtom);
    if (stopAnimation && currentAnimation) {
      currentAnimation.kill();
      return;
    }

    const ZONE = 'level';

    if (matrix) {
      //배열을 matrix4로 변형
      const threeMatrix = new THREE.Matrix4().fromArray(matrix);
      // 위치, 회전, 스케일을 저장할 객체 생성
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      // 행렬에서 position, rotation, scale 추출
      threeMatrix.decompose(position, quaternion, scale);

      const pathFinding =
        action.pathFinding.pathfinder ??
        getAtomValue(pathfindingAtom)?.pathfinding;
      if (!pathFinding) {
        throw new Error('pathFinding is not defined @moveTo');
      }

      const groupID = pathFinding.getGroup(ZONE, camera.position);
      const targetGroupID = pathFinding.getGroup(ZONE, position);

      addPoints(
        {
          point: camera.position,
          color: 'blue',
          id: 'start',
        },
        {
          point: position,
          color: 'green',
          id: 'target',
        },
      );

      const closestStartNode = pathFinding.getClosestNode(
        camera.position,
        ZONE,
        groupID,
      );
      const closestTargetNode = pathFinding.getClosestNode(
        position,
        ZONE,
        targetGroupID,
      );
      const path = pathFinding.findPath(
        closestStartNode.centroid,
        closestTargetNode.centroid,
        ZONE,
        groupID,
      );
      if (path) {
        //해당 죄표의 인덱스를 찾아서 현재 인덱스랑 같은지 비교
        const filteredPath = path.filter((point, index, self) => {
          console.log(
            self,
            point,
            index,
            self.findIndex(p => p.equals(point)),
          );
          return index === self.findIndex(p => p.equals(point));
        });
        const newPath = [...filteredPath];
        newPath.pop();
        newPath.push(position);
        addPoints(
          ...newPath.map(vector => ({
            point: new THREE.Vector3(vector.x, 0.05, vector.z),
            color: 'yellow',
          })),
        );

        handlePathFindingMove(
          camera,
          position,
          newPath,
          cameraSetting.moveSpeed,
          quaternion,
          action.onComplete,
        );
      } else {
        throw new Error('no path');
      }
    }
  }

  if (action.linear) {
    const { matrix, duration, fov } = action.linear;
    //배열을 matrix4로 변형
    const threeMatrix = new THREE.Matrix4().fromArray(matrix);
    // 위치, 회전, 스케일을 저장할 객체 생성
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    // 행렬에서 position, rotation, scale 추출
    threeMatrix.decompose(position, quaternion, scale);
    handleLinearMove(
      camera,
      position,
      quaternion,
      duration,
      fov,
      action.onComplete,
    );
  }

  if (action.teleport) {
    const { matrix } = action.teleport;
    handleTeleportMove(camera, matrix);
  }
};

export const setAsModel = (object: THREE.Object3D) => {
  object.layers.enable(Layer.Model);
  object.children.forEach(setAsModel);
  return object;
};

export const resetGL = (threeExports?: RootState) => {
  if (!threeExports) {
    return;
  }
  const { gl, scene, camera } = threeExports;
  if (!gl || !gl.info || !gl.info.programs) {
    return;
  }
  scene.traverse((object: THREE.Object3D) => {
    if ((object as { material?: THREE.Material }).material)
      gl.properties.remove((object as THREE.Mesh).material);
  });
  gl.info.programs.length = 0;
  gl.compile(scene, camera);
};

export const readDirectory = async (
  directoryEntry: FileSystemDirectoryEntry,
  acceptedExtensions: string[],
) => {
  const reader = directoryEntry.createReader();
  const entries: File[] = [];

  const readEntries = async (): Promise<void> => {
    const results = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );

    if (results.length === 0) return;

    for (const entry of results) {
      if (entry.isFile) {
        const file = await new Promise<File | null>((res, rej) =>
          (entry as FileSystemFileEntry).file(res, rej),
        );
        if (
          file &&
          acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
        ) {
          entries.push(file);
        }
      } else if (entry.isDirectory) {
        const nestedFiles = await readDirectory(
          entry as FileSystemDirectoryEntry,
          acceptedExtensions,
        );
        entries.push(...nestedFiles);
      }
    }

    await readEntries(); // 계속해서 읽기
  };

  await readEntries();
  return entries;
};

export const getModelArrangedScene = (scene: THREE.Scene) => {
  const cloned = scene.clone();
  const toDelete: string[] = [];
  cloned.traverseAll(object => {
    if (!object.layers.isEnabled(Layer.Model)) {
      toDelete.push(object.uuid);
    }
  });

  const elementsToDelete = toDelete
    .map(uuid => {
      return cloned.getObjectByProperty('uuid', uuid);
    })
    .filter(e => e !== undefined);

  elementsToDelete.forEach(e => {
    e.removeFromParent();
  });

  return cloned;
};

export const uploadExrLightmap = async (
  object: THREE.Object3D,
  isMobile?: boolean,
) => {
  // 같은 라이트맵을 공유하는 material 검출
  // { hash : [mat1, mat2] }
  const lightmapHashes: { [key in string]: THREE.Material[] } = {};

  object.traverseAll(async obj => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.matStandard;
      const isEXR = (tex: THREE.Texture) =>
        tex.vUserData.isExr !== undefined && tex.vUserData.isExr;
      const isKTX = (tex: THREE.Texture) =>
        tex.vUserData.mimeType === 'image/ktx2';

      // Lightmap to HashMap
      const addLightMapToHash = (hashKey: string, material: THREE.Material) => {
        if (!lightmapHashes[hashKey]) {
          lightmapHashes[hashKey] = [];
        }
        lightmapHashes[hashKey].push(material);
      };

      // 250110 추가
      if (mat && mat.lightMap) {
        console.log('lightmap in : ', mat.vUserData);
        const lightMap = mat.lightMap;
        const isDpRelatedModel = mesh.vUserData.modelType !== undefined;

        if (isDpRelatedModel) {
          const modelType = mesh.vUserData.modelType!;

          if (modelType === 'DP') {
            const dpOnHash = mat.vUserData.dpOnTextureFile;
            if (dpOnHash && dpOnHash.endsWith('.exr')) {
              addLightMapToHash(dpOnHash, mat);
            }
          } else {
            const dpOffHash = mat.vUserData.dpOffTextureFile;
            const dpOnHash = mat.vUserData.dpOnTextureFile;

            if (dpOffHash && dpOffHash.endsWith('.exr'))
              addLightMapToHash(dpOffHash, mat);
            if (dpOnHash && dpOnHash.endsWith('.exr'))
              addLightMapToHash(dpOnHash, mat);
          }
        } else if (isEXR(lightMap) || isKTX(lightMap)) {
          if (!mat.vUserData.lightMap && lightMap.vUserData.lightMap) {
            mat.vUserData.lightMap = lightMap.vUserData.lightMap;
          }

          const lightMapHash = mat.vUserData.lightMap;
          if (lightMapHash && lightMapHash.endsWith('.exr')) {
            addLightMapToHash(lightMapHash, mat);
          }
        }
        mat.vUserData.lightMapIntensity = mat.lightMapIntensity;

        console.log('lightmap out : ', mat.vUserData);
      }
    }
  });

  const hashes = Object.keys(lightmapHashes);

  const files: File[] = [];
  const afterMats: THREE.Material[] = [];

  await Promise.all(
    hashes.map(hash => {
      console.log(hash);
      return get(hash).then(file => {
        if (file) {
          files.push(file);
          const mats = Object.values(lightmapHashes[hash]);
          afterMats.push(...mats);
        } else {
          // 파일 임포트 시 idbkeyval에 exr파일이 저장되어있어야함
          throw new Error();
        }
      });
    }),
  );

  if (files.length > 0) {
    return uploadExrToKtx(files, isMobile).then(res => {
      console.log(res);
      if (res.success) {
        const data = res.data;
        const updateKtxName = (key: keyof VUserData, mat: any) => {
          const exrName = mat.vUserData[key];
          if (exrName) {
            const ktxName = exrName.replace('.exr', '.ktx');
            if (data.some(datum => datum.filename === ktxName)) {
              mat.vUserData[key] = ktxName;
              if (isMobile) {
                mat.vUserData.isMobile = true;
              }
            }
          }
        };

        afterMats.forEach(mat => {
          (mat as any).lightMap = null;

          // lightMap 업데이트
          updateKtxName('lightMap', mat);
          // dpOnTextureFile && dpOffTextureFile 업데이트
          updateKtxName('dpOnTextureFile', mat);
          updateKtxName('dpOffTextureFile', mat);
        });
        return res;
      } else {
        console.error('라이트맵 ktx업로드 실패', res);
        return res;
      }
    });
  } else {
    console.log('@uploadExrLightmap 라이트맵없음, 업로드x');
  }
};

export const splitExtension = (filename: string) => {
  const lastDot = filename.lastIndexOf('.');
  return {
    name: filename.slice(0, lastDot),
    ext: filename.slice(lastDot + 1),
  };
};

export const calculateTargetPosition = (
  cameraPosition: THREE.Vector3,
  direction: THREE.Vector3,
  distance: number,
) => {
  // direction이 정규화되지 않았을 경우 정규화
  const normalizedDirection = direction.clone().normalize();

  // 방향 벡터에 거리(distance)를 곱해 이동한 벡터 계산
  const offset = normalizedDirection.multiplyScalar(distance);

  // 카메라 위치에 offset을 더해 타겟 위치 계산
  return cameraPosition.clone().add(offset);
};

export type PointXZ = { x: number; z: number };

export function createClosedConcaveSurface(
  points: PointXZ[],
  // y: number,
  color?: number,
): THREE.Mesh {
  if (points.length < 3) {
    throw new Error(
      'At least three points are required to create a closed surface.',
    );
  }

  // xz 평면에서 생성했지만 shape은 xy기준으로 생성되므로
  // 생성 수 마지막에 geometry.rotateX(Math.PI / 2)를 호출하여 xz평면으로 변환

  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z);
  points.slice(1).forEach(point => {
    shape.lineTo(point.x, point.z);
  });
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);

  // 이 때 바깥쪽을 보고 있으므로 Material에서 더블사이드로 설정
  const material = new VMeshStandardMaterial({
    emissive: color ?? 0x3333cc,
    emissiveIntensity: 1.0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.layers.disableAll();
  mesh.layers.enable(Layer.Room);

  return mesh;
}

export function createMeshesFromPoints(
  points: PointXZ[],
  minY: number,
  maxY: number,
): {
  verticalSurfaces: THREE.Mesh;
  topFace: THREE.Mesh;
  bottomFace: THREE.Mesh;
  closureFace: THREE.Mesh;
} {
  if (points.length < 2) {
    throw new Error('At least two points are required to create a mesh.');
  }

  const createBufferGeometry = (vertices: number[], indices: number[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };

  const createMesh = (geometry: THREE.BufferGeometry) => {
    // const material = new THREE.MeshStandardMaterial({ color: 0x44aa88, side: THREE.DoubleSide });
    // return new THREE.Mesh(geometry, material);
    return new THREE.Mesh(geometry);
  };

  // Vertical surfaces
  const verticalVertices: number[] = [];
  const verticalIndices: number[] = [];

  points.forEach((point, i) => {
    verticalVertices.push(point.x, minY, point.z); // Lower vertex
    verticalVertices.push(point.x, maxY, point.z); // Upper vertex
  });

  for (let i = 0; i < points.length - 1; i++) {
    const lowerLeft = i * 2;
    const upperLeft = i * 2 + 1;
    const lowerRight = (i + 1) * 2;
    const upperRight = (i + 1) * 2 + 1;
    verticalIndices.push(lowerLeft, upperLeft, lowerRight);
    verticalIndices.push(upperLeft, upperRight, lowerRight);
  }

  const verticalSurfaces = createMesh(
    createBufferGeometry(verticalVertices, verticalIndices),
  );

  // Bottom face
  // const bottomVertices: number[] = [];
  // const bottomIndices: number[] = [];
  // points.forEach((point) => {
  //     bottomVertices.push(point.x, minY, point.z);
  // });
  // // bottomVertices.push(0, minY, 0);
  // points.forEach((_, i) => {
  //     bottomIndices.push(0, i, (i + 1) % points.length);
  // });
  // const bottomFace = createMesh(createBufferGeometry(bottomVertices, bottomIndices));
  const bottomFace = createClosedConcaveSurface(points);

  // Top face
  // const topVertices: number[] = [];
  // const topIndices: number[] = [];
  // points.forEach((point) => {
  //     topVertices.push(point.x, maxY, point.z);
  // });
  // points.forEach((_, i) => {
  //     topIndices.push(0, (i + 1) % points.length, i);
  // });
  // const topFace = createMesh(createBufferGeometry(topVertices, topIndices));
  const topFace = createClosedConcaveSurface(points);

  // Closure face (connect last point back to first point)
  const closureVertices: number[] = [];
  const closureIndices: number[] = [];
  const lastIndex = points.length - 1;
  closureVertices.push(points[lastIndex].x, minY, points[lastIndex].z);
  closureVertices.push(points[lastIndex].x, maxY, points[lastIndex].z);
  closureVertices.push(points[0].x, minY, points[0].z);
  closureVertices.push(points[0].x, maxY, points[0].z);
  closureIndices.push(0, 1, 2);
  closureIndices.push(1, 3, 2);
  const closureFace = createMesh(
    createBufferGeometry(closureVertices, closureIndices),
  );

  return {
    verticalSurfaces,
    topFace,
    bottomFace,
    closureFace,
  };
}

export function toggleDP(scene: THREE.Scene, toggle: boolean) {
  scene.traverseAll(o => {
    if (o.vUserData.modelType === 'DP') {
      o.visible = toggle;
    }

    if (o.type === 'Mesh') {
      const m = o as THREE.Mesh;
      if (m.vUserData.modelType === 'BASE') {
        const material = m.material as THREE.MeshStandardMaterial;
        material.lightMap = toggle
          ? material.vUserData.dpOnLightMap!!
          : material.vUserData.dpOffLightMap!!;
        material.needsUpdate = true;
      }
    }
  });
}

export const topView = (value: boolean) => {
  const lastCameraInfo = getAtomValue(lastCameraInfoAtom);
  const threeExports = getAtomValue(threeExportsAtom);
  if (!threeExports) return;
  const { scene, camera } = threeExports;

  const element = document.getElementById('canvasDiv');
  if (!element) return;

  const createCamera = (isTopView: boolean): THREE.Camera => {
    console.log('scene', scene, camera);
    const newScene = scene.clone(true);
    newScene.children = newScene.children.filter(child => {
      return !(child instanceof TransformControls);
    });

    const boundingBox = new THREE.Box3().setFromObject(newScene);
    const size = boundingBox.getSize(new THREE.Vector3()); // 모델 크기
    const center = boundingBox.getCenter(new THREE.Vector3()); // 모델 중심

    const lastMatrixArray = lastCameraInfo.matrix;

    const threeMatrix = new THREE.Matrix4().fromArray(lastMatrixArray);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    threeMatrix.decompose(position, quaternion, scale);
    if (isTopView) {
      // setAtomValue(globalGlAtom, pre => ({
      //   ...pre,
      //   localClippingEnabled: true,
      // }));
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

      orthoCam.zoom = Math.round(size.y * 15);
      orthoCam.updateProjectionMatrix();
      orthoCam.updateMatrix();
      orthoCam.updateMatrixWorld(true);

      orthoCam.layers.enable(Layer.ReflectionBox);

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

      perCam.layers.enable(Layer.ReflectionBox);

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

export function getGLStatus(gl: THREE.WebGLRenderer) {
  const info = gl.info;
  return info.memory;
}

export function changeMeshVisibleWithTransition(
  mesh: THREE.Mesh,
  transitionDelay: number,
  targetVisible: boolean,
  timeLine: gsap.core.Timeline,
) {
  const mat = mesh.material as THREE.Material;
  const originalRenderOrder = mesh.renderOrder;
  const originalTransparent = mat.transparent;
  // 메시의 바운딩 박스 계산
  const box = new THREE.Box3().setFromObject(mesh);

  // dissolveOrigin 설정: x는 minX, y는 중앙, z는 minZ
  const minX = box.min.x; // 왼쪽 X 좌표
  const centerY = (box.min.y + box.max.y) / 2; // Y 중앙
  const minZ = box.min.z; // 가장 앞쪽 (액자의 왼쪽 테두리)

  // dissolveOrigin을 Three.js Vector3로 설정
  const dissolveOrigin = new THREE.Vector3(minX, centerY, minZ);

  // 3D 거리 사용
  mat.shader.uniforms.dissolveMaxDist.value = box.max.distanceTo(box.min);

  // Shader Uniform에 dissolveOrigin 전달
  mat.uniforms.dissolveOrigin = dissolveOrigin;
  mat.shader.uniforms.dissolveDirection.value = targetVisible;
  mat.shader.uniforms.progress.value = 0;

  timeLine.to(
    {
      t: 0,
    },
    {
      t: 1,
      duration: transitionDelay,
      ease: 'none',
      onStart() {
        mat.shader.uniforms.progress.value = 0.0001;
        mat.transparent = true;
        if (!targetVisible) {
          mesh.renderOrder = 9999;
        }
        if (targetVisible) {
          mesh.visible = true;
        }
        mat.useProgressiveAlpha = true;
      },
      onUpdate() {
        mat.shader.uniforms.progress.value = this.targets()[0].t;
      },
      onComplete() {
        mesh.visible = targetVisible;
        mesh.renderOrder = originalRenderOrder;
        mat.transparent = originalTransparent;
        mat.useProgressiveAlpha = false; // needsUpdate = true 자동
        mat.shader.uniforms.progress.value = 0.001;
      },
    },
    0,
  );
}

export function changeMeshLightMapWithTransition(
  mesh: THREE.Mesh,
  transitionDelay: number,
  targetLightMap: THREE.Texture,
  timeLine: gsap.core.Timeline,
) {
  const mat = mesh.material as THREE.Material;
  const beforeLightMap = mat.lightMap;
  if (!beforeLightMap) {
    console.warn('No LightMap : ', mesh);
    throw new Error('No LightMap Found in Material');
  }
  const cloned = mat.clone();

  const LIGHTMAP_PROGRESS_SHADER = `
  #if defined( RE_IndirectDiffuse )

    #ifdef USE_LIGHTMAP
  
      vec4 lightMap1 = texture2D(texture1, vLightMapUv);
      vec4 lightMap2 = texture2D(texture2, vLightMapUv);
      vec4 lightMapTexel = mix(lightMap1, lightMap2, progress);
      vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
  
      irradiance += lightMapIrradiance;
  
    #endif
  
    #if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
  
      iblIrradiance += getIBLIrradiance( geometryNormal );
  
    #endif
  
  #endif
  
  #if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
  
    #ifdef USE_ANISOTROPY
  
      radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
  
    #else
  
      radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
  
    #endif
  
    #ifdef USE_CLEARCOAT
  
      clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
  
    #endif
  
  #endif`;

  cloned.onBeforeCompile = shader => {
    // 유니폼 변수 설정
    shader.uniforms.progress = { value: 0.0 };
    shader.uniforms.texture1 = { value: beforeLightMap };
    shader.uniforms.texture2 = { value: targetLightMap };

    // 프래그먼트 쉐이더에 유니폼 변수 추가
    shader.fragmentShader =
      `uniform float progress;
                 uniform sampler2D texture1;
                 uniform sampler2D texture2;
                 ` + shader.fragmentShader;

    // lights_fragment_maps 부분 완전히 대체 (중요: 기존 lightMap 계산 무시)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_maps>',
      LIGHTMAP_PROGRESS_SHADER,
    );

    cloned.vUserData.shader = shader;
  };

  timeLine.to(
    {
      t: 0,
    },
    {
      t: 1,
      duration: transitionDelay,
      ease: 'none',
      onStart() {
        mesh.material = cloned;
      },
      onUpdate() {
        const progress = this.targets()[0].t;
        const shader = cloned.shader;
        if (shader) {
          shader.uniforms.progress.value = progress;
          cloned.needsUpdate = true;
        }
      },
      onComplete() {
        mat.lightMap = targetLightMap;
        mesh.material = mat;
        mat.needsUpdate = true;
        cloned.dispose();
      },
    },
    0,
  );
}

export function applyProbeOnMaterial(
  material: THREE.Material,
  probe: ReflectionProbe,
) {
  material.envMap = probe.getRenderTargetTexture();
  material.updateEnvUniforms(probe.getCenter(), probe.getSize());
  material.vUserData.probeId = probe.getId();
  material.needsUpdate = true;
}

function getRandomColorWithComplementary() {
  // 1. 랜덤한 RGB 색상 생성
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // 2. RGB를 HEX로 변환
  const randomColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  // 3. 보색 계산
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;

  // 4. 보색을 HEX로 변환
  const complementaryColor = `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;

  return { randomColor, complementaryColor };
}


export function distSquaredFromLineToBox(
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  box: THREE.Box3,
) {
  const minX = box.min.x,
    maxX = box.max.x,
    minZ = box.min.z,
    maxZ = box.max.z;

  // Check if line segment intersects the bottom face (distance = 0)
  const lineMinX = Math.min(p1.x, p2.x),
    lineMaxX = Math.max(p1.x, p2.x);
  const lineMinZ = Math.min(p1.y, p2.y),
    lineMaxZ = Math.max(p1.y, p2.y); // p1.y, p2.y as Z
  if (
    lineMaxX >= minX &&
    lineMinX <= maxX &&
    lineMaxZ >= minZ &&
    lineMinZ <= maxZ
  ) {
    const edges = [
      [minX, minZ, maxX, minZ], // bottom edge
      [maxX, minZ, maxX, maxZ], // right edge
      [maxX, maxZ, minX, maxZ], // top edge
      [minX, maxZ, minX, minZ], // left edge
    ];
    for (let [x1, z1, x2, z2] of edges) {
      const det = (p2.x - p1.x) * (z2 - z1) - (p2.y - p1.y) * (x2 - x1);
      if (det === 0) continue; // Parallel
      const t = ((x1 - p1.x) * (z2 - z1) - (z1 - p1.y) * (x2 - x1)) / det;
      const u =
        ((x1 - p1.x) * (p2.y - p1.y) - (z1 - p1.y) * (p2.x - p1.x)) / det;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0; // Intersection
    }
  }

  // Calculate squared distance (no sqrt)
  const lineDx = p2.x - p1.x,
    lineDz = p2.y - p1.y; // Dx, Dz in XZ plane
  const lenSquared = lineDx * lineDx + lineDz * lineDz;
  if (lenSquared === 0) {
    // Degenerate case: point-to-box distance (squared)
    const dx = Math.max(minX - p1.x, 0, p1.x - maxX);
    const dz = Math.max(minZ - p1.y, 0, p1.y - maxZ);
    return dx * dx + dz * dz;
  }

  let minDistSquared = Infinity;
  const corners = [
    [minX, minZ],
    [maxX, minZ],
    [maxX, maxZ],
    [minX, maxZ],
  ];

  for (let [cx, cz] of corners) {
    let t = ((cx - p1.x) * lineDx + (cz - p1.y) * lineDz) / lenSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment
    const closestX = p1.x + t * lineDx;
    const closestZ = p1.y + t * lineDz;
    const dx = cx - closestX,
      dz = cz - closestZ;
    minDistSquared = Math.min(minDistSquared, dx * dx + dz * dz);
  }

  return minDistSquared;
}


export function getWallPoint(indexOrId: number | string, points: WallPoint[]) {
  if (typeof indexOrId === 'number') {
    return points[indexOrId];
  }

  return points.find(point => point.id === indexOrId);
}

export const findClosestProbe = (points: WallPoint[], probes: ReflectionProbe[], wall: WallView) => {
  if (probes.length === 0) {
    return undefined;
  }

  const { start: _start, end: _end } = wall;
  const start = getWallPoint(_start, points)!;
  const end = getWallPoint(_end, points)!;

  const closest = probes.reduce(
    (
      closestProbe: {
        distance: number;
        prev: ReflectionProbe;
      },
      probe: ReflectionProbe,
    ) => {
      const box = probe.getBox();

      // (start, end) closest from AABB
      const curDist = distSquaredFromLineToBox(start.point, end.point, box);

      if (curDist < closestProbe.distance) {
        return {
          distance: curDist,
          prev: probe,
        };
      }
      return closestProbe;
    },
    {
      distance: 100000,
      prev: probes[0],
    },
  );

  return closest.prev;
};

export function createWallFromPoints(points: WallPointView[]): WallView[] {

  const pointLength = points.length;
  if (pointLength < 2) {
    return [];
  }

  const walls: WallView[] = [];
  const prevWalls = getWallOptionAtom()?.walls ?? [];


  for (let i = 0; i < pointLength; i++) {
    const startPoint = points[i];
    const endIndex = i + 1 === pointLength ? 0 : i + 1; // 끝점의 경우 시작과 잇는다
    const endPoint = points[endIndex];

    const prevWall = prevWalls.find(w => w.start === startPoint.id && w.end === endPoint.id);

    const wall: WallView = {
      start: startPoint.id,
      end: endPoint.id,
      show: true,
      id: prevWall?.id ?? v4(),
      probeId: prevWall?.probeId ?? undefined,
      probeName: prevWall?.probeName ?? undefined,
    };

    walls.push(wall);
  }

  resetColor(walls);

  return walls;
}

export function assignClosestProbeToWall(points: WallPointView[], walls: WallView[], probes: ReflectionProbe[]) {
  walls.forEach(wall => {
    const closestProbe = findClosestProbe(points, probes, wall);
    if (closestProbe) {
      wall.probeId = closestProbe.getId();
      wall.probeName = closestProbe.getName();
    }
  })
  return walls;
}

export function colorNumberToCSS(color: number, format = 'hex') {
  // Ensure color is an integer and mask to 24 bits (0xFFFFFF)
  const hex = color & 0xFFFFFF;

  if (format === 'hex') {
    // Convert to hex string, pad to 6 digits, and prefix with #
    return `#${hex.toString(16).padStart(6, '0').toUpperCase()}`;
  } else if (format === 'rgb') {
    // Extract RGB components
    const r = (hex >> 16) & 0xFF; // Red (first 8 bits)
    const g = (hex >> 8) & 0xFF;  // Green (middle 8 bits)
    const b = hex & 0xFF;         // Blue (last 8 bits)
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    throw new Error("Unsupported format. Use 'hex' or 'rgb'.");
  }
}

export const resetColor = <T extends { color?: number }>(coloredArray: T[]): T[] => {
  coloredArray.forEach((el, i) => {
    const colorHsl = new THREE.Color();
    colorHsl.setHSL(i / coloredArray.length, 1, 0.5);
    el.color = colorHsl.getHex();
  });
  return coloredArray;
};

// 재질 주어졌을 때 해당 재질을 사용하는 모든 메시를 포함하는 바운딩 박스 계산
// MESH_TRANSITION에서 사용
export function computeBoundingBoxForMaterial(scene: THREE.Scene, targetMaterial: THREE.Material): THREE.Box3 | null {
  const resultBox = new THREE.Box3();
  let found = false;

  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materialsUuid = materials.map(m => m.uuid);

      // 이 mesh가 targetMaterial을 쓰는지 확인
      if (materialsUuid.includes(targetMaterial.uuid)) {

        resultBox.expandByObject(mesh);

        found = true;
      }
    }
  });

  return found ? resultBox : null; // 아무 것도 없으면 null
}