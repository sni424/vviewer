import pako from 'pako';
import { EXRLoader } from 'three/examples/jsm/Addons.js';

export type WorkerTask = WorkerTaskFetch | WorkerTaskExr;

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
  } else {
    throw new Error('Unknown action');
  }
};

export {};
