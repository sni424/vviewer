// WorkerPool.ts

import { MeshInfoType, occlusionType, Point2D, Walls } from 'src/types';
import { THREE } from 'VTHREE';
import {
  WorkerTaskBitmapToArrayBuffer,
  WorkerTaskCompress,
  WorkerTaskDecompress,
  WorkerTaskExr,
  WorkerTaskFetch,
  WorkerTaskGeometryDeserialize,
} from './Worker';

type TaskExr = WorkerTaskExr & {
  resolve: (params: {
    data: ArrayBuffer;
    width: number;
    height: number;
    format: THREE.PixelFormat;
    type: THREE.TextureDataType;
    arrayType: string;
  }) => void;
  reject: (err: any) => void;
};

type TaskBitmapToArrayBuffer = WorkerTaskBitmapToArrayBuffer & {
  resolve: (params: {
    data: ArrayBuffer;
    width: number;
    height: number;
    type: string;
  }) => void;
  reject: (err: any) => void;
};

type TaskCompress = WorkerTaskCompress & {
  resolve: (buffer: ArrayBuffer) => void;
  reject: (err: any) => void;
};

type TaskDecompress = WorkerTaskDecompress & {
  resolve: (buffer: ArrayBuffer) => void;
  reject: (err: any) => void;
};

type TaskGeometryDeserialize = WorkerTaskGeometryDeserialize & {
  resolve: (bufferGeometry: THREE.BufferGeometry) => void;
  reject: (err: any) => void;
};

type TaskExteriorMeshes = {
  id: number;
  action: 'processExterior';
  data: {
    wallPoints: Point2D[];
    meshInfoArray: MeshInfoType[];
    meshArray: string[];
  };
  resolve: (value: number[]) => void;
  reject: (err: any) => void;
};

type TaskNavPoint = {
  id: number;
  action: 'processNav';
  data: {
    navPointArray: Point2D[];
    meshInfoArray: MeshInfoType[];
    wallData: Walls;
  };
  resolve: (value: [{ navPoint: Point2D; dpName: string[] | [] }]) => void;
  reject: (err: any) => void;
};

type TaskFilterNav = {
  id: number;
  action: 'processFilterNav';
  data: {
    occlusionArray: occlusionType[];
  };
  resolve: (value: occlusionType[]) => void;
  reject: (err: any) => void;
};

type Task =
  | TaskFetch
  | TaskExr
  | TaskBitmapToArrayBuffer
  | TaskCompress
  | TaskDecompress
  | TaskGeometryDeserialize
  | TaskNavPoint
  | TaskFilterNav
  | TaskExteriorMeshes;

type TaskReturn<T extends { resolve: (...args: any[]) => void }> = Parameters<
  T['resolve']
>[0];

type TaskFetch = WorkerTaskFetch & {
  resolve: (buf: ArrayBuffer) => void;
  reject: (err: any) => void;
};
export type TaskFetchReturn = TaskReturn<TaskFetch>;
export type TaskExrReturn = TaskReturn<TaskExr>;
export type TaskBitmapToArrayBufferReturn = TaskReturn<TaskBitmapToArrayBuffer>;
export type TaskCompressReturn = TaskReturn<TaskCompress>;
export type TaskDecompressReturn = TaskReturn<TaskDecompress>;
export type TaskGeometryDeserializeReturn = TaskReturn<TaskGeometryDeserialize>;

export type ExrParse = {
  data: ArrayBuffer;
  width: number;
  height: number;
  format: THREE.PixelFormat;
  type: THREE.TextureDataType;
  arrayType: string;
};

// fetch -> pako.inflate를 실행하는 워커풀
export default class Workers {
  private static _instance: Workers;
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private taskId = 0;
  private taskMap = new Map<number, Task>();
  private cache = new Map<string, ArrayBuffer>();
  private busyWorkers = new Set<number>();

  private constructor(concurrency = navigator.hardwareConcurrency ?? 4) {
    for (let i = 0; i < concurrency; i++) {
      const worker = new Worker(new URL('./Worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = this.onMessage.bind(this);
      this.workers.push(worker);
    }
  }

  public static get instance() {
    if (!this._instance) this._instance = new Workers();
    return this._instance;
  }

  public static async fetch(
    url: string,
    inflate: boolean = false,
  ): Promise<ArrayBuffer> {
    if (url.includes('undefined')) {
      debugger;
    }

    return this.instance._fetch(url, inflate);
  }

  public static async processExteriorMeshes(
    wallPoints: Point2D[],
    meshInfoArray: MeshInfoType[],
    meshArray: string[],
    parts: number = navigator.hardwareConcurrency,
  ): Promise<number[]> {
    const total = meshInfoArray.length;

    const promises = Array.from({ length: parts }, (_, part) => {
      const start = Math.floor((part * total) / parts);
      const end = Math.floor(((part + 1) * total) / parts);
      const batch = meshInfoArray.slice(start, end);

      return this.instance._processExteriorMeshes(batch, wallPoints, meshArray);
    });

    const allResults = await Promise.all(promises);
    return allResults.flat();
  }

  public static async processNavPoints(
    navPoints: Point2D[],
    meshInfoArray: MeshInfoType[],
    wallData: Walls,
    parts: number = navigator.hardwareConcurrency,
  ): Promise<{ navPoint: [number, number]; dpName: string[] }[]> {
    const total = navPoints.length;

    const promises = Array.from({ length: parts }, (_, part) => {
      const start = Math.floor((part * total) / parts);
      const end = Math.floor(((part + 1) * total) / parts);
      const batch = navPoints.slice(start, end);
      return this.instance._processNavPoint(batch, meshInfoArray, wallData);
    });

    const allResults = await Promise.all(promises);
    return allResults.flat();
  }

  public static async filterNavArray(
    occlusionArray: occlusionType[],
    parts: number = navigator.hardwareConcurrency,
  ): Promise<{ navPoint: [number, number]; dpName: string[] }[]> {
    const total = occlusionArray.length;

    const promises = Array.from({ length: parts }, (_, part) => {
      const start = Math.floor((part * total) / parts);
      const end = Math.floor(((part + 1) * total) / parts);
      const batch = occlusionArray.slice(start, end);
      return this.instance._processFilterNavArray(batch);
    });

    const allResults = await Promise.all(promises);
    return allResults.flat();
  }

  // trasnfer이면 worker로 넘겨버려서 앞으로 buffer을 사용할 수 없음
  public static async compress(
    buffer: ArrayBuffer,
    transfer?: boolean,
  ): Promise<ArrayBuffer> {
    return this.instance._compress(buffer, transfer);
  }

  // trasnfer이면 worker로 넘겨버려서 앞으로 buffer을 사용할 수 없음
  public static async decompress(
    buffer: ArrayBuffer,
    transfer?: boolean,
  ): Promise<ArrayBuffer> {
    return this.instance._decompress(buffer, transfer);
  }

  public static async exrParse(url?: string): Promise<ExrParse>;
  public static async exrParse(arrayBuffer?: ArrayBuffer): Promise<ExrParse>;
  public static async exrParse(
    urlOrArrayBuffer?: string | ArrayBuffer,
  ): Promise<ExrParse> {
    if (typeof urlOrArrayBuffer === 'string') {
      return this.instance._exrParse(urlOrArrayBuffer);
    } else if (urlOrArrayBuffer instanceof ArrayBuffer) {
      return this.instance._exrParse(urlOrArrayBuffer);
    } else {
      throw new Error('Invalid argument');
    }
  }

  private async _processExteriorMeshes(
    meshInfoArray: MeshInfoType[],
    wallPoints: Point2D[],
    meshArray: string[],
  ): Promise<number[]> {
    const id = this.taskId++;
    const prom = new Promise<number[]>((resolve, reject) => {
      const task: TaskExteriorMeshes = {
        id,
        action: 'processExterior',
        data: { meshInfoArray, wallPoints, meshArray },
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
    });
    return prom.then(res => {
      return res;
    });
  }
  private async _processNavPoint(
    navPointArray: Point2D[],
    meshInfoArray: MeshInfoType[],
    wallData: Walls,
  ): Promise<{ navPoint: [number, number]; dpName: string[] }[]> {
    const id = this.taskId++;
    const prom = new Promise<
      [
        {
          navPoint: [number, number];
          dpName: string[] | [];
        },
      ]
    >((resolve, reject) => {
      const task: TaskNavPoint = {
        id,
        action: 'processNav',
        data: { navPointArray, meshInfoArray, wallData },
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
    });
    return prom.then(res => {
      return res;
    });
  }

  private async _processFilterNavArray(
    occlusionArray: occlusionType[],
  ): Promise<occlusionType[]> {
    const id = this.taskId++;
    const prom = new Promise<occlusionType[]>((resolve, reject) => {
      const task: TaskFilterNav = {
        id,
        action: 'processFilterNav',
        data: { occlusionArray },
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
    });
    return prom.then(res => {
      return res;
    });
  }

  public static async bitmapToArrayBuffer(bitmap: ImageBitmap) {
    return this.instance._bitmapToArrayBuffer(bitmap);
  }

  private async _bitmapToArrayBuffer(bitmap: ImageBitmap): Promise<{
    data: ArrayBuffer;
    width: number;
    height: number;
    type: string;
  }> {
    const id = this.taskId++;
    return new Promise((resolve, reject) => {
      const task: Task = {
        id,
        action: 'bitmapToArrayBuffer',
        data: {
          bitmap,
        },
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
      // resolve는 onMessage에서 task.resolve 참조
    });
  }

  public static async geometryDeserialize(
    url: string,
  ): Promise<THREE.BufferGeometry>;
  public static async geometryDeserialize(
    arrayBuffer: ArrayBuffer,
    transfer?: boolean,
  ): Promise<THREE.BufferGeometry>;
  public static async geometryDeserialize(
    urlOrArrayBuffer: string | ArrayBuffer,
  ): Promise<THREE.BufferGeometry> {
    if (typeof urlOrArrayBuffer === 'string') {
      return this.instance._geometryDeserialize(urlOrArrayBuffer);
    } else if (urlOrArrayBuffer instanceof ArrayBuffer) {
      return this.instance._geometryDeserialize(urlOrArrayBuffer);
    } else {
      throw new Error('Invalid argument');
    }
  }

  private async _geometryDeserialize(
    urlOrArrayBuffer: string | ArrayBuffer,
    transfer?: boolean,
  ): Promise<THREE.BufferGeometry> {
    const id = this.taskId++;

    const data =
      typeof urlOrArrayBuffer === 'string'
        ? { url: urlOrArrayBuffer }
        : { arrayBuffer: urlOrArrayBuffer, transfer };

    return new Promise((resolve, reject) => {
      const task: Task = {
        id,
        action: 'geometryDeserialize',
        data,
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
    });
  }

  private async _exrParse(
    urlOrArrayBuffer: string | ArrayBuffer,
  ): Promise<ExrParse> {
    const id = this.taskId++;

    const isUrlInput = typeof urlOrArrayBuffer === 'string';
    return new Promise((resolve, reject) => {
      const task: Task = {
        id,
        action: 'exr',
        data: {
          url: isUrlInput ? urlOrArrayBuffer : undefined,
          arrayBuffer: isUrlInput ? undefined : urlOrArrayBuffer,
        },
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
      // resolve는 onMessage에서 task.resolve 참조
    });
  }

  private async _fetch(url: string, inflate: boolean): Promise<ArrayBuffer> {
    if (this.cache.has(url)) return this.cache.get(url)!;
    const id = this.taskId++;

    const prom = new Promise((resolve, reject) => {
      const task: Task = {
        id,
        action: 'fetch',
        data: { url, inflate },
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
      // resolve는 onMessage에서 task.resolve 참조
    }).then((buffer: any) => {
      this.cache.set(url, buffer);
      return buffer;
    });
    this.cache.set(url, prom as any);
    return prom as any;
  }

  private async _compress(
    buffer: ArrayBuffer,
    transfer?: boolean,
  ): Promise<ArrayBuffer> {
    const id = this.taskId++;

    return new Promise((resolve, reject) => {
      const task: Task = {
        id,
        action: 'compress',
        data: {
          arrayBuffer: buffer,
          transfer,
        },
        resolve,
        reject,
      };

      this.taskMap.set(id, task);
      this.enqueue(task);
    });
  }

  private async _decompress(
    buffer: ArrayBuffer,
    transfer?: boolean,
  ): Promise<ArrayBuffer> {
    const id = this.taskId++;

    return new Promise((resolve, reject) => {
      const task: Task = {
        id,
        action: 'decompress',
        data: {
          arrayBuffer: buffer,
          transfer,
        },
        resolve,
        reject,
      };

      this.taskMap.set(id, task);
      this.enqueue(task);
    });
  }

  private enqueue(task: Task) {
    const workerIndex = this.getAvailableWorkerIndex();
    if (workerIndex !== -1) {
      this.dispatch(task, workerIndex);
    } else {
      this.queue.push(task);
    }
  }

  private dispatch(task: Task, workerIndex: number) {
    this.busyWorkers.add(workerIndex);
    const worker = this.workers[workerIndex];
    const copiedTask = { ...task };
    delete (copiedTask as any).resolve;
    delete (copiedTask as any).reject;

    const transferrables = [];

    if (task.action === 'exr' && task.data.arrayBuffer) {
      transferrables.push(task.data.arrayBuffer);
    }

    if (task.action === 'compress' && task.data.transfer) {
      transferrables.push(task.data.arrayBuffer);
    }

    if (task.action === 'decompress' && task.data.transfer) {
      transferrables.push(task.data.arrayBuffer);
    }

    worker.postMessage(copiedTask, transferrables);
  }

  private onMessage(
    e: MessageEvent<
      | {
          id: number;
          action: 'fetch';
          data: ArrayBuffer;
          error?: any;
        }
      | {
          id: number;
          action: 'exr';
          data: {
            data: ArrayBuffer;
            width: number;
            height: number;
            format: THREE.PixelFormat;
            type: THREE.TextureDataType;
            arrayType: string;
          };
          error?: any;
        }
      | {
          id: number;
          action: 'bitmapToArrayBuffer';
          data: TaskBitmapToArrayBufferReturn;
          error?: any;
        }
      | {
          id: number;
          action: 'compress';
          data: TaskCompressReturn;
          error?: any;
        }
      | {
          id: number;
          action: 'decompress';
          data: TaskDecompressReturn;
          error?: any;
        }
      | {
          id: number;
          action: 'geometryDeserialize';
          data:
            | {
                format: 'VXQ1';
                positions: Float32Array;
                normals: Float32Array;
                uvs: Float32Array[];
                indices: Int32Array;
              }
            | {
                format: 'VXQ0';
                positions: ArrayBuffer; // Float32Array
                normals: ArrayBuffer; // Float32Array
                uvChannels: ArrayBuffer[]; // Float32Array[]
              };
          error?: any;
        }
      | {
          id: number;
          action: 'processNav';
          data: { navPoint: Point2D; dpName: string[] };
          error?: any;
        }
      | {
          id: number;
          action: 'processFilterNav';
          data: { occlusionArray: occlusionType[] };
          error?: any;
        }
      | {
          id: number;
          action: 'processExterior';
          data: number[];
          error?: any;
        }
    >,
  ) {
    const { id, action, data, error } = e.data;
    const task = this.taskMap.get(id);
    if (!task) return;

    this.taskMap.delete(id);

    const workerIndex = this.getWorkerIndexForTask(id);
    if (workerIndex !== -1) this.busyWorkers.delete(workerIndex);

    if (error) task.reject(error);
    else {
      if (action === 'fetch') {
        (task as TaskFetch).resolve(data);
      } else if (action === 'exr') {
        const { data: exrData, width, height, format, type, arrayType } = data;
        (task as TaskExr).resolve({
          data: exrData,
          width,
          height,
          format,
          type,
          arrayType,
        });
      } else if (action === 'bitmapToArrayBuffer') {
        (task as TaskBitmapToArrayBuffer).resolve(data);
      } else if (action === 'compress' || action === 'decompress') {
        (task as TaskCompress).resolve(data);
      } else if (action === 'geometryDeserialize') {
        const t = task as TaskGeometryDeserialize;

        const { format } = data;

        if (format === 'VXQ0') {
          const { positions, normals, uvChannels } = data;

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(positions), 3),
          );
          geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(new Float32Array(normals), 3),
          );

          uvChannels.forEach((uv, idx) => {
            const name = idx === 0 ? 'uv' : `uv${idx}`;
            geometry.setAttribute(
              name,
              new THREE.BufferAttribute(new Float32Array(uv), 2),
            );
          });

          t.resolve(geometry);
        } else if (format === 'VXQ1') {
          const { positions, normals, uvs, indices } = data;

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3),
          );
          geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(normals, 3),
          );
          uvs.forEach((uv, i) => {
            const name = i === 0 ? 'uv' : `uv${i}`;
            geometry.setAttribute(name, new THREE.BufferAttribute(uv, 2));
          });
          geometry.setIndex(new THREE.BufferAttribute(indices, 1));

          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          try {
            if (
              geometry.getAttribute('uv') &&
              geometry.getAttribute('normal')
            ) {
              geometry.computeTangents();
            }
          } catch (e) {
            console.warn('Tangent computation failed:', e);
          }

          t.resolve(geometry);
        } else {
          data;
          debugger;
          throw new Error(`Unknown format: ${format}`);
        }
      } else if (action === 'processNav') {
        (task as TaskNavPoint).resolve(data as any);
      } else if (action === 'processFilterNav') {
        (task as TaskFilterNav).resolve(data as any);
      } else if (action === 'processExterior') {
        (task as TaskExteriorMeshes).resolve(data as number[]);
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
    }

    // Process next in queue
    if (this.queue.length > 0) {
      const nextTask = this.queue.shift()!;
      const nextWorkerIndex = this.getAvailableWorkerIndex();
      if (nextWorkerIndex !== -1) this.dispatch(nextTask, nextWorkerIndex);
    }
  }

  private getAvailableWorkerIndex(): number {
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.busyWorkers.has(i)) return i;
    }
    return -1;
  }

  private getWorkerIndexForTask(taskId: number): number {
    // Round-robin fallback (not strictly accurate, just for cleanup)
    return (taskId - 1 + this.workers.length) % this.workers.length;
  }
}

// Usage:
// const buffer = await WorkerPool.fetch(url, true); // or false

Workers.instance; // 한 번 불러서 생성 후 대기
