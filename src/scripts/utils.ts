import { RootState } from '@react-three/fiber';
import gsap from 'gsap';
import { get, set } from 'idb-keyval';
import { Pathfinding } from 'three-pathfinding';

import objectHash from 'object-hash';
import pako from 'pako';
import { TransformControls } from 'three-stdlib';
import { OrbitControls, RGBELoader } from 'three/examples/jsm/Addons.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Layer } from '../Constants';
import { FileInfo, MoveActionOptions, MoveActionType, View } from '../types.ts';
import {
  BenchMark,
  cameraActionAtom,
  getAtomValue,
  selectedAtom,
  setAtomValue
} from './atoms';
import VGLTFExporter from './VGLTFExporter.ts';
import VGLTFLoader from './VGLTFLoader.tsx';
import * as THREE from './VTHREE';

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

export const getIntersects = (
  e: React.MouseEvent,
  threeExports: RootState | null,
  raycaster: THREE.Raycaster = new THREE.Raycaster(),
  filterUserdataIgnoreRaycast = true, // Object3D.vUserData.ignoreRayCast가 true인 아이들은 무시
) => {
  if (!threeExports) {
    console.error(
      'Three가 셋업되지 않은 상태에서 Intersect가 불림 @useEditorInputEvents',
    );
    return {
      intersects: [],
      mesh: [],
      otherUserCameras: [],
      review: [],
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

  const dstObjects = filterUserdataIgnoreRaycast
    ? scene.children.filter(obj => !obj.getUserData().ignoreRaycast)
    : scene.children;
  const defaultFilteredObjects = dstObjects.filter(
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
        const loader = new VGLTFLoader();
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
    cache: "no-store"
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

export const loadLatest = async ({
  threeExports,
  addBenchmark: _addBenchmark,
  // setSceneAnalysis,
}: {
  threeExports: RootState;
  addBenchmark?: (key: keyof BenchMark, value?: number) => void;
}) => {
  const addBenchmark = _addBenchmark ?? (() => { });

  const latestHashUrl = import.meta.env.VITE_LATEST_HASH;
  const latestUrl = import.meta.env.VITE_LATEST;
  if (!latestUrl || !latestHashUrl) {
    alert('.env에 환경변수를 설정해주세요, latestUrl latestHashUrl');
    return;
  }
  addBenchmark('start');
  addBenchmark('downloadStart');

  const localLatestHash = await get('latest-hash');
  const remoteLatestHash = await (
    await decompressFileToObject<{ hash: string }>(latestHashUrl)
  ).hash;
  const loadModel = async () => {
    let url;
    if (!localLatestHash || localLatestHash !== remoteLatestHash) {
      // CACHE UPDATE
      const blob = await fetch(latestUrl, {
        cache: 'no-store',
      }).then(res => res.blob());
      await set('latest-hash', remoteLatestHash);
      await set('latest', blob);

      url = URL.createObjectURL(blob);

      // return decompressFileToObject(latestUrl).then(async (res) => {
      //     // alert("decompressFileToObject+" + JSON.stringify(res))
      //
      //     await set("latest-hash", remoteLatestHash);
      //     await set("latest", res);
      //     // await set("latest", JSON.stringify(res));
      //     return res;
      // }).catch((e) => {
      //     alert("모델을 불러오는데 실패했습니다." + e.message);
      // })
    } else {
      // return JSON.parse((await get("latest"))!);
      const blob = await get('latest');
      console.log('getLatest: ', blob);
      url = URL.createObjectURL(blob);
    }
    return await new VGLTFLoader().loadAsync(url);
  };

  return loadModel()
    .then(res => {
      addBenchmark('downloadEnd');
      addBenchmark('parseStart');
      // const loader = new THREE.ObjectLoader();
      // const parsedScene = loader.parse(res);
      const parsedScene = res.scene;
      addBenchmark('parseEnd');

      const { scene } = threeExports;
      // threeExports.scene.add(parsedScene);

      const loadAsync = new Promise((res, rej) => {
        setAsModel(parsedScene);
        scene.add(parsedScene);

        const interval = setInterval(() => {
          //@ts-ignore
          const found = scene.getObjectByProperty('uuid', parsedScene.uuid);
          if (found) {
            // console.log("loaded", elapsed, "ms");

            // 1초 후에 메시,버텍스, 트라이앵글 수 계산
            // setTimeout(() => {
            //     let meshCount = 0;
            //     let vertexCount = 0;
            //     let triangleCount = 0;
            //     let maxVertexInMesh = 0;
            //     let maxTriangleInMesh = 0;
            //     scene.traverse(obj => {
            //         if (obj instanceof THREE.Mesh) {
            //             meshCount++;
            //             vertexCount += obj.geometry.attributes.position.count;
            //             triangleCount += obj.geometry.index?.count ?? 0;
            //             maxVertexInMesh = Math.max(maxVertexInMesh, obj.geometry.attributes.position.count);
            //             maxTriangleInMesh = Math.max(maxTriangleInMesh, obj.geometry.index?.count ?? 0);
            //         }
            //     });
            //     console.log("mesh count", meshCount);
            //     console.log("vertex count", vertexCount);
            //     console.log("triangle count", triangleCount);
            //     console.log("max vertex in mesh", maxVertexInMesh);
            //     console.log("max triangle in mesh", maxTriangleInMesh);
            //     setSceneAnalysis({
            //         meshCount,
            //         vertexCount,
            //         triangleCount,
            //         maxVertexInMesh,
            //         maxTriangleInMesh
            //     });

            // }, 1000);

            clearInterval(interval);
            addBenchmark('sceneAddEnd');
            addBenchmark('end');
            res(parsedScene);
          }
          rej('not found');
        }, 30);
      });
      return loadAsync;
    })
    .catch(e => {
      console.error(e);
      alert('모델을 불러오는데 실패했습니다. : ' + e.message);
    });
};

export const loadHDRTexture = (path: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
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

//카메라 moveTo함수시 카메라 회전 함수수
const rotateCameraSmoothly = (
  startDirection: THREE.Vector3,
  endDirection: THREE.Vector3,
  t: number,
  flipY: boolean = true
) => {
  if (flipY) {
    startDirection.normalize();
    endDirection.normalize();
  }
  const from = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), startDirection);
  const to = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), endDirection);
  //선형 보간 좌표값
  const result = new THREE.Quaternion().slerpQuaternions(from, to, t);


  //회전값 각도 설정
  const euler = new THREE.Euler().setFromQuaternion(result, "YXZ");
  // 카메라가 옆으로 뒤집힘 문제를 방지
  euler.z = 0;
  result.setFromEuler(euler);


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
  initialPath: THREE.Vector3[]
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
    ...initialPath.map((p) => new THREE.Vector3(p.x, target.y, p.z)),
  ];

  // 세그먼트와 전체 거리 계산
  const segments: { start: THREE.Vector3; end: THREE.Vector3; distance: number }[] = [];
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
  let ratios = segments.map((seg) => {
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
const handlePathfindingMove = (
  camera: THREE.Object3D,
  target: THREE.Vector3,
  initialPath: THREE.Vector3[],
  speed: number,
  direction?: THREE.Vector3
) => {
  // path없으면 동작x
  if (initialPath.length === 0) return;

  // 경로 세팅 (한 번만)
  const { segments } = setupPathData(
    camera,
    target,
    initialPath
  );
  //  세그먼트를 순차로 이동
  let currentSegmentIndex = 0;
  const speedFactor = Math.max(0.1, 1 / speed);

  function moveToNextSegment() {
    if (currentSegmentIndex >= segments.length) {
      console.log("All path segments completed");
      return;
    }

    const { start, end, distance } = segments[currentSegmentIndex];
    //카메라가 보는 방향
    const startDirection = camera.getWorldDirection(new THREE.Vector3()).normalize();

    const isLastSegment = (currentSegmentIndex === segments.length - 1);
    //카메라가 마지막에에 바라볼 방향
    const segDirection = end.clone().sub(start).normalize();
    const endDirection = isLastSegment && direction ? direction : segDirection;

    currentAnimation = gsap.to({ t: 0 }, {
      t: 1,
      duration: distance * speedFactor,
      ease: "power2.inOut",
      onStart() {
        // 새로운 세그먼트를 시작할 때마다 false 리셋
        didShift = false;
      },
      onUpdate() {
        const progress = this.targets()[0].t;
        // 90% 도달 & 아직 세그먼트 전환 안했다면
        if (progress > 0.99 && !didShift && currentSegmentIndex < segments.length - 1) {
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
        if (direction) {
          const newQuat = rotateCameraSmoothly(startDirection, endDirection, progress);
          camera.quaternion.copy(newQuat);
        }
      },
      onComplete() {
        // 세그먼트가 100% 끝났을 때 할 작업이 있으면 여기서
        if (currentAnimation) {
          currentAnimation.kill();
        }
        setTimeout(() => {
          setAtomValue(cameraActionAtom, pre => ({
            ...pre,
            tour: {
              ...pre.tour,
              isAnimation: false
            }
          }))
        }, 500)
      },
    });
  }

  // 최초 호출
  moveToNextSegment();
};



//직선거리 이동



const handleLinearMove = (
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  direction: THREE.Vector3,
  speed: number,
  cameraFov?: number
) => {
  const startDirection = camera
    .getWorldDirection(new THREE.Vector3())
    .normalize();
  const startPosition = camera.position.clone();
  const timeline = gsap.timeline();
  // 카메라 이동
  timeline.to({ t: 0 },
    {
      t: 1,
      duration: speed,
      ease: "power2.inOut",
      onUpdate: function () {
        const progress = this.targets()[0].t;
        //카메라 이동
        camera.position.lerpVectors(startPosition, target, progress);
      },
      onComplete: () => {
      },
    });
  // 카메라 회전
  timeline.to(
    { t: 0 },
    {
      t: 1,
      duration: speed,
      ease: "power2.inOut",
      onUpdate: function () {
        const progress = this.targets()[0].t;
        // 최종 바라볼 방향(‘도착 지점에서 center를 보는’ 벡터)
        const finalDir = new THREE.Vector3()
          .subVectors(direction, target)
          .normalize();
        // 회전 보간: startDir → finalDir
        if (cameraFov) {
          const newQuat = rotateCameraSmoothly(startDirection, finalDir, progress, false);
          camera.quaternion.copy(newQuat);
        } else {
          const newQuat = rotateCameraSmoothly(startDirection, direction, progress);
          camera.quaternion.copy(newQuat);
        }
      },
      onComplete: () => {
        console.log("Rotation completed");
        // camera.lookAt(direction)
      },
    },
    // 이동과 회전을 동시에 실행
    "<"
  );
  //카메라 fov값 변경경
  if (cameraFov !== undefined) {
    timeline.to(
      camera,
      {
        fov: cameraFov,
        duration: speed,
        ease: "power2.out",
        onUpdate: () => {
          camera.updateProjectionMatrix();
        },
      },
      0 // 첫 번째 애니메이션과 동시에(혹은 "<" 사용)
    );
  }
};

const handleTeleportMove = (
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  direction: THREE.Vector3,
) => {
  //매트릭스 일 경우 포지션 이동
  //camera.position.setFromMatrixPosition(matrix);
  //camera.updateMatrixWorld(true); 
  camera.position.set(target.x, target.y, target.z)
  //메트릭스 일경우
  // camera.rotation.setFromRotationMatrix(camera.matrix);
  // camera.matrixWorldNeedsUpdate = true; 
  //방향일경우
  const newTarget = camera.position.clone().add(direction);
  camera.lookAt(newTarget)
  //좌표일경우
  // camera.lookAt(target)
}


//카메라 moveTo함수
export const moveTo = (
  camera: THREE.PerspectiveCamera,
  action: MoveActionType,
  options: MoveActionOptions,
) => {
  switch (action) {
    case 'pathfinding':
      if (action !== 'pathfinding' || !options.pathfinding) return;

      const { target, speed, model, direction, stopAnimtaion } = options.pathfinding;

      if (stopAnimtaion && currentAnimation) {
        currentAnimation.kill();
        return;
      }

      const ZONE = 'level';
      const pathFinding = new Pathfinding();

      if (model && target && speed) {
        const navMesh = model.getObjectByName('84B3_DP') as THREE.Mesh;
        if (!navMesh) return;

        const zone = Pathfinding.createZone(navMesh.geometry);
        pathFinding.setZoneData(ZONE, zone);

        const groupID = pathFinding.getGroup(ZONE, camera.position);
        const targetGroupID = pathFinding.getGroup(ZONE, target);

        const closestStartNode = pathFinding.getClosestNode(camera.position, ZONE, groupID);
        const closestTargetNode = pathFinding.getClosestNode(target, ZONE, targetGroupID);
        const path = pathFinding.findPath(
          closestStartNode.centroid,
          closestTargetNode.centroid,
          ZONE,
          groupID,
        );

        if (path) {
          if (direction) {
            //마지막에 내가 정한 좌표가 아닌 closestTargetNode 근처 좌표로 이동하기에 
            //배열의 마지막 좌표를 target좌표로 변경경
            const newPath = [...path]
            newPath.pop();
            newPath.push(target)
            console.log("newPath", newPath)
            handlePathfindingMove(camera, target, newPath, speed, direction);
          } else {
            handlePathfindingMove(camera, target, path, speed);
          }
        }
      }
      break;
    case 'linear':
      if (options.linear) {
        handleLinearMove(
          camera,
          options.linear.target,
          options.linear.direction,
          options.linear.duration,
          options.linear.fov
        );
      }
      break;

    case 'teleport':
      if (options.teleport) {
        const { target, direction } = options.teleport;
        handleTeleportMove(camera, target, direction);
      }
      break;

    default:
      console.error('Invalid action type');
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
  console.log('Reading directory:', directoryEntry.name);

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

export const uploadGainmap = async (object: THREE.Object3D) => {
  const uploadUrl = import.meta.env.VITE_UPLOAD_URL;

  // 같은 라이트맵을 공유하는 material 검출
  // { hash : [mat1, mat2] }
  const gainmapHashes: { [key in string]: THREE.MeshStandardMaterial[] } = {};

  object.traverseAll(async obj => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.lightMap && mat.lightMap.vUserData.gainMap) {
        mat.vUserData.gainMap = mat.lightMap.vUserData.gainMap;
        mat.vUserData.gainMapIntensity = mat.lightMapIntensity;
        const gainMapHash = mat.vUserData.gainMap;

        if (gainMapHash) {
          if (!gainmapHashes[gainMapHash]) {
            gainmapHashes[gainMapHash] = [];
          }
          gainmapHashes[gainMapHash].push(mat);
        }
      }
    }
  });

  const hashes = Object.keys(gainmapHashes);

  const files: File[] = [];
  const afterMats: THREE.MeshStandardMaterial[] = [];

  await Promise.all(
    hashes.map(hash => {
      return get(hash).then(file => {
        if (file) {
          files.push(file);
          const mats = Object.values(gainmapHashes[hash]);
          afterMats.push(...mats);
        }
      });
    }),
  );
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  }).then(res => {
    console.log(res);
    afterMats.forEach(mat => {
      mat.lightMap = null;
    });
    return res;
  });
}

export const splitExtension = (filename: string) => {
  const lastDot = filename.lastIndexOf('.');
  return {
    name: filename.slice(0, lastDot),
    ext: filename.slice(lastDot + 1)
  }
}


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
}