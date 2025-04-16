// WorkerPool.ts

// --- WorkerPool Singleton ---
type Task = {
  id: number;
  url: string;
  inflate: boolean;
  resolve: (buf: ArrayBuffer) => void;
  reject: (err: any) => void;
};

// fetch -> pako.inflate를 실행하는 워커풀
export default class Fetcher {
  private static _instance: Fetcher;
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private taskId = 0;
  private taskMap = new Map<number, Task>();
  private cache = new Map<string, ArrayBuffer>();
  private busyWorkers = new Set<number>();

  private constructor(concurrency = navigator.hardwareConcurrency ?? 4) {
    for (let i = 0; i < concurrency; i++) {
      const worker = new Worker(
        new URL('./FetcherWorker.ts', import.meta.url),
        {
          type: 'module',
        },
      );
      worker.onmessage = this.onMessage.bind(this);
      this.workers.push(worker);
    }
  }

  public static get instance() {
    if (!this._instance) this._instance = new Fetcher();
    return this._instance;
  }

  public static async fetch(
    url: string,
    inflate: boolean = true,
  ): Promise<ArrayBuffer> {
    return this.instance._fetch(url, inflate);
  }

  private async _fetch(url: string, inflate: boolean): Promise<ArrayBuffer> {
    if (this.cache.has(url)) return this.cache.get(url)!;
    const id = this.taskId++;

    return new Promise((resolve, reject) => {
      const task: Task = { id, url, inflate, resolve, reject };
      this.taskMap.set(id, task);
      this.enqueue(task);
      // resolve는 onMessage에서 task.resolve 참조
    }).then((buffer: any) => {
      this.cache.set(url, buffer);
      return buffer;
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
    worker.postMessage({ id: task.id, url: task.url, inflate: task.inflate });
  }

  private onMessage(e: MessageEvent) {
    const { id, buffer, error } = e.data;
    const task = this.taskMap.get(id);
    if (!task) return;

    this.taskMap.delete(id);

    const workerIndex = this.getWorkerIndexForTask(id);
    if (workerIndex !== -1) this.busyWorkers.delete(workerIndex);

    if (error) task.reject(error);
    else task.resolve(buffer);

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

Fetcher.instance; // 한 번 불러서 생성 후 대기
