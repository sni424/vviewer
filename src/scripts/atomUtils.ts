import { Pathfinding } from 'three-pathfinding';
import { ENV } from '../Constants';
import {
  cameraMatrixAtom,
  getAtomValue,
  pathfindingAtom,
  postprocessAtoms,
  roomAtom,
  RoomCreateOption,
  setAtomValue,
  threeExportsAtom,
} from './atoms';
import VGLTFLoader from './loaders/VGLTFLoader.ts';
import { THREE } from './VTHREE';

interface PointXZ {
  x: number;
  z: number;
}

type KTXApiResponse = {
  success: boolean;
  responseType: 'success';
  data: {
    fileSize: number;
    fileType: null;
    fileUrl: string;
    filename: string;
  }[];
};

function isPointOnLineSegment(p: PointXZ, v1: PointXZ, v2: PointXZ): boolean {
  const crossProduct =
    (p.z - v1.z) * (v2.x - v1.x) - (p.x - v1.x) * (v2.z - v1.z);
  if (Math.abs(crossProduct) > 1e-10) return false; // Not on the line
  const dotProduct =
    (p.x - v1.x) * (v2.x - v1.x) + (p.z - v1.z) * (v2.z - v1.z);
  if (dotProduct < 0) return false; // Before the segment
  const squaredLength = (v2.x - v1.x) ** 2 + (v2.z - v1.z) ** 2;
  return dotProduct <= squaredLength; // After the segment
}

function isPointInsidePolygon(point: PointXZ, polygon: PointXZ[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let count = 0;
  const { x, z } = point;

  for (let i = 0; i < polygon.length; i++) {
    const vertex1 = polygon[i];
    const vertex2 = polygon[(i + 1) % polygon.length];

    // Check if the point lies exactly on the edge
    if (isPointOnLineSegment(point, vertex1, vertex2)) {
      return true; // Point is on the edge
    }

    if (vertex1.z > z !== vertex2.z > z) {
      const intersectX =
        ((vertex2.x - vertex1.x) * (z - vertex1.z)) / (vertex2.z - vertex1.z) +
        vertex1.x;
      if (x < intersectX) {
        count++;
      }
    }
  }

  return count % 2 === 1; // Odd number of crossings = inside
}

export const cameraInRoom = (camera?: THREE.Matrix4): RoomCreateOption[] => {
  camera = camera ?? getAtomValue(cameraMatrixAtom);
  if (!camera) {
    return [];
  }

  const rooms = getAtomValue(roomAtom);
  const cameraXZ: PointXZ = {
    x: camera.elements[12],
    z: camera.elements[14],
  };

  const retvals: RoomCreateOption[] = [];
  for (const room of rooms) {
    const points: PointXZ[] = room.border.map(border => ({
      x: border[0],
      z: border[1],
    }));
    if (isPointInsidePolygon(cameraXZ, points)) {
      retvals.push(room);
    }
  }
  return retvals;
};

export const uploadExrToKtx = async (
  exrs: File | File[],
): Promise<KTXApiResponse> => {
  const uploadUrl = import.meta.env.VITE_KTX_URL as string;
  if (!uploadUrl) {
    throw new Error('VITE_KTX_URL is not defined');
  }

  const fd = new FormData();
  const files = Array.isArray(exrs) ? exrs : [exrs];
  for (const file of files) {
    fd.append('files', file);
  }
  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: fd,
  });
  return await res.json();
};

export const uploadPngToKtx = async (
  pngs: File | File[],
): Promise<KTXApiResponse> => {
  const uploadUrl = import.meta.env.VITE_PNG_KTX_URL as string;
  if (!uploadUrl) {
    throw new Error('VITE_PNG_KTX_URL is not defined');
  }

  const fd = new FormData();
  const files = Array.isArray(pngs) ? pngs : [pngs];
  for (const file of files) {
    fd.append('files', file);
  }
  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: fd,
  });
  return await res.json();
};

export const uploadJson = (name: string, value: Record<string, any>) => {
  let jsonName: string = name;
  if (!jsonName.endsWith('.json')) {
    jsonName += '.json';
  }
  const json = typeof value === 'string' ? value : JSON.stringify(value);

  const fd = new FormData();
  fd.append('files', new Blob([json], { type: 'application/json' }), jsonName);
  return fetch(import.meta.env.VITE_UPLOAD_URL as string, {
    method: 'POST',
    body: fd,
  });
};

export const loadHotspot = async () => {
  return fetch(ENV.base + 'hotspots.json', {
    cache: 'no-store',
  }).then(res => res.json());
};

export const loadRooms = async () => {
  return fetch(ENV.base + 'rooms.json', {
    cache: 'no-store',
  }).then(res => res.json());
};

export const loadTourSpot = async () => {
  return fetch(ENV.base + 'tourSpot.json', {
    cache: 'no-store',
  }).then(res => res.json());
};

export const loadProbes = async () => {
  return fetch(ENV.base + 'probe.json', {
    cache: 'no-store',
  }).then(res => res.json());
};

export const loadPostProcess = async () => {
  return fetch(ENV.base + 'postprocess.json', {
    cache: 'no-store',
  }).then(res => res.json());
};

export const loadOption = async () => {
  return fetch(ENV.base + 'options.json', {
    cache: 'no-store',
  }).then(res => res.json());
};

export const loadPostProcessAndSet = async () => {
  return loadPostProcess().then(res => {
    if (res) {
      // 아톰 안에 아톰이라 2번 setAtomValue를 불러줘야함
      console.log('postprocess Called : ', res);
      setAtomValue(postprocessAtoms, prev => {
        const copied = { ...prev };
        const loadedKeys = Object.keys(res);
        const postprocessKeys = Object.keys(copied);
        postprocessKeys.forEach(key => {
          if (loadedKeys.includes(key)) {
            setAtomValue(copied[key], (eachPrev: any) => {
              console.log(key, res[key]);
              return {
                ...eachPrev,
                ...(res as any)[key],
              };
            });
            // copied[key] = { ...(value as any)[key] };
          }
        });

        return copied;
      });
    } else {
      alert('후처리 불러오기 실패');
    }
  });
};

export const threes = () => {
  return getAtomValue(threeExportsAtom);
};

export const rerender = () => {
  const t = threes();
  if (!t) {
    console.error('Three.js is not initialized');
    return;
  }

  const { gl, scene, camera } = t;
  gl.render(scene, camera);
};

const createGeometry = (points: [number, number][]) => {
  if (points.length < 3) {
    throw new Error('At least 3 points are required to create a geometry');
  }

  const shape = new THREE.Shape();
  const copied = [...points];
  copied.reverse();
  shape.moveTo(copied[0][0], copied[0][1]);
  copied.slice(1).forEach(point => {
    shape.lineTo(point[0], point[1]);
  });
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);

  return geometry;
};

export const initPathfinding = (points?: [number, number][]) => {
  points =
    points ?? getAtomValue(roomAtom).find(room => room.name === '바닥')?.border;
  if (!points) {
    throw new Error('Points are not defined @initPathfinding');
  }

  getAtomValue(pathfindingAtom)?.geometry.dispose();

  const geometry = createGeometry(points);
  const pathfinding = new Pathfinding();
  const zone = Pathfinding.createZone(geometry);
  pathfinding.setZoneData('level', zone);

  setAtomValue(pathfindingAtom, {
    pathfinding,
    geometry,
    points,
  });
};

export const pathfinding = () => {
  const retval = getAtomValue(pathfindingAtom);
  if (!retval) {
    throw new Error('Pathfinding is not initialized');
  }
  return retval.pathfinding;
};

export const loadNavMesh = async () => {
  // const key = "navMesh";

  // const getBlob = async () => {
  //   return get(key).then(res => {
  //     if (res) {
  //       return res;
  //     } else {
  //       return fetch(ENV.navMesh).then(res => res.blob()).then(blob => {
  //         return set(key, blob).then(() => {
  //           return blob;
  //         })
  //       })
  //     }
  //   })
  // }
  // const navBlob = await getBlob();
  // const url = URL.createObjectURL(navBlob);
  // new VGLTFLoader().loadAsync(url).
  new VGLTFLoader().loadAsync(ENV.navMesh).then(gltf => {
    let floor: THREE.Mesh | null = null;
    gltf.scene.traverseAll(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        floor = obj as THREE.Mesh;
        return;
      }
    });
    if (!floor) {
      throw new Error('Floor is not found');
    }

    const pathfinding = new Pathfinding();
    const geometry = (floor as THREE.Mesh).geometry;
    const zone = Pathfinding.createZone(geometry);
    pathfinding.setZoneData('level', zone);

    const points: [number, number][] = [];

    const { attributes } = geometry;
    const { position } = attributes;
    const { array } = position;
    for (let i = 0; i < array.length; i += 3) {
      points.push([array[i], array[i + 2]]);
    }

    setAtomValue(pathfindingAtom, {
      pathfinding,
      geometry,
      points,
    });
  });
};
