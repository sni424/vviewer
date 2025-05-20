import FileFetcherQueue from 'src/pages/max/loaders/FileLoadingQueue.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import Workers from 'src/scripts/workers/Workers';

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

let downloadCount = {
  value: 0,
};
const maxDownloadCount = 50;

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

  if (downloadCount.value > maxDownloadCount) {
    return new Promise(res => {
      setTimeout(() => {
        res(downloadJson(projectName, fileName));
      }, 0);
    });
  }

  downloadCount.value++;
  const url = `http://localhost:4000/retrieve?${key}`;

  const prom = fetch(url)
    .then(res => res.json())
    .then(data => {
      downloadCount.value--;
      return data;
    });
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

  // if (downloadCount.value > maxDownloadCount) {
  //   return new Promise(res => {
  //     setTimeout(() => {
  //       res(downloadBinary(projectName, fileName));
  //     }, 0);
  //   });
  // }

  const url = `${S3URL}/${projectName}/${encodeURIComponent(fileName)}`;

  if (fileName === 'Map%20') {
    debugger;
  }

  // downloadCount.value++;

  const fetcher1 = (url: string) => Workers.fetch(url);
  const fetcher2 = (url: string) => {
    downloadCount.value++;
    return fetch(url)
      .then(res => res.arrayBuffer())
      .then(data => {
        downloadCount.value--;
        return data;
      });
  };
  const prom = fetcher2(url).catch(e => {
    url;
    projectName;
    fileName;
    console.error('Error fetching binary file:', e);
    debugger;
  });
  downloadCache.set(key, prom);

  return prom;
}
