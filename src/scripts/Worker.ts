import pako from 'pako';
import { MeshInfoType, occlusionType, Point2D, Walls } from 'src/types';
import { EXRLoader } from 'three/examples/jsm/Addons.js';
import { Vector3 } from 'VTHREE';

export type WorkerTask =
  | WorkerTaskFetch
  | WorkerTaskExr
  | WorkerTaskBitmapToArrayBuffer
  | WorkerTaskCompress
  | WorkerTaskDecompress
  | WorkerTaskProcessNavPoints
  | WorkerTaskFilterNavArray
  | WorkerTaskExteriorMeshes;

export type WorkerTaskFetch = {
  id: number;
  action: 'fetch';
  data: {
    url: string;
    inflate: boolean;
  };
};

export type WorkerTaskExr = {
  id: number;
  action: 'exr';
  data: {
    url?: string;
    arrayBuffer?: ArrayBuffer;
  };
};

export type WorkerTaskBitmapToArrayBuffer = {
  id: number;
  action: 'bitmapToArrayBuffer';
  data: {
    bitmap: ImageBitmap;
  };
};

export type WorkerTaskCompress = {
  id: number;
  action: 'compress';
  data: {
    arrayBuffer: ArrayBuffer;
    transfer?: boolean;
  };
};

export type WorkerTaskDecompress = {
  id: number;
  action: 'decompress';
  data: {
    arrayBuffer: ArrayBuffer;
    transfer?: boolean;
  };
};

export type WorkerTaskExteriorMeshes = {
  id: number;
  action: 'processExterior';
  data: {
    wallPoints: Point2D[];
    meshInfoArray: MeshInfoType[];
    meshArray: string[];
  };
};
export type WorkerResponseExteriorMeshes = {
  id: number;
  action: 'processExterior';
  data: number[];
};

export type WorkerTaskProcessNavPoints = {
  id: number;
  action: 'processNav';
  data: {
    navPointArray: [number, number][];
    meshInfoArray: MeshInfoType[];
    wallData: Walls;
  };
};
export type WorkerResponseNav = {
  id: number;
  action: 'processNav';
  data: { navPoint: [number, number]; dpName: string[] }[];
};

export type WorkerTaskFilterNavArray = {
  id: number;
  action: 'processFilterNav';
  data: {
    occlusionArray: occlusionType[];
  };
};
export type WorkerResponseFilterNavArray = {
  id: number;
  action: 'processFilterNav';
  data: {
    occlusionArray: occlusionType[];
  };
};

export const isPointInPolygon = (
  point: Point2D,
  polygon: Point2D[],
): boolean => {
  const x = point[0],
    y = point[1];

  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];

    const xj = polygon[j][0],
      yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
};

const meshInsidePoint = (
  polygon: Point2D[],
  min: Vector3,
  max: Vector3,
): Point2D[] => {
  const points: Point2D[] = [];
  console.log(max.x - min.x, max.z - min.z);
  for (let x = min.x; x <= max.x; 0.1) {
    for (let y = min.z; y <= max.z; 0.1) {
      const point: Point2D = [x, y];
      if (isPointInPolygon(point, polygon)) {
        points.push(point); // 다각형 내부 포인트만 추가
      }
    }
  }
  return points;
};

//선분 교차 검증 함수
const isIntersectFromPoints = (
  line1: [number, number][],
  line2: [number, number][],
): boolean => {
  const [a, b] = line1;
  const [c, d] = line2;

  function ccw(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
  ) {
    const result =
      (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
    if (result > 0) return 1;
    if (result < 0) return -1;
    return 0;
  }

  const ab = ccw(a, b, c) * ccw(a, b, d);
  const cd = ccw(c, d, a) * ccw(c, d, b);

  if (ab === 0 && cd === 0) {
    const [a1x, a2x] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
    const [a1y, a2y] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
    const [b1x, b2x] = [Math.min(c[0], d[0]), Math.max(c[0], d[0])];
    const [b1y, b2y] = [Math.min(c[1], d[1]), Math.max(c[1], d[1])];
    return a1x <= b2x && b1x <= a2x && a1y <= b2y && b1y <= a2y;
  }

  return ab <= 0 && cd <= 0;
};
const checkBoxToObject = (
  roomPoint: [number, number],
  objectArray: Point2D[],
  wallsData: Walls,
): boolean => {
  for (const boxPoint of objectArray) {
    // 이 경로가 어떤 벽과 교차하는지 추적
    let intersectsAnyWall = false;
    for (const wallPointIndex of wallsData.walls) {
      const result = isIntersectFromPoints(
        [roomPoint, boxPoint],
        [
          wallsData.points[wallPointIndex[0]],
          wallsData.points[wallPointIndex[1]],
        ],
      );
      if (result) {
        // 하나라도 교차하면 이 쌍은 유효하지 않음
        intersectsAnyWall = true;
        break;
      }
    }
    if (!intersectsAnyWall) {
      // 모든 벽과 교차하지 않는 경로 발견
      return true;
    }
  }

  // 유효한 경로가 없음
  return false;
};

export async function fetchArrayBuffer(
  ...params: Parameters<typeof fetch>
): Promise<ArrayBuffer> {
  const response = await fetch(...params);
  if (!response.ok) throw new Error('Fetch failed');

  // Get total size from headers (if available)
  const contentLength = response.headers.get('Content-Length');
  if (!contentLength) {
    console.warn('Content-Length not provided', params);
    return response.arrayBuffer(); // Fallback to default behavior
  }

  const totalSize = parseInt(contentLength, 10);

  // Pre-allocate the ArrayBuffer
  const buffer = new ArrayBuffer(totalSize);
  const view = new Uint8Array(buffer);
  let offset = 0;

  // Read stream chunks
  const reader = response.body!.getReader();
  while (true) {
    const { done, value } = await reader.read(); // value is Uint8Array
    if (done) break;

    if (offset + value.length > totalSize) {
      throw new Error('Received more data than expected');
    }

    view.set(value, offset); // Copy chunk into pre-allocated buffer
    offset += value.length;
  }

  if (offset !== totalSize) {
    throw new Error('Received less data than expected');
  }

  return buffer;
}

const exrLoader = new EXRLoader();

self.onmessage = async (e: MessageEvent<WorkerTask>) => {
  const { id, action, data } = e.data;

  if (action === 'fetch') {
    try {
      const { url, inflate } = data;
      const buffer = await fetchArrayBuffer(url);
      const result = inflate
        ? pako.inflate(new Uint8Array(buffer)).buffer
        : buffer;
      (self as any).postMessage({ id, action: 'fetch', data: result }, [
        result,
      ]);
    } catch (err) {
      console.error('Worker error : ', err);
      (self as any).postMessage({ id, error: (err as any).message });
    }
  } else if (action === 'processExterior') {
    const { meshInfoArray, wallPoints, meshArray } = data;
    const navMeshArray: number[] = [];
    console.log('meshInfoArray', meshInfoArray, wallPoints);
    meshInfoArray.forEach(navInfo => {
      const newPoint = meshInsidePoint(
        wallPoints,
        navInfo.box.min,
        navInfo.box.max,
      );

      if (newPoint.length < 1) {
        navMeshArray.push(meshArray.indexOf(navInfo.name));
      }
    });

    (self as any).postMessage({
      id,
      action: 'processExterior',
      data: navMeshArray,
    } as WorkerResponseExteriorMeshes);
  } else if (action === 'processNav') {
    const { navPointArray, meshInfoArray, wallData } = data;
    const navMeshArray: any = [];
    navPointArray.forEach(point => {
      const dpName: string[] = [];
      meshInfoArray.forEach((dp: MeshInfoType) => {
        if (checkBoxToObject(point, dp.point, wallData)) {
          dpName.push(dp.name);
        }
      });
      dpName.sort();
      navMeshArray.push({ navPoint: point, dpName });
    });

    (self as any).postMessage({
      id,
      action: 'processNav',
      data: navMeshArray,
    } as WorkerResponseNav);
  } else if (action === 'processFilterNav') {
    const { occlusionArray } = data;
    const navMeshArray: any = [];
    occlusionArray.forEach(navInfo => {
      if (navInfo.dpName.length > 1) {
        navMeshArray.push(navInfo);
      }
    });

    (self as any).postMessage({
      id,
      action: 'processFilterNav',
      data: navMeshArray,
    } as WorkerResponseFilterNavArray);
  } else if (action === 'exr') {
    let { url, arrayBuffer } = data;
    if (!arrayBuffer) {
      if (url) {
        arrayBuffer = await fetchArrayBuffer(url);
      } else {
        throw new Error('url이 없습니다');
      }
    }

    const {
      data: exrdata,
      width,
      height,
      format,
      type,
    } = exrLoader.parse(arrayBuffer);

    (self as any).postMessage(
      {
        id,
        action: 'exr',
        data: {
          data: exrdata.buffer,
          width,
          height,
          format,
          type,
          arrayType: exrdata.constructor.name,
        },
      } as WorkerTaskExr,
      [exrdata.buffer],
    );
  } else if (action === 'bitmapToArrayBuffer') {
    const { bitmap } = data;
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const arrayBuffer = imageData.data.buffer;
    const width = bitmap.width;
    const height = bitmap.height;

    (self as any).postMessage(
      {
        id,
        action: 'bitmapToArrayBuffer',
        data: {
          data: arrayBuffer,
          width,
          height,
          type: 'image/png',
        },
      },
      [arrayBuffer],
    );
  } else if (action === 'compress') {
    const { arrayBuffer } = data;
    const compressedBuffer = pako.deflate(new Uint8Array(arrayBuffer));
    (self as any).postMessage(
      {
        id,
        action: 'compress',
        data: compressedBuffer.buffer,
      },
      [compressedBuffer.buffer],
    );
  } else if (action === 'decompress') {
    const { arrayBuffer } = data;
    const decompressedBuffer = pako.inflate(new Uint8Array(arrayBuffer));
    (self as any).postMessage(
      {
        id,
        action: 'decompress',
        data: decompressedBuffer.buffer,
      },
      [decompressedBuffer.buffer],
    );
  } else {
    throw new Error('Unknown action');
  }
};

export {};
