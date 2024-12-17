import { useAtomValue } from 'jotai';
import { loadHistoryAtom } from './atoms';

declare global {
  interface Map<K, V> {
    reduce<T>(
      callback: (accumulator: T, value: V, key: K, map: Map<K, V>) => T,
      initialValue: T,
    ): T;
  }
}

Map.prototype.reduce = function <K, V, T>(
  this: Map<K, V>,
  callback: (accumulator: T, value: V, key: K, map: Map<K, V>) => T,
  initialValue: T,
): T {
  let accumulator = initialValue;
  for (const [key, value] of this) {
    accumulator = callback(accumulator, value, key, this);
  }
  return accumulator;
};

const useFiles = () => {
  const loadingHistory = useAtomValue(loadHistoryAtom);
  const files = loadingHistory.reduce(
    (returnFiles, value) => {
      returnFiles.files.push(value);
      if (value.end === 0) {
        returnFiles.loadingFiles.push(value);
      }
      return returnFiles;
    },
    {
      files: [] as { name: string; start: number; end: number; file: File }[],
      loadingFiles: [] as { name: string; start: number; end: number }[],
    },
  );
  return files;
};

export default useFiles;
