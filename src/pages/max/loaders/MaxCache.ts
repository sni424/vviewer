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

    // case 1.
    const { originalFile, type, fileName } = maxFile;
    if (originalFile instanceof File && type) {
      this.files.set(getKeyFromMaxFile(maxFile), data);
      return;
    }

    // case 2.
    if (fileName && type) {
      this.files.set(keyBuilder(fileName, type), data);
      return;
    }

    throw new Error('MaxCache.addPromise: Invalid MaxFile');
  },

  addPromiseByNameAndType: function (
    name: string,
    type: MaxFileType,
    data: Promise<MaxFileData>,
  ) {
    if (!this.enabled) return;

    this.files.set(keyBuilder(name, type), data);
  },

  has: function (key: any): boolean {
    if (!this.enabled) return false;

    if (key === null || key === undefined) {
      return false;
    }

    if (typeof key === 'object') {
      // assume MaxFile
      const { originalFile, type, fileName } = key;

      if (originalFile instanceof File && type) {
        return this.files.has(getKeyFromMaxFile(key));
      }

      if (fileName && type) {
        return this.files.has(keyBuilder(fileName, type));
      }
    }

    return this.files.has(key);
  },

  get: async function (maxFile: MaxFile): Promise<MaxFileData | null> {
    if (!this.enabled) return null;

    // case 1.
    const { originalFile, type, fileName } = maxFile;
    if (originalFile instanceof File && type) {
      return this.files.get(getKeyFromMaxFile(maxFile)) ?? null;
    }

    // case 2.
    if (fileName && type) {
      return this.files.get(keyBuilder(fileName, type)) ?? null;
    }

    return null;
  },

  hasByNameAndType(name: string | undefined, type: MaxFileType): boolean {
    if (name === undefined) {
      return false;
    }
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

  if (!originalFile || !type) {
    debugger;
  }

  // console.log( 'THREE.Cache', 'Adding key:', key );
  const name = originalFile.name;

  // return { name, type };
  return keyBuilder(name, type);
}

export { MaxCache };
