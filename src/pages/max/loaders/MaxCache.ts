import { MaxFile, MaxFileData, MaxFileType } from 'src/pages/max/maxAtoms.ts';

export type LoadingStatus = 'waiting' | 'progress' | 'done';

const MaxCache = {
  enabled: true,

  files: new Map<string, Promise<MaxFileData>>(),

  add: function (maxFile: MaxFile) {
    if (!this.enabled) return;

    const { resultData } = maxFile;

    this.files.set(
      getKeyFromMaxFile(maxFile),
      resultData instanceof Promise ? resultData : Promise.resolve(resultData),
    );
  },

  addPromise: function (maxFile: MaxFile, data: Promise<MaxFileData>) {
    if (!this.enabled) return;

    this.files.set(getKeyFromMaxFile(maxFile), data);
  },

  addPromiseByNameAndType: function (
    name: string,
    type: MaxFileType,
    data: Promise<MaxFileData>,
  ) {
    if (!this.enabled) return;

    this.files.set(keyBuilder(name, type), data);
  },

  has: function (maxFile: MaxFile): boolean {
    if (!this.enabled) return false;

    return this.files.has(getKeyFromMaxFile(maxFile));
  },

  get: async function (maxFile: MaxFile): Promise<MaxFileData | null> {
    if (!this.enabled) return null;

    return this.files.get(getKeyFromMaxFile(maxFile)) ?? null;
  },

  hasByNameAndType(name: string, type: MaxFileType): boolean {
    return this.files.has(keyBuilder(name, type));
  },

  getByNameAndType: async function (
    name: string,
    type: MaxFileType,
  ): Promise<MaxFileData | null> {
    return this.files.get(keyBuilder(name, type)) ?? null;
  },

  setByNameAndType(
    name: string,
    type: MaxFileType,
    data: MaxFileData | Promise<MaxFileData>,
  ): void {
    if (data instanceof Promise) {
      this.files.set(keyBuilder(name, type), data);
    } else {
      this.files.set(keyBuilder(name, type), Promise.resolve(data));
    }
  },

  remove: function (maxFile: MaxFile): void {
    this.files.delete(getKeyFromMaxFile(maxFile));
  },

  clear: function (): void {
    this.files = new Map();
  },

  size: function (): number {
    return this.files.size;
  },
};

function keyBuilder(name: string, type: MaxFileType) {
  return `name:[${name}]-type:[${type}]`;
}

export function getKeyFromMaxFile(maxFile: MaxFile) {
  const { originalFile, type } = maxFile;

  // console.log( 'THREE.Cache', 'Adding key:', key );
  const name = originalFile.name;

  // return { name, type };
  return keyBuilder(name, type);
}

export { MaxCache };
