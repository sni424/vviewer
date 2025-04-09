// src/main.ts
import { useEffect } from 'react';
import { WorkerResponse } from 'src/scripts/manager/Worker';
import * as THREE from 'VTHREE';

const worker = new Worker(
  new URL('../scripts/manager/Worker.ts', import.meta.url),
  {
    type: 'module',
  },
);

async function processUrlToThreeObjects(url: string): Promise<{
  texture: THREE.DataTexture;
  geometry: THREE.BufferGeometry;
}> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (
      event: MessageEvent<WorkerResponse | { type: 'error'; message: string }>,
    ) => {
      if (event.data.type === 'result') {
        const { arrayBuffer, obj } = event.data;

        // const texture = new THREE.DataTexture(
        //   new Uint8Array(arrayBuffer),
        //   width,
        //   height,
        //   THREE.RGBAFormat,
        // );
        // texture.needsUpdate = true;

        // const geometry = new THREE.PlaneGeometry(width, height);

        resolve({ obj, arrayBuffer });
      } else if (event.data.type === 'error') {
        reject(new Error(event.data.message));
      }
    };

    worker.onerror = error => reject(error);

    worker.postMessage({ type: 'processUrl', url });
  });
}

// Usage
function TestPage() {
  useEffect(() => {
    const fetcher = async () => {
      try {
        const { obj, arrayBuffer } =
          await processUrlToThreeObjects('/binaryData.bin');

        console.log(obj, arrayBuffer);

        // Add to scene...
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetcher();
  }, []);

  return <div>Hi</div>;
}

export default TestPage;
