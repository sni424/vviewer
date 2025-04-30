import { MaxFile } from 'src/pages/max/maxAtoms.ts';

export interface MaxLoader<T> {
  load(maxFile: MaxFile): Promise<T>;
}