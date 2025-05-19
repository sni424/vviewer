import FileFetcherQueue from 'src/pages/max/loaders/FileLoadingQueue.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';

export async function resolveMaxFile(
  url: string,
  filename: string,
  type: MaxFileType,
): Promise<MaxFile> {
  return FileFetcherQueue.fetchFile(filename, async () => {
    const blob = await fetch(url).then(res => res.blob());
    return new File([blob], filename);
  }).then(
    file =>
      ({
        name: filename,
        type: type,
        originalFile: file,
        loaded: false,
      }) as MaxFile,
  );
}

const downloadCache = new Map<string, Promise<any>>();
export async function downloadJson<T = any>(
  projectName: string,
  fileName: string,
): Promise<T> {
  const key = new URLSearchParams({
    projectId: projectName,
    fileId: fileName,
  }).toString();

  if (downloadCache.has(key)) {
    return downloadCache.get(key);
  }

  const url = `http://localhost:4000/retrieve?${key}`;

  const prom = fetch(url).then(res => res.json());
  downloadCache.set(key, prom);

  return prom;
}

export async function downloadBinary(
  projectName: string,
  fileName: string,
): Promise<ArrayBuffer> {
  const S3URL = import.meta.env.VITE_S3_DEV_URL;

  if (!S3URL) {
    throw new Error('.env에 VITE_S3_DEV_URL을 설정해주세요');
  }

  const key = new URLSearchParams({
    projectId: projectName,
    fileId: fileName,
  }).toString();

  if (downloadCache.has(key)) {
    return downloadCache.get(key);
  }

  const url = `${S3URL}/${projectName}/${encodeURIComponent(fileName)}`;

  if (fileName === 'Map%20') {
    debugger;
  }

  const prom = fetch(url)
    .then(res => res.arrayBuffer())
    .catch(e => {
      url;
      projectName;
      fileName;
      console.error('Error fetching binary file:', e);
      debugger;
    });
  downloadCache.set(key, prom);

  return prom;
}
