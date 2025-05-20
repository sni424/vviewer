// WorkerPool.ts

import { THREE } from 'VTHREE';
import {
  WorkerTaskBitmapToArrayBuffer,
  WorkerTaskCompress,
  WorkerTaskDecompress,
  WorkerTaskExr,
  WorkerTaskFetch,
  WorkerTaskFetchJson,
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

type Task =
  | TaskFetch
  | TaskFetchJson
  | TaskExr
  | TaskBitmapToArrayBuffer
  | TaskCompress
  | TaskDecompress
  | TaskGeometryDeserialize;

type TaskReturn<T extends { resolve: (...args: any[]) => void }> = Parameters<
  T['resolve']
>[0];

type TaskFetch = WorkerTaskFetch & {
  resolve: (buf: ArrayBuffer) => void;
  reject: (err: any) => void;
};
type TaskFetchJson<T = any> = WorkerTaskFetchJson & {
  resolve: (buf: T) => void;
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
  private cache = new Map<string, any>();
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

  public static async fetchJson<T = any>(url: string): Promise<T> {
    if (url.includes('undefined')) {
      debugger;
    }

    return this.instance._fetchJson(url);
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

  private async _fetchJson<T = any>(url: string): Promise<T> {
    if (this.cache.has(url)) return this.cache.get(url)!;
    const id = this.taskId++;

    const prom = new Promise((resolve, reject) => {
      const task: TaskFetchJson<T> = {
        id,
        action: 'fetchJson',
        data: { url },
        resolve,
        reject,
      };
      this.taskMap.set(id, task);
      this.enqueue(task);
      // resolve는 onMessage에서 task.resolve 참조
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
                positions: number[];
                normals: number[];
                uvs: number[];
                indices: number[];
              }
            | {
                format: 'VXQ0';
                positions: ArrayBuffer; // Float32Array
                normals: ArrayBuffer; // Float32Array
                uvChannels: ArrayBuffer[]; // Float32Array[]
              };
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
            new THREE.Float32BufferAttribute(positions, 3),
          );
          geometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute(normals, 3),
          );
          geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
          geometry.setIndex(indices);

          t.resolve(geometry);
        } else {
          data;
          debugger;
          throw new Error(`Unknown format: ${format}`);
        }
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
