import pako from 'pako';

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Fetch failed');
  return response.arrayBuffer();
}

self.onmessage = async (e: MessageEvent) => {
  const { id, url, inflate } = e.data;
  try {
    const buffer = await fetchArrayBuffer(url);
    const result = inflate
      ? pako.inflate(new Uint8Array(buffer)).buffer
      : buffer;
    (self as any).postMessage({ id, buffer: result }, [result]);
  } catch (err) {
    console.error('Worker error : ', err);
    (self as any).postMessage({ id, error: (err as any).message });
  }
};

export {};
