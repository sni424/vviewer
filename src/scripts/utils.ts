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
  return fetch(url)
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
  flipY: boolean = true,
) => {
  if (flipY) {
    startDirection.y = 0;
    endDirection.y = 0;
  }
  startDirection.normalize();
  endDirection.normalize();

  const from = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), startDirection);
  const to = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), endDirection);
  // (3) 부드러운 slerp
  const result = new THREE.Quaternion().slerpQuaternions(from, to, t);

  // (4) 만약 "카메라가 옆으로 뒤집힘" 문제를 방지하고 싶다면
  // roll을 0으로 고정할 수도 있습니다.
  // (원치 않으면 이 부분은 삭제)
  const euler = new THREE.Euler().setFromQuaternion(result, "YXZ");
  euler.z = 0; // roll 제거
  result.setFromEuler(euler);

  return result;
};
// 현재 애니메이션 인스턴스를 저장
let currentAnimation: gsap.core.Tween | null = null;
//카메라 이동 경로에따른 애니메이션션
const handlePathfindingMove = (
  camera: THREE.Object3D,
  target: THREE.Vector3,
  path: THREE.Vector3[],
  speed: number,
  direction?: THREE.Vector3,
) => {

  if (path.length === 0) return; // 종료 조건 추가

  const startPosition = camera.position.clone(); // 초기 카메라 위치
  const startDirection = camera
    .getWorldDirection(new THREE.Vector3())
    .normalize(); // 초기 카메라 방향
  const newVector = new THREE.Vector3(path[0].x, target.y, path[0].z); // 이동할 좌표
  const endDirection = newVector.clone().sub(startPosition).normalize(); // 이동할 방향
  const distance = camera.position.distanceTo(newVector); // 거리 계산
  // speed가 클수록 duration을 짧게 (최소 0.1 보장)
  const speedFactor = Math.max(0.1, 1 / speed);
  // 기존 애니메이션 종료
  if (currentAnimation) {
    currentAnimation.kill();
  }
  // 애니메이션 실행
  currentAnimation = gsap.to({ t: 0 }, {
    t: 1,
    duration: distance * speedFactor,
    ease: 'power1.out', // 자연스러운 애니메이션
    onUpdate: function () {
      // 0에서 1까지 보간 값
      const progress = this.targets()[0].t;
      // 회전이 빨리 끝나도록 설정
      //앞으로 남은 경로가 있을때 거의 다다랐을때 다음 경로 실행
      if (progress >= 0.9 && path.length > 1) {
        path.shift();
        handlePathfindingMove(camera, target, path, speed, direction); // 재귀 호출로 다음 경로 처리
        return;
      } else {
        //마지막 경로에서 카메라 방향 설정
        if (direction) {
          if (path.length === 1) {

            const adjustedProgress = Math.min(progress * (distance / 2), 1);
            const currentPosition = new THREE.Vector3().lerpVectors(
              startPosition,
              newVector,
              progress
            );
            camera.position.copy(currentPosition);

            const quaternion = rotateCameraSmoothly(
              startDirection,
              direction,
              // progress
              adjustedProgress
            );
            camera.quaternion.copy(quaternion);
          } else {

            const currentPosition = new THREE.Vector3().lerpVectors(
              startPosition,
              newVector,
              progress
            );
            camera.position.copy(currentPosition);
            //이동하는 경로에따라 카메라 방향 설정
            const quaternion = rotateCameraSmoothly(
              startDirection,
              endDirection,
              // adjustedProgress
              progress
            );
            camera.quaternion.copy(quaternion);
          }
        }

      }
    },
    onComplete: () => {
      console.log('complete path');
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
        // // 현재 위치 계산
        // const currentPosition = new THREE.Vector3().lerpVectors(
        //   startPosition,
        //   target,
        //   progress
        // );
        // camera.position.copy(currentPosition);
        camera.position.lerpVectors(startPosition, target, progress);
      },
      onComplete: () => {
        // camera.position.copy(target);
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
        if (cameraFov) {
          camera.lookAt(direction)
          camera.updateProjectionMatrix();
        } else {
          const progress = this.targets()[0].t;
          camera.quaternion.copy(
            rotateCameraSmoothly(startDirection, direction, progress, cameraFov === undefined)
          );
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
        // handleTeleportMove(camera, options.teleport.target);
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
