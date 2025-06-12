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