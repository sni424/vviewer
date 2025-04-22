// WorkerPool.ts

import { THREE } from 'VTHREE';
import { WorkerTaskExr, WorkerTaskFetch } from './SingleWorker';

type Task = TaskFetch | TaskExr;

export type TaskFetch = WorkerTaskFetch & {
  resolve: (buf: ArrayBuffer) => void;
  reject: (err: any) => void;
};
export type TaskExr = WorkerTaskExr & {
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
      const worker = new Worker(new URL('./SingleWorker.ts', import.meta.url), {
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
    inflate: boolean = true,
  ): Promise<ArrayBuffer> {
    return this.instance._fetch(url, inflate);
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
