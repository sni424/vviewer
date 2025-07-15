import FileFetcherQueue from 'src/pages/max/loaders/FileLoadingQueue.ts';
import { MaxFile, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { MaxLayers } from 'src/pages/max/loaders/FreezeLoader.ts';

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

async function callObject() {
  const objectURL = MaxConstants.base + 'objects_0715.json';
  return fetch(objectURL).then(res => res.json() as Promise<MaxCallObject>);
}

type MeshName = string;
type MaterialName = string;

export type MaxCallObject = {
  paths: string[];
  sectionMapping:  { [key: MeshName]: MaxLayers };
  probeApplyInfo: { [key: MaterialName]: { probeNames: string[], probeType: 'multi' }}
  dp: string[];
}

export { callObject };