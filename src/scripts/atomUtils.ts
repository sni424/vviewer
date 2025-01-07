import { ENV } from "../Constants";
import { cameraMatrixAtom, getAtomValue, roomAtom, RoomCreateOption, threeExportsAtom } from "./atoms";
import { THREE } from "./VTHREE";

interface PointXZ {
  x: number;
  z: number;
}

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


export const uploadExrToKtx = (exrs: File | File[]): Promise<{
  success: boolean;
  responseType: "success",
  data: {
    fileSize: number;
    fileType: null;
    fileUrl: string;
    filename: string;
  }[]
}> => {
  const uploadUrl = import.meta.env.VITE_KTX_URL as string;
  if (!uploadUrl) {
    throw new Error('VITE_KTX_URL is not defined');
  }

  const fd = new FormData();
  const files = Array.isArray(exrs) ? exrs : [exrs];
  for (const file of files) {
    fd.append('files', file);
  }
  return fetch(uploadUrl, {
    method: 'POST',
    body: fd,
  }).then(res => res.json());
}

export const uploadJson = (name: string, value: Record<string, any>) => {
  let jsonName: string = name;
  if (!jsonName.endsWith('.json')) {
    jsonName += '.json';
  }
  const json = typeof value === "string" ? value : JSON.stringify(value);

  const fd = new FormData();
  fd.append(
    'files',
    new Blob([json], { type: 'application/json' }),
    jsonName,
  );
  return fetch(import.meta.env.VITE_UPLOAD_URL as string, {
    method: 'POST',
    body: fd,
  });
}

export const loadHotspot = async () => {
  return fetch(ENV.base + "hotspots.json", {
    cache: 'no-store',
  }).then(res => res.json());
}

export const loadRooms = async () => {
  return fetch(ENV.base + "rooms.json", {
    cache: 'no-store',
  }).then(res => res.json());
}

export const loadTourSpot = async () => {
  return fetch(ENV.base + "tourSpot.json", {
    cache: 'no-store',
  }).then(res => res.json());
}

export const threes = () => {
  return getAtomValue(threeExportsAtom);
};

export const rerender = () => {
  const t = threes();
  if (!t) {
    console.error("Three.js is not initialized");
    return;
  }

  const { gl, scene, camera } = t;
  gl.render(scene, camera);
}