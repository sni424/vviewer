import pako from 'pako';
import { EXRLoader } from 'three/examples/jsm/Addons.js';
import { loadSmartGeometry } from './WorkerUtils';

export type WorkerTask =
  | WorkerTaskFetch
  | WorkerTaskFetchJson
  | WorkerTaskExr
  | WorkerTaskBitmapToArrayBuffer
  | WorkerTaskCompress
  | WorkerTaskDecompress
  | WorkerTaskGeometryDeserialize;

export type WorkerTaskFetch = {
  id: number;
  action: 'fetch';
  data: {
    url: string;
    inflate: boolean;
  };
};

export type WorkerTaskFetchJson = {
  id: number;
  action: 'fetchJson';
  data: {
    url: string;
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

export type WorkerTaskGeometryDeserialize = {
  id: number;
  action: 'geometryDeserialize';
  data:
    | {
        arrayBuffer: ArrayBuffer;
        transfer?: boolean;
      }
    | {
        url: string;
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
      // console.log('worker fetch url:', url);
      const buffer = await fetchArrayBuffer(url, {});
      // console.log('worker fetch buffer:', buffer);

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
  } else if (action === 'fetchJson') {
    try {
      const { url } = data;
      const json = await fetch(url).then(res => res.json());
      (self as any).postMessage({ id, action: 'fetchJson', data: json });
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
  } else if (action === 'bitmapToArrayBuffer') {
    const { bitmap } = data;
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);

    const width = bitmap.width;
    const height = bitmap.height;

    // PNG Blob 생성
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    // Blob → ArrayBuffer 변환
    const arrayBuffer = await blob.arrayBuffer();

    // // 일반 bmp 형식
    // {
    //   const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    //   const arrayBuffer = imageData.data.buffer;
    // }

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
  } else if (action === 'geometryDeserialize') {
    let { url, arrayBuffer } = data as {
      url?: string;
      arrayBuffer?: ArrayBuffer;
      transfer?: boolean;
    };

    if (url && !arrayBuffer) {
      arrayBuffer = await fetchArrayBuffer(url);
      const result = loadSmartGeometry(arrayBuffer);
      if (result.format === 'VXQ1') {
        const { format, positions, normals, uvs, indices } = result;
        (self as any).postMessage(
          {
            id,
            action: 'geometryDeserialize',
            data: {
              format,
              positions: positions,
              normals: normals,
              uvs: uvs,
              indices: indices,
            },
          },
          [],
        );
      } else if (result.format === 'VXQ0') {
        const { format, positions, normals, uvChannels } = result;
        const posBuf = positions.buffer;
        const normBuf = normals.buffer;
        const uvBuf = uvChannels.map(uv => uv.buffer);

        (self as any).postMessage(
          {
            id,
            action: 'geometryDeserialize',
            data: {
              format,
              positions: posBuf,
              normals: normBuf,
              uvChannels: uvBuf,
            },
          },
          [posBuf, normBuf, ...uvBuf],
        );
      } else {
        console.error(data);
        throw new Error('Unknown format');
      }
    }

    if (!arrayBuffer) {
      throw new Error('url 또는 arrayBuffer이 없습니다');
    }
  } else {
    throw new Error('Unknown action');
  }
};

export {};
